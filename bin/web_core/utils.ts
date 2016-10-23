import * as HttpProtocols from '../shared/http_protocols';

export interface VueIndex {
	range: number,
	gameTime: number,
	gameReadyTime: number,

	name: string,
	historyMaxShipsCount: number,
	activeWebSocket: HttpProtocols.WebSocketResProtocol,
	webSockets: HttpProtocols.WebSocketResProtocol[]
}

export interface Transformation {
	scaling: number,
	horizontalMoving: number,
	verticalMoving: number
}