import * as GameProtocols from '../../shared/game_protocols';
import config from '../../shared/config';

import StageMediator from './stage_mediator';

export default class MovingShipsStage {
	private _canvas: HTMLCanvasElement;
	private _mediator: StageMediator;

	constructor(gameMovingShipsStageCanvas: HTMLCanvasElement, gameStageMediator: StageMediator) {
		this._canvas = gameMovingShipsStageCanvas;
		this._mediator = gameStageMediator;
	}

	getCanvas(): HTMLCanvasElement {
		return this._canvas;
	}

	draw() {
		let map = this._mediator.map;
		let transformation = this._mediator.transformation;

		let ctx = this._canvas.getContext('2d');
		ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

		ctx.save();
		ctx.setTransform(transformation.scaling, 0, 0, transformation.scaling, transformation.horizontalMoving, transformation.verticalMoving);

		// 绘制飞船移动
		ctx.font = '14px Arial,Microsoft YaHei';
		map.movingShipsQueue.forEach(movingShips => {
			let planetFrom = map.planets.filter(p => p.id == movingShips.planetFromId)[0];
			let planetTo = map.planets.filter(p => p.id == movingShips.planetToId)[0];
			let x = planetTo.position.x - movingShips.distanceLeft * (planetTo.position.x - planetFrom.position.x) / movingShips.distance;
			let y = planetTo.position.y - movingShips.distanceLeft * (planetTo.position.y - planetFrom.position.y) / movingShips.distance;

			ctx.fillStyle = map.players.filter(player => player.id == movingShips.playerId)[0].color;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(movingShips.count.toString(), x, y);

		});
		ctx.restore();
	}

	private _timer: NodeJS.Timer;
	startMovingShips(protocol: GameProtocols.StartMovingShips) {
		let queue = this._mediator.map.movingShipsQueue = protocol.queue;
		clearInterval(this._timer);
		if (protocol.queue.length == 0) {
			return;
		}

		this._timer = setInterval(() => {
			for (let i in queue) {
				let movingShip = queue[i];
				let deltaDistance = config.gameAlgorithm.getMovingShipsDeltaDistance(movingShip.count, movingShip.distance, movingShip.distanceLeft);

				if ((movingShip.distanceLeft -= deltaDistance) <= 0) {
					queue.splice(parseInt(i), 1);
				}
			}
			this.draw();
		}, config.gameAlgorithm.getMovingShipsInterval());
	}
}