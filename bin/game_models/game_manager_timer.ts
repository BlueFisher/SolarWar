import Config from '../protocols/config';
import * as GameProtocols from '../protocols/game_protocols';

type funcEmit = (event: string, ...args: any[]) => void;

export default class TimeManager {
	static events = {
		gameReadyTimeChanged: 'gameReadyTimeChanged',
		gameStarted: 'gameStarted',
		gameTimeChanged: 'gameTimeChanged',
		gameOver: 'gameOver'
	}

	private _emit: funcEmit;

	private _gameReadyTime = Config.gameReadyTime;
	private _gameTime = Config.gameTime;

	constructor(emit: funcEmit) {
		this._emit = emit;

		this._gameReadyTimeElapse();
	}

	isGameStarted(): boolean {
		return this._gameReadyTime == 0;
	}
	private _gameReadyTimeElapse() {
		if (this._gameReadyTime == 1) {
			this._gameTimeElapse();
			this._emit(TimeManager.events.gameStarted);
			return;
		}
		this._gameReadyTime--;
		this._emit(TimeManager.events.gameReadyTimeChanged, new GameProtocols.ReadyTimeElapse(this._gameReadyTime));
		setTimeout(() => {
			this._gameReadyTimeElapse();
		}, 1000);
	}

	private _gameTimeElapse() {
		if (this._gameTime == 1) {
			this._emit(TimeManager.events.gameOver);
			return;
		}
		this._gameTime--;
		this._emit(TimeManager.events.gameTimeChanged, new GameProtocols.TimeElapse(this._gameTime));
		setTimeout(() => {
			this._gameTimeElapse();
		}, 1000);
	}
}