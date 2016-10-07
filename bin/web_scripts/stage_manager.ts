import * as events from 'events';
import * as GameProtocols from '../protocols/game_protocols';
import GameStage from './game_stage';
import UiStage from './ui_stage';

export default class StageManager extends events.EventEmitter {
	static events = {
		sendProtocol: 'sendProtocol',
		gameOver: 'gameOvers',
	};

	private _gameStage: GameStage;
	private _uiStage: UiStage;

	/**
	 * 舞台管理类
	 * @param gameStageCanvas 游戏舞台
	 * @param uiStageCanvas 用户界面舞台
	 * @param $countRatio 移动星球数量比例的元素
	 * @param sendProtocol 发送协议的回调函数
	 */
	constructor(gameStageCanvas: HTMLCanvasElement, uiStageCanvas: HTMLCanvasElement, $countRatio: JQuery) {
		super();

		this._gameStage = new GameStage(gameStageCanvas);
		this._uiStage = new UiStage(uiStageCanvas, $countRatio, this._gameStage, (protocol) => {
			this.emit(StageManager.events.sendProtocol, protocol);
		});
	}

	redrawGameStage() {
		this._gameStage.redrawStage();
	}

	protocolReceived(protocol: GameProtocols.BaseProtocol) {
		switch (protocol.type) {
			case GameProtocols.Type.initializeMap:
				this._gameStage.initializeMap(<GameProtocols.InitializeMap>protocol);
				break;
			case GameProtocols.Type.gameOver:
				this._onGameOver(<GameProtocols.GameOver>protocol);
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
		}
	}

	private _onGameOver(protocol: GameProtocols.GameOver) {
		this.emit(StageManager.events.gameOver, protocol);
	}
}