import config from '../../shared/config';
import * as GameProtocols from '../../shared/game_protocols';

import GameManager from './game_manager';

export default class TimeManager {
	private _emit: FuncEmit;

	private _gameReadyTime = config.gameReadyTime;
	private _gameTime = config.gameTime;

	constructor(emit: FuncEmit) {
		this._emit = emit;

		this._gameReadyTimeElapse();
	}

	isGameStarted(): boolean {
		return this._gameReadyTime == 0;
	}
	private _gameReadyTimeElapse() {

		this._gameReadyTime--;
		this._emit(GameManager.events.sendToAllDirectly, new GameProtocols.ReadyTimeElapse(this._gameReadyTime));

		if (this._gameReadyTime == 0) {
			this._gameTimeElapse();
			this._emit(GameManager.events.gameStarted);
			return;
		}

		setTimeout(() => {
			this._gameReadyTimeElapse();
		}, 1000);
	}

	private _gameTimeElapse() {
		this._gameTime--;
		this._emit(GameManager.events.sendToAllDirectly, new GameProtocols.TimeElapse(this._gameTime));

		if (this._gameTime == 0) {
			this._emit(GameManager.events.gameOver);
			return;
		}

		setTimeout(() => {
			this._gameTimeElapse();
		}, 1000);
	}
}