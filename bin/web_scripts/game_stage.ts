import * as events from 'events';
import * as $ from 'jquery';
import * as GameProtocols from '../protocols/game_protocols';

export default class GameStage extends events.EventEmitter {
	private _canvas: HTMLCanvasElement;
	private _ctx: CanvasRenderingContext2D;
	private _currPlayerId: number;
	private _$countRatio: JQuery;

	constructor($canvas: JQuery, $countRatio: JQuery, currPlayerId: number) {
		super();

		this._canvas = <HTMLCanvasElement>$canvas[0];
		this._ctx = this._canvas.getContext("2d");
		this._$countRatio = $countRatio;
		this._currPlayerId = currPlayerId;

		this._handleMovingShips(this._canvas);
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
				this._ctx.beginPath();
				this._ctx.moveTo(startPoint.x, startPoint.y);
				this._ctx.lineTo(endPoint.x, endPoint.y);
				this._ctx.stroke();
				this._ctx.closePath();
			});

			$canvas.one('mouseup', e => {
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
			ctx.beginPath();
			ctx.arc(planet.position.x, planet.position.y, planet.size / 2, 0, Math.PI * 2);
			ctx.closePath();
			if (planet.occupiedPlayerId != null) {
				let color = status.players.filter(player => player.id == planet.occupiedPlayerId)[0].color;
				ctx.fillStyle = color;
			} else {
				ctx.fillStyle = '#ddd';
			}
			ctx.fill();

			ctx.fillStyle = 'black';
			ctx.textBaseline = 'middle';
			ctx.fillText(planet.id.toString(), planet.position.x, planet.position.y);


			ctx.textAlign = 'center';
			ctx.textBaseline = 'alphabetic';
			let currY = 0;
			planet.allShips.forEach(s => {
				let player = status.players.filter(player => player.id == s.playerId)[0];
				ctx.fillStyle = player.color;
				ctx.fillText(`${player.name} ${s.count}`, planet.position.x, planet.position.y + planet.size / 2 + 15 + currY);
				currY += 20;
			});

			if (planet.occupyingStatus != null) {
				let player = status.players.filter(player => player.id == planet.occupyingStatus.playerId)[0];
				ctx.fillStyle = player.color;
				ctx.fillText(`${player.name} ${planet.occupyingStatus.percent}%`, planet.position.x, planet.position.y - planet.size / 2 - 10);
			}
		});
	}
}