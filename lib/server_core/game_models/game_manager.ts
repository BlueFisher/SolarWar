import * as events from 'events';

import config from '../../shared/config';
import * as GameProtocols from '../../shared/game_protocols';

import * as Map from './map_loader';
import MovingShipsManager from './game_manager_tools/moving_ships_manager';
import TimeManager from './game_manager_tools/timer_manager';
import { SolarObject } from './solar_object';
import Player from './player';
import Planet from './planet';
import Portal from './portal';

export default class GameManager extends events.EventEmitter {
	static events = {
		sendToAllDirectly: Symbol(),
		gameStarted: Symbol(),
		gameOver: Symbol()
	}

	private _players: Player[] = [];
	private _solarObjects: SolarObject[] = [];

	private _movingShipsManager: MovingShipsManager;
	private _timeManager: TimeManager;

	private _mapLoader: Map.MapLoader;

	/**
	 * 游戏逻辑管理
	 */
	constructor() {
		super();

		this._solarObjects.push(new Portal(50, { x: 0, y: 0 }, this._solarObjectChanged.bind(this)));

		this._mapLoader = new Map.MapLoader();
		this._movingShipsManager = new MovingShipsManager(this.emit.bind(this));
		this._timeManager = new TimeManager(this.emit.bind(this));
	}

	private _solarObjectChanged(obj: SolarObject, players: Player[], interval?: number) {
		players.forEach((basePlayer) => {
			let player = this._players.find(p => p.id == basePlayer.id);

			if (player.currShipsCount == 0) {
				// 查找有没有星球上还有当前玩家的残留，如果没有则该玩家游戏结束
				if (this._solarObjects.find(p => p.occupyingStatus &&
					(p.occupiedPlayer && p.occupiedPlayer.id == player.id || p.occupyingStatus.player.id == player.id))) {
					player.isGameOver = false;
				} else {
					player.isGameOver = true;
					this.emit(GameManager.events.gameOver, player.id);
				}
			}
		});

		if (interval) {
			this.emit(GameManager.events.sendToAllDirectly, new GameProtocols.StartOccupyingSolarObject(obj.getBaseSolarObjectProtocol(), players.map(p => p.getBasePlayerProtocol()), interval));
		} else {
			this.emit(GameManager.events.sendToAllDirectly, new GameProtocols.ChangedSolarObject(obj.getBaseSolarObjectProtocol(), players.map(p => p.getBasePlayerProtocol())));
		}
	}

	dispose() {
		this._solarObjects.forEach(p => p.dispose());

		this._players = [];
		this._solarObjects = [];
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
			objects: this._solarObjects.map(p => {
				return p.getBaseSolarObjectProtocol();
			}),
			movingShipsQueue: this._movingShipsManager.getMovingShipsQueue()
		};
	}

	/**增加玩家
	 * @param name 玩家昵称
	 * @return [玩家id, 新增的星球]
	 */
	addPlayer(name: string): [number, GameProtocols.ChangedSolarObject[]] {
		let player = new Player(name, 0);
		this._players.push(player);

		let newPlanets: Planet[] = [];
		let mapPlanets = this._mapLoader.getNextPlanets();

		mapPlanets.forEach(p => {
			newPlanets.push(new Planet(p.size, p.position, this._solarObjectChanged.bind(this), p.type == Map.PlanetType.Occupied ? player : null));
		});

		let newPlanetProtocols: GameProtocols.ChangedSolarObject[] = newPlanets.map(p => {
			this._solarObjects.push(p);
			return new GameProtocols.ChangedSolarObject(p.getBaseSolarObjectProtocol(), [player.getBasePlayerProtocol()]);
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
	movePlayerShips(id: number, objFromId: number, objToId: number, countRatio: number) {
		let objFrom = this._solarObjects.find(p => p.id == objFromId);
		let objTo = this._solarObjects.find(p => p.id == objToId);
		let player = this._players.find(p => p.id == id);
		this._movingShipsManager.movePlayerShips(player, objFrom, objTo, countRatio);
	}
	addPortal(playerId: number, position: Point) {
		let player = this._players.find(p => p.id == playerId);
		if (player && player.historyMaxShipsCount >= 100) {
			let newPortal = new Portal(50, position, this._solarObjectChanged.bind(this));
			this._solarObjects.push(newPortal);
			this._solarObjectChanged(newPortal, []);
		}
	}
	/**
	 * 获取玩家历史最高的人口飞船数
	 */
	getPlayerHistoryMaxShipsCount(id: number): number {
		let player = this._players.find(p => p.id == id);
		return this._players.find(p => p.id == id).historyMaxShipsCount;
	}

	isPlayerOnGame(id: number): boolean {
		let player = this._players.find(p => p.id == id);
		return player && !player.isGameOver;
	}
}