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

		this._stageMediator = new StageMediator(this._domManager.getCanvases(), this._domManager.getBackgrounds(), webSocketSend);
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

			case GameProtocols.Type.movingShips:
				this._stageMediator.movingShipsQueue(<GameProtocols.MovingShips>protocol);
				break;
			case GameProtocols.Type.planetChanged:
				this._stageMediator.changePlanet(<GameProtocols.ChangedPlanet>protocol);
				break;
			case GameProtocols.Type.startOccupyingPlanet:
				let startOccupyingProtocol = <GameProtocols.StartOccupyingPlanet>protocol;
				startOccupyingProtocol.startDateTime = new Date(startOccupyingProtocol.startDateTime.toString());
				this._stageMediator.startOccupyingPlanet(startOccupyingProtocol);
				break;
			case GameProtocols.Type.readyTime:
				this._domManager.readyTimeElapse(<GameProtocols.ReadyTimeElapse>protocol);
				break;
			case GameProtocols.Type.time:
				this._domManager.timeElapse(<GameProtocols.TimeElapse>protocol);
				break;
		}
	}
}