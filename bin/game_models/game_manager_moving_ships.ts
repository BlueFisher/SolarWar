import Config from '../protocols/config';
import Player from './player';
import Planet from './planet';
import * as GameProtocols from '../protocols/game_protocols';

type funcEmit = (event: string, ...args: any[]) => void;

export default class MovingShipsManager {
	static events = {
		movingShipsQueueChanged: 'movingShipsQueueChanged',
	}

	private _movingShipsQueue: {
		planetFrom: Planet,
		planetTo: Planet,
		player: Player,
		count: number,
		distance: number,
		distanceLeft: number
	}[] = [];
	private _emit: funcEmit;

	constructor(emit: funcEmit) {
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
			this._movingShipsQueue.push({
				planetFrom: planetFrom,
				planetTo: planetTo,
				player: player,
				count: count,
				distance: distance,
				distanceLeft: distance
			});
			this._startMovingShips();
		}
	}

	getMovingShipsQueue(): GameProtocols.BaseMovingShips[] {
		return this._movingShipsQueue.map(elem => {
			return {
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

	private _isMovingShips = false;

	private _startMovingShips() {
		if (!this._isMovingShips) {
			this._moveShips();
		}
	}

	private _moveShips() {
		let canMoveShips = (): boolean => {
			if (this._movingShipsQueue.length == 0) {
				return this._isMovingShips = false;
			}
			return this._isMovingShips = true;
		};

		if (!canMoveShips())
			return;

		setTimeout(() => {
			if (!canMoveShips())
				return;

			for (let i in this._movingShipsQueue) {
				let movingShip = this._movingShipsQueue[i];
				let deltaDistance = Config.algorithm.getMovingShipsDeltaDistance(movingShip.count, movingShip.distance, movingShip.distanceLeft);

				// 如果已到目的星球，则调用shipsArrived，并从飞行队列中移除
				if ((movingShip.distanceLeft -= deltaDistance) <= 0) {
					movingShip.planetTo.shipsArrived(movingShip.player, movingShip.count);
					this._movingShipsQueue.splice(parseInt(i), 1);
				}
			}

			this._movingShipsQueueChange();
			this._moveShips();
		}, Config.algorithm.getMovingShipsInterval());
	}

	private _movingShipsQueueChange() {
		let protocol = new GameProtocols.MovingShipsQueue([], this.getMovingShipsQueue());
		this._emit(MovingShipsManager.events.movingShipsQueueChanged, protocol);
	}
}