export enum GameProtocolType {
	requestAddPlayer = 0,
	responseAddPlayer,
	movingShips,

	gameStatus,
	gameOver
}
export interface GameBaseProtocol {
	type: GameProtocolType
}

export interface RequestAddPlayerProtocol extends GameBaseProtocol {
	name: string
}
export interface ResponseAddPlayerProtocol extends GameBaseProtocol {
	id: number
}

export interface MovingShips extends GameBaseProtocol {
	planetFromId: number,
	planetToId: number,
	countRatio: number
}

export interface Point {
	x: number,
	y: number
}
export interface PlayerProtocol {
	id: number,
	name: string,
	color: string,
	maxShipsCount: number,
	currShipsCount: number
}
export enum PlanetStatus {
	none = 0,
	occupying,
	occupied
}
export interface PlanetProtocol {
	id: number,
	size: number,
	position: {
		x: number,
		y: number
	},
	// status: PlanetStatus,
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
export interface GameStatusProtocol extends GameBaseProtocol {
	size: {
		width: number,
		height: number
	}
	players: PlayerProtocol[],
	planets: PlanetProtocol[],
	movingShipsQueue: {
		planetFromId: number,
		planetToId: number,
		playerId: number,
		count: number,
		distance: number,
		distanceLeft: number
	}[]
}
export interface GameOverProtocol extends GameBaseProtocol {

}