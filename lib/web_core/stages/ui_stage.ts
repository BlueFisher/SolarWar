import config from '../../shared/config';
import * as GameProtocols from '../../shared/game_protocols';
import * as vueData from '../vueData';

import StageMediator from './stage_mediator';

export default class UiStage {
	private _mediator: StageMediator;
	private _uiStageCanvas: HTMLCanvasElement;

	private _sendProtocol: (protocol: GameProtocols.BaseProtocol) => void;

	constructor(uiStageCanvas: HTMLCanvasElement, gameStageMediator: StageMediator, sendProtocol: (protocol: GameProtocols.BaseProtocol) => void) {
		this._uiStageCanvas = uiStageCanvas;

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

			let obj = this._getPointedSolarObject(point);
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
		let mousedownNextPoint: Point;
		let mousedownSolarObject: GameProtocols.BaseSolarObject;
		let mouseupSolarObject: GameProtocols.BaseSolarObject;
		let mouseWhich: number = null;
		$canvas.on('mousemove', e => {
			e.preventDefault();

			let point = {
				x: e.pageX - $canvas.offset().left,
				y: e.pageY - $canvas.offset().top
			};

			ctx.clearRect(0, 0, this._uiStageCanvas.width, this._uiStageCanvas.height);

			ctx.save();

			let trans = this._mediator.getNewestTrans();
			ctx.setTransform(trans.scaling, 0, 0, trans.scaling, trans.horizontalMoving, trans.verticalMoving);
			
			let mouseoverObj: GameProtocols.BaseSolarObject;
			if (mouseWhich) {
				if (mousedownSolarObject && mouseWhich == 1 && !vueData.index.addingProp) { // 如果鼠标左键点击在星球上

					// 绘制点击星球的选中效果
					drawActiveSolarObject(mousedownSolarObject);

					mouseupSolarObject = this._getPointedSolarObject(point);
					ctx.save();
					ctx.beginPath();

					// 路径线从点击的星球开始绘制
					ctx.moveTo(mousedownSolarObject.position.x, mousedownSolarObject.position.y);
					if (mouseupSolarObject) { // 如果鼠标移动到星球上
						// 路径线绘制到移动到的星球上
						ctx.lineTo(mouseupSolarObject.position.x, mouseupSolarObject.position.y);
					} else {
						// 路径线绘制到鼠标位置
						let pointInMap = this._getPointInMap(point);
						ctx.lineTo(pointInMap.x, pointInMap.y);
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
					if (mousedownSolarObject && !vueData.index.addingProp) {
						drawActiveSolarObject(mousedownSolarObject);
					}

					this._mediator.moveStage(point.x - mousedownNextPoint.x, point.y - mousedownNextPoint.y);
					mousedownNextPoint = point;
				}
			} else {
				// 根据是否移动在星球上绘制移动特效和变换鼠标指针
				mousedownSolarObject = this._getPointedSolarObject(point);
				if (mousedownSolarObject && !vueData.index.addingProp) {
					$canvas.css({ cursor: 'pointer' });
					drawActiveSolarObject(mousedownSolarObject);
				} else {
					$canvas.css({ cursor: '-webkit-grab' });
				}
			}

			if (vueData.index.addingProp) {
				let pointInMap = this._getPointInMap(point);

				ctx.beginPath();
				ctx.arc(pointInMap.x, pointInMap.y, config.map.portalSize / 2, 0, 2 * Math.PI);

				ctx.strokeStyle = 'white';

				if (this._isPortalCovered(pointInMap)) {
					ctx.strokeStyle = 'red';
				}

				ctx.stroke();
			}

			ctx.restore();
		});
		$canvas.on('mousedown', e => {
			e.preventDefault();

			mousedownNextPoint = mousedownPoint = {
				x: e.pageX - $canvas.offset().left,
				y: e.pageY - $canvas.offset().top
			};

			mouseWhich = e.which;

			if (!mousedownSolarObject || mouseWhich != 1) {
				$canvas.css({ cursor: '-webkit-grabbing' });
			}
		});
		$canvas.on('mouseup', e => {
			e.preventDefault();

			this._mediator.moveStageDone();
			$canvas.css({ cursor: 'default' });

			if (mouseWhich == 1 && vueData.index.addingProp) {
				let mouseupPoint = {
					x: e.pageX - $canvas.offset().left,
					y: e.pageY - $canvas.offset().top
				};
				if (mouseupPoint.x == mousedownPoint.x && mouseupPoint.y == mouseupPoint.y) {
					let pointInMap = this._getPointInMap(mousedownPoint);
					if (!this._isPortalCovered(pointInMap)) {
						let i = vueData.index.props.findIndex(p => p == vueData.index.addingProp);
						this._sendProtocol(new GameProtocols.RequestAddPortal(this._getPointInMap(mouseupPoint)));
						vueData.index.props.splice(i, 1);
						vueData.index.addingProp = null;
					}
				}
			} else if (mouseWhich == 3 && vueData.index.addingProp) {
				vueData.index.addingProp = null;
			}

			if (mousedownSolarObject && mouseupSolarObject) {
				let protocol = new GameProtocols.RequestMovingShips(mousedownSolarObject.id, mouseupSolarObject.id, vueData.index.ratio / 100);
				this._sendProtocol(protocol);
			}

			mouseWhich = null;
			mousedownSolarObject = null;
			mouseupSolarObject = null;
		});
	}

	private _getPointInMap(point: Point): Point {
		let trans = this._mediator.getTrans();
		let x = (point.x - trans.horizontalMoving) / trans.scaling;
		let y = (point.y - trans.verticalMoving) / trans.scaling;
		return { x: x, y: y };
	}
	private _getPointedSolarObject(point: Point): GameProtocols.BaseSolarObject {
		let pointInMap = this._getPointInMap(point);
		return this._mediator.getCoveredSolarObject(pointInMap, 20);
	}
	private _isPortalCovered(pointInMap: Point): boolean {
		let obj = this._mediator.getCoveredSolarObject(pointInMap, config.map.portalMinDistanceToObject);
		return obj ? true : false;
	}
}