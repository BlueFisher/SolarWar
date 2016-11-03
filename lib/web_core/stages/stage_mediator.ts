import * as HttpProtocols from '../../shared/http_protocols';
import * as GameProtocols from '../../shared/game_protocols';
import * as vueData from '../vueData';

import StageTransformation from './stage_transformation';
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

	private _stageTransformation: StageTransformation;
	private _gameStage: GameStage;
	private _movingShipsStage: MovingShipsStage;
	private _uiStage: UiStage;

	players: GameProtocols.BasePlayer[] = [];
	currPlayerId: number;

	constructor(canvases: HTMLCanvasElement[], backgrounds: HTMLElement[], webSocketSend: (protocol: GameProtocols.BaseProtocol) => void) {
		[this._gameStageCanvas, this._movingShipsStageCanvas, this._uiStageCanvas] = canvases;

		this._stageTransformation = new StageTransformation(this._gameStageCanvas, this._movingShipsStageCanvas, this);
		this._gameStage = new GameStage(this._gameStageCanvas, this);
		this._movingShipsStage = new MovingShipsStage(this._movingShipsStageCanvas, this);
		this._uiStage = new UiStage(this._uiStageCanvas, backgrounds, this, (p) => {
			webSocketSend(p);
		});

		$(window).on('resize', () => {
			this.redrawStage();
		});
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

	private _updatePlayers(players: GameProtocols.BasePlayer[]) {
		players.forEach(p => {
			if (p.id == this.currPlayerId) {
				vueData.vueIndex.currShipsCount = p.currShipsCount;
				vueData.vueIndex.maxShipsCount = p.maxShipsCount;
			}

			if (!this.players[p.id - 1]) {
				this.players.push(p);
			} else {
				this.players[p.id - 1] = p;
			}
		});

		if (players.length > 0) {
			vueData.vueIndex.ranklist = this.players.slice().sort(function (a, b) {
				return a.maxShipsCount >= b.maxShipsCount ? -1 : 1;
			}).slice(0, 10);
		}
	}

	initializeMap(protocol: GameProtocols.InitializeMap) {
		this.currPlayerId = protocol.playerId;
		let map: GameProtocols.Map = protocol.map;
		let [minPosition, maxPosition] = this._getMapMainRange(map.planets);
		this._stageTransformation.setStageTransformation(minPosition, maxPosition);

		this._updatePlayers(map.players);
		this._gameStage.changePlanets(map.planets);
		this._movingShipsStage.movingShips(map.movingShipsQueue);
	}

	zoomStage(deltaScaling: number, deltaHorizontalMoving: number, deltaVerticalMoving: number) {
		this._stageTransformation.zoomStage(deltaScaling, deltaHorizontalMoving, deltaVerticalMoving);
	}
	moveStage(x: number, y: number) {
		this._stageTransformation.moveStage(x, y);
	}
	moveStageDone() {
		this._stageTransformation.moveStageDone();
	}
	getTrans() {
		return this._stageTransformation.getTrans();
	}
	getNewestTrans() {
		return this._stageTransformation.getNewestTrans();
	}

	getPointedPlanet(x: number, y: number): GameProtocols.BasePlanet {
		return this._gameStage.getPointedPlanet(x, y);
	}
	getPlanets(): GameProtocols.BasePlanet[] {
		return this._gameStage.getPlanets();
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

	redrawStage() {
		this._gameStage.draw();
		this._movingShipsStage.draw();
	}
}