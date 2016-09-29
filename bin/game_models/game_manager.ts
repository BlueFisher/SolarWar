import * as events from 'events';
import {PlanetType, Map, MapLoader} from './map_loader'
import Player from './player';
import Planet from './planet';
import * as GameProtocols from '../protocols/game_protocols';

interface _movingShipsQueue {
	planetFrom: Planet,
	planetTo: Planet,
	player: Player,
	count: number,
	distance: number,
	distanceLeft: number
}

class GameManager extends events.EventEmitter {
	private _gameTime = 60 * 16;
	private _players: Player[] = [];
	private _planets: Planet[] = [];
	private _movingShipsQueue: _movingShipsQueue[] = [];
	private _map: Map

	/**
	 * 游戏逻辑管理
	 */
	constructor() {
		super();
		this._initializeMap();
		this._gameTimeElapse();
	}

	private _initializeMap() {
		let map = MapLoader.getMap();
		this._map = {
			planets: []
		};
		map.planets.forEach(p => {
			if (p.type == PlanetType.None) {
				this._planets.push(new Planet(this._getNextPlanetId(), p.size, p.position, (planetProtocol) => {
					this._planetChange(planetProtocol);
				}));
			} else if (p.type == PlanetType.Occupied) {
				this._map.planets.push(p);
			}
		});
	}

	private _getMovingShipsQueue(): GameProtocols.BaseMovingShips[] {
		return this._movingShipsQueue.map(elem => {
			return {
				planetFromId: elem.planetFrom.id,
				planetToId: elem.planetTo.id,
				playerId: elem.player.id,
				count: elem.count,
				distance: elem.distance,
				distanceLeft: elem.distanceLeft
			}
		})
	}

	/**获取当前完整的地图信息 */
	getMap(): GameProtocols.Map {
		let map: GameProtocols.Map = {
			players: this._players.map(p => {
				return p.getBasePlayerProtocol();
			}),
			planets: this._planets.map(p => {
				return p.getBasePlanetProtocol();
			}),
			movingShipsQueue: this._getMovingShipsQueue()
		}

		return map;
	}

	/**增加玩家
	 * @param name 玩家昵称
	 */
	addPlayer(name: string): [number, GameProtocols.Planet[]] {
		let player = new Player(this._getNextPlayerId(), name, 0);
		this._players.push(player);
		let mapPlanet = this._map.planets.pop();

		let newPlanets: Planet[] = [];
		if (mapPlanet != undefined) {
			newPlanets.push(new Planet(this._getNextPlanetId(), mapPlanet.size, mapPlanet.position, (planet) => {
				this._planetChange(planet);
			}, player));
		} else {
			newPlanets.push(new Planet(this._getNextPlanetId(), 50, {
				x: Math.random() * 1500,
				y: Math.random() * 900
			}, (planet) => {
				this._planetChange(planet);
			}, player));
		}

		let newPlanetProtocols: GameProtocols.Planet[] = newPlanets.map(p => {
			this._planets.push(p);

			return new GameProtocols.Planet(p.getBasePlanetProtocol(), [player.getBasePlayerProtocol()]);
		})

		return [player.id, newPlanetProtocols];
	}

	private _currPlanetId = 0;
	private _getNextPlanetId(): number {
		return ++this._currPlanetId;
	}
	private _currPlayerId = 0;
	private _getNextPlayerId(): number {
		return ++this._currPlayerId;
	}

	/**
	 * 移动玩家飞船
	 * @param id 玩家id
	 * @param planetFromId 源星球id
	 * @param planetToId 目的星球id
	 * @param countRatio 从源星球移动的飞船比例
	 */
	movePlayerShips(id: number, planetFromId: number, planetToId: number, countRatio: number) {
		if (planetFromId == planetToId) {
			return;
		}
		let planetFrom = this._planets.filter(p => p.id == planetFromId)[0];
		let planetTo = this._planets.filter(p => p.id == planetToId)[0];
		let player = this._players.filter(p => p.id == id)[0];
		if (planetFrom == undefined || planetTo == undefined || player == undefined) {
			return;
		}
		if (countRatio > 1 || countRatio < 0) {
			return;
		}
		let count = planetFrom.shipsLeft(player, countRatio);
		if (count > 0) {
			// 计算连个星球之间距离，加入到飞行队列中，开始飞船移动计时器
			let distance = this._getTwoPlanetsDistance(planetFrom, planetTo);
			this._movingShipsQueue.push({
				planetFrom: planetFrom,
				planetTo: planetTo,
				player: player,
				count: count,
				distance: distance,
				distanceLeft: distance
			});
			this._startMovingShips();
		}
	}

	private _getTwoPlanetsDistance(planet1: Planet, planet2: Planet) {
		return Math.sqrt(Math.pow(planet1.position.x - planet2.position.x, 2) + Math.pow(planet1.position.y - planet2.position.y, 2)) - planet1.size / 2 - planet2.size / 2;
	}

	private _isMovingShips = false;
	private _startMovingShips() {
		if (!this._isMovingShips) {
			this._moveShips();
		}
	}
	private _moveShips() {
		let canMoveShips = (): boolean => {
			if (this._movingShipsQueue.length == 0) {
				return this._isMovingShips = false;
			}
			return this._isMovingShips = true;
		}

		if (!canMoveShips())
			return;

		setTimeout(() => {
			if (!canMoveShips())
				return;

			for (let i in this._movingShipsQueue) {
				let movingShip = this._movingShipsQueue[i];

				let deltaDistance: number;
				if (movingShip.count < 9) {
					deltaDistance = 2.5
				} else if (movingShip.count > 9) {
					deltaDistance = 1.25;
				} else {
					deltaDistance = -75 / 14 / Math.sqrt(movingShip.count) + 85 / 28;
				}

				// 如果已到目的星球，则调用shipsArrived，并从飞行队列中移除
				if ((movingShip.distanceLeft -= deltaDistance) <= 0) {
					movingShip.planetTo.shipsArrived(movingShip.player, movingShip.count);
					this._movingShipsQueue.splice(parseInt(i), 1);
				}
			}

			this._movingShipsQueueChange();
			this._moveShips();
		}, 16);
	}

	private _planetChange(planetProtocol: GameProtocols.Planet) {
		planetProtocol.players.forEach((player) => {
			if (player.currShipsCount == 0) {
				let isGameOver = true;
				this._planets.forEach((planet) => {
					if (planet.occupyingStatus != null) {
						if (planet.occupiedPlayer == player || planet.occupyingStatus.player == player) {
							isGameOver = false;
							return;
						}
					}
				});
				if (isGameOver) {
					let index: number;
					this._players.forEach((p, i) => {
						if (p == player) {
							index = i;
							return;
						}
					});
					this._players.splice(index, 1);
					this.emit('gameOver', player.id);
				}
			}
		});
		this.emit('planetChange', planetProtocol);
	}

	private _movingShipsQueueChange() {
		let protocol = new GameProtocols.MovingShipsQueue([], this._getMovingShipsQueue());
		this.emit('movingShipsQueueChange', protocol);
	}

	private _gameTimeElapse() {
		if (this._gameTime == 0) {
			this.emit('gameOver');
			return;
		}
		this._gameTime--;
		this.emit('gameTimeChange', new GameProtocols.Time(this._gameTime));
		setTimeout(() => {
			this._gameTimeElapse();
		}, 1000);
	}
}

export default GameManager;