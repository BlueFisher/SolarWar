import * as HttpProtocols from '../shared/http_protocols';
import * as GameProtocols from '../shared/game_protocols';

interface VueIndex {
    ratio: number,
    gameTime: number,
    gameReadyTime: number,

    name: string,
    resumeGame: boolean,

    currShipsCount: number,
    maxShipsCount: number,
    historyMaxShipsCount: number,

    ranklist: GameProtocols.BasePlayer[],

    activeWebSocket: HttpProtocols.WebSocketResponse,
    webSockets: HttpProtocols.WebSocketResponse[]
}

export let vueIndex: VueIndex = {
    ratio: 100,
    gameTime: null,
    gameReadyTime: null,

    name: 'Default Player',
    resumeGame: true,

    currShipsCount: 0,
    maxShipsCount: 0,
    historyMaxShipsCount: 0,

    ranklist: [],

    activeWebSocket: null,
    webSockets: []
}
vueIndex