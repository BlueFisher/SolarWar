import * as GameProtocols from '../protocols/game_protocols';

export default class PlanetsManager {
	private _map: GameProtocols.Map;
	private _redrawStage: () => void;
	constructor(redrawStage: () => void) {
		this._redrawStage = redrawStage;
	}

	getPointedPlanet(x: number, y: number): GameProtocols.BasePlanet {
		if (this._map != undefined) {
			for (let planet of this._map.planets) {
				if (Math.sqrt(Math.pow(x - planet.position.x, 2) + Math.pow(y - planet.position.y, 2)) < planet.size / 2 + 20) {
					return planet;
				}
			}
		}
		return null;
	}
	drawPlanets(ctx: CanvasRenderingContext2D, map: GameProtocols.Map) {
		this._map = map;
		map.planets.forEach(planet => {
			// 绘制星球
			ctx.save();
			ctx.beginPath();
			ctx.arc(planet.position.x, planet.position.y, planet.size / 2, 0, Math.PI * 2);
			if (planet.occupiedPlayerId != null) {
				ctx.fillStyle = map.players.filter(player => player.id == planet.occupiedPlayerId)[0].color;
			} else {
				ctx.fillStyle = '#ddd';
			}
			ctx.fill();
			ctx.restore();

			// 绘制星球争夺或平静状态
			ctx.save();
			ctx.font = '14px Arial,Microsoft YaHei';
			if (planet.allShips.length == 1) {
				ctx.textAlign = 'center';
				let player = map.players.filter(player => player.id == planet.allShips[0].playerId)[0];
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

					let player = map.players.filter(player => player.id == ship.playerId)[0];
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

			// 绘制星球占领中状态
			if ((planet.allShips.length == 1 || planet.allShips.length == 0)
				&& planet.occupyingStatus != null && planet.occupyingStatus.percent < 100) {
				ctx.save();
				let player = map.players.filter(player => player.id == planet.occupyingStatus.playerId)[0];
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
		this.changePlanet(protocol);
		let planet = this._map.planets.filter(p => p.id == protocol.planet.id)[0];
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

		let timeDifference = (new Date().getTime() - protocol.startDateTime.getTime()) / protocol.interval;
		if (occupyingPlayerId == planet.occupyingStatus.playerId) {
			planet.occupyingStatus.percent += timeDifference;
		} else {
			planet.occupyingStatus.percent -= timeDifference;
		}

		let smooth = 1 / (planet.size / 10);
		let timer = setInterval(() => {
			planet = this._map.planets.filter(p => p.id == protocol.planet.id)[0];
			if (planet.allShips.length != 1) {
				this._clearOccupyingInterval(planet.id);
				return;
			}

			let occupyingPlayerId = planet.allShips[0].playerId;

			if (occupyingPlayerId == planet.occupyingStatus.playerId) {
				if ((planet.occupyingStatus.percent += smooth) >= 100) {
					planet.occupiedPlayerId = occupyingPlayerId;

					this._clearOccupyingInterval(planet.id);
				}
			} else {
				if ((planet.occupyingStatus.percent -= smooth) <= 0) {
					if (planet.occupiedPlayerId == planet.occupyingStatus.playerId) {
						planet.occupiedPlayerId = null;
					}
					planet.occupyingStatus.playerId = occupyingPlayerId;

					this._clearOccupyingInterval(planet.id);
				}
			}

			this._redrawStage();
		}, protocol.interval * smooth);

		this._setOccupyingInterval(planet.id, timer);
	}

	changePlanet(protocol: GameProtocols.Planet) {
		let isExisted = false;
		this._map.planets.forEach((mapPlanet, mapIndex) => {
			if (mapPlanet.id == protocol.planet.id) {
				this._map.planets[mapIndex] = protocol.planet;
				isExisted = true;
				return;
			}
		});
		if (!isExisted) {
			this._map.planets.push(protocol.planet);
		}

		protocol.players.forEach((player) => {
			isExisted = false;
			this._map.players.forEach((mapPlayer, mapIndex) => {
				if (mapPlayer.id == player.id) {
					this._map.players[mapIndex] = player;
					isExisted = true;
					return;
				}
			});
			if (!isExisted) {
				this._map.players.push(player);
			}
		});

		this._redrawStage();
	}
}