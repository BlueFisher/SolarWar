import { PlanetType } from '../protocols/game_protocols';
import Config from '../protocols/config';

export interface Planet {
	type: PlanetType,
	position: Point,
	size: number
}

export class MapLoader {
	private _areaWidth = Config.map.areaWidth;
	private _padding = Config.map.padding;
	private _planetsTypeSizes = Config.map.planetsTypeSizes.slice();

	private _circleIndex = 0;
	private _areaIndexes: number[] = [];

	getNextPlanets(): Planet[] {
		if (this._areaIndexes.length == 0) {
			this._circleIndex++;
			for (let i = 1; i <= (2 * this._circleIndex - 1) * 4; i++) {
				this._areaIndexes.push(i);
			}
		}

		let areaCenterPoint = this._getAreaCenterPosition(this._circleIndex, this._areaIndexes.splice(Math.random() * this._areaIndexes.length, 1)[0]);

		let angle = Math.random() * 2 * Math.PI / this._planetsTypeSizes.length;

		let planetsTypeSizes = this._planetsTypeSizes.slice();
		let planets: Planet[] = [];

		while (planetsTypeSizes.length) {
			let typeSize = planetsTypeSizes.splice(Math.random() * planetsTypeSizes.length, 1)[0];
			planets.push({
				type: typeSize.type,
				position: {
					x: areaCenterPoint.x + this._areaWidth * Math.sqrt(2) / 3 * Math.cos(angle),
					y: areaCenterPoint.y + this._areaWidth * Math.sqrt(2) / 3 * Math.sin(angle),
				},
				size: typeSize.size
			});
			angle += 2 * Math.PI / this._planetsTypeSizes.length;
		}
		return planets;
	}

	private _getAreaCenterPosition(circleIndex: number, index: number): Point {
		let quadrant = Math.ceil((index / (circleIndex * 2 - 1)));
		let n = index - (quadrant - 1) * (circleIndex * 2 - 1);

		let tempN = n;
		if (n < circleIndex) {
			tempN = circleIndex;
		}
		let y = (this._areaWidth + this._padding) * (1 / 2 + (circleIndex * 2 - tempN - 1));
		tempN = n;
		if (n > circleIndex) {
			tempN = circleIndex;
		}
		let x = (this._areaWidth + this._padding) * (1 / 2 + (tempN - 1));

		if (quadrant == 2) {
			y = -y;
		} else if (quadrant == 3) {
			x = -x;
			y = -y;
		} else if (quadrant == 4) {
			x = -x;
		}

		return {
			x: x,
			y: y
		}
	}
}