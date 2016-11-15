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

import { AI } from './ai';

export default class GameManager extends events.EventEmitter {
	static events = {
		playerAdded: Symbol(),
		sendToAllDirectly: Symbol(),
		sendToOne: Symbol(),
		gameStarted: Symbol(),
		gameOver: Symbol()
	}

	private _players: Player[] = [];
	private _solarObjects: SolarObject[] = [];

	private _movingShipsManager: MovingShipsManager;
	private _timeManager: TimeManager;

	private _mapLoader: Map.MapLoader;

	private _ais: AI[] = [];

	/**
	 * 游戏逻辑管理器
	 */
	constructor() {
		super();

		this._mapLoader = new Map.MapLoader();
		this._movingShipsManager = new MovingShipsManager(this.emit.bind(this));
		this._timeManager = new TimeManager(this.emit.bind(this));

		this._ais.push(new AI(this, this._players, this._solarObjects));
		this._ais.push(new AI(this, this._players, this._solarObjects));
		this._ais.push(new AI(this, this._players, this._solarObjects));
		this._ais.push(new AI(this, this._players, this._solarObjects));
	}

	private _solarObjectChanged(obj: SolarObject, players: Player[], interval?: number) {
		players.forEach((basePlayer) => {
			let player = this._players.find(p => p.id == basePlayer.id);

			if (player.currShipsCount == 0) {
				// 查找有没有星球上还有当前玩家的残留，如果没有则该玩家游戏结束
				if (!this._solarObjects.find(p => p.occupyingStatus &&
					(p.occupiedPlayer && p.occupiedPlayer.id == player.id || p.occupyingStatus.player.id == player.id))) {
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

	private _canAddProp(player: Player, type: GameProtocols.SolarObjectType) {
		this.emit(GameManager.events.sendToOne, new GameProtocols.CanAddProp(type), player.id);
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
	 * @return 玩家id
	 */
	addPlayer(name: string): number {
		let player = new Player(name, 0, this._canAddProp.bind(this));
		this._players.push(player);

		let isPlanetsAvailable = (mapPlanets: Map.Planet[]) => {
			let portals = this._solarObjects.filter(p => p instanceof Portal);
			for (let portal of portals) {
				for (let p of mapPlanets) {
					let distance = Math.sqrt((portal.position.x - p.position.x) ** 2 + (portal.position.y - p.position.y) ** 2);
					if (distance < config.map.portalMinDistanceToObject + p.size / 2)
						return false;
				}
			}
			return true;
		}

		let mapPlanets: Map.Planet[];
		do {
			mapPlanets = this._mapLoader.getNextPlanets();
		} while (!isPlanetsAvailable(mapPlanets))

		let newPlanets = mapPlanets.map(p => {
			return new Planet(p.size, p.position, this._solarObjectChanged.bind(this), p.type == Map.PlanetType.Occupied ? player : null);
		});

		let newPlanetProtocols: GameProtocols.ChangedSolarObject[] = newPlanets.map(p => {
			this._solarObjects.push(p);
			return new GameProtocols.ChangedSolarObject(p.getBaseSolarObjectProtocol(), [player.getBasePlayerProtocol()]);
		});

		if (this.isGameStarted()) {
			this.emit(GameManager.events.playerAdded, newPlanetProtocols);
		}
		return player.id;
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
		if (player) {
			let i = player.propReadyToAdd.findIndex(p => p == GameProtocols.SolarObjectType.portal);
			if (i != -1) {
				let newPortal = new Portal(50, position, this._solarObjectChanged.bind(this));
				this._solarObjects.push(newPortal);
				this._solarObjectChanged(newPortal, []);
				player.propReadyToAdd.splice(i, 1);
			}
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