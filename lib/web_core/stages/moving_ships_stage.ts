import * as GameProtocols from '../../shared/game_protocols';
import config from '../../shared/config';

import StageMediator from './stage_mediator';

interface MovingShips extends GameProtocols.BaseMovingShips {
	objFrom?: GameProtocols.BaseSolarObject,
	objTo?: GameProtocols.BaseSolarObject,
	shipsPosition?: Point[],
	lastBorder?: number
}

export default class MovingShipsStage {
	private _canvas: HTMLCanvasElement;
	private _mediator: StageMediator;

	constructor(gameMovingShipsStageCanvas: HTMLCanvasElement, gameStageMediator: StageMediator) {
		this._canvas = gameMovingShipsStageCanvas;
		this._mediator = gameStageMediator;
	}

	dispose() {
		this._queue = [];
	}

	draw() {
		let objects = this._mediator.getSolarObjects();
		let players = this._mediator.players;
		let transformation = this._mediator.getTrans();
		let [minVisablePoint, maxVisablePoint] = this._mediator.getVisableRange();

		let ctx = this._canvas.getContext('2d');
		ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

		ctx.save();
		ctx.setTransform(transformation.scaling, 0, 0, transformation.scaling, transformation.horizontalMoving, transformation.verticalMoving);

		// 绘制飞船移动
		for (let movingShips of this._queue) {
			let objFrom = movingShips.objFrom;
			let objTo = movingShips.objTo;
			let x = objTo.position.x - movingShips.distanceLeft * (objTo.position.x - objFrom.position.x) / movingShips.distance;
			let y = objTo.position.y - movingShips.distanceLeft * (objTo.position.y - objFrom.position.y) / movingShips.distance;

			if (x < minVisablePoint.x
				|| x > maxVisablePoint.x
				|| y < minVisablePoint.y
				|| y > maxVisablePoint.y) {
				continue;
			}

			ctx.fillStyle = players.find(player => player.id == movingShips.playerId).color;

			if (!movingShips.shipsPosition) {
				movingShips.shipsPosition = [];
				for (let j = 0; j < Math.ceil(movingShips.count / 2); j++) {
					let newShip: Point;
					do {
						newShip = {
							x: (Math.random() - 0.5) * (objFrom.size),
							y: (Math.random() - 0.5) * (objFrom.size),
						}
					} while (Math.sqrt(newShip.x ** 2 + newShip.y ** 2) >= objFrom.size / 2);

					movingShips.shipsPosition.push(newShip);
				}
			} else {
				let currBorder = movingShips.distanceLeft / movingShips.distance * (objFrom.size - objTo.size) + objTo.size;
				let ratio = currBorder / movingShips.lastBorder;

				for (let j = 0; j < Math.ceil(movingShips.count / 2); j++) {
					let position = movingShips.shipsPosition[j];
					position.x *= ratio;
					position.y *= ratio;
				}
				movingShips.lastBorder = currBorder;
			}
			for (let shipPostion of movingShips.shipsPosition) {
				ctx.beginPath();
				ctx.arc(x + shipPostion.x, y + shipPostion.y, 1, 0, 2 * Math.PI);
				ctx.fill();
			}
		};
		ctx.restore();
	}

	private _queue: MovingShips[] = [];
	movingShips(queue: GameProtocols.BaseMovingShips[]) {
		if (queue.length == 0) {
			this._queue = [];
		} else {
			for (let i = 0; i < queue.length; i++) {
				if (!this._queue[i]) {
					let m: MovingShips = queue[i];
					m.objFrom = this._mediator.getSolarObjects().find(p => p.id == m.objectFromId);
					m.objTo = this._mediator.getSolarObjects().find(p => p.id == m.objectToId);
					m.lastBorder = m.objFrom.size;
					this._queue.push(m);
				} else if (this._queue[i].id < queue[i].id) {
					this._queue.splice(i, 1);
					i--;
				} else {
					this._queue[i].count = queue[i].count;
					this._queue[i].distance = queue[i].distance;
					this._queue[i].distanceLeft = queue[i].distanceLeft;
				}
			}
		}

		this.draw();
	}
}