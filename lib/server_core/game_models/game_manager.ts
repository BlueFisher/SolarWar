import * as events from 'events';

import config from '../../shared/config';
import * as GameProtocols from '../../shared/game_protocols';

import * as Map from './map_loader';
import MovingShipsManager from './game_manager_moving_ships';
import TimeManager from './game_manager_timer';
import Player from './player';
import Planet from './planet';


export default class GameManager extends events.EventEmitter {
	static events = {
		sendToAllDirectly: 'sendToAllDirectly',
		gameStarted: 'gameStarted',
		gameOver: 'gameOver'
	}

	private _players: Player[] = [];
	private _planets: Planet[] = [];
	private _movingShipsManager: MovingShipsManager;
	private _timeManager: TimeManager;

	private _mapLoader: Map.MapLoader;

	/**
	 * 游戏逻辑管理
	 */
	constructor() {
		super();
		this._mapLoader = new Map.MapLoader();
		this._movingShipsManager = new MovingShipsManager(this.emit.bind(this));
		this._timeManager = new TimeManager(this.emit.bind(this));
	}

	private _currPlanetId = 0;
	private _getNextPlanetId(): number {
		return ++this._currPlanetId;
	}

	private _currPlayerId = 0;
	private _getNextPlayerId(): number {
		return ++this._currPlayerId;
	}

	private _planetChanged(planet: Planet, players: Player[], interval?: number) {
		players.forEach((basePlayer) => {
			let player = this._players.filter(p => p.id == basePlayer.id)[0];

			if (player.currShipsCount == 0) {
				// 查找有没有星球上还有当前玩家的残留，如果没有则该玩家游戏结束
				if (this._planets.find(p => p.occupyingStatus &&
					(p.occupiedPlayer && p.occupiedPlayer.id == player.id || p.occupyingStatus.player.id == player.id))) {
					player.isGameOver = false;
				} else {
					player.isGameOver = true;
					this.emit(GameManager.events.gameOver, player.id);
				}
			}
		});

		if (interval) {
			this.emit(GameManager.events.sendToAllDirectly, new GameProtocols.StartOccupyingPlanet(planet.getBasePlanetProtocol(), players.map(p => p.getBasePlayerProtocol()), interval));
		} else {
			this.emit(GameManager.events.sendToAllDirectly, new GameProtocols.ChangedPlanet(planet.getBasePlanetProtocol(), players.map(p => p.getBasePlayerProtocol())));
		}
	}

	dispose() {
		this._planets.forEach(p => p.dispose());

		this._players = [];
		this._planets = [];
		this._movingShipsManager.dispose();
		this._mapLoader = null;
	}

	isGameStarted(): boolean {
		return this._timeManager.isGameStarted();
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
			movingShipsQueue: this._movingShipsManager.getMovingShipsQueue()
		};
	}

	/**增加玩家
	 * @param name 玩家昵称
	 * @return [玩家id, 新增的星球]
	 */
	addPlayer(name: string): [number, GameProtocols.ChangedPlanet[]] {
		let player = new Player(this._getNextPlayerId(), name, 0);
		this._players.push(player);

		let newPlanets: Planet[] = [];
		let mapPlanets = this._mapLoader.getNextPlanets();

		mapPlanets.forEach(p => {
			newPlanets.push(new Planet(this._getNextPlanetId(), p.size, p.position, (planet, players, interval) => {
				this._planetChanged(planet, players, interval);
			}, p.type == GameProtocols.PlanetType.Occupied ? player : null));
		});

		let newPlanetProtocols: GameProtocols.ChangedPlanet[] = newPlanets.map(p => {
			this._planets.push(p);
			return new GameProtocols.ChangedPlanet(p.getBasePlanetProtocol(), [player.getBasePlayerProtocol()]);
		});

		return [player.id, newPlanetProtocols];
	}
	/**
	 * 移动玩家飞船
	 * @param id 玩家id
	 * @param planetFromId 源星球id
	 * @param planetToId 目的星球id
	 * @param countRatio 从源星球移动的飞船比例
	 */
	movePlayerShips(id: number, planetFromId: number, planetToId: number, countRatio: number) {
		let planetFrom = this._planets.filter(p => p.id == planetFromId)[0];
		let planetTo = this._planets.filter(p => p.id == planetToId)[0];
		let player = this._players.filter(p => p.id == id)[0];
		this._movingShipsManager.movePlayerShips(player, planetFrom, planetTo, countRatio);
	}
	/**
	 * 获取玩家历史最高的人口飞船数
	 */
	getPlayerHistoryMaxShipsCount(id: number): number {
		let player = this._players.filter(p => p.id == id)[0];
		return this._players.filter(p => p.id == id)[0].historyMaxShipsCount;
	}

	isPlayerOnGame(id: number): boolean {
		let player = this._players.filter(p => p.id == id)[0];
		return player && !player.isGameOver;
	}
}