import * as GameProtocols from '../protocols/game_protocols';
import DomManager from './dom_manager';
import GameStage from './game_stage';
import UiStage from './ui_stage';

class Main {
	private _vueUiData: VueUIData = {
		range: 100,
		gameTime: null,
		gameReadyTime: null,

		name: 'Default Player',
		historyMaxShipsCount: 0
	}

	private _domManager: DomManager;
	private _gameStage: GameStage;
	private _uiStage: UiStage;

	constructor() {
		this._domManager = new DomManager(this._vueUiData, (p) => {
			this._webSocketSend(p);
		});
		let [gameStageCanvas, uiStageCanvas] = this._domManager.getCanvas();

		this._gameStage = new GameStage(gameStageCanvas);
		this._uiStage = new UiStage(uiStageCanvas, this._vueUiData, this._gameStage, (p) => {
			this._webSocketSend(p);
		});

		$(window).on('resize', () => {
			this._gameStage.redrawStage();
		});

		this._connect(gameStageCanvas.getAttribute('data-ip'), parseInt(gameStageCanvas.getAttribute('data-port')));
	}

	private _ws: WebSocket;
	private _connect(ip: string, port: number) {
		this._ws = new WebSocket(`ws://${ip}:${port}`);
		toastr.info('正在连接服务器...');

		this._ws.onopen = () => {
			toastr.clear();
			toastr.success('服务器连接成功');
			this._domManager.gameInit();
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
				this._gameStage.initializeMap(<GameProtocols.InitializeMap>protocol);
				this._domManager.gameOn();
				break;
			case GameProtocols.Type.gameOver:
				this._domManager.gameOver(<GameProtocols.GameOver>protocol);
				break;

			case GameProtocols.Type.movingShipsQueue:
				this._gameStage.changeMovingShipsQueue(<GameProtocols.MovingShipsQueue>protocol);
				break;
			case GameProtocols.Type.planet:
				this._gameStage.changePlanet(<GameProtocols.Planet>protocol);
				break;
			case GameProtocols.Type.startOccupyingPlanet:
				let startOccupyingProtocol = <GameProtocols.StartOccupyingPlanet>protocol;
				startOccupyingProtocol.startDateTime = new Date(startOccupyingProtocol.startDateTime.toString());
				this._gameStage.startOccupyingPlanet(startOccupyingProtocol);
				break;
			case GameProtocols.Type.readyTime:
				this._domManager.readyTimeElapse(<GameProtocols.ReadyTimeElapse>protocol);
		}
	}
}

$(document).ready(() => {
	new Main();
});
