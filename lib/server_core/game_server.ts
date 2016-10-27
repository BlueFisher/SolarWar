import * as WebSocketServer from 'ws';
import * as express from 'express';
import GameManager from './game_models/game_manager';
import * as GameProtocols from '../shared/game_protocols';
import GameManagerEvents from './game_models//game_manager_events';

interface SocketPlayerMap {
	sessionId: number,
	socket: WebSocketServer,
	playerId: number
}

export default class GameServer {
	private _gameManager: GameManager;
	private _sessionParser: express.RequestHandler;
	/**用户Socket键值对 */
	private _socketPlayerMap: SocketPlayerMap[] = [];

	/**
	 * 发送和接收WebSocket信息，提交和处理后台游戏逻辑
	 * 
	 * @param webSocketPort WebSocket端口号
	 * @param callback 监听成功回调函数
	 */
	constructor(webSocketPort: number, sessionParser: express.RequestHandler, callback?: () => void) {
		let wss = new WebSocketServer.Server({
			port: webSocketPort
		}, () => {
			if (callback) callback();
		});

		wss.on('connection', socket => {
			this._onWebSocketConnection(socket);
		});

		this._sessionParser = sessionParser;

		this._initializeGameManager();
	}

	private _initializeGameManager() {
		this._gameManager = new GameManager();
		this._gameManager.on(GameManagerEvents.sendToAllDirectly, (protocol: any) => {
			let json = JSON.stringify(protocol);
			this._socketPlayerMap.filter(p => p.playerId).forEach(p => {
				this._send(json, p.socket);
			});
		});

		this._gameManager.on(GameManagerEvents.gameStarted, () => {
			let json = new GameProtocols.InitializeMap(this._gameManager.getMap(), null);
			this._socketPlayerMap.filter(p => p.playerId != null).forEach(p => {
				json.playerId = p.playerId;
				this._send(JSON.stringify(json), p.socket);
			})
		});

		this._gameManager.on(GameManagerEvents.gameOver, (playerId: number) => {
			let socketPlayerMap = this._socketPlayerMap;
			if (playerId) {
				socketPlayerMap = this._socketPlayerMap.filter(p => p.playerId == playerId);
			}
			socketPlayerMap.forEach(pair => {
				if (pair.playerId != null) {
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

	private _onWebSocketConnection(socket: WebSocketServer) {
		this._sessionParser(<express.Request>socket.upgradeReq, <express.Response>{}, () => {
			let sessionId: number = (socket.upgradeReq as any).sessionID;
			let socketPlayer = this._socketPlayerMap.filter(p => p.sessionId == sessionId)[0];
			if (socketPlayer) {
				socketPlayer.socket.close();
				socketPlayer.socket = socket;
			} else {
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
			this._onSocketClose(socket);
		});
		socket.on('close', () => {
			this._onSocketClose(socket);
		});
	}

	private _onSocketClose(socket: WebSocketServer) {
		let socketPlayer = this._socketPlayerMap.filter(p => p.socket == socket)[0];
		if (socketPlayer) {
			console.warn(`${socketPlayer.sessionId} ${socketPlayer.playerId} disconnected`);
		}
	}

	private _send(msg: string, socket: WebSocketServer) {
		if (socket.readyState == WebSocketServer.OPEN) {
			socket.send(msg);
		}
	}

	private _onInitializeMap(protocol: GameProtocols.RequestInitializeMap, socket: WebSocketServer) {
		let socketPlayer = this._socketPlayerMap.filter(p => p.socket == socket)[0];
		if (socketPlayer) {
			if (socketPlayer.playerId && protocol.resumeGame && this._gameManager.isPlayerOnGame(socketPlayer.playerId)) {

			} else {
				let [id, newPlanetProtocols] = this._gameManager.addPlayer(protocol.name);
				socketPlayer.playerId = id;

				if (this._gameManager.isGameStarted()) {
					let jsons = newPlanetProtocols.map(p => JSON.stringify(p));
					this._socketPlayerMap.filter(p => p.playerId && p.socket != socket).forEach(sp => {
						jsons.forEach(json => {
							this._send(json, socket);
						});
					});
				}
			}

			if (this._gameManager.isGameStarted()) {
				let json = new GameProtocols.InitializeMap(this._gameManager.getMap(), socketPlayer.playerId);
				this._send(JSON.stringify(json), socket);
			}
		}
	}
	private _onMovePlayerShips(protocol: GameProtocols.RequestMovingShips, socket: WebSocketServer) {
		let socketPlayer = this._socketPlayerMap.filter(p => p.playerId != null).filter(p => p.socket == socket)[0];
		if (socketPlayer) {
			this._gameManager.movePlayerShips(socketPlayer.playerId, protocol.planetFromId, protocol.planetToId, protocol.countRatio);
		}
	}
}