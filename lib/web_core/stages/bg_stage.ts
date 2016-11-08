import StageMediator from './stage_mediator';

export default class BgStage {
	private _canvas: HTMLCanvasElement;
	private _mediator: StageMediator;

	constructor(bgStageCanvas: HTMLCanvasElement, gameStageMediator: StageMediator) {
		this._canvas = bgStageCanvas;
		this._mediator = gameStageMediator;
		this.draw();
	}

	draw() {
		let padding = 100;
		let transformation = this._mediator.getTrans();

		let ctx = this._canvas.getContext('2d');

		ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

		ctx.save();
		ctx.setTransform(transformation.scaling, 0, 0, transformation.scaling, 0, 0);

		let horizonStart = (transformation.horizontalMoving / transformation.scaling) % padding;
		let verticalStart = (transformation.verticalMoving / transformation.scaling) % padding;

		let width = this._canvas.width / transformation.scaling;
		let height = this._canvas.height / transformation.scaling;

		ctx.beginPath();
		ctx.fillStyle = 'rgba(255,255,255,.1)';

		for (let i = horizonStart; i < width; i += padding) {
			let coordX = (i - transformation.horizontalMoving / transformation.scaling) / padding;
			ctx.fillText(coordX.toFixed(0), i, 20);
			ctx.moveTo(i, 0);
			ctx.lineTo(i, height);
		}
		for (let i = verticalStart; i < height; i += padding) {
			let coordY = (i - transformation.verticalMoving / transformation.scaling) / padding;
			ctx.fillText(coordY.toFixed(0), 20, i);
			ctx.moveTo(0, i);
			ctx.lineTo(width, i);
		}

		ctx.strokeStyle = 'rgba(255,255,255,.1)';
		ctx.stroke();
		ctx.restore();
	}
}