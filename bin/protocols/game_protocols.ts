export interface Point {
	x: number,
	y: number
}

export enum Type {
	requestInitializeMap = 0,
	initializeMap,
	requestMoveShips,
	planet,
	startOccupyingPlanet,
	movingShipsQueue,
	time,
	gameOver
}

export interface BasePlayer {
	id: number,
	name: string,
	color: string,
	maxShipsCount: number,
	currShipsCount: number
}
export interface BasePlanet {
	id: number,
	size: number,
	position: {
		x: number,
		y: number
	},
	allShips: {
		playerId: number,
		count: number
	}[],
	occupiedPlayerId: number,
	occupyingStatus: {
		playerId: number,
		percent: number
	}
}
export interface BaseMovingShips {
	planetFromId: number,
	planetToId: number,
	playerId: number,
	count: number,
	distance: number,
	distanceLeft: number
}
export interface Map {
	players: BasePlayer[],
	planets: BasePlanet[],
	movingShipsQueue: BaseMovingShips[]
}

export class BaseProtocol {
	constructor(type: Type) {
		this.type = type;
	}

	type: Type;
}

export class Planet extends BaseProtocol {
	constructor(planet: BasePlanet, players: BasePlayer[]) {
		super(Type.planet);
		this.planet = planet;
		this.players = players;
	}

	planet: BasePlanet;
	players: BasePlayer[];
}
export class StartOccupyingPlanet extends Planet {
	constructor(planet: BasePlanet, players: BasePlayer[], interval: number) {
		super(planet, players);
		this.type = Type.startOccupyingPlanet;
		this.interval = interval;
		this.startDateTime = new Date();
	}

	startDateTime: Date;
	interval: number;
}

export class MovingShipsQueue extends BaseProtocol {
	constructor(players: BasePlayer[], queue: BaseMovingShips[]) {
		super(Type.movingShipsQueue);
		this.players = players;
		this.queue = queue;
	}

	players: BasePlayer[];
	queue: BaseMovingShips[]
}

export class RequestInitializeMap extends BaseProtocol {
	constructor(name: string) {
		super(Type.requestInitializeMap);
		this.name = name;
	}

	name: string
}

export class InitializeMap extends BaseProtocol {
	constructor(map: Map, playerId: number) {
		super(Type.initializeMap);
		this.map = map;
		this.playerId = playerId;
	}

	map: Map;
	playerId: number;
}

export class RequestMovingShips extends BaseProtocol {
	constructor(planetFromId: number, planetToId: number, countRatio: number) {
		super(Type.requestMoveShips);
		this.planetFromId = planetFromId;
		this.planetToId = planetToId;
		this.countRatio = countRatio;
	}

	planetFromId: number;
	planetToId: number;
	countRatio: number;
}

export class Time extends BaseProtocol {
	constructor(time: number) {
		super(Type.time);
		this.time = time;
	}

	time: number
}

export class GameOver extends BaseProtocol {
	constructor(historyMaxShipsCount: number) {
		super(Type.gameOver);
		this.historyMaxShipsCount = historyMaxShipsCount;
	}

	historyMaxShipsCount: number;
}