import * as events from 'events';
import {PlanetType, Map, MapLoader} from './map_loader'
import Player from './player';
import Planet from './planet';
import {GameProtocolType, GameStatusProtocol} from '../protocols/game_protocols';

interface _movingShipsQueue {
	planetFrom: Planet,
	planetTo: Planet,
	player: Player,
	count: number,
	distance: number,
	distanceLeft: number
}

class GameManager extends events.EventEmitter {
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
	}

	private _initializeMap() {
		let map = MapLoader.getMap();
		this._map = {
			size: map.size,
			planets: []
		};
		map.planets.forEach(p => {
			if (p.type == PlanetType.None) {
				this._planets.push(new Planet(this._getNextPlanetId(), p.size, p.position, () => {
					this._statusChange();
				}));
			} else if (p.type == PlanetType.Occupied) {
				this._map.planets.push(p);
			}
		});

		this._statusChange();
	}

	/**增加玩家 */
	addPlayer(name: string): number {
		let player = new Player(this._getNextPlayerId(), name, 0);
		this._players.push(player);
		let mapPlanet = this._map.planets.pop();
		if (mapPlanet != undefined) {
			this._planets.push(new Planet(this._getNextPlanetId(), mapPlanet.size, mapPlanet.position, () => {
				this._statusChange();
			}, player));
		} else {
			this._planets.push(new Planet(this._getNextPlanetId(), 50, {
				x: Math.random() * 1500,
				y: Math.random() * 900
			}, this._statusChange.bind(this), player));
		}

		this._statusChange();

		return player.id;
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
			this._statusChange();
			this._moveShips();
		}, 16);
	}

	private _statusChange(): GameStatusProtocol {
		this._players.forEach((player, index) => {
			if (player.currShipsCount == 0) {
				let isGameOver = true;
				this._planets.forEach((planet, index) => {
					if (planet.occupyingStatus != null) {
						if (planet.occupiedPlayer == player || planet.occupyingStatus.player == player) {
							isGameOver = false;
							return;
						}
					}
				});
				if (isGameOver) {
					this._players.splice(index, 1);
					this.emit('gameOver', player.id);
				}
			}
		});

		let status: GameStatusProtocol = {
			size: this._map.size,
			type: GameProtocolType.gameStatus,
			players: this._players.map(p => {
				return p.getPlayerProtocol();
			}),
			planets: this._planets.map(p => {
				return p.getPlanetProtocol();
			}),
			movingShipsQueue: this._movingShipsQueue.map(elem => {
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

		this.emit('statusChange', status);
		return status;
	}
}

export default GameManager;