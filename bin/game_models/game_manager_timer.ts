import Config from '../protocols/config';
import * as GameProtocols from '../protocols/game_protocols';

import GameManagerEvents from './game_manager_events';

export default class TimeManager {
	private _emit: FuncEmit;

	private _gameReadyTime = Config.gameReadyTime;
	private _gameTime = Config.gameTime;

	constructor(emit: FuncEmit) {
		this._emit = emit;

		this._gameReadyTimeElapse();
	}

	isGameStarted(): boolean {
		return this._gameReadyTime == 0;
	}
	private _gameReadyTimeElapse() {

		this._gameReadyTime--;
		this._emit(GameManagerEvents.sendToAllDirectly, new GameProtocols.ReadyTimeElapse(this._gameReadyTime));

		if (this._gameReadyTime == 0) {
			this._gameTimeElapse();
			this._emit(GameManagerEvents.gameStarted);
			return;
		}

		setTimeout(() => {
			this._gameReadyTimeElapse();
		}, 1000);
	}

	private _gameTimeElapse() {
		this._gameTime--;
		this._emit(GameManagerEvents.sendToAllDirectly, new GameProtocols.TimeElapse(this._gameTime));

		if (this._gameTime == 0) {
			this._emit(GameManagerEvents.gameOver);
			return;
		}

		setTimeout(() => {
			this._gameTimeElapse();
		}, 1000);
	}
}