import * as $ from 'jquery';
import * as GameProtocols from '../protocols/game_protocols';
import GameStage from './game_stage';
import UiStage from './ui_stage';

export default class StageManager {
	private _gameStage: GameStage;
	private _uiStage: UiStage;

	private _sendProtocol: (protocol: GameProtocols.BaseProtocol) => void;

	/**
	 * 舞台管理类
	 * @param gameStageCanvas 游戏舞台
	 * @param uiStageCanvas 用户界面舞台
	 * @param $countRatio 移动星球数量比例的元素
	 */
	constructor(gameStageCanvas: HTMLCanvasElement, uiStageCanvas: HTMLCanvasElement, $countRatio: JQuery,
		sendProtocol: (protocol: GameProtocols.BaseProtocol) => void) {

		this._gameStage = new GameStage(gameStageCanvas);
		this._uiStage = new UiStage(uiStageCanvas, $countRatio, this._gameStage);
		this._sendProtocol = sendProtocol;

		this._uiStage.on('sendProtocol', protocol => {
			this._sendProtocol(protocol);
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
				this._gameStage.startOccupyingPlanet(<GameProtocols.StartOccupyingPlanet>protocol);
		}
	}

	private _onGameOver(protocol: GameProtocols.GameOver) {
		alert('Game Over');
	}
}