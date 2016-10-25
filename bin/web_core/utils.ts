import * as HttpProtocols from '../shared/http_protocols';

interface VueIndex {
    ratio: number,
    gameTime: number,
    gameReadyTime: number,

    name: string,
    historyMaxShipsCount: number,
    activeWebSocket: HttpProtocols.WebSocketResProtocol,
    webSockets: HttpProtocols.WebSocketResProtocol[]
}
export let vueIndex: VueIndex = {
    ratio: 100,
    gameTime: null,
    gameReadyTime: null,

    name: 'Default Player',
    historyMaxShipsCount: 0,

    activeWebSocket: null,
    webSockets: []
}