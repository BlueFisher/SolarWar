import * as events from 'events';
import Config from '../protocols/config';
import * as Map from './map_loader';
import Player from './player';
import Planet from './planet';
import * as GameProtocols from '../protocols/game_protocols';

interface MovingShipsQueue {
	planetFrom: Planet,
	planetTo: Planet,
	player: Player,
	count: number,
	distance: number,
	distanceLeft: number
}

export default class GameManager extends events.EventEmitter {
	static events = {
		gameReadyTimeChanged: 'gameReadyTimeChanged',
		gameStarted: 'gameStarted',
		planetChanged: 'planetChanged',
		gameTimeChanged: 'gameTimeChanged',
		movingShipsQueueChanged: 'movingShipsQueueChanged',
		gameOver: 'gameOver'
	};

	private _gameReadyTime = Config.gameReadyTime;
	private _gameTime = Config.gameTime;

	private _players: Player[] = [];
	private _planets: Planet[] = [];
	private _movingShipsQueue: MovingShipsQueue[] = [];

	private _mapLoader = new Map.MapLoader();

	/**
	 * 游戏逻辑管理
	 */
	constructor() {
		super();
		// this._initializeMap();
		this._gameReadyTimeElapse();
	}

	dispose() {
		this._planets.forEach(p => p.dispose());

		this._players = [];
		this._planets = [];
		this._movingShipsQueue = [];
		this._mapLoader = null;
	}

	// private _initializeMap() {

	// }

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
		});
	}

	/**获取当前完整的地图信息 */
	getMap(): GameProtocols.Map {
		return {
			players: this._players.map(p => {
				return p.getBasePlayerProtocol();
			}),
			planets: this._planets.map(p => {
				return p.getBasePlanetProtocol();
			}),
			movingShipsQueue: this._getMovingShipsQueue()
		};
	}

	/**增加玩家
	 * @param name 玩家昵称
	 */
	addPlayer(name: string): [number, GameProtocols.Planet[]] {
		let player = new Player(this._getNextPlayerId(), name, 0);
		this._players.push(player);

		let newPlanets: Planet[] = [];
		let mapPlanets = this._mapLoader.getNextPlanets();

		if (mapPlanets.length) {
			mapPlanets.forEach(p => {
				newPlanets.push(new Planet(this._getNextPlanetId(), p.size, p.position, (planet) => {
					this._planetChanged(planet);
				}, p.type == GameProtocols.PlanetType.Occupied ? player : null));
			});
		}

		let newPlanetProtocols: GameProtocols.Planet[] = newPlanets.map(p => {
			this._planets.push(p);
			return new GameProtocols.Planet(p.getBasePlanetProtocol(), [player.getBasePlayerProtocol()]);
		});

		return [player.id, newPlanetProtocols];
	}
	getPlayerHistoryMaxShipsCount(id: number): number {
		return this._players.filter(p => p.id == id)[0].historyMaxShipsCount;
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
			let distance = GameManager._getTwoPlanetsDistance(planetFrom, planetTo);
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

	private static _getTwoPlanetsDistance(planet1: Planet, planet2: Planet) {
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
		};

		if (!canMoveShips())
			return;

		setTimeout(() => {
			if (!canMoveShips())
				return;

			for (let i in this._movingShipsQueue) {
				let movingShip = this._movingShipsQueue[i];
				let deltaDistance = Config.algorithm.getMovingShipsDeltaDistance(movingShip.count, movingShip.distance, movingShip.distanceLeft);

				// 如果已到目的星球，则调用shipsArrived，并从飞行队列中移除
				if ((movingShip.distanceLeft -= deltaDistance) <= 0) {
					movingShip.planetTo.shipsArrived(movingShip.player, movingShip.count);
					this._movingShipsQueue.splice(parseInt(i), 1);
				}
			}

			this._movingShipsQueueChange();
			this._moveShips();
		}, Config.algorithm.getMovingShipsInterval());
	}

	private _planetChanged(planetProtocol: GameProtocols.Planet) {
		planetProtocol.players.forEach((player) => {
			if (player.currShipsCount == 0) {
				let isGameOver = true;
				this._planets.forEach((planet) => {
					if (planet.occupyingStatus != null) {
						if ((planet.occupiedPlayer != null && planet.occupiedPlayer.id == player.id) || planet.occupyingStatus.player.id == player.id) {
							isGameOver = false;
							return;
						}
					}
				});
				if (isGameOver) {
					this.emit(GameManager.events.gameOver, player.id);

					let index: number;
					this._players.forEach((p, i) => {
						if (p.id == player.id) {
							index = i;
							return;
						}
					});

					if (index != undefined) {
						this._players.splice(index, 1);
					}
				}
			}
		});
		this.emit(GameManager.events.planetChanged, planetProtocol);
	}

	private _movingShipsQueueChange() {
		let protocol = new GameProtocols.MovingShipsQueue([], this._getMovingShipsQueue());
		this.emit(GameManager.events.movingShipsQueueChanged, protocol);
	}

	isGameStarted(): boolean {
		return this._gameReadyTime == 0;
	}
	private _gameReadyTimeElapse() {
		if (this._gameReadyTime == 0) {
			this._gameTimeElapse();
			this.emit(GameManager.events.gameStarted);
			return;
		}
		this._gameReadyTime--;
		this.emit(GameManager.events.gameReadyTimeChanged, new GameProtocols.ReadyTimeElapse(this._gameReadyTime));
		setTimeout(() => {
			this._gameReadyTimeElapse();
		}, 1000);
	}

	private _gameTimeElapse() {
		if (this._gameTime == 0) {
			this.emit(GameManager.events.gameOver);
			return;
		}
		this._gameTime--;
		this.emit(GameManager.events.gameTimeChanged, new GameProtocols.TimeElapse(this._gameTime));
		setTimeout(() => {
			this._gameTimeElapse();
		}, 1000);
	}
}