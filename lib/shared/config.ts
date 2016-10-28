import { PlanetType } from '../shared/game_protocols';

export default {
	httpPort: 80,
	webSocketServers: [
		{ ip: 'localhost', port: 8080 }
	],

	gameReadyTime: 10,
	gameTime: 60 * 15,

	gameAlgorithm: {
		getOccupyingInterval: function (size: number, count: number): number {
			let interval = (3 * Math.pow(size / count, 2) + 2) * 10;
			if (interval > 500)
				interval = 500;
			return interval;
		},
		getCombatInterval: function (): number {
			return 50;
		},
		getBuildingShipsInterval: function (size: number): number {
			return 963.2 * Math.exp(-0.01 * size) + 130 * Math.exp(0.003 * size);
		},
		getMovingShipsInterval: function (): number {
			return 16;
		},
		getMovingShipsDeltaDistance: function (count: number, distance: number, distanceLeft: number): number {
			if (count < 9) {
				return 2.5;
			} else if (count > 9) {
				return 1.25;
			} else {
				return -75 / 14 / Math.sqrt(count) + 85 / 28;
			}
		}
	},

	map: {
		areaWidth: 275,
		padding: (Math.sqrt(2) - 1) * 275 / 2,
		planetsTypeSizes: [
			{
				size: 25,
				type: PlanetType.None
			}, {
				size: 50,
				type: PlanetType.Occupied
			}, {
				size: 75,
				type: PlanetType.None
			}
		]
	}
}