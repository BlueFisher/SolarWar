import * as HttpProtocols from '../shared/http_protocols';
import * as GameProtocols from '../shared/game_protocols';

interface VueIndex {
    ratio: number,
    gameTime: number,
    gameReadyTime: number,

    name: string,
    currShipsCount: number,
    maxShipsCount: number,
    historyMaxShipsCount: number,

    ranklist: GameProtocols.BasePlayer[],

    activeWebSocket: HttpProtocols.WebSocketResProtocol,
    webSockets: HttpProtocols.WebSocketResProtocol[]
}

export let vueIndex: VueIndex = {
    ratio: 100,
    gameTime: null,
    gameReadyTime: null,

    name: 'Default Player',
    currShipsCount: 0,
    maxShipsCount: 0,
    historyMaxShipsCount: 0,

    ranklist: [],

    activeWebSocket: null,
    webSockets: []
}
vueIndex