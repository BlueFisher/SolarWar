import * as WebSocketServer from 'ws';
import GameManager from './game_models/game_manager';
import * as GameProtocols from './protocols/game_protocols';
interface SocketPlayerMap {
	socket: WebSocketServer,
	playerId: number
}
class GameServer {
	private _gameManager: GameManager;
	/**用户Socket键值对 */
	private _socketPlayerMap: SocketPlayerMap[] = [];

	/**
	 * 发送和接收WebSocket信息，提交和处理后台游戏逻辑
	 * 
	 * @param webSocketPort WebSocket端口号
	 * @param callback 监听成功回调函数
	 */
	constructor(webSocketPort: number, callback?: () => void) {
		let wss = new WebSocketServer.Server({
			port: webSocketPort
		}, () => {
			if (callback != null) callback();
		});

		wss.on('connection', socket => {
			this._onWebSocketConnection(socket);
		});

		this._initializeGameManager();
	}

	private _initializeGameManager() {
		this._gameManager = new GameManager();
		this._gameManager.on(GameManager.events.planetChanged, (planetProtocol: GameProtocols.Planet) => {
			let json = JSON.stringify(planetProtocol);
			this._socketPlayerMap.filter(p => p.playerId != null).forEach(p => {
				p.socket.send(json);
			});
		});
		this._gameManager.on(GameManager.events.movingShipsQueueChanged, (movingShipsQueueProtocol: GameProtocols.MovingShipsQueue) => {
			let json = JSON.stringify(movingShipsQueueProtocol);
			this._socketPlayerMap.filter(p => p.playerId != null).forEach(p => {
				p.socket.send(json);
			});
		});
		this._gameManager.on(GameManager.events.gameOver, (playerId: number) => {
			let socketPlayerMap = this._socketPlayerMap;
			if (playerId) {
				socketPlayerMap = this._socketPlayerMap.filter(p => p.playerId == playerId);
			}
			socketPlayerMap.forEach(pair => {
				if (pair.playerId != null) {
					let historyMaxShipsCount = this._gameManager.getPlayerHistoryMaxShipsCount(pair.playerId);
					let json = JSON.stringify(new GameProtocols.GameOver(historyMaxShipsCount));
					pair.socket.send(json);
				}
			});

			if (!playerId) {
				this._socketPlayerMap.forEach(pair => {
					pair.playerId = null;
				})
				this._initializeGameManager();
			}
		});

		this._gameManager.on(GameManager.events.gameReadyTimeChanged, (gameTimeProtocol: GameProtocols.ReadyTime) => {
			let json = JSON.stringify(gameTimeProtocol);
			this._socketPlayerMap.forEach(p => {
				p.socket.send(json)
			});
		});

		this._gameManager.on(GameManager.events.gameStarted, () => {
			let json = new GameProtocols.InitializeMap(this._gameManager.getMap(), null);
			this._socketPlayerMap.filter(p => p.playerId != null).forEach(p => {
				json.playerId = p.playerId;
				p.socket.send(JSON.stringify(json));
			})
		});

		this._gameManager.on(GameManager.events.gameTimeChanged, (gameTimeProtocol: GameProtocols.Time) => {
			let json = JSON.stringify(gameTimeProtocol);
			this._socketPlayerMap.forEach(p => {
				p.socket.send(json);
			});
		});
	}

	private _onWebSocketConnection(socket: WebSocketServer) {
		this._socketPlayerMap.push({
			socket: socket,
			playerId: null
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
		this._socketPlayerMap.forEach((elem, index) => {
			if (elem.socket == socket) {
				this._socketPlayerMap.splice(index, 1);
				return;
			}
		});
	}

	private _onInitializeMap(protocol: GameProtocols.RequestInitializeMap, socket: WebSocketServer) {
		let socketPlayer = this._socketPlayerMap.filter(p => p.socket == socket)[0];
		if (socketPlayer != undefined) {
			let [id, newPlanetProtocols] = this._gameManager.addPlayer(protocol.name);
			socketPlayer.playerId = id;

			if (this._gameManager.isGameStarted()) {
				let json = new GameProtocols.InitializeMap(this._gameManager.getMap(), id);
				socket.send(JSON.stringify(json));

				let jsons = newPlanetProtocols.map(p => JSON.stringify(p));
				this._socketPlayerMap.filter(p => p.playerId != null).forEach(sp => {
					if (sp.socket != socket) {
						jsons.forEach(json => {
							sp.socket.send(json);
						});
					}
				});
			}
		}
	}
	private _onMovePlayerShips(protocol: GameProtocols.RequestMovingShips, socket: WebSocketServer) {
		let socketPlayer = this._socketPlayerMap.filter(p => p.playerId != null).filter(p => p.socket == socket)[0];
		if (socketPlayer != undefined) {
			this._gameManager.movePlayerShips(socketPlayer.playerId, protocol.planetFromId, protocol.planetToId, protocol.countRatio);
		}
	}

	/**获取游戏逻辑管理实例 */
	getGameManager(): GameManager {
		return this._gameManager;
	}
}

export default GameServer;