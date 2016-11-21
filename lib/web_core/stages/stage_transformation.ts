import * as HttpProtocols from '../../shared/http_protocols';
import * as GameProtocols from '../../shared/game_protocols';
import * as vueData from '../vueData';

import GameStage from './game_stage';
import MovingShipsStage from './moving_ships_stage';
import UiStage from './ui_stage';
import StageMediator from './stage_mediator';

interface Transformation {
	scaling: number,
	horizontalMoving: number,
	verticalMoving: number
}

export default class StageTransformation {
	private _bgStageCanvas: HTMLCanvasElement;
	private _movingShipsStageCanvas: HTMLCanvasElement;
	private _gameStageCanvas: HTMLCanvasElement;
	private _mediator: StageMediator;

	private _stageContainer: HTMLElement;

	private _transformation: Transformation = {
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

	constructor(transStageContainer: HTMLElement, bgStageCanvas: HTMLCanvasElement, movingShipsStageCanvas: HTMLCanvasElement, gameStageCanvas: HTMLCanvasElement, mediator: StageMediator) {
		this._stageContainer = transStageContainer;

		this._bgStageCanvas = bgStageCanvas;
		this._movingShipsStageCanvas = movingShipsStageCanvas;
		this._gameStageCanvas = gameStageCanvas;
		this._mediator = mediator;

		this._stageContainer.addEventListener('webkitTransitionEnd', () => {
			this._endTransition();
		});
	}

	private _endTransition() {
		this._stageContainer.style.transition = 'none';
		this._stageContainer.style.transform = `matrix(1,0,0,1,0,0)`;

		this._transformation = this._tempTransformation;

		this._tempTransformation = null;
		this._tempDeltaTransformation = null;
		this._mediator.redrawStage();
	}

	setStageTransformation(minPosition: Point, maxPosition: Point) {
		let scaling = Math.sqrt((this._gameStageCanvas.width * this._gameStageCanvas.height) / ((maxPosition.x - minPosition.x) * (maxPosition.y - minPosition.y)));
		let horizontalMoving = -(minPosition.x * scaling - (this._gameStageCanvas.width - (maxPosition.x - minPosition.x) * scaling) / 2);
		let verticalMoving = -(minPosition.y * scaling - (this._gameStageCanvas.height - (maxPosition.y - minPosition.y) * scaling) / 2);
		this._transformation = {
			scaling: scaling,
			horizontalMoving: horizontalMoving,
			verticalMoving: verticalMoving
		};
	}

	getTrans() {
		return this._transformation;
	}

	getNewestTrans() {
		if (this._tempTransformation == null) {
			return this._transformation;
		} else {
			return this._tempTransformation;
		}
	}

	zoomStage(deltaScaling: number, deltaHorizontalMoving: number, deltaVerticalMoving: number) {
		if (this._transformation.scaling + deltaScaling <= 0.5 || (this._tempTransformation != null && this._tempTransformation.scaling + deltaScaling <= 0.5)
			|| this._transformation.scaling + deltaScaling >= 3 || (this._tempTransformation != null && this._tempTransformation.scaling + deltaScaling >= 3)) {
			return;
		}

		if (this._tempTransformation == null) {
			this._stageContainer.style.transition = 'transform 0.2s';

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

		this._stageContainer.style.transform = `matrix(${cssScaling},0,0,${cssScaling},${cssHorizontalMoving},${cssVerticalMoving})`;

		this._tempTransformation.scaling += deltaScaling;
		this._tempTransformation.horizontalMoving += deltaHorizontalMoving;
		this._tempTransformation.verticalMoving += deltaVerticalMoving;
	}

	private _tempMovingX = 0;
	private _tempMovingY = 0;
	moveStage(x: number, y: number) {
		if (this._tempTransformation) {
			this._endTransition();
		}
		this._tempMovingX += x;
		this._tempMovingY += y;

		this._stageContainer.style.transform = `matrix(1,0,0,1,${this._tempMovingX},${this._tempMovingY})`;
	}
	moveStageDone() {
		this._transformation.horizontalMoving += this._tempMovingX;
		this._transformation.verticalMoving += this._tempMovingY;
		this._tempMovingX = this._tempMovingY = 0;
		this._stageContainer.style.transform = `matrix(1,0,0,1,0,0)`;

		this._mediator.redrawStage();
	}
}