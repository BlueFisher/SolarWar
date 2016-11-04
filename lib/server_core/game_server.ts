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
		playerId: number
	}[] = [];

	/**
	 * 发送和接收WebSocket信息，提交和处理后台游戏逻辑
	 * 
	 * @param ip WebSocket IP地址
	 * @param webSocketPort WebSocket端口号
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
			if (userId) {
				logger.info(`user ${userId} connected`);
			} else {
				logger.info(`anonymous user connected`);
			}

			let sessionId: string = req.sessionID;
			let pair = this._socketPlayerMap.filter(p => p.sessionId == sessionId)[0];
			if (pair) {
				// 如果已经连接，则断开原来的连接
				if (pair.socket.readyState == WebSocketServer.OPEN) {
					pair.socket.close();
					logger.warn(`player ${pair.playerId} origin disconnected`);
				}
				// 如果已经有用户登陆过且现在登录的不是原用户，则删除原来的用户绑定的玩家
				if (pair.userId && pair.userId != userId) {
					pair.playerId = null;
				}
				pair.userId = userId;
				pair.socket = socket;
			} else {
				// 添加新的连接
				this._socketPlayerMap.push({
					userId: userId,
					sessionId: sessionId,
					socket: socket,
					playerId: null
				});
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
			}
		});

		socket.on('error', () => {
			onSocketClose(socket);
		});
		socket.on('close', () => {
			onSocketClose(socket);
		});

		let onSocketClose = (socket: WebSocketServer) => {
			let pair = this._socketPlayerMap.filter(p => p.socket == socket)[0];
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

	private _initializeGameManager() {
		this._gameManager = new GameManager();
		this._gameManager.on(GameManager.events.sendToAllDirectly, (protocol: any) => {
			let json = JSON.stringify(protocol);
			this._socketPlayerMap.filter(p => p.playerId).forEach(p => {
				this._send(json, p.socket);
			});
		});

		this._gameManager.on(GameManager.events.gameStarted, () => {
			let json = new GameProtocols.InitializeMap(this._gameManager.getMap(), null);
			this._socketPlayerMap.filter(p => p.playerId).forEach(p => {
				json.playerId = p.playerId;
				this._send(JSON.stringify(json), p.socket);
			})
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
		let pair = this._socketPlayerMap.filter(p => p.socket == socket)[0];
		if (pair) {
			if (pair.playerId && protocol.resumeGame && this._gameManager.isPlayerOnGame(pair.playerId)) {
				logger.info(`player ${pair.playerId} resume game`);
			} else {
				let [id, newPlanetProtocols] = this._gameManager.addPlayer(protocol.name);
				pair.playerId = id;
				logger.info(`player ${pair.playerId} added in game`);

				if (this._gameManager.isGameStarted()) {
					let jsons = newPlanetProtocols.map(p => JSON.stringify(p));
					this._socketPlayerMap.filter(p => p.playerId && p.socket != socket).forEach((pair) => {
						jsons.forEach(json => {
							this._send(json, pair.socket);
						});
					});
				}
			}

			if (this._gameManager.isGameStarted()) {
				let json = new GameProtocols.InitializeMap(this._gameManager.getMap(), pair.playerId);
				this._send(JSON.stringify(json), socket);
			}
		}
	}

	private _onMovePlayerShips(protocol: GameProtocols.RequestMovingShips, socket: WebSocketServer) {
		let pair = this._socketPlayerMap.filter(p => p.playerId && p.socket == socket)[0];
		if (pair) {
			this._gameManager.movePlayerShips(pair.playerId, protocol.objectFromId, protocol.objectToId, protocol.countRatio);
		}
	}

	isPlayerOnGame(userId: string, sessionId: string): boolean {
		let pair = this._socketPlayerMap.filter(p => p.sessionId == sessionId)[0];
		if (pair) {
			let isOnGame = this._gameManager.isPlayerOnGame(pair.playerId);
			if (pair.userId) {
				return pair.userId == userId && isOnGame;
			} else {
				return isOnGame;
			}
		} else {
			return false;
		}
	}
}