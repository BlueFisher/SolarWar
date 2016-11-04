import * as GameProtocols from '../../shared/game_protocols';
import * as vueData from '../vueData';

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

			let obj = this._getPointedSolarObject(point.x, point.y);
			if (obj) { // 如果滚轮滑动时在星球上则缩放中心为该星球中心
				deltaHorizontalMoving = -deltaScaling * obj.position.x;
				deltaVerticalMoving = -deltaScaling * obj.position.y;
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
		let drawActiveSolarObject = (obj: GameProtocols.BaseSolarObject) => {
			let trans = this._mediator.getNewestTrans();
			ctx.save();
			ctx.setTransform(trans.scaling, 0, 0, trans.scaling, trans.horizontalMoving, trans.verticalMoving);

			ctx.strokeStyle = 'rgba(255,255,255,0.8)';
			ctx.lineWidth = 2;
			ctx.shadowBlur = 30; // 模糊尺寸
			ctx.shadowColor = '#fff'; // 颜色

			ctx.beginPath();
			ctx.arc(obj.position.x, obj.position.y, obj.size / 2 - 1, 0, Math.PI * 2);
			ctx.stroke();
			if (obj.type == GameProtocols.SolarObjectType.portal) {
				ctx.beginPath();
				ctx.arc(obj.position.x, obj.position.y, obj.size / 2 - 9, 0, Math.PI * 2);
				ctx.stroke();
			}

			ctx.restore();
		};
		let mousedownPoint: Point;
		let mousedownSolarObject: GameProtocols.BaseSolarObject;
		let mouseupSolarObject: GameProtocols.BaseSolarObject;
		let isMouseDown = false;
		let mouseWhich = 1;
		$canvas.on('mousemove', e => {
			e.preventDefault();

			let point = {
				x: e.pageX - $canvas.offset().left,
				y: e.pageY - $canvas.offset().top
			};

			// this._bg1.style.backgroundPosition = `${(this._uiStageCanvas.width / 2 - point.x) / 100}px ${(this._uiStageCanvas.height / 2 - point.y) / 100}px`;
			// this._bg2.style.backgroundPosition = `${(this._uiStageCanvas.width / 2 - point.x) / 50}px ${(this._uiStageCanvas.height / 2 - point.y) / 50}px`;

			if (isMouseDown) {
				if (mousedownSolarObject && mouseWhich == 1) { // 如果鼠标左键点击在星球上
					ctx.clearRect(0, 0, this._uiStageCanvas.width, this._uiStageCanvas.height);
					// 绘制点击星球的选中效果
					drawActiveSolarObject(mousedownSolarObject);

					mouseupSolarObject = this._getPointedSolarObject(point.x, point.y);
					ctx.save();
					ctx.beginPath();
					let trans = this._mediator.getNewestTrans();
					ctx.setTransform(trans.scaling, 0, 0, trans.scaling, trans.horizontalMoving, trans.verticalMoving);
					// 路径线从点击的星球开始绘制
					ctx.moveTo(mousedownSolarObject.position.x, mousedownSolarObject.position.y);
					if (mouseupSolarObject) { // 如果鼠标移动到星球上
						// 路径线绘制到移动到的星球上
						ctx.lineTo(mouseupSolarObject.position.x, mouseupSolarObject.position.y);
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

					if (mouseupSolarObject) {
						// 绘制鼠标移动到的星球选中效果
						drawActiveSolarObject(mouseupSolarObject);
					}
				} else {
					// 移动画布
					if (mousedownSolarObject) {
						ctx.clearRect(0, 0, this._uiStageCanvas.width, this._uiStageCanvas.height);
						drawActiveSolarObject(mousedownSolarObject);
					}

					this._mediator.moveStage(point.x - mousedownPoint.x, point.y - mousedownPoint.y);
					mousedownPoint = point;
				}
			} else {
				// 根据是否移动在星球上绘制移动特效和变换鼠标指针
				let obj = this._getPointedSolarObject(point.x, point.y);
				if (obj) {
					$canvas.css({ cursor: 'pointer' });
					ctx.clearRect(0, 0, this._uiStageCanvas.width, this._uiStageCanvas.height);
					drawActiveSolarObject(obj);
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
			mousedownSolarObject = this._getPointedSolarObject(mousedownPoint.x, mousedownPoint.y);
			isMouseDown = true;
			mouseWhich = e.which;

			if (!mousedownSolarObject || mouseWhich != 1) {
				$canvas.css({ cursor: '-webkit-grabbing' });
			}
		});
		$canvas.on('mouseup', e => {
			e.preventDefault();

			this._mediator.moveStageDone();
			$canvas.css({ cursor: 'default' });

			if (mousedownSolarObject != null && mouseupSolarObject != null) {
				let protocol = new GameProtocols.RequestMovingShips(mousedownSolarObject.id, mouseupSolarObject.id, vueData.vueIndex.ratio / 100);
				this._sendProtocol(protocol);
			}

			isMouseDown = false;
			mousedownSolarObject = null;
			mouseupSolarObject = null;
		});
	}

	private _getPointedSolarObject(x: number, y: number): GameProtocols.BaseSolarObject {
		let trans = this._mediator.getTrans();
		x = (x - trans.horizontalMoving) / trans.scaling;
		y = (y - trans.verticalMoving) / trans.scaling;
		return this._mediator.getPointedSolarObject(x, y);
	}
}