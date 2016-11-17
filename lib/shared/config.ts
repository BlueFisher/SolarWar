import { PlanetType } from '../server_core/game_models/map_loader';

export default {
	httpPort: 80,
	webSocketServers: [
		{ ip: 'localhost', port: 8080 }
	],
	mongodbServer: 'mongodb://localhost:27017/solarwar',
	useCDN: true,

	sessionAge: 7 * 24 * 60 * 60 * 1000,

	gameReadyTime: 10,
	gameTime: 10,

	gameAlgorithm: {
		getOccupyingInterval: function (size: number, count: number): number {
			let interval = (3 * (size / count) ** 2 + 2) * 10;
			if (interval > 500)
				interval = 500;
			return interval;
		},
		getCombatInterval: function (): number {
			return 50;
		},
		getBuildingShipsInterval: function (size: number): number {
			if (size <= 25)
				return 800;
			if (size <= 75)
				return 750;
			if (size <= 125)
				return 525;
			if (size <= 175)
				return 425;
			return 400;
		},
		getMovingShipsInterval: function (): number {
			return 16;
		},
		getMovingShipsDeltaDistance: function (count: number, distance: number, distanceLeft: number): number {
			return -Math.atan((count - 30) / 20) / 2.5 + 1.875;
		}
	},

	map: {
		areaWidth: 275,
		padding: (Math.sqrt(2) - 1) * 275 / 2,
		portalSize: 50,
		portalMinDistanceToObject: 80,
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