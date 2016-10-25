import * as HttpProtocols from '../../shared/http_protocols';
import * as GameProtocols from '../../shared/game_protocols';

import GameStage from './game_stage';
import MovingShipsStage from './moving_ships_stage';
import UiStage from './ui_stage';

interface Transformation {
	scaling: number,
	horizontalMoving: number,
	verticalMoving: number
}

export default class StageMediator {
	private _gameStageCanvas: HTMLCanvasElement;
	private _movingShipsStageCanvas: HTMLCanvasElement;
	private _uiStageCanvas: HTMLCanvasElement;

	private _gameStage: GameStage;
	private _movingShipsStage: MovingShipsStage;
	private _uiStage: UiStage;

	players: GameProtocols.BasePlayer[];
	// map: {
	// 	players: GameProtocols.BasePlayer[],
	// 	planets: GameProtocols.BasePlanet[],
	// };
	currPlayerId: number;

	transformation: Transformation = {
		scaling: 1,
		horizontalMoving: 0,
		verticalMoving: 0
	};
	private _tempTransformation: Transformation = null;
	private _tempDeltaTransformation: {
		deltaScaling: number,
		deltaHorizontalMoving: number,
		deltaVerticalMoving: number
	} = null;

	constructor(canvases: HTMLCanvasElement[], backgrounds: HTMLElement[], webSocketSend: (protocol: GameProtocols.BaseProtocol) => void) {
		[this._gameStageCanvas, this._movingShipsStageCanvas, this._uiStageCanvas] = canvases;

		this._gameStage = new GameStage(this._gameStageCanvas, this);
		this._movingShipsStage = new MovingShipsStage(this._movingShipsStageCanvas, this);
		this._uiStage = new UiStage(this._uiStageCanvas, backgrounds, this, (p) => {
			webSocketSend(p);
		});

		$(window).on('resize', () => {
			this.redrawStage();
		});
		this._gameStageCanvas.addEventListener('webkitTransitionEnd', () => {
			this._endTransition();
		});
	}

	getTrans() {
		return this.transformation;
	}
	getNewestTrans() {
		if (this._tempTransformation == null) {
			return this.getTrans();
		} else {
			return this._tempTransformation;
		}
	}

	private _getMapMainRange(planets: GameProtocols.BasePlanet[]): [Point, Point] {
		let range = 200;
		let minPosition: Point = { x: Infinity, y: Infinity };
		let maxPosition: Point = { x: -Infinity, y: -Infinity };
		if (planets.length == 0 || this.currPlayerId == null) {
			return [{ x: 10, y: 10 }, { x: 800, y: 800 }];
		}

		planets.forEach(p => {
			if (p.occupiedPlayerId == this.currPlayerId || p.allShips.filter(s => s.playerId == this.currPlayerId).length == 1 ||
				(p.occupyingStatus != null && p.occupyingStatus.playerId == this.currPlayerId)) {
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
		this.transformation = {
			scaling: scaling,
			horizontalMoving: horizontalMoving,
			verticalMoving: verticalMoving
		};
	}

	getPointedPlanet(x: number, y: number): GameProtocols.BasePlanet {
		return this._gameStage.getPointedPlanet(x, y);
	}

	getPlanets(): GameProtocols.BasePlanet[] {
		return this._gameStage.getPlanets();
	}

	initializeMap(protocol: GameProtocols.InitializeMap) {
		this.currPlayerId = protocol.playerId;
		let map: GameProtocols.Map = protocol.map;
		let [minPosition, maxPosition] = this._getMapMainRange(map.planets);
		this._setStageTransformation(minPosition, maxPosition);

		this.players = map.players;
		this._gameStage.changePlanets(map.planets);
		this._movingShipsStage.movingShips(map.movingShipsQueue);
	}

	zoomStage(deltaScaling: number, deltaHorizontalMoving: number, deltaVerticalMoving: number) {
		if (this.transformation.scaling + deltaScaling <= 0.5 || (this._tempTransformation != null && this._tempTransformation.scaling + deltaScaling <= 0.5)
			|| this.transformation.scaling + deltaScaling >= 7 || (this._tempTransformation != null && this._tempTransformation.scaling + deltaScaling >= 7)) {
			return;
		}

		if (this._tempTransformation == null) {
			[this._gameStageCanvas, this._movingShipsStageCanvas].forEach(c => {
				c.style.transition = 'transform 0.25s';
			});

			this._tempTransformation = {
				scaling: this.transformation.scaling,
				horizontalMoving: this.transformation.horizontalMoving,
				verticalMoving: this.transformation.verticalMoving
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

		let cssScaling = 1 + this._tempDeltaTransformation.deltaScaling / this.transformation.scaling;
		let cssHorizontalMoving = this._tempDeltaTransformation.deltaScaling / this.transformation.scaling * (this._gameStageCanvas.width / 2 - this.transformation.horizontalMoving)
			+ this._tempDeltaTransformation.deltaHorizontalMoving;
		let cssVerticalMoving = this._tempDeltaTransformation.deltaScaling / this.transformation.scaling * (this._gameStageCanvas.height / 2 - this.transformation.verticalMoving)
			+ this._tempDeltaTransformation.deltaVerticalMoving;

		[this._gameStageCanvas, this._movingShipsStageCanvas].forEach(c => {
			c.style.transform = `matrix(${cssScaling},0,0,${cssScaling},${cssHorizontalMoving},${cssVerticalMoving})`;
		});

		this._tempTransformation.scaling += deltaScaling;
		this._tempTransformation.horizontalMoving += deltaHorizontalMoving;
		this._tempTransformation.verticalMoving += deltaVerticalMoving;
	}

	moveStage(x: number, y: number) {
		this.transformation.horizontalMoving += x;
		this.transformation.verticalMoving += y;
		if (this._tempTransformation == null) {
			this.redrawStage();
		} else {
			this._endTransition();
		}
	}

	private _endTransition() {
		[this._gameStageCanvas, this._movingShipsStageCanvas].forEach(c => {
			c.style.transition = 'none';
			c.style.transform = `matrix(1,0,0,1,0,0)`;
		});
		this.transformation = this._tempTransformation;

		this._tempTransformation = null;
		this._tempDeltaTransformation = null;
		this.redrawStage();
	}

	startOccupyingPlanet(protocol: GameProtocols.StartOccupyingPlanet) {
		this._updatePlayers(protocol.players);
		this._gameStage.startOccupyingPlanet(protocol);
	}

	movingShipsQueue(protocol: GameProtocols.MovingShips) {
		this._updatePlayers(protocol.players);
		this._movingShipsStage.movingShips(protocol.queue);
	}

	changePlanet(protocol: GameProtocols.ChangedPlanet) {
		this._updatePlayers(protocol.players);
		this._gameStage.changePlanets([protocol.planet]);
	}

	private _updatePlayers(players: GameProtocols.BasePlayer[]) {
		let isExisted = false;
		players.forEach((player) => {
			isExisted = false;
			this.players.forEach((mapPlayer, mapIndex) => {
				if (mapPlayer.id == player.id) {
					this.players[mapIndex] = player;
					isExisted = true;
					return;
				}
			});
			if (!isExisted) {
				this.players.push(player);
			}
		});
	}

	redrawStage() {
		this._gameStage.draw();
		this._movingShipsStage.draw();
	}
}