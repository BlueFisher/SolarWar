import * as HttpProtocols from './http_protocols';

export interface Index {
	range: number,
	gameTime: number,
	gameReadyTime: number,

	name: string,
	historyMaxShipsCount: number,
	activeWebSocket: HttpProtocols.WebSocketResProtocol,
	webSockets: HttpProtocols.WebSocketResProtocol[]
}