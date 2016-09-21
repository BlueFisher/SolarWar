import * as events from 'events';
import * as $ from 'jquery';
import * as GameProtocols from '../protocols/game_protocols';

export default class StageManager extends events.EventEmitter {
	private _gameStageCanvas: HTMLCanvasElement;
	private _uiStageCanvas: HTMLCanvasElement;
	private _transformation = {
		scaling: 1,
		horizontalMoving: 0,
		verticalMoving: 0
	}
	private _currPlayerId: number;
	private _$countRatio: JQuery;

	constructor(gameStageCanvas: HTMLCanvasElement, uiStageCanvas: HTMLCanvasElement, $countRatio: JQuery) {
		super();

		this._gameStageCanvas = gameStageCanvas;
		this._uiStageCanvas = uiStageCanvas;
		this._$countRatio = $countRatio;

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

			if (!planet) {
				this._transformation.horizontalMoving -= deltaScaling * (point.x - this._transformation.horizontalMoving) / this._transformation.scaling;
				this._transformation.verticalMoving -= deltaScaling * (point.y - this._transformation.verticalMoving) / this._transformation.scaling;
			} else {
				this._transformation.horizontalMoving -= deltaScaling * planet.position.x;
				this._transformation.verticalMoving -= deltaScaling * planet.position.y;
			}
			this._transformation.scaling += deltaScaling;
			let mousemoveEvent = new $.Event('mousemove', {
				pageX: e.pageX,
				pageY: e.pageY
			});
			$canvas.trigger(mousemoveEvent);
			this.redrawStage();
		});

		let drawActivePlanet = (planet: GameProtocols.PlanetProtocol) => {
			ctx.save();
			ctx.setTransform(this._transformation.scaling, 0, 0, this._transformation.scaling, this._transformation.horizontalMoving, this._transformation.verticalMoving);
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
				if (mousedownPlanet && mouseWhich == 1) {
					ctx.clearRect(0, 0, this._uiStageCanvas.width, this._uiStageCanvas.height);

					drawActivePlanet(mousedownPlanet);

					ctx.save();
					ctx.beginPath();
					ctx.moveTo(mousedownPlanet.position.x, mousedownPlanet.position.y);
					ctx.lineTo(point.x, point.y);
					ctx.stroke();
					ctx.restore();

					mouseupPlanet = this._getPointedPlanet(point.x, point.y);
					if (mouseupPlanet) {
						drawActivePlanet(mouseupPlanet);
					}
				} else {
					if (mousedownPlanet) {
						ctx.clearRect(0, 0, this._uiStageCanvas.width, this._uiStageCanvas.height);
						drawActivePlanet(mousedownPlanet);
					}

					this._transformation.horizontalMoving += point.x - mousedownPoint.x;
					this._transformation.verticalMoving += point.y - mousedownPoint.y;
					this.redrawStage();
					mousedownPoint = point;
				}
			} else {
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
		if (this._lastGameStatusProtocol != undefined) {
			x = (x - this._transformation.horizontalMoving) / this._transformation.scaling;
			y = (y - this._transformation.verticalMoving) / this._transformation.scaling;
			for (let planet of this._lastGameStatusProtocol.planets) {
				if (Math.sqrt(Math.pow(x - planet.position.x, 2) + Math.pow(y - planet.position.y, 2)) < planet.size / 2 + 20) {
					return planet;
				}
			}
		}
		return null;
	}

	refreshCurrPlayerId(id: number) {
		this._currPlayerId = id;
		let [minPosition, maxPosition] = this._getMapMainRange(this._lastGameStatusProtocol.planets);
		this._setStageTransformation(minPosition, maxPosition);
		this.redrawStage();
	}

	private _lastGameStatusProtocol: GameProtocols.GameStatusProtocol;
	redrawStage() {
		if (this._lastGameStatusProtocol != undefined) {
			this.stageChange(this._lastGameStatusProtocol);
		}
	}
	private _getMapMainRange(planets: GameProtocols.PlanetProtocol[]): [GameProtocols.Point, GameProtocols.Point] {
		let range = 200;
		let minPosition: GameProtocols.Point = { x: Infinity, y: Infinity };
		let maxPosition: GameProtocols.Point = { x: -Infinity, y: -Infinity };
		if (planets.length == 0 || this._currPlayerId == null) {
			return [maxPosition, minPosition];
		}

		planets.forEach(p => {
			if (p.occupiedPlayerId == this._currPlayerId || p.allShips.filter(s => s.playerId == this._currPlayerId).length == 1 ||
				(p.occupyingStatus != null && p.occupyingStatus.playerId == this._currPlayerId)) {
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
	private _setStageTransformation(minPosition: GameProtocols.Point, maxPosition: GameProtocols.Point) {
		let scaling = Math.sqrt((this._gameStageCanvas.width * this._gameStageCanvas.height) / ((maxPosition.x - minPosition.x) * (maxPosition.y - minPosition.y)));
		let horizontalMoving = -(minPosition.x * scaling - (this._gameStageCanvas.width - (maxPosition.x - minPosition.x) * scaling) / 2);
		let verticalMoving = -(minPosition.y * scaling - (this._gameStageCanvas.height - (maxPosition.y - minPosition.y) * scaling) / 2);
		this._transformation = {
			scaling: scaling,
			horizontalMoving: horizontalMoving,
			verticalMoving: verticalMoving
		};
	}
	stageChange(status: GameProtocols.GameStatusProtocol) {
		this._lastGameStatusProtocol = status;
		let ctx = this._gameStageCanvas.getContext('2d');
		ctx.clearRect(0, 0, this._gameStageCanvas.width, this._gameStageCanvas.height);

		ctx.save();
		ctx.setTransform(this._transformation.scaling, 0, 0, this._transformation.scaling, this._transformation.horizontalMoving, this._transformation.verticalMoving);
		// 绘制飞船移动
		ctx.save();

		ctx.font = '14px Arial,Microsoft YaHei';

		status.movingShipsQueue.forEach(movingShips => {
			let planetFrom = status.planets.filter(p => p.id == movingShips.planetFromId)[0];
			let planetTo = status.planets.filter(p => p.id == movingShips.planetToId)[0];
			let x = planetTo.position.x - movingShips.distanceLeft * (planetTo.position.x - planetFrom.position.x) / movingShips.distance;
			let y = planetTo.position.y - movingShips.distanceLeft * (planetTo.position.y - planetFrom.position.y) / movingShips.distance;
			let color = status.players.filter(player => player.id == movingShips.playerId)[0].color;

			ctx.fillStyle = color;
			ctx.fillText(movingShips.count.toString(), x, y);
		});
		ctx.restore();

		status.planets.forEach(planet => {
			// 绘制星球
			ctx.save();
			ctx.beginPath();
			ctx.arc(planet.position.x, planet.position.y, planet.size / 2, 0, Math.PI * 2);
			if (planet.occupiedPlayerId != null) {
				let color = status.players.filter(player => player.id == planet.occupiedPlayerId)[0].color;
				ctx.fillStyle = color;
			} else {
				ctx.fillStyle = '#ddd';
			}
			ctx.fill();

			// 绘制星球id
			ctx.fillStyle = 'black';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.font = '14px Arial,Microsoft YaHei';
			ctx.fillText(planet.id.toString(), planet.position.x, planet.position.y);
			ctx.restore();

			// 绘制星球争夺或平静状态
			ctx.save();
			ctx.font = '14px Arial,Microsoft YaHei';
			if (planet.allShips.length == 1) {
				ctx.textAlign = 'center';
				let player = status.players.filter(player => player.id == planet.allShips[0].playerId)[0];
				ctx.fillStyle = player.color;
				ctx.fillText(`${player.name} ${planet.allShips[0].count}`, planet.position.x, planet.position.y + planet.size / 2 + 15);
			} else if (planet.allShips.length > 1) {
				let sum = 0;
				planet.allShips.forEach(p => sum += p.count);

				let currAngle = 0;
				planet.allShips.forEach(ship => {
					ctx.beginPath();
					let nextAngle = currAngle + Math.PI * 2 * ship.count / sum;
					ctx.arc(planet.position.x, planet.position.y, planet.size / 2 + 5, currAngle, nextAngle);

					let player = status.players.filter(player => player.id == ship.playerId)[0];
					ctx.strokeStyle = ctx.fillStyle = player.color;
					let x = planet.position.x + Math.cos((currAngle + nextAngle) / 2) * (planet.size + 10);
					let y = planet.position.y + Math.sin((currAngle + nextAngle) / 2) * (planet.size + 10);
					ctx.fillText(`${player.name} ${ship.count}`, x, y);
					currAngle = nextAngle;

					ctx.lineWidth = 5;
					ctx.stroke();
				});
			}
			ctx.restore();
			//绘制星球占领中状态
			if ((planet.allShips.length == 1 || planet.allShips.length == 0)
				&& planet.occupyingStatus != null && planet.occupyingStatus.percent != 100) {
				ctx.save();
				let player = status.players.filter(player => player.id == planet.occupyingStatus.playerId)[0];
				ctx.beginPath();
				let angle = Math.PI * 2 * planet.occupyingStatus.percent / 100;
				ctx.arc(planet.position.x, planet.position.y, planet.size / 2 + 5, 0, angle);

				ctx.strokeStyle = player.color;
				ctx.lineWidth = 5;
				ctx.stroke();
				ctx.restore();
			}
		});
		ctx.restore();
	}
}