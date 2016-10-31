import * as GameProtocols from '../../shared/game_protocols';
import * as Utils from '../utils';

import StageMediator from './stage_mediator';

export default class UiStage {
	private _mediator: StageMediator;
	private _uiStageCanvas: HTMLCanvasElement;

	private _bg1: HTMLElement;
	private _bg2: HTMLElement;

	private _sendProtocol: (protocol: GameProtocols.BaseProtocol) => void;

	constructor(uiStageCanvas: HTMLCanvasElement, backgrounds: HTMLElement[], gameStageMediator: StageMediator, sendProtocol: (protocol: GameProtocols.BaseProtocol) => void) {
		this._uiStageCanvas = uiStageCanvas;

		[this._bg1, this._bg2] = backgrounds;

		this._mediator = gameStageMediator;
		this._sendProtocol = sendProtocol;

		this._handleMovingShips();
	}

	private _handleMovingShips() {
		let $canvas = $(this._uiStageCanvas);

		$canvas.on('contextmenu', function () {
			return false;
		});
		$canvas.mousewheel(e => {
			e.preventDefault();

			let point = {
				x: e.pageX - $canvas.offset().left,
				y: e.pageY - $canvas.offset().top
			};
			let deltaScaling = e.deltaY > 0 ? 0.25 : -0.25;
			let deltaHorizontalMoving = 0;
			let deltaVerticalMoving = 0;

			let planet = this._getPointedPlanet(point.x, point.y);
			if (planet) { // 如果滚轮滑动时在星球上则缩放中心为该星球中心
				deltaHorizontalMoving = -deltaScaling * planet.position.x;
				deltaVerticalMoving = -deltaScaling * planet.position.y;
			} else {
				let trans = this._mediator.getTrans();
				deltaHorizontalMoving = -deltaScaling * (point.x - trans.horizontalMoving) / trans.scaling;
				deltaVerticalMoving = -deltaScaling * (point.y - trans.verticalMoving) / trans.scaling;
			}

			this._mediator.zoomStage(deltaScaling, deltaHorizontalMoving, deltaVerticalMoving);
			// 触发鼠标移动事件来重绘星球激活效果
			$canvas.trigger(new $.Event('mousemove', {
				pageX: e.pageX,
				pageY: e.pageY
			}));
		});

		let ctx = this._uiStageCanvas.getContext('2d');
		// 绘制星球激活特效
		let drawActivePlanet = (planet: GameProtocols.BasePlanet) => {
			let trans = this._mediator.getNewestTrans();
			ctx.save();
			ctx.setTransform(trans.scaling, 0, 0, trans.scaling, trans.horizontalMoving, trans.verticalMoving);
			ctx.beginPath();
			ctx.arc(planet.position.x, planet.position.y, planet.size / 2 - 1, 0, Math.PI * 2);
			ctx.strokeStyle = 'rgba(255,255,255,0.8)';
			ctx.lineWidth = 2;
			ctx.shadowBlur = 30; // 模糊尺寸
			ctx.shadowColor = '#fff'; // 颜色
			ctx.stroke();
			ctx.restore();
		};
		let mousedownPoint: Point;
		let mousedownPlanet: GameProtocols.BasePlanet;
		let mouseupPlanet: GameProtocols.BasePlanet;
		let isMouseDown = false;
		let mouseWhich = 1;
		$canvas.on('mousemove', e => {
			e.preventDefault();

			let point = {
				x: e.pageX - $canvas.offset().left,
				y: e.pageY - $canvas.offset().top
			};

			this._bg1.style.backgroundPosition = `${(this._uiStageCanvas.width / 2 - point.x) / 100}px ${(this._uiStageCanvas.height / 2 - point.y) / 100}px`;
			this._bg2.style.backgroundPosition = `${(this._uiStageCanvas.width / 2 - point.x) / 50}px ${(this._uiStageCanvas.height / 2 - point.y) / 50}px`;

			if (isMouseDown) {
				if (mousedownPlanet && mouseWhich == 1) { // 如果鼠标左键点击在星球上
					ctx.clearRect(0, 0, this._uiStageCanvas.width, this._uiStageCanvas.height);
					// 绘制点击星球的选中效果
					drawActivePlanet(mousedownPlanet);

					mouseupPlanet = this._getPointedPlanet(point.x, point.y);
					ctx.save();
					ctx.beginPath();
					let trans = this._mediator.getNewestTrans();
					ctx.setTransform(trans.scaling, 0, 0, trans.scaling, trans.horizontalMoving, trans.verticalMoving);
					// 路径线从点击的星球开始绘制
					ctx.moveTo(mousedownPlanet.position.x, mousedownPlanet.position.y);
					if (mouseupPlanet) { // 如果鼠标移动到星球上
						// 路径线绘制到移动到的星球上
						ctx.lineTo(mouseupPlanet.position.x, mouseupPlanet.position.y);
					} else {
						// 路径线绘制到鼠标位置
						ctx.setTransform(1, 0, 0, 1, 0, 0);
						ctx.lineTo(point.x, point.y);
					}

					ctx.lineCap = 'round';
					ctx.strokeStyle = '#fff';
					ctx.lineWidth = 2;
					ctx.shadowBlur = 15; // 模糊尺寸
					ctx.shadowColor = '#fff'; // 颜色
					ctx.stroke();
					ctx.restore();

					if (mouseupPlanet) {
						// 绘制鼠标移动到的星球选中效果
						drawActivePlanet(mouseupPlanet);
					}
				} else {
					// 移动画布
					if (mousedownPlanet) {
						ctx.clearRect(0, 0, this._uiStageCanvas.width, this._uiStageCanvas.height);
						drawActivePlanet(mousedownPlanet);
					}

					this._mediator.moveStage(point.x - mousedownPoint.x, point.y - mousedownPoint.y);
					mousedownPoint = point;
				}
			} else {
				// 根据是否移动在星球上绘制移动特效和变换鼠标指针
				let planet = this._getPointedPlanet(point.x, point.y);
				if (planet) {
					$canvas.css({ cursor: 'pointer' });
					ctx.clearRect(0, 0, this._uiStageCanvas.width, this._uiStageCanvas.height);
					drawActivePlanet(planet);
				} else {
					$canvas.css({ cursor: '-webkit-grab' });
					ctx.clearRect(0, 0, this._uiStageCanvas.width, this._uiStageCanvas.height);
				}
			}
		});
		$canvas.on('mousedown', e => {
			e.preventDefault();

			mousedownPoint = {
				x: e.pageX - $canvas.offset().left,
				y: e.pageY - $canvas.offset().top
			};
			mousedownPlanet = this._getPointedPlanet(mousedownPoint.x, mousedownPoint.y);
			isMouseDown = true;
			mouseWhich = e.which;

			if (!mousedownPlanet || mouseWhich != 1) {
				$canvas.css({ cursor: '-webkit-grabbing' });
			}
		});
		$canvas.on('mouseup', e => {
			e.preventDefault();

			this._mediator.moveStageDone();
			$canvas.css({ cursor: 'default' });

			if (mousedownPlanet != null && mouseupPlanet != null) {
				let protocol = new GameProtocols.RequestMovingShips(mousedownPlanet.id, mouseupPlanet.id, Utils.vueIndex.ratio / 100);
				this._sendProtocol(protocol);
			}

			isMouseDown = false;
			mousedownPlanet = null;
			mouseupPlanet = null;
		});
	}

	private _getPointedPlanet(x: number, y: number): GameProtocols.BasePlanet {
		let trans = this._mediator.getTrans();
		x = (x - trans.horizontalMoving) / trans.scaling;
		y = (y - trans.verticalMoving) / trans.scaling;
		return this._mediator.getPointedPlanet(x, y);
	}
}