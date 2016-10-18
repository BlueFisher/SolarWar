import * as GameProtocols from '../shared/game_protocols';
import GameStage from './game_stage';

export default class UiStage {
	private _gameStage: GameStage;
	private _uiStageCanvas: HTMLCanvasElement;
	private _countRatioData: { range: number };

	private _sendProtocol: (protocol: GameProtocols.BaseProtocol) => void;

	constructor(uiStageCanvas: HTMLCanvasElement, countRatioData: { range: number }, gameStage: GameStage, sendProtocol: (protocol: GameProtocols.BaseProtocol) => void) {
		this._uiStageCanvas = uiStageCanvas;
		this._countRatioData = countRatioData;
		this._gameStage = gameStage;
		this._sendProtocol = sendProtocol;

		this._handleMovingShips();
	}

	private _handleMovingShips() {
		let $canvas = $(this._uiStageCanvas);
		let ctx = this._uiStageCanvas.getContext('2d');
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
				let trans = this._gameStage.getTrans();
				deltaHorizontalMoving = -deltaScaling * (point.x - trans.horizontalMoving) / trans.scaling;
				deltaVerticalMoving = -deltaScaling * (point.y - trans.verticalMoving) / trans.scaling;
			}

			this._gameStage.zoomStage(deltaScaling, deltaHorizontalMoving, deltaVerticalMoving);
			// 触发鼠标移动事件来重绘星球激活效果
			$canvas.trigger(new $.Event('mousemove', {
				pageX: e.pageX,
				pageY: e.pageY
			}));
		});

		// 绘制星球激活特效
		let drawActivePlanet = (planet: GameProtocols.BasePlanet) => {
			let trans = this._gameStage.getNewestTrans();
			ctx.save();
			ctx.setTransform(trans.scaling, 0, 0, trans.scaling, trans.horizontalMoving, trans.verticalMoving);
			ctx.beginPath();
			ctx.arc(planet.position.x, planet.position.y, planet.size / 2 + 10, 0, Math.PI * 2);
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

			if (isMouseDown) {
				if (mousedownPlanet && mouseWhich == 1) { // 如果鼠标左键点击在星球上
					ctx.clearRect(0, 0, this._uiStageCanvas.width, this._uiStageCanvas.height);
					// 绘制点击星球的选中效果
					drawActivePlanet(mousedownPlanet);

					mouseupPlanet = this._getPointedPlanet(point.x, point.y);
					ctx.save();
					ctx.beginPath();
					let trans = this._gameStage.getNewestTrans();
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

					this._gameStage.moveStage(point.x - mousedownPoint.x, point.y - mousedownPoint.y);
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

			$canvas.css({ cursor: 'default' });

			if (mousedownPlanet != null && mouseupPlanet != null) {
				let protocol = new GameProtocols.RequestMovingShips(mousedownPlanet.id, mouseupPlanet.id, this._countRatioData.range / 100);
				this._sendProtocol(protocol);
			}

			isMouseDown = false;
			mousedownPlanet = null;
			mouseupPlanet = null;
		});
	}

	private _getPointedPlanet(x: number, y: number): GameProtocols.BasePlanet {
		let trans = this._gameStage.getTrans();
		x = (x - trans.horizontalMoving) / trans.scaling;
		y = (y - trans.verticalMoving) / trans.scaling;
		return this._gameStage.getPointedPlanet(x, y);
	}
}