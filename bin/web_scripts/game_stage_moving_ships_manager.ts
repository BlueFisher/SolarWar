import * as GameProtocols from '../protocols/game_protocols';
import Config from '../protocols/config';

export default class MovingShipsManager {
	private _map: GameProtocols.Map;
	private _redrawStage: () => void;
	constructor(redrawStage: () => void) {
		this._redrawStage = redrawStage;
	}

	draw(ctx: CanvasRenderingContext2D, map: GameProtocols.Map) {
		this._map = map;

		// 绘制飞船移动
		ctx.save();
		ctx.font = '14px Arial,Microsoft YaHei';
		map.movingShipsQueue.forEach(movingShips => {
			let planetFrom = map.planets.filter(p => p.id == movingShips.planetFromId)[0];
			let planetTo = map.planets.filter(p => p.id == movingShips.planetToId)[0];
			let x = planetTo.position.x - movingShips.distanceLeft * (planetTo.position.x - planetFrom.position.x) / movingShips.distance;
			let y = planetTo.position.y - movingShips.distanceLeft * (planetTo.position.y - planetFrom.position.y) / movingShips.distance;

			ctx.fillStyle = map.players.filter(player => player.id == movingShips.playerId)[0].color;
			ctx.fillText(movingShips.count.toString(), x, y);
		});
		ctx.restore();
	}

	private _timer: NodeJS.Timer;
	startMovingShips(protocol: GameProtocols.StartMovingShips) {
		let queue = this._map.movingShipsQueue = protocol.queue;
		clearInterval(this._timer);
		if (protocol.queue.length == 0) {
			return;
		}

		this._timer = setInterval(() => {
			for (let i in queue) {
				let movingShip = queue[i];
				let deltaDistance = Config.algorithm.getMovingShipsDeltaDistance(movingShip.count, movingShip.distance, movingShip.distanceLeft);

				if ((movingShip.distanceLeft -= deltaDistance) <= 0) {
					queue.splice(parseInt(i), 1);
				}
			}
			this._redrawStage();
		}, Config.algorithm.getMovingShipsInterval());
	}
}