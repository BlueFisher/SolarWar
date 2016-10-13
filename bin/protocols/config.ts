import { PlanetType } from '../protocols/game_protocols';

export default {
	httpPort: 80,
	webSocketPort: 8080,
	ip: 'localhost',

	gameReadyTime: 10,
	gameTime: 10,

	algorithm: {
		getOccupyingInterval: function (size: number, count: number): number {
			return (3 * Math.pow(size / count, 0.25) + 2) * 1000 / 100;
		},
		getCombatInterval: function (): number {
			return 50;
		},
		getBuildingShipsInterval: function (size: number): number {
			return (-0.005 * this.size + 1) * 1000;
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