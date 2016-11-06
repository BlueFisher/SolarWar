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

	private _getMapMainRange(objs: GameProtocols.BaseSolarObject[]): [Point, Point] {
		let range = 200;
		let minPosition: Point = { x: Infinity, y: Infinity };
		let maxPosition: Point = { x: -Infinity, y: -Infinity };
		if (objs.length == 0 || this.currPlayerId == null) {
			return [{ x: 10, y: 10 }, { x: 800, y: 800 }];
		}

		objs.forEach(p => {
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
				vueData.index.currShipsCount = p.currShipsCount;
				vueData.index.maxShipsCount = p.maxShipsCount;
			}

			if (!this.players[p.id - 1]) {
				this.players.push(p);
			} else {
				this.players[p.id - 1] = p;
			}
		});

		if (players.length > 0) {
			vueData.index.ranklist = this.players.slice().sort(function (a, b) {
				return a.maxShipsCount >= b.maxShipsCount ? -1 : 1;
			}).slice(0, 10);
		}
	}

	initializeMap(protocol: GameProtocols.InitializeMap) {
		this.currPlayerId = protocol.playerId;
		let map: GameProtocols.Map = protocol.map;
		let [minPosition, maxPosition] = this._getMapMainRange(map.objects);
		this._stageTransformation.setStageTransformation(minPosition, maxPosition);

		this._updatePlayers(map.players);
		this._gameStage.changeSolarObjects(map.objects);
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

	getCoveredSolarObject(point: Point, distance: number) {
		return this._gameStage.getCoveredSolarObject(point, distance);
	}
	getSolarObjects(): GameProtocols.BaseSolarObject[] {
		return this._gameStage.getSolarObjects();
	}

	startOccupyingSolarObject(protocol: GameProtocols.StartOccupyingSolarObject) {
		this._updatePlayers(protocol.players);
		this._gameStage.startOccupyingSolarObject(protocol);
	}
	canAddProp(protocol: GameProtocols.CanAddProp) {
		vueData.index.props.push(protocol.propType);
	}

	movingShipsQueue(protocol: GameProtocols.MovingShips) {
		this._updatePlayers(protocol.players);
		this._movingShipsStage.movingShips(protocol.queue);
	}


	changeSolarObject(protocol: GameProtocols.ChangedSolarObject) {
		this._updatePlayers(protocol.players);
		this._gameStage.changeSolarObjects([protocol.object]);
	}

	redrawStage() {
		this._gameStage.draw();
		this._movingShipsStage.draw();
	}
}