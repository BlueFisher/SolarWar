import * as HttpProtocols from '../shared/http_protocols';
import * as GameProtocols from '../shared/game_protocols';

let activeWebSocket: HttpProtocols.WebSocketResponse = null;
let webSockets: HttpProtocols.WebSocketResponse[] = [];

export let vueIndex = {
	ratio: 100,
	gameTime: null,

	currShipsCount: 0,
	maxShipsCount: 0,

	ranklist: [],
}

let user: {
	_id?: string,
	email: string
} = null;

export let vueIndexCommon = {
	name: 'Default Player',
	activeWebSocket: activeWebSocket,
	webSockets: webSockets,
	user: user
}

export let vueGameInitModal = {
	common: vueIndexCommon,
	resumeGame: true,
	email: '',
	password: '',
	showAccount: false,
}

export let vueGameOverModal = {
	common: vueIndexCommon,
	historyMaxShipsCount: 0
}

export let vueGameReadyModal = {
	gameReadyTime: null
}