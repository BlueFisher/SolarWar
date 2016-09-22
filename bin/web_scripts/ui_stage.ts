import * as events from 'events';
import * as $ from 'jquery';
import * as GameProtocols from '../protocols/game_protocols';
import GameStage from './game_stage';

export default class UiStage extends events.EventEmitter {
	private _gameStage: GameStage;
	private _uiStageCanvas: HTMLCanvasElement;
	private _$countRatio: JQuery;

	constructor(uiStageCanvas: HTMLCanvasElement, $countRatio: JQuery, gameStage: GameStage) {
		super();

		this._uiStageCanvas = uiStageCanvas;
		this._$countRatio = $countRatio;
		this._gameStage = gameStage;

		this._handleMovingShips();
	}

	private _handleMovingShips() {
		let $canvas = $(this._uiStageCanvas);
		let ctx = this._uiStageCanvas.getContext('2d');
		$canvas.on('contextmenu', function (e) {
			return false;
		});
		$canvas.mousewheel(e => {
			let point = {
				x: e.pageX - $canvas.offset().left,
				y: e.pageY - $canvas.offset().top
			};
			let deltaScaling = e.deltaY / e.deltaFactor * 2;

			let planet = this._getPointedPlanet(point.x, point.y);
			if (planet) { // 如果滚轮滑动时在星球上则缩放中心为该星球中心
				this._gameStage.transformation.horizontalMoving -= deltaScaling * planet.position.x;
				this._gameStage.transformation.verticalMoving -= deltaScaling * planet.position.y;
			} else {
				this._gameStage.transformation.horizontalMoving -= deltaScaling * (point.x - this._gameStage.transformation.horizontalMoving) / this._gameStage.transformation.scaling;
				this._gameStage.transformation.verticalMoving -= deltaScaling * (point.y - this._gameStage.transformation.verticalMoving) / this._gameStage.transformation.scaling;
			}
			this._gameStage.transformation.scaling += deltaScaling;

			// 触发鼠标移动事件来重绘星球激活效果
			$canvas.trigger(new $.Event('mousemove', {
				pageX: e.pageX,
				pageY: e.pageY
			}));
			this._gameStage.redrawStage();
		});

		/**绘制星球激活特效 */
		let drawActivePlanet = (planet: GameProtocols.PlanetProtocol) => {
			ctx.save();
			ctx.setTransform(this._gameStage.transformation.scaling, 0, 0, this._gameStage.transformation.scaling, this._gameStage.transformation.horizontalMoving, this._gameStage.transformation.verticalMoving);
			ctx.beginPath();
			ctx.arc(planet.position.x, planet.position.y, planet.size / 2 + 10, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
		}
		let mousedownPoint: GameProtocols.Point;
		let mousedownPlanet: GameProtocols.PlanetProtocol;
		let mouseupPlanet: GameProtocols.PlanetProtocol;
		let isMouseDown = false;
		let mouseWhich = 1;
		$canvas.on('mousemove', e => {
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
					ctx.setTransform(this._gameStage.transformation.scaling, 0, 0, this._gameStage.transformation.scaling, this._gameStage.transformation.horizontalMoving, this._gameStage.transformation.verticalMoving);
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

					this._gameStage.transformation.horizontalMoving += point.x - mousedownPoint.x;
					this._gameStage.transformation.verticalMoving += point.y - mousedownPoint.y;
					this._gameStage.redrawStage();
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
			isMouseDown = false;
			$canvas.css({ cursor: 'default' });

			if (mousedownPlanet != null && mouseupPlanet != null) {
				let protocol: GameProtocols.MovingShips = {
					type: GameProtocols.GameProtocolType.movingShips,
					planetFromId: mousedownPlanet.id,
					planetToId: mouseupPlanet.id,
					countRatio: this._$countRatio.val() / 100,
				}
				this.emit('protocolSend', protocol);
			}
		});
	}

	private _getPointedPlanet(x: number, y: number): GameProtocols.PlanetProtocol {
		x = (x - this._gameStage.transformation.horizontalMoving) / this._gameStage.transformation.scaling;
		y = (y - this._gameStage.transformation.verticalMoving) / this._gameStage.transformation.scaling;
		return this._gameStage.getPointedPlanet(x, y);
	}
}