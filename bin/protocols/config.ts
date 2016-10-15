import { PlanetType } from '../protocols/game_protocols';

export default {
	httpPort: 80,
	webSocketServers: [
		{ ip: 'localhost', port: 8080 }
	],

	gameReadyTime: 10,
	gameTime: 60 * 16,

	algorithm: {
		getOccupyingInterval: function (size: number, count: number): number {
			return (3 * Math.pow(size / count, 2) + 2) * 10;
		},
		getCombatInterval: function (): number {
			return 50;
		},
		getBuildingShipsInterval: function (size: number): number {
			return (-0.005 * size + 1) * 1000;
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