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
	}

	addNewPlayerName(name: string): number {
		let id = this._gameManager.addPlayer(name);
		this._socketPlayerMap.push({
			socket: null,
			playerId: id
		})
		return id;
	}

	private _onWebSocketConnection(socket: WebSocketServer) {
		socket.on('message', message => {
			let protocol: GameProtocols.GameBaseProtocol = JSON.parse(message);
			switch (protocol.type) {
				case GameProtocols.GameProtocolType.newPlayerConnected:
					this._onNewPlayerConnected(<GameProtocols.NewPlayerConnectedProtocol>protocol, socket);
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
		for (let i in this._socketPlayerMap) {
			if (this._socketPlayerMap[i].socket == socket) {
				this._socketPlayerMap.splice(parseInt(i), 1);
				break;
			}
		}
	}

	private _onNewPlayerConnected(protocol: GameProtocols.NewPlayerConnectedProtocol, socket: WebSocketServer) {
		let socketPlayer = this._socketPlayerMap.filter(p => p.playerId == protocol.id)[0];
		if (socketPlayer != undefined) {
			socketPlayer.socket = socket;
			this._gameManager.requestImmediateStatus();
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