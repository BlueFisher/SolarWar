import * as $ from 'jquery';

import * as HttpProtocols from '../shared/http_protocols';
import * as GameProtocols from '../shared/game_protocols';

import * as Utils from './utils';
import DomManager from './dom_manager';
import StageMediator from './stages/stage_mediator';

export default class GameManager {
	private _domManager: DomManager;
	private _stageMediator: StageMediator;

	/**游戏舞台 */
	constructor(webSocketConnect: () => void, webSocketSend: (protocol: GameProtocols.BaseProtocol) => void) {
		this._domManager = new DomManager(webSocketConnect);

		let [gameStageCanvas, gameMovingShipsStageCanvas, uiStageCanvas] = this._domManager.getCanvases();
		this._stageMediator = new StageMediator(gameStageCanvas, gameMovingShipsStageCanvas, uiStageCanvas, webSocketSend);

		$.getJSON('/websockets').then(data => {
			this._setWebSockets(data);
		});
	}

	private _setWebSockets(data: HttpProtocols.WebSocketResProtocol[]) {
		Utils.vueIndex.webSockets = data;
		Utils.vueIndex.activeWebSocket = Utils.vueIndex.webSockets[0];
		this._domManager.gameInit();
	}

	protocolReceived(protocol: GameProtocols.BaseProtocol) {
		switch (protocol.type) {
			case GameProtocols.Type.initializeMap:
				this._stageMediator.initializeMap(<GameProtocols.InitializeMap>protocol);
				this._domManager.gameOn();
				break;
			case GameProtocols.Type.gameOver:
				this._domManager.gameOver(<GameProtocols.GameOver>protocol);
				break;

			case GameProtocols.Type.startMovingShips:
				this._stageMediator.startMovingShipsQueue(<GameProtocols.StartMovingShips>protocol);
				break;
			case GameProtocols.Type.planet:
				this._stageMediator.changePlanet(<GameProtocols.Planet>protocol);
				break;
			case GameProtocols.Type.startOccupyingPlanet:
				let startOccupyingProtocol = <GameProtocols.StartOccupyingPlanet>protocol;
				startOccupyingProtocol.startDateTime = new Date(startOccupyingProtocol.startDateTime.toString());
				this._stageMediator.startOccupyingPlanet(startOccupyingProtocol);
				break;
			case GameProtocols.Type.readyTime:
				this._domManager.readyTimeElapse(<GameProtocols.ReadyTimeElapse>protocol);
		}
	}
}