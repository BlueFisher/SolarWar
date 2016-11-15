import * as HttpProtocols from '../shared/http_protocols';
import * as GameProtocols from '../shared/game_protocols';


let availableProps: GameProtocols.SolarObjectType[] = [];
let addingProp: GameProtocols.SolarObjectType = null;
let ranklist: GameProtocols.BasePlayer[] = [];

export let index = {
	ratio: 100,
	props: availableProps,
	addingProp: addingProp,
	gameTime: null,

	currShipsCount: 0,
	maxShipsCount: 0,

	ranklist: ranklist,
}

let user: {
	_id?: string,
	email: string
} = null;
let activeWebSocket: HttpProtocols.WebSocketResponse = null;
let webSockets: HttpProtocols.WebSocketResponse[] = [];

export let indexCommon = {
	name: 'Default Player',
	activeWebSocket: activeWebSocket,
	webSockets: webSockets,
	user: user
}

export let gameInitModal = {
	common: indexCommon,
	resumeGame: true,
	email: '',
	password: '',
	showAccount: false,
}

export let gameOverModal = {
	common: indexCommon,
	historyMaxShipsCount: 0
}

export let gameReadyModal = {
	gameReadyTime: null
}