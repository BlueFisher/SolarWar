import * as WebSocketServer from 'ws';
import * as express from 'express';
import * as session from 'express-session';

import { logger } from './log';
import GameManager from './game_models/game_manager';
import * as GameProtocols from '../shared/game_protocols';
import * as dao from './db_access_funcs';

export default class GameServer {
	ip: string;
	port: number;

	private _gameManager: GameManager;
	private _sessionParser: express.RequestHandler;
	/**用户Socket键值对 */
	private _socketPlayerMap: {
		userId?: string,
		sessionId: string,
		socket: WebSocketServer,
		playerId?: number
	}[] = [];

	/**
	 * 发送和接收WebSocket信息，提交和处理后台游戏逻辑
	 * 
	 * @param ip WebSocket IP地址
	 * @param port WebSocket端口号
	 * @param sessionParser Session处理器
	 * @param callback 监听成功回调函数
	 */
	constructor(ip: string, port: number, sessionParser: express.RequestHandler, callback?: () => void) {
		this.ip = ip;
		this.port = port;
		this._sessionParser = sessionParser;

		let wss = new WebSocketServer.Server({
			port: port
		}, () => {
			if (callback) callback();
		}).on('connection', socket => {
			this._onWebSocketConnection(socket);
		});

		this._initializeGameManager();
	}

	private _onWebSocketConnection(socket: WebSocketServer) {
		// 处理WebSocket连接请求中的session
		let req = socket.upgradeReq as express.Request;
		this._sessionParser(req, <express.Response>{}, () => {
			let userId = req.session['userId'];
			let sessionId: string = req.sessionID;

			if (userId) {
				let pairUser = this._socketPlayerMap.find(p => p.userId == userId);
				if (pairUser) {
					logger.info(`user ${userId} reconnected`);
					this._closeSocket(pairUser.socket);
					pairUser.sessionId = sessionId;
					pairUser.socket = socket;
				} else {
					let pairSession = this._socketPlayerMap.find(p => p.sessionId == sessionId);
					if (pairSession) {
						logger.info(`user ${userId} connected in existed session ${sessionId}`);
						this._closeSocket(pairSession.socket);
						if (pairSession.userId != userId) {
							pairSession.userId = null;
						}
						pairSession.userId = userId;
						pairSession.socket = socket;
					} else {
						logger.info(`user ${userId} connected`);
						this._socketPlayerMap.push({
							userId: userId,
							sessionId: sessionId,
							socket: socket
						});
					}
				}
			} else {
				let pair = this._socketPlayerMap.find(p => p.sessionId == sessionId);
				if (pair) {
					if (pair.userId) {
						logger.info(`anonymouse user reconnected in existed user ${pair.userId}`);
						this._closeSocket(pair.socket);
						pair.userId = null;
						pair.socket = socket;
						pair.playerId = null;
					} else {
						logger.info(`anonymouse user reconnected`);
						this._closeSocket(pair.socket);
						pair.socket = socket;
					}
				} else {
					logger.info(`anonymouse user connected`);
					this._socketPlayerMap.push({
						sessionId: sessionId,
						socket: socket
					});
				}
			}
		});

		socket.on('message', message => {
			let protocol: GameProtocols.BaseProtocol = JSON.parse(message);
			switch (protocol.type) {
				case GameProtocols.Type.requestInitializeMap:
					this._onInitializeMap(<GameProtocols.RequestInitializeMap>protocol, socket);
					break;
				case GameProtocols.Type.requestMoveShips:
					this._onMovePlayerShips(<GameProtocols.RequestMovingShips>protocol, socket);
					break;
				case GameProtocols.Type.addPortal:
					this._onAddPortal(<GameProtocols.RequestAddPortal>protocol, socket);
			}
		});

		socket.on('error', () => {
			onSocketClose(socket);
		});
		socket.on('close', () => {
			onSocketClose(socket);
		});

		let onSocketClose = (socket: WebSocketServer) => {
			let pair = this._socketPlayerMap.find(p => p.socket == socket);
			if (pair) {
				logger.warn(`player ${pair.playerId} disconnected`);
			}
		}
	}

	private _send(msg: string, socket: WebSocketServer) {
		if (socket.readyState == WebSocketServer.OPEN) {
			socket.send(msg);
		}
	}
	private _closeSocket(socket: WebSocketServer) {
		if (socket.readyState == WebSocketServer.OPEN) {
			socket.close();
		}
	}

	private _initializeGameManager() {
		this._gameManager = new GameManager();

		this._gameManager.on(GameManager.events.playerAdded, (protocols: GameProtocols.ChangedSolarObject[]) => {
			this._socketPlayerMap.filter(p => p.playerId).forEach(p => {
				protocols.forEach(protocol => {
					this._send(JSON.stringify(protocol), p.socket);
				})
			});
		});

		this._gameManager.on(GameManager.events.sendToAllDirectly, (protocol: any) => {
			let json = JSON.stringify(protocol);
			this._socketPlayerMap.filter(p => p.playerId).forEach(p => {
				this._send(json, p.socket);
			});
		});

		this._gameManager.on(GameManager.events.sendToOne, (protocol: any, playerId: number) => {
			let json = JSON.stringify(protocol);
			let pair = this._socketPlayerMap.find(p => p.playerId == playerId);
			if (pair) {
				this._send(json, pair.socket);
			}
		})

		this._gameManager.on(GameManager.events.gameStarted, () => {
			let json = new GameProtocols.InitializeMap(this._gameManager.getMap(), null);
			this._socketPlayerMap.filter(p => p.playerId).forEach(p => {
				json.playerId = p.playerId;
				this._send(JSON.stringify(json), p.socket);
			});
		});

		this._gameManager.on(GameManager.events.gameOver, (playerId: number) => {
			let socketPlayerMap = this._socketPlayerMap;
			if (playerId) {
				socketPlayerMap = this._socketPlayerMap.filter(p => p.playerId == playerId);
			}
			socketPlayerMap.forEach(pair => {
				if (pair.playerId) {
					let historyMaxShipsCount = this._gameManager.getPlayerHistoryMaxShipsCount(pair.playerId);
					if (pair.userId) {
						dao.addNewScore(pair.userId, historyMaxShipsCount);
					}
					let json = JSON.stringify(new GameProtocols.GameOver(historyMaxShipsCount));
					this._send(json, pair.socket);
				}
			});

			// 游戏整场回合结束，释放资源，重新启动
			if (!playerId) {
				this._socketPlayerMap.forEach(pair => {
					pair.playerId = null;
				})
				this._gameManager.dispose();
				this._initializeGameManager();
			}
		})
	}

	private _onInitializeMap(protocol: GameProtocols.RequestInitializeMap, socket: WebSocketServer) {
		let pair = this._socketPlayerMap.find(p => p.socket == socket);
		if (pair) {
			if (pair.playerId && protocol.resumeGame && this._gameManager.isPlayerOnGame(pair.playerId)) {
				logger.info(`player ${pair.playerId} resume game`);
			} else {
				let id = this._gameManager.addPlayer(protocol.name);
				pair.playerId = id;
				logger.info(`player ${pair.playerId} added in game`);
			}

			if (this._gameManager.isGameStarted()) {
				let json = new GameProtocols.InitializeMap(this._gameManager.getMap(), pair.playerId);
				this._send(JSON.stringify(json), socket);
			}
		}
	}

	private _onMovePlayerShips(protocol: GameProtocols.RequestMovingShips, socket: WebSocketServer) {
		let pair = this._socketPlayerMap.find(p => p.playerId && p.socket == socket);
		if (pair) {
			this._gameManager.movePlayerShips(pair.playerId, protocol.objectFromId, protocol.objectToId, protocol.countRatio);
		}
	}
	private _onAddPortal(protocol: GameProtocols.RequestAddPortal, socket: WebSocketServer) {
		let pair = this._socketPlayerMap.find(p => p.playerId && p.socket == socket);
		if (pair) {
			this._gameManager.addPortal(pair.playerId, protocol.position);
		}
	}

	isPlayerOnGame(userId: string, sessionId: string): boolean {
		if (userId) {
			let pairUser = this._socketPlayerMap.find(p => p.userId == userId);
			if (pairUser) {
				return this._gameManager.isPlayerOnGame(pairUser.playerId);
			} else {
				let pairSession = this._socketPlayerMap.find(p => p.sessionId == sessionId);
				if (pairSession) {
					if (pairSession.userId != userId) {
						return false;
					}
					return this._gameManager.isPlayerOnGame(pairSession.playerId);
				} else {
					return false;
				}
			}
		} else {
			let pair = this._socketPlayerMap.find(p => p.sessionId == sessionId);
			if (pair) {
				if (pair.userId) {
					return false;
				} else {
					return this._gameManager.isPlayerOnGame(pair.playerId);
				}
			} else {
				return false;
			}
		}
	}
}