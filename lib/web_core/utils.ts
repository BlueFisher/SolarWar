import * as HttpProtocols from '../shared/http_protocols';

export let vueIndex = {
    ratio: 100,
    gameTime: null,
    gameReadyTime: null,

    name: 'Default Player',
    currShipsCount: 0,
    maxShipsCount: 0,
    historyMaxShipsCount: 0,

    activeWebSocket: null,
    webSockets: []
}