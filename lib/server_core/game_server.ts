import * as WebSocketServer from 'ws';
import * as express from 'express';
import { logger } from './log';
import GameManager from './game_models/game_manager';
import * as GameProtocols from '../shared/game_protocols';

export default class GameServer {
	ip: string;
	port: number;

	private _gameManager: GameManager;
	private _sessionParser: express.RequestHandler;
	/**用户Socket键值对 */
	private _socketPlayerMap: {
		sessionId: string,
		socket: WebSocketServer,
		playerId: number
	}[] = [];

	/**
	 * 发送和接收WebSocket信息，提交和处理后台游戏逻辑
	 * 
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
		this._sessionParser(<express.Request>socket.upgradeReq, <express.Response>{}, () => {
			let sessionId: string = (socket.upgradeReq as any).sessionID;
			let pair = this._socketPlayerMap.filter(p => p.sessionId == sessionId)[0];
			if (pair) {
				// 如果已经连接，则断开原来的连接
				if (pair.socket.readyState == WebSocketServer.OPEN) {
					pair.socket.close();
					logger.warn(`player ${pair.playerId} origin disconnected`);
				}
				pair.socket = socket;
			} else {
				// 否则添加新的连接
				this._socketPlayerMap.push({
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
					this._socketPlayerMap.filter(p => p.playerId && p.socket != socket).forEach(() => {
						jsons.forEach(json => {
							this._send(json, socket);
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
			this._gameManager.movePlayerShips(pair.playerId, protocol.planetFromId, protocol.planetToId, protocol.countRatio);
		}
	}

	isPlayerOnGame(sessionId: string): boolean {
		let pair = this._socketPlayerMap.filter(p => p.sessionId == sessionId)[0];
		return pair ? this._gameManager.isPlayerOnGame(pair.playerId) : false;
	}
}