export enum PlanetType {
	None = 0,
	Occupied
}

export interface Map {
	planets: {
		type: PlanetType,
		position: {
			x: number,
			y: number
		},
		size: number
	}[]
}

export class MapLoader {
	static getMap(): Map {
		return {
			planets: [
				{
					type: PlanetType.None,
					position: {
						x: 450,
						y: 450
					},
					size: 100
				}, {
					type: PlanetType.None,
					position: {
						x: 450,
						y: 275
					},
					size: 50
				}, {
					type: PlanetType.None,
					position: {
						x: 275,
						y: 450
					},
					size: 50
				}, {
					type: PlanetType.None,
					position: {
						x: 625,
						y: 450
					},
					size: 50
				}, {
					type: PlanetType.None,
					position: {
						x: 450,
						y: 625
					},
					size: 50
				}, {
					type: PlanetType.None,
					position: {
						x: 275,
						y: 275
					},
					size: 25
				}, {
					type: PlanetType.None,
					position: {
						x: 625,
						y: 275
					},
					size: 25
				}, {
					type: PlanetType.None,
					position: {
						x: 275,
						y: 625
					},
					size: 25
				}, {
					type: PlanetType.None,
					position: {
						x: 625,
						y: 625
					},
					size: 25
				}, {
					type: PlanetType.Occupied,
					position: {
						x: 150,
						y: 275
					},
					size: 50
				}, {
					type: PlanetType.Occupied,
					position: {
						x: 275,
						y: 150
					},
					size: 50
				}, {
					type: PlanetType.Occupied,
					position: {
						x: 150,
						y: 450
					},
					size: 50
				}, {
					type: PlanetType.Occupied,
					position: {
						x: 450,
						y: 150
					},
					size: 50
				}, {
					type: PlanetType.Occupied,
					position: {
						x: 150,
						y: 625
					},
					size: 50
				}, {
					type: PlanetType.Occupied,
					position: {
						x: 625,
						y: 150
					},
					size: 50
				}
			]
		}
	}
}