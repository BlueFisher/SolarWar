import * as events from 'events';
import * as $ from 'jquery';
import * as GameProtocols from '../protocols/game_protocols';

export default class GameStage extends events.EventEmitter {
	private _canvas: HTMLCanvasElement;
	private _ctx: CanvasRenderingContext2D;
	private _currPlayerId: number;
	private _$countRatio: JQuery;

	constructor($canvas: JQuery, $countRatio: JQuery) {
		super();

		this._canvas = <HTMLCanvasElement>$canvas[0];
		this._ctx = this._canvas.getContext("2d");
		this._$countRatio = $countRatio;

		this._handleMovingShips(this._canvas);
	}

	refreshCurrPlayerId(id: number) {
		this._currPlayerId = id;
	}

	private _handleMovingShips(canvas: HTMLCanvasElement) {
		let $canvas = $(canvas);

		$canvas.on('mousedown', e => {
			let startPoint: GameProtocols.Point, endPoint: GameProtocols.Point;
			startPoint = {
				x: e.pageX - $canvas.offset().left,
				y: e.pageY - $canvas.offset().top
			}

			$canvas.on('mousemove', (e) => {
				endPoint = {
					x: e.pageX - $canvas.offset().left,
					y: e.pageY - $canvas.offset().top
				}

				this.redrawStage();
				this._ctx.save();
				this._ctx.beginPath();
				this._ctx.moveTo(startPoint.x, startPoint.y);
				this._ctx.lineTo(endPoint.x, endPoint.y);
				this._ctx.stroke();
				this._ctx.restore();
			});

			$canvas.one('mouseup', e => {
				endPoint = {
					x: e.pageX - $canvas.offset().left,
					y: e.pageY - $canvas.offset().top
				}

				let planetFrom = this._getPointedPlanet(startPoint.x, startPoint.y);
				let planetTo = this._getPointedPlanet(endPoint.x, endPoint.y);

				if (planetFrom != null && planetTo != null) {
					let protocol: GameProtocols.MovingShips = {
						type: GameProtocols.GameProtocolType.movingShips,
						planetFromId: planetFrom.id,
						planetToId: planetTo.id,
						countRatio: this._$countRatio.val() / 100,
					}
					this.emit('protocolSend', protocol);
				}

				this.redrawStage();
				$canvas.off('mousemove');
			});
		});
	}
	private _getPointedPlanet(x: number, y: number): GameProtocols.PlanetProtocol {
		for (let planet of this._lastGameStatusProtocol.planets) {
			if (Math.sqrt(Math.pow(x - planet.position.x, 2) + Math.pow(y - planet.position.y, 2)) < planet.size / 2 + 20) {
				return planet;
			}
		}
		return null;
	}

	private _lastGameStatusProtocol: GameProtocols.GameStatusProtocol;
	redrawStage() {
		if (this._lastGameStatusProtocol != undefined) {
			this.stageChange(this._lastGameStatusProtocol);
		}
	}
	stageChange(status: GameProtocols.GameStatusProtocol) {
		this._lastGameStatusProtocol = status;
		let ctx = this._ctx;

		ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
		ctx.font = '14px Arial,Microsoft YaHei';

		status.movingShipsQueue.forEach(movingShips => {
			let planetFrom = status.planets.filter(p => p.id == movingShips.planetFromId)[0];
			let planetTo = status.planets.filter(p => p.id == movingShips.planetToId)[0];
			let x = planetTo.position.x - movingShips.distanceLeft * (planetTo.position.x - planetFrom.position.x) / movingShips.distance;
			let y = planetTo.position.y - movingShips.distanceLeft * (planetTo.position.y - planetFrom.position.y) / movingShips.distance;
			let color = status.players.filter(player => player.id == movingShips.playerId)[0].color;

			ctx.fillStyle = color;
			ctx.fillText(movingShips.count.toString(), x, y);
		})

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
			ctx.fillText(planet.id.toString(), planet.position.x, planet.position.y);
			ctx.restore();

			// 绘制星球争夺或平静状态
			if (planet.allShips.length == 1) {
				ctx.save();
				ctx.textAlign = 'center';
				let player = status.players.filter(player => player.id == planet.allShips[0].playerId)[0];
				ctx.fillStyle = player.color;
				ctx.fillText(`${player.name} ${planet.allShips[0].count}`, planet.position.x, planet.position.y + planet.size / 2 + 15);
				ctx.restore();
			} else if (planet.allShips.length > 1) {
				let sum = 0;
				planet.allShips.forEach(p => sum += p.count);

				let currAngle = 0;
				planet.allShips.forEach(ship => {
					ctx.save();
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
					ctx.restore();
				});
			}

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
	}
}