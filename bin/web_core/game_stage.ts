import * as $ from 'jquery';
import * as GameProtocols from '../shared/game_protocols';
import PlanetsManager from './game_stage_planets_manager';
import MovingShipsManager from './game_stage_moving_ships_manager';

interface transformation {
	scaling: number,
	horizontalMoving: number,
	verticalMoving: number
}

export default class GameStage {
	private _gameStageCanvas: HTMLCanvasElement;
	private _planetsManager: PlanetsManager;
	private _movingShipsManager: MovingShipsManager;
	private _map: GameProtocols.Map;
	private _currPlayerId: number;
	private _transformation: transformation = {
		scaling: 1,
		horizontalMoving: 0,
		verticalMoving: 0
	};
	private _tempTransformation: transformation = null;
	private _tempDeltaTransformation: {
		deltaScaling: number,
		deltaHorizontalMoving: number,
		deltaVerticalMoving: number
	} = null;

	getTrans() {
		return this._transformation;
	}
	getNewestTrans() {
		if (this._tempTransformation == null) {
			return this.getTrans();
		} else {
			return this._tempTransformation;
		}
	}

	/**游戏舞台 */
	constructor(gameStageCanvas: HTMLCanvasElement) {
		this._gameStageCanvas = gameStageCanvas;
		this._planetsManager = new PlanetsManager(() => {
			this.redrawStage();
		});
		this._movingShipsManager = new MovingShipsManager(() => {
			this.redrawStage();
		});

		this._gameStageCanvas.addEventListener('webkitTransitionEnd', () => {
			this._endTransition();
		});
	}

	private _getMapMainRange(planets: GameProtocols.BasePlanet[]): [Point, Point] {
		let range = 200;
		let minPosition: Point = { x: Infinity, y: Infinity };
		let maxPosition: Point = { x: -Infinity, y: -Infinity };
		if (planets.length == 0 || this._currPlayerId == null) {
			return [{ x: 10, y: 10 }, { x: 800, y: 800 }];
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
	private _setStageTransformation(minPosition: Point, maxPosition: Point) {
		let scaling = Math.sqrt((this._gameStageCanvas.width * this._gameStageCanvas.height) / ((maxPosition.x - minPosition.x) * (maxPosition.y - minPosition.y)));
		let horizontalMoving = -(minPosition.x * scaling - (this._gameStageCanvas.width - (maxPosition.x - minPosition.x) * scaling) / 2);
		let verticalMoving = -(minPosition.y * scaling - (this._gameStageCanvas.height - (maxPosition.y - minPosition.y) * scaling) / 2);
		this._transformation = {
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
		this._planetsManager.refreshCurrPlayerId(protocol.playerId);
		let map: GameProtocols.Map = protocol.map;
		let [minPosition, maxPosition] = this._getMapMainRange(map.planets);
		this._setStageTransformation(minPosition, maxPosition);

		this.drawStage(map);
	}

	zoomStage(deltaScaling: number, deltaHorizontalMoving: number, deltaVerticalMoving: number) {
		if (this._transformation.scaling + deltaScaling <= 0.5 || (this._tempTransformation != null && this._tempTransformation.scaling + deltaScaling <= 0.5)
			|| this._transformation.scaling + deltaScaling >= 7 || (this._tempTransformation != null && this._tempTransformation.scaling + deltaScaling >= 7)) {
			return;
		}

		if (this._tempTransformation == null) {
			this._gameStageCanvas.style.transition = 'transform 0.25s';
			this._tempTransformation = {
				scaling: this._transformation.scaling,
				horizontalMoving: this._transformation.horizontalMoving,
				verticalMoving: this._transformation.verticalMoving
			}
		}
		if (this._tempDeltaTransformation == null) {
			this._tempDeltaTransformation = {
				deltaScaling: deltaScaling,
				deltaHorizontalMoving: deltaHorizontalMoving,
				deltaVerticalMoving: deltaVerticalMoving
			}
		} else {
			this._tempDeltaTransformation.deltaScaling += deltaScaling;
			this._tempDeltaTransformation.deltaHorizontalMoving += deltaHorizontalMoving;
			this._tempDeltaTransformation.deltaVerticalMoving += deltaVerticalMoving;
		}

		let cssScaling = 1 + this._tempDeltaTransformation.deltaScaling / this._transformation.scaling;
		let cssHorizontalMoving = this._tempDeltaTransformation.deltaScaling / this._transformation.scaling * (this._gameStageCanvas.width / 2 - this._transformation.horizontalMoving)
			+ this._tempDeltaTransformation.deltaHorizontalMoving;
		let cssVerticalMoving = this._tempDeltaTransformation.deltaScaling / this._transformation.scaling * (this._gameStageCanvas.height / 2 - this._transformation.verticalMoving)
			+ this._tempDeltaTransformation.deltaVerticalMoving;
		this._gameStageCanvas.style.transform = `matrix(${cssScaling},0,0,${cssScaling},${cssHorizontalMoving},${cssVerticalMoving})`;

		this._tempTransformation.scaling += deltaScaling;
		this._tempTransformation.horizontalMoving += deltaHorizontalMoving;
		this._tempTransformation.verticalMoving += deltaVerticalMoving;
	}

	moveStage(x: number, y: number) {
		this._transformation.horizontalMoving += x;
		this._transformation.verticalMoving += y;
		if (this._tempTransformation == null) {
			this.redrawStage();
		} else {
			this._endTransition();
		}
	}

	private _endTransition() {
		this._gameStageCanvas.style.transition = 'none';
		this._gameStageCanvas.style.transform = `matrix(1,0,0,1,0,0)`;
		this._transformation = this._tempTransformation;

		this._tempTransformation = null;
		this._tempDeltaTransformation = null;
		this.redrawStage();
	}

	startOccupyingPlanet(protocol: GameProtocols.StartOccupyingPlanet) {
		this._updatePlayers(protocol.players);
		this._planetsManager.startOccupyingPlanet(protocol);
	}

	startMovingShipsQueue(protocol: GameProtocols.StartMovingShips) {
		this._updatePlayers(protocol.players);
		this._movingShipsManager.startMovingShips(protocol);
	}

	changePlanet(protocol: GameProtocols.Planet) {
		this._updatePlayers(protocol.players);
		this._planetsManager.changePlanet(protocol);
	}

	private _updatePlayers(players: GameProtocols.BasePlayer[]) {
		let isExisted = false;
		players.forEach((player) => {
			isExisted = false;
			this._map.players.forEach((mapPlayer, mapIndex) => {
				if (mapPlayer.id == player.id) {
					this._map.players[mapIndex] = player;
					isExisted = true;
					return;
				}
			});
			if (!isExisted) {
				this._map.players.push(player);
			}
		});
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
		ctx.setTransform(this._transformation.scaling, 0, 0, this._transformation.scaling, this._transformation.horizontalMoving, this._transformation.verticalMoving);

		this._movingShipsManager.draw(ctx, map);
		this._planetsManager.draw(ctx, map);

		ctx.restore();
	}
}