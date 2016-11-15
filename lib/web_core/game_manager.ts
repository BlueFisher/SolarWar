import * as $ from 'jquery';

import * as HttpProtocols from '../shared/http_protocols';
import * as GameProtocols from '../shared/game_protocols';

import * as vueData from './vueData';
import DomManager from './dom_manager';
import StageMediator from './stages/stage_mediator';

export default class GameManager {
	private _domManager: DomManager;
	private _stageMediator: StageMediator;

	/**游戏舞台 */
	constructor(webSocketConnect: () => void, webSocketSend: (protocol: GameProtocols.BaseProtocol) => void) {
		this._domManager = new DomManager(webSocketConnect);

		this._stageMediator = new StageMediator(this._domManager.getMovingStageContainer(), this._domManager.getCanvases(), webSocketSend);
	}

	protocolReceived(protocol: GameProtocols.BaseProtocol) {
		switch (protocol.type) {
			case GameProtocols.Type.initializeMap:
				this._stageMediator.initializeMap(<GameProtocols.InitializeMap>protocol);
				this._domManager.gameOn();
				break;
			case GameProtocols.Type.gameOver:
				this._domManager.gameOver(<GameProtocols.GameOver>protocol);
				this._stageMediator.gameOver();
				break;

			case GameProtocols.Type.movingShips:
				this._stageMediator.movingShipsQueue(<GameProtocols.MovingShips>protocol);
				break;
			case GameProtocols.Type.solarObjectChanged:
				this._stageMediator.changeSolarObject(<GameProtocols.ChangedSolarObject>protocol);
				break;
			case GameProtocols.Type.startOccupyingSolarObject:
				let startOccupyingProtocol = <GameProtocols.StartOccupyingSolarObject>protocol;
				startOccupyingProtocol.startDateTime = new Date(startOccupyingProtocol.startDateTime.toString());
				this._stageMediator.startOccupyingSolarObject(startOccupyingProtocol);
				break;
			case GameProtocols.Type.canAddProp:
				this._stageMediator.canAddProp(<GameProtocols.CanAddProp>protocol)
			case GameProtocols.Type.readyTime:
				this._domManager.readyTimeElapse(<GameProtocols.ReadyTimeElapse>protocol);
				break;
			case GameProtocols.Type.time:
				this._domManager.timeElapse(<GameProtocols.TimeElapse>protocol);
				break;
		}
	}
}