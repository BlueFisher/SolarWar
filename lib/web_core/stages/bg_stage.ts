import StageMediator from './stage_mediator';

export default class BgStage {
	private _canvas: HTMLCanvasElement;
	private _mediator: StageMediator;

	constructor(bgStageCanvas: HTMLCanvasElement, gameStageMediator: StageMediator) {
		this._canvas = bgStageCanvas;
		this._mediator = gameStageMediator;
	}

	draw() {
		let transformation = this._mediator.getTrans();

		let ctx = this._canvas.getContext('2d');

		ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

		ctx.save();
		ctx.setTransform(transformation.scaling, 0, 0, transformation.scaling, 0, 0);

		let horizonStart = (transformation.horizontalMoving / transformation.scaling) % 100;
		let verticalStart = (transformation.verticalMoving / transformation.scaling) % 100;

		let width = this._canvas.width / transformation.scaling;
		let height = this._canvas.height / transformation.scaling;

		ctx.beginPath();
		for (let i = horizonStart; i < width; i += 100) {
			ctx.moveTo(i, 0);
			ctx.lineTo(i, height);
		}
		for (let i = verticalStart; i < height; i += 100) {
			ctx.moveTo(0, i);
			ctx.lineTo(width, i);
		}

		ctx.strokeStyle = 'rgba(255,255,255,.1)';
		ctx.stroke();
		ctx.restore();
	}
}