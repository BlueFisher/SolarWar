import * as WebSocketServer from 'ws';
import GameManager from './game_models/game_manager';
import * as GameProtocols from './protocols/game_protocols';

interface SocketPlayerIdMap {
	socket: WebSocketServer,
	playerId: number
}

class GameServer {
	private _gameManager: GameManager;
	/**用户Socket键值对 */
	private _socketPlayerMap: SocketPlayerIdMap[] = [];

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

		this._gameManager = new GameManager();
		this._gameManager.on('statusChange', (status: GameProtocols.GameStatus) => {
			this._socketPlayerMap.forEach(p => {
				if (p.socket != null) {
					p.socket.send(JSON.stringify(status));
				}
			})
		});
		this._gameManager.on('gameOver', (playerId: number) => {
			let protocol: GameProtocols.GameOver = {
				type: GameProtocols.Type.gameOver
			}
			let socketPlayer = this._socketPlayerMap.filter(p => p.playerId == playerId)[0];
			if (socketPlayer != undefined) {
				socketPlayer.socket.send(JSON.stringify(protocol));
			}
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
				case GameProtocols.Type.requestAddingPlayer:
					this._onRequestAddPlayer(<GameProtocols.RequestAddingPlayer>protocol, socket);
					break;
				case GameProtocols.Type.moveShips:
					this._onMovePlayerShips(<GameProtocols.RequestMovingShips>protocol, socket);
					break;
			}
		});

		socket.on('error', () => {
			this._onSocketClose(socket);
		});
		socket.on('close', () => {
			this._onSocketClose(socket);
		})
	}

	private _onSocketClose(socket: WebSocketServer) {
		this._socketPlayerMap.forEach((elem, index) => {
			if (elem.socket == socket) {
				this._socketPlayerMap.splice(index, 1);
				return;
			}
		});
	}

	private _onRequestAddPlayer(protocol: GameProtocols.RequestAddingPlayer, socket: WebSocketServer) {
		let socketPlayer = this._socketPlayerMap.filter(p => p.socket == socket)[0];
		if (socketPlayer != undefined) {
			let id = this._gameManager.addPlayer(protocol.name);
			socketPlayer.playerId = id;

			let responseProtocol: GameProtocols.ResponseAddingPlayer = {
				type: GameProtocols.Type.responseAddingPlayer,
				id: id
			}
			socket.send(JSON.stringify(responseProtocol));
		}
	}
	private _onMovePlayerShips(protocol: GameProtocols.RequestMovingShips, socket: WebSocketServer) {
		let socketPlayer = this._socketPlayerMap.filter(p => p.socket == socket)[0];
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