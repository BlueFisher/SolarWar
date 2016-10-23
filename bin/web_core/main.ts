import * as HttpProtocols from '../shared/http_protocols';
import * as GameProtocols from '../shared/game_protocols';
import * as Utils from './utils';
import DomManager from './dom_manager';
import GameStageManager from './game_stage_manager';
import UiStage from './ui_stage';

class Main {
	private _vueIndex: Utils.VueIndex = {
		range: 100,
		gameTime: null,
		gameReadyTime: null,

		name: 'Default Player',
		historyMaxShipsCount: 0,

		activeWebSocket: null,
		webSockets: []
	}

	private _domManager: DomManager;
	private _gameStageManager: GameStageManager;
	private _uiStage: UiStage;

	private _ws: WebSocket = null;

	constructor() {
		this._domManager = new DomManager(this._vueIndex, () => {
			this._connectWebSocket();
		});
		let [gameStageCanvas, gameMovingShipsCanvas, uiStageCanvas] = this._domManager.getCanvas();

		this._gameStageManager = new GameStageManager(gameStageCanvas, gameMovingShipsCanvas);
		this._uiStage = new UiStage(uiStageCanvas, this._vueIndex, this._gameStageManager, (p) => {
			this._webSocketSend(p);
		});

		$(window).on('resize', () => {
			this._gameStageManager.redrawStage();
		});

		$.getJSON('/websockets').then((data: HttpProtocols.WebSocketResProtocol[]) => {
			this._vueIndex.webSockets = data;
			this._vueIndex.activeWebSocket = this._vueIndex.webSockets[0];
			this._domManager.gameInit();
		});
	}

	private _connectWebSocket() {
		let url = `ws://${this._vueIndex.activeWebSocket.ip}:${this._vueIndex.activeWebSocket.port}/`;
		if (this._ws == null) {
			this._connect(url);
		} else if (this._ws.url != url) {
			this._ws.close();
			this._connect(url);
		} else {
			this._webSocketSend(new GameProtocols.RequestInitializeMap(this._vueIndex.name));
		}
	}
	private _connect(url: string) {
		this._ws = new WebSocket(url);
		toastr.info('正在连接服务器...');

		this._ws.onopen = () => {
			toastr.clear();
			toastr.success('服务器连接成功');
			this._webSocketSend(new GameProtocols.RequestInitializeMap(this._vueIndex.name));
		};

		this._ws.onmessage = (e) => {
			let protocol = JSON.parse(e.data);
			this._protocolReceived(protocol);
		};

		this._ws.onclose = this._ws.onerror = () => {
			toastr.error('服务器断开连接');
		};
	}

	private _webSocketSend(protocol: GameProtocols.BaseProtocol) {
		this._ws.send(JSON.stringify(protocol));
	}

	private _protocolReceived(protocol: GameProtocols.BaseProtocol) {
		switch (protocol.type) {
			case GameProtocols.Type.initializeMap:
				this._gameStageManager.initializeMap(<GameProtocols.InitializeMap>protocol);
				this._domManager.gameOn();
				break;
			case GameProtocols.Type.gameOver:
				this._domManager.gameOver(<GameProtocols.GameOver>protocol);
				break;

			case GameProtocols.Type.startMovingShips:
				this._gameStageManager.startMovingShipsQueue(<GameProtocols.StartMovingShips>protocol);
				break;
			case GameProtocols.Type.planet:
				this._gameStageManager.changePlanet(<GameProtocols.Planet>protocol);
				break;
			case GameProtocols.Type.startOccupyingPlanet:
				let startOccupyingProtocol = <GameProtocols.StartOccupyingPlanet>protocol;
				startOccupyingProtocol.startDateTime = new Date(startOccupyingProtocol.startDateTime.toString());
				this._gameStageManager.startOccupyingPlanet(startOccupyingProtocol);
				break;
			case GameProtocols.Type.readyTime:
				this._domManager.readyTimeElapse(<GameProtocols.ReadyTimeElapse>protocol);
		}
	}
}

$(document).ready(() => {
	new Main();
});
