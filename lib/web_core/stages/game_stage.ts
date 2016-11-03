import * as GameProtocols from '../../shared/game_protocols';

import StageMediator from './stage_mediator';

export default class GameStage {
	private _canvas: HTMLCanvasElement;
	private _mediator: StageMediator;

	private _planetImgs: HTMLImageElement[] = [];

	constructor(gameStageCanvas: HTMLCanvasElement, gameStageMediator: StageMediator) {
		this._canvas = gameStageCanvas;
		this._mediator = gameStageMediator;

		for (let i = 1; i <= 5; i++) {
			let img = new Image();
			img.src = `/public/images/planets_0${i}.png`;
			this._planetImgs.push(img);
		}
	}

	getPointedPlanet(x: number, y: number): GameProtocols.BasePlanet {
		if (this._planets.length != 0) {
			for (let planet of this._planets) {
				if (Math.sqrt(Math.pow(x - planet.position.x, 2) + Math.pow(y - planet.position.y, 2)) < planet.size / 2 + 20) {
					return planet;
				}
			}
		}
		return null;
	}

	draw() {
		let players = this._mediator.players;
		let transformation = this._mediator.getTrans();

		let ctx = this._canvas.getContext('2d');
		ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

		ctx.save();
		ctx.setTransform(transformation.scaling, 0, 0, transformation.scaling, transformation.horizontalMoving, transformation.verticalMoving);

		this._planets.forEach(planet => {
			// 绘制星球
			ctx.save();

			let color = '#ddd';
			if (planet.occupiedPlayerId != null) {
				color = players.filter(player => player.id == planet.occupiedPlayerId)[0].color;
			}

			ctx.beginPath();
			ctx.arc(planet.position.x, planet.position.y, planet.size / 2, 0, Math.PI * 2);

			// setShadow(ctx, 1, 1, 15, color);
			var grd = ctx.createRadialGradient(planet.position.x - planet.size * 0.2, planet.position.y - planet.size * 0.2, planet.size / 2,
				planet.position.x - planet.size * 0.2, planet.position.y - planet.size * 0.2, planet.size * 1.5);
			grd.addColorStop(0, color);
			grd.addColorStop(1, 'rgba(0,0,0,.5)');

			ctx.fillStyle = grd;

			ctx.fill();
			ctx.drawImage(this._planetImgs[planet.id % this._planetImgs.length], planet.position.x - planet.size / 2, planet.position.y - planet.size / 2, planet.size, planet.size);
			ctx.restore();

			// 绘制星球争夺或平静状态
			ctx.save();
			ctx.font = '10px Arial,Microsoft YaHei';
			if (planet.allShips.length == 1) {
				ctx.textAlign = 'center';
				let player = players.filter(player => player.id == planet.allShips[0].playerId)[0];
				ctx.fillStyle = player.color;
				// setShadow(ctx, 1, 1, 15, player.color);
				ctx.fillText(`${player.name} ${planet.allShips[0].count}`, planet.position.x, planet.position.y + planet.size / 2 + 12);
			} else if (planet.allShips.length > 1) {
				let sum = 0;
				planet.allShips.forEach(p => sum += p.count);

				// 将当前玩家移至数组第一位
				let index = 0;
				planet.allShips.forEach((s, i) => {
					if (s.playerId == this._mediator.currPlayerId) {
						index = i;
						return;
					}
				});
				let currShips = planet.allShips.splice(index, 1)[0];
				planet.allShips.unshift(currShips);

				let currAngle = -Math.PI / 2 - Math.PI * planet.allShips[0].count / sum;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.lineWidth = 2;
				planet.allShips.forEach(ship => {
					ctx.beginPath();
					let nextAngle = currAngle + Math.PI * 2 * ship.count / sum;
					ctx.arc(planet.position.x, planet.position.y, planet.size / 2 + 5, currAngle, nextAngle);

					let player = players.filter(player => player.id == ship.playerId)[0];
					ctx.strokeStyle = ctx.fillStyle = player.color;
					let x = planet.position.x + Math.cos((currAngle + nextAngle) / 2) * (planet.size / 2 + 12);
					let y = planet.position.y + Math.sin((currAngle + nextAngle) / 2) * (planet.size / 2 + 12);

					ctx.fillText(ship.count.toString(), x, y);
					currAngle = nextAngle;
					setShadow(ctx, 0, 0, 30, player.color);
					ctx.stroke();
				});
			}
			ctx.restore();

			// 绘制星球占领中状态
			if ((planet.allShips.length == 1 || planet.allShips.length == 0)
				&& planet.occupyingStatus != null && planet.occupyingStatus.percent < 100) {
				ctx.save();
				let player = players.filter(player => player.id == planet.occupyingStatus.playerId)[0];
				ctx.beginPath();
				let angle = Math.PI * 2 * planet.occupyingStatus.percent / 100 - Math.PI / 2;
				ctx.arc(planet.position.x, planet.position.y, planet.size / 2 + 3, -Math.PI / 2, angle);

				setShadow(ctx, 0, 0, 30, player.color);
				ctx.lineCap = 'round';
				ctx.strokeStyle = player.color;
				ctx.lineWidth = 2;
				ctx.stroke();
				ctx.restore();
			}
		});

		ctx.restore();

		function setShadow(ctx: CanvasRenderingContext2D, x: number, y: number, blur: number, color: string) {
			ctx.shadowOffsetX = x; // 阴影Y轴偏移
			ctx.shadowOffsetY = y; // 阴影X轴偏移
			ctx.shadowBlur = blur; // 模糊尺寸
			ctx.shadowColor = color; // 颜色
		}
	}

	private _occupyingTimers: {
		planetId: number,
		timer: NodeJS.Timer
	}[] = [];
	private _setOccupyingInterval(planetId: number, timer: NodeJS.Timer) {
		let occupyingTimer = this._occupyingTimers.filter(p => p.planetId == planetId)[0];
		if (occupyingTimer == undefined) {
			this._occupyingTimers.push({
				planetId: planetId,
				timer: timer
			});
		} else {
			occupyingTimer.timer = timer;
		}
	}
	private _clearOccupyingInterval(planetId: number) {
		let occupyingTimer = this._occupyingTimers.filter(p => p.planetId == planetId)[0];
		if (occupyingTimer != undefined) {
			clearInterval(occupyingTimer.timer);
		}
	}
	startOccupyingPlanet(protocol: GameProtocols.StartOccupyingPlanet) {
		this.changePlanets([protocol.planet]);
		let planet = this._planets.filter(p => p.id == protocol.planet.id)[0];
		this._clearOccupyingInterval(planet.id);
		if (protocol.interval == -1) {
			return;
		}

		let occupyingPlayerId = planet.allShips[0].playerId;

		if (planet.occupyingStatus == null) {
			planet.occupyingStatus = {
				playerId: occupyingPlayerId,
				percent: 0
			};
		}

		let timer = setInterval(() => {
			planet = this._planets.filter(p => p.id == protocol.planet.id)[0];
			if (planet.allShips.length != 1) {
				this._clearOccupyingInterval(planet.id);
				return;
			}

			let occupyingPlayerId = planet.allShips[0].playerId;

			if (occupyingPlayerId == planet.occupyingStatus.playerId) {
				if ((planet.occupyingStatus.percent += 0.5) >= 100) {
					planet.occupiedPlayerId = occupyingPlayerId;

					this._clearOccupyingInterval(planet.id);
				}
			} else {
				if ((planet.occupyingStatus.percent -= 0.5) <= 0) {
					if (planet.occupiedPlayerId == planet.occupyingStatus.playerId) {
						planet.occupiedPlayerId = null;
					}
					planet.occupyingStatus.playerId = occupyingPlayerId;

					this._clearOccupyingInterval(planet.id);
				}
			}

			this.draw();
		}, Math.ceil(protocol.interval * 0.5));

		this._setOccupyingInterval(planet.id, timer);
	}

	private _planets: GameProtocols.BasePlanet[] = [];

	getPlanets(): GameProtocols.BasePlanet[] {
		return this._planets;
	}

	changePlanets(planets: GameProtocols.BasePlanet[]) {
		planets.forEach(p => {
			if (!this._planets[p.id - 1]) {
				this._planets.push(p);
			} else {
				this._planets[p.id - 1] = p;
			}
		});
		this.draw();
	}
}