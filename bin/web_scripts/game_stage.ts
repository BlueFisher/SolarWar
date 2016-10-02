import * as GameProtocols from '../protocols/game_protocols';
import PlanetsManager from './game_stage_planets_manager';

export default class GameStage {
	private _gameStageCanvas: HTMLCanvasElement;
	private _planetsManager: PlanetsManager;
	private _map: GameProtocols.Map;
	private _currPlayerId: number;
	transformation = {
		scaling: 1,
		horizontalMoving: 0,
		verticalMoving: 0
	};

	/**游戏舞台 */
	constructor(gameStageCanvas: HTMLCanvasElement) {
		this._gameStageCanvas = gameStageCanvas;
		this._planetsManager = new PlanetsManager(() => {
			this.redrawStage();
		});
	}

	private _getMapMainRange(planets: GameProtocols.BasePlanet[]): [GameProtocols.Point, GameProtocols.Point] {
		let range = 200;
		let minPosition: GameProtocols.Point = { x: Infinity, y: Infinity };
		let maxPosition: GameProtocols.Point = { x: -Infinity, y: -Infinity };
		if (planets.length == 0 || this._currPlayerId == null) {
			return [maxPosition, minPosition];
		}

		planets.forEach(p => {
			if (p.occupiedPlayerId == this._currPlayerId || p.allShips.filter(s => s.playerId == this._currPlayerId).length == 1 ||
				(p.occupyingStatus != null && p.occupyingStatus.playerId == this._currPlayerId)) {
				let temp;
				if ((temp = p.position.x - p.size - range) < minPosition.x) {
					minPosition.x = temp;
				}
				if ((temp = p.position.x + p.size + range) > maxPosition.x) {
					maxPosition.x = temp;
				}
				if ((temp = p.position.y - p.size - range) < minPosition.y) {
					minPosition.y = temp;
				}
				if ((temp = p.position.y + p.size + range) > maxPosition.y) {
					maxPosition.y = temp;
				}
			}
		});

		return [minPosition, maxPosition];
	}
	private _setStageTransformation(minPosition: GameProtocols.Point, maxPosition: GameProtocols.Point) {
		let scaling = Math.sqrt((this._gameStageCanvas.width * this._gameStageCanvas.height) / ((maxPosition.x - minPosition.x) * (maxPosition.y - minPosition.y)));
		let horizontalMoving = -(minPosition.x * scaling - (this._gameStageCanvas.width - (maxPosition.x - minPosition.x) * scaling) / 2);
		let verticalMoving = -(minPosition.y * scaling - (this._gameStageCanvas.height - (maxPosition.y - minPosition.y) * scaling) / 2);
		this.transformation = {
			scaling: scaling,
			horizontalMoving: horizontalMoving,
			verticalMoving: verticalMoving
		};
	}

	getPointedPlanet(x: number, y: number): GameProtocols.BasePlanet {
		return this._planetsManager.getPointedPlanet(x, y);
	}

	initializeMap(protocol: GameProtocols.InitializeMap) {
		this._currPlayerId = protocol.playerId;
		let map: GameProtocols.Map = protocol.map;

		let [minPosition, maxPosition] = this._getMapMainRange(map.planets);
		this._setStageTransformation(minPosition, maxPosition);

		this.drawStage(map);
	}
	
	changeMovingShipsQueue(protocol: GameProtocols.MovingShipsQueue) {
		this._map.movingShipsQueue = protocol.queue;

		this.redrawStage();
	}

	changePlanet(protocol: GameProtocols.Planet) {
		this._planetsManager.changePlanet(protocol);
	}

	startOccupyingPlanet(protocol: GameProtocols.StartOccupyingPlanet) {
		this._planetsManager.startOccupyingPlanet(protocol);
	}

	redrawStage() {
		if (this._map) {
			this.drawStage(this._map);
		}
	}
	drawStage(map: GameProtocols.Map) {
		this._map = map;
		let ctx = this._gameStageCanvas.getContext('2d');

		ctx.clearRect(0, 0, this._gameStageCanvas.width, this._gameStageCanvas.height);

		ctx.save();

		ctx.setTransform(this.transformation.scaling, 0, 0, this.transformation.scaling, this.transformation.horizontalMoving, this.transformation.verticalMoving);

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

		this._planetsManager.drawPlanets(ctx, map);

		ctx.restore();
	}
}