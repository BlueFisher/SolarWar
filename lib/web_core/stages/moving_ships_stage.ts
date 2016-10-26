import * as GameProtocols from '../../shared/game_protocols';
import config from '../../shared/config';

import StageMediator from './stage_mediator';

interface MovingShips extends GameProtocols.BaseMovingShips {
	planetFrom?: GameProtocols.BasePlanet,
	planetTo?: GameProtocols.BasePlanet,
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

	draw() {
		let planets = this._mediator.getPlanets();
		let players = this._mediator.players;
		let transformation = this._mediator.transformation;

		let ctx = this._canvas.getContext('2d');
		ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

		ctx.save();
		ctx.setTransform(transformation.scaling, 0, 0, transformation.scaling, transformation.horizontalMoving, transformation.verticalMoving);

		// 绘制飞船移动
		this._queue.forEach(movingShips => {
			let planetFrom = movingShips.planetFrom;
			let planetTo = movingShips.planetTo;
			let x = planetTo.position.x - movingShips.distanceLeft * (planetTo.position.x - planetFrom.position.x) / movingShips.distance;
			let y = planetTo.position.y - movingShips.distanceLeft * (planetTo.position.y - planetFrom.position.y) / movingShips.distance;

			ctx.fillStyle = players.filter(player => player.id == movingShips.playerId)[0].color;

			if (!movingShips.shipsPosition) {
				movingShips.shipsPosition = [];
				for (let j = 0; j < Math.ceil(movingShips.count / 2); j++) {
					movingShips.shipsPosition.push({
						x: (Math.random() - 0.5) * (planetFrom.size - 10),
						y: (Math.random() - 0.5) * (planetFrom.size - 10),
					});
				}
			} else {
				let currBorder = movingShips.distanceLeft / movingShips.distance * (planetFrom.size - planetTo.size) + planetTo.size;
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
		});
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
					m.planetFrom = this._mediator.getPlanets().filter(p => p.id == m.planetFromId)[0];
					m.planetTo = this._mediator.getPlanets().filter(p => p.id == m.planetToId)[0];
					m.lastBorder = m.planetFrom.size;
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