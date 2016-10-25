import config from '../../shared/config';
import * as GameProtocols from '../../shared/game_protocols';

import GameManagerEvents from './game_manager_events';

import Player from './player';
import Planet from './planet';

export default class MovingShipsManager {
	private _emit: FuncEmit;

	private _movingShipsQueue: {
		id: number,
		planetFrom: Planet,
		planetTo: Planet,
		player: Player,
		count: number,
		distance: number,
		distanceLeft: number
	}[] = [];

	constructor(emit: FuncEmit) {
		this._emit = emit;
	}

	dispose() {
		this._movingShipsQueue = [];
	}

	movePlayerShips(player: Player, planetFrom: Planet, planetTo: Planet, countRatio: number) {
		if (planetFrom == planetTo) {
			return;
		}
		if (planetFrom == undefined || planetTo == undefined || player == undefined) {
			return;
		}
		if (countRatio > 1 || countRatio < 0) {
			return;
		}
		let count = planetFrom.shipsLeft(player, countRatio);
		if (count > 0) {
			// 计算连个星球之间距离，加入到飞行队列中，开始飞船移动计时器
			let distance = this._getTwoPlanetsDistance(planetFrom, planetTo);
			this._startMovingShips(player, planetFrom, planetTo, count, distance);
		}
	}

	getMovingShipsQueue(): GameProtocols.BaseMovingShips[] {
		return this._movingShipsQueue.map(elem => {
			return {
				id: elem.id,
				planetFromId: elem.planetFrom.id,
				planetToId: elem.planetTo.id,
				playerId: elem.player.id,
				count: elem.count,
				distance: elem.distance,
				distanceLeft: elem.distanceLeft
			}
		});
	}

	private _getTwoPlanetsDistance(planet1: Planet, planet2: Planet) {
		return Math.sqrt(Math.pow(planet1.position.x - planet2.position.x, 2) + Math.pow(planet1.position.y - planet2.position.y, 2)) - planet1.size / 2 - planet2.size / 2;
	}

	private _sendStartingMovingShips() {
		let protocol = new GameProtocols.MovingShips([], this.getMovingShipsQueue());
		this._emit(GameManagerEvents.sendToAllDirectly, protocol);
	}

	private _currMovingId = 0;
	private _getNextMovingId(): number {
		return ++this._currMovingId;
	}

	private _isMovingShips = false;

	private _canMoveShips(): boolean {
		if (this._movingShipsQueue.length == 0) {
			return false;
		}
		return true;
	}
	private _startMovingShips(player: Player, planetFrom: Planet, planetTo: Planet, count: number, distance: number) {
		this._movingShipsQueue.push({
			id: this._getNextMovingId(),
			player: player,
			planetFrom: planetFrom,
			planetTo: planetTo,
			count: count,
			distance: distance,
			distanceLeft: distance
		});

		if (!this._isMovingShips) {
			this._moveShips();
		}
	}

	private _moveShips() {
		if (!(this._isMovingShips = this._canMoveShips()))
			return;

		setTimeout(() => {
			for (let i = this._movingShipsQueue.length - 1; i >= 0; i--) {
				let movingShip = this._movingShipsQueue[i];
				let deltaDistance = config.gameAlgorithm.getMovingShipsDeltaDistance(movingShip.count, movingShip.distance, movingShip.distanceLeft);
				// 如果已到目的星球，则调用shipsArrived，并从飞行队列中移除
				if ((movingShip.distanceLeft -= deltaDistance) <= 0) {
					movingShip.planetTo.shipsArrived(movingShip.player, movingShip.count);
					this._movingShipsQueue.splice(i, 1);
					
				}
			}
			this._sendStartingMovingShips();
			this._moveShips();
		}, config.gameAlgorithm.getMovingShipsInterval());
	}
}