export interface Point {
	x: number,
	y: number
}

export enum Type {
	requestAddingPlayer = 0,
	responseAddingPlayer,
	moveShips,

	gameStatus,
	gameOver
}
export interface BaseProtocol {
	type: Type
}

export interface RequestAddingPlayer extends BaseProtocol {
	name: string
}
export interface ResponseAddingPlayer extends BaseProtocol {
	id: number
}

export interface RequestMovingShips extends BaseProtocol {
	planetFromId: number,
	planetToId: number,
	countRatio: number
}

export interface Player {
	id: number,
	name: string,
	color: string,
	maxShipsCount: number,
	currShipsCount: number
}
export interface Planet {
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
export interface GameStatus extends BaseProtocol {
	players: Player[],
	planets: Planet[],
	movingShipsQueue: {
		planetFromId: number,
		planetToId: number,
		playerId: number,
		count: number,
		distance: number,
		distanceLeft: number
	}[]
}
export interface GameOver extends BaseProtocol {

}