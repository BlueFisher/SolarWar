import config from '../../../shared/config';
import * as GameProtocols from '../../../shared/game_protocols';

import GameManager from '../game_manager';
import { BaseGameManagerTool, FuncEmit } from './base_game_manager_tool';

import { SolarObject } from '../solar_object';
import Player from '../player';
import Portal from '../portal';
import Planet from '../planet';

export default class MovingShipsManager extends BaseGameManagerTool {
	private _movingShipsQueue: {
		id: number,
		objFrom: SolarObject,
		objTo: SolarObject,
		player: Player,
		count: number,
		distance: number,
		distanceLeft: number
	}[] = [];

	dispose() {
		this._movingShipsQueue = [];
	}

	private _getTwoSolarObjectsDistance(obj1: SolarObject, obj2: SolarObject) {
		return Math.sqrt((obj1.position.x - obj2.position.x) ** 2 + (obj1.position.y - obj2.position.y) ** 2) - obj1.size / 2 - obj2.size / 2;
	}

	private _sendStartingMovingShips() {
		let protocol = new GameProtocols.MovingShips([], this.getMovingShipsQueue());
		this._emit(GameManager.events.sendToAllDirectly, protocol);
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
	private _startMovingShips(player: Player, objFrom: SolarObject, objTo: SolarObject, count: number, distance: number) {
		this._movingShipsQueue.push({
			id: this._getNextMovingId(),
			player: player,
			objFrom: objFrom,
			objTo: objTo,
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
				let deltaDistance = config.algorithm.getMovingShipsDeltaDistance(movingShip.count, movingShip.distance, movingShip.distanceLeft);
				// 如果已到目的星球，则调用shipsArrived，并从飞行队列中移除
				if ((movingShip.distanceLeft -= deltaDistance) <= 0) {
					movingShip.objTo.shipsArrived(movingShip.player, movingShip.count);
					this._movingShipsQueue.splice(i, 1);
				}
			}
			this._sendStartingMovingShips();
			this._moveShips();
		}, config.algorithm.getMovingShipsInterval());
	}

	movePlayerShips(player: Player, objFrom: SolarObject, objTo: SolarObject, countRatio: number) {
		if (objFrom == objTo) {
			return;
		}
		if (!objFrom || !objTo || !player) {
			return;
		}
		if (countRatio > 1 || countRatio < 0) {
			return;
		}
		let count = objFrom.shipsLeft(player, countRatio);
		if (count > 0) {
			// 如果出发星球为传送门且传送门被当前玩家占领，则立即传送
			if (objFrom instanceof Portal && objFrom.occupiedPlayer == player) {
				objTo.shipsArrived(player, count);
			} else {
				// 计算两个星球之间距离，加入到飞行队列中，开始飞船移动计时器
				let distance = this._getTwoSolarObjectsDistance(objFrom, objTo);
				this._startMovingShips(player, objFrom, objTo, count, distance);
			}
		}
	}

	getMovingShipsQueue(): GameProtocols.BaseMovingShips[] {
		return this._movingShipsQueue.map(elem => {
			return {
				id: elem.id,
				objectFromId: elem.objFrom.id,
				objectToId: elem.objTo.id,
				playerId: elem.player.id,
				count: elem.count,
				distance: elem.distance,
				distanceLeft: elem.distanceLeft
			}
		});
	}
}