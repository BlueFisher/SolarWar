import * as events from 'events';
import * as $ from 'jquery';
import * as GameProtocols from '../protocols/game_protocols';
import GameStage from './game_stage';
import UiStage from './ui_stage';

export default class StageManager extends events.EventEmitter {
	private _gameStage: GameStage;
	private _uiStage: UiStage;

	/**
	 * 舞台管理类
	 * @param gameStageCanvas 游戏舞台
	 * @param uiStageCanvas 用户界面舞台
	 * @param $countRatio 移动星球数量比例的元素
	 */
	constructor(gameStageCanvas: HTMLCanvasElement, uiStageCanvas: HTMLCanvasElement, $countRatio: JQuery) {
		super();

		this._gameStage = new GameStage(gameStageCanvas);
		this._uiStage = new UiStage(uiStageCanvas, $countRatio, this._gameStage);

		this._uiStage.on('protocolSend', protocol => {
			this.emit('protocolSend', protocol);
		});
	}

	redrawGameStage() {
		this._gameStage.redrawStage();
	}
	refreshCurrPlayerId(id: number) {
		this._gameStage.refreshCurrPlayerId(id);
	}
	stageChange(status: GameProtocols.GameStatusProtocol) {
		this._gameStage.stageChange(status);
	}
}