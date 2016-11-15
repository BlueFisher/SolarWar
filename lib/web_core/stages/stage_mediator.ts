import * as HttpProtocols from '../../shared/http_protocols';
import * as GameProtocols from '../../shared/game_protocols';
import * as vueData from '../vueData';

import StageTransformation from './stage_transformation';
import BgStage from './bg_stage';
import MovingShipsStage from './moving_ships_stage';
import GameStage from './game_stage';
import UiStage from './ui_stage';

interface Transformation {
	scaling: number,
	horizontalMoving: number,
	verticalMoving: number
}

export default class StageMediator {
	private _canvas: HTMLCanvasElement;

	private _stageTransformation: StageTransformation;

	private _bgStage: BgStage;
	private _movingShipsStage: MovingShipsStage;
	private _gameStage: GameStage;
	private _uiStage: UiStage;

	players: GameProtocols.BasePlayer[] = [];
	currPlayerId: number;

	constructor(movingStageContainer: HTMLElement, canvases: HTMLCanvasElement[], webSocketSend: (protocol: GameProtocols.BaseProtocol) => void) {
		let [bgStageCanvas, movingShipsStageCanvas, gameStageCanvas, uiStageCanvas] = canvases;

		this._canvas = bgStageCanvas

		this._stageTransformation = new StageTransformation(movingStageContainer, bgStageCanvas, gameStageCanvas, movingShipsStageCanvas, this);

		this._bgStage = new BgStage(bgStageCanvas, this);
		this._movingShipsStage = new MovingShipsStage(movingShipsStageCanvas, this);
		this._gameStage = new GameStage(gameStageCanvas, this);
		this._uiStage = new UiStage(uiStageCanvas, this, (p) => {
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
			return [{ x: -this._canvas.width / 2, y: -this._canvas.height / 2 },
			{ x: this._canvas.width / 2, y: this._canvas.height / 2 }];
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

			let i = this.players.findIndex(tp => tp.id == p.id);
			if (i != -1) {
				this.players[i] = p;
			} else {
				this.players.push(p);
			}
		});

		if (players.length > 0) {
			vueData.index.ranklist = this.players.slice();
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

		this._bgStage.draw();
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

	getVisableRange(): [Point, Point] {
		let trans = this._stageTransformation.getTrans();
		let minPosition: Point = {
			x: -trans.horizontalMoving / trans.scaling,
			y: -trans.verticalMoving / trans.scaling,
		}
		let maxPosition: Point = {
			x: (this._canvas.width - trans.horizontalMoving) / trans.scaling,
			y: (this._canvas.height - trans.verticalMoving) / trans.scaling,
		}
		return [minPosition, maxPosition];
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
		this._bgStage.draw();
	}
}