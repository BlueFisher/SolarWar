import config from '../../shared/config';
import * as GameProtocols from '../../shared/game_protocols';

import GameManager from './game_manager';
import { SolarObject } from './solar_object';
import Player from './player';
import Planet from './planet';

export class AI {
	private static _aiId = 1;

	private _gameManager: GameManager;
	private _players: Player[];
	private _solarObjects: SolarObject[];

	constructor(gameManager: GameManager, players: Player[], solarObjects: SolarObject[]) {
		this._gameManager = gameManager;
		this._players = players;
		this._solarObjects = solarObjects;
		let id = this._gameManager.addPlayer(`AI ${AI._aiId++}`);
		let currPlayer = this._players.find(p => p.id == id);

		let timer = setInterval(() => {
			if (currPlayer.isGameOver) {
				clearInterval(timer);
				return;
			}
			if (this._gameManager.isGameStarted()) {
				let a = this._solarObjects.filter(p => p.occupiedPlayer && p.occupiedPlayer.id == currPlayer.id);
				if (a.length) {
					this._gameManager.movePlayerShips(currPlayer.id, a[Math.floor(Math.random() * a.length)].id, this._solarObjects[Math.floor(Math.random() * this._solarObjects.length)].id, 1);
				}
			}
		}, 5000);
	}
}