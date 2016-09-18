import * as WebSocketServer from 'ws';
import GameManager from './game_models/game_manager';
import * as GameProtocols from './protocols/game_protocols';

interface SocketPlayerIdMap {
	socket: WebSocketServer,
	playerId: number
}

class GameServer {
	private _gameManager: GameManager;
	private _socketPlayerMap: SocketPlayerIdMap[] = [];

	constructor(webSocketPort: number) {
		let wss = new WebSocketServer.Server({
			port: webSocketPort
		});

		wss.on('connection', socket => {
			this._onWebSocketConnection(socket);
		});

		this._gameManager = new GameManager();
		this._gameManager.on('statusChange', (status: GameProtocols.GameStatusProtocol) => {
			this._socketPlayerMap.forEach(p => {
				if (p.socket != null) {
					p.socket.send(JSON.stringify(status));
				}
			})
		});
		this._gameManager.on('gameOver', (playerId: number) => {
			let protocol: GameProtocols.GameOverProtocol = {
				type: GameProtocols.GameProtocolType.gameOver
			}
			let socketPlayer = this._socketPlayerMap.filter(p => p.playerId == playerId)[0];
			if (socketPlayer != undefined) {
				socketPlayer.socket.send(JSON.stringify(protocol));
			}
		});
	}

	// addNewPlayerName(name: string): number {
	// 	let id = this._gameManager.addPlayer(name);
	// 	this._socketPlayerMap.push({
	// 		socket: null,
	// 		playerId: id
	// 	})
	// 	return id;
	// }

	private _onWebSocketConnection(socket: WebSocketServer) {
		this._socketPlayerMap.push({
			socket: socket,
			playerId: null
		});

		socket.on('message', message => {
			let protocol: GameProtocols.GameBaseProtocol = JSON.parse(message);
			switch (protocol.type) {
				case GameProtocols.GameProtocolType.requestAddPlayer:
					this._onRequestAddPlayer(<GameProtocols.RequestAddPlayerProtocol>protocol, socket);
					break;
				case GameProtocols.GameProtocolType.movingShips:
					this._onMovePlayerShips(<GameProtocols.MovingShips>protocol, socket);
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

	private _onRequestAddPlayer(protocol: GameProtocols.RequestAddPlayerProtocol, socket: WebSocketServer) {
		let socketPlayer = this._socketPlayerMap.filter(p => p.socket == socket)[0];
		if (socketPlayer != undefined) {
			let id = this._gameManager.addPlayer(protocol.name);
			socketPlayer.playerId = id;

			let responseProtocol: GameProtocols.ResponseAddPlayerProtocol = {
				type: GameProtocols.GameProtocolType.responseAddPlayer,
				id: id
			}
			socket.send(JSON.stringify(responseProtocol));
		}
	}
	private _onMovePlayerShips(protocol: GameProtocols.MovingShips, socket: WebSocketServer) {
		let socketPlayer = this._socketPlayerMap.filter(p => p.socket == socket)[0];
		if (socketPlayer != undefined) {
			this._gameManager.movePlayerShips(socketPlayer.playerId, protocol.planetFromId, protocol.planetToId, protocol.countRatio);
		}
	}

	getGameManager(): GameManager {
		return this._gameManager;
	}
}

export default GameServer;