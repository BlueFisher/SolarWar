import config from '../../shared/config';
import * as GameProtocols from '../../shared/game_protocols';

import GameManager from './game_manager';
import { SolarObject } from './solar_object';
import Player from './player';
import Planet from './planet';

export class AI {
	private _gameManager: GameManager;
	private _players: Player[];
	private _solarObjects: SolarObject[];
	private _id: number;

	constructor(gameManager: GameManager, players: Player[], solarObjects: SolarObject[]) {
		this._gameManager = gameManager;
		this._players = players;
		this._solarObjects = solarObjects;
		this._id = this._gameManager.addPlayer('AI TEST');

		setInterval(() => {
			if (this._gameManager.isGameStarted()) {
				let a = this._solarObjects.filter(p => p.occupiedPlayer && p.occupiedPlayer.id == this._id);
				if (a.length) {
					this._gameManager.movePlayerShips(this._id, a[Math.floor(Math.random() * a.length)].id, this._solarObjects[Math.floor(Math.random() * this._solarObjects.length)].id, 1);
				}
			}
		}, 5000);
	}
}