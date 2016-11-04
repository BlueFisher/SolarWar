export enum SolarObjectType{
	planet,
	portal
}

export enum Type {
	requestInitializeMap = 0,
	initializeMap,

	requestMoveShips,

	solarObjectChanged,
	startOccupyingSolarObject,
	movingShips,

	readyTime,
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
export interface BaseSolarObject {
	type?: SolarObjectType,
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
	id: number,
	objectFromId: number,
	objectToId: number,
	playerId: number,
	count: number,
	distance: number,
	distanceLeft: number
}
export interface Map {
	players: BasePlayer[],
	objects: BaseSolarObject[],
	movingShipsQueue: BaseMovingShips[]
}

export class BaseProtocol {
	constructor(type: Type) {
		this.type = type;
	}

	type: Type;
}

export class ChangedSolarObject extends BaseProtocol {
	constructor(object: BaseSolarObject, players: BasePlayer[]) {
		super(Type.solarObjectChanged);
		this.object = object;
		this.players = players;
	}

	object: BaseSolarObject;
	players: BasePlayer[];
}
export class StartOccupyingSolarObject extends ChangedSolarObject {
	constructor(object: BaseSolarObject, players: BasePlayer[], interval: number) {
		super(object, players);
		this.type = Type.startOccupyingSolarObject;
		this.interval = interval;
		this.startDateTime = new Date();
	}

	startDateTime: Date;
	interval: number;
}

export class MovingShips extends BaseProtocol {
	constructor(players: BasePlayer[], queue: BaseMovingShips[]) {
		super(Type.movingShips);
		this.players = players;
		this.queue = queue;
	}

	players: BasePlayer[];
	queue: BaseMovingShips[]
}

export class RequestInitializeMap extends BaseProtocol {
	constructor(name: string, resumeGame: boolean) {
		super(Type.requestInitializeMap);
		this.name = name;
		this.resumeGame = resumeGame;
	}

	name: string;
	resumeGame: boolean;
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
	constructor(objectFromId: number, objectToId: number, countRatio: number) {
		super(Type.requestMoveShips);
		this.objectFromId = objectFromId;
		this.objectToId = objectToId;
		this.countRatio = countRatio;
	}

	objectFromId: number;
	objectToId: number;
	countRatio: number;
}

export class ReadyTimeElapse extends BaseProtocol {
	constructor(time: number) {
		super(Type.readyTime);
		this.time = time;
	}

	time: number;
}
export class TimeElapse extends BaseProtocol {
	constructor(time: number) {
		super(Type.time);
		this.time = time;
	}

	time: number;
}

export class GameOver extends BaseProtocol {
	constructor(historyMaxShipsCount: number) {
		super(Type.gameOver);
		this.historyMaxShipsCount = historyMaxShipsCount;
	}

	historyMaxShipsCount: number;
}