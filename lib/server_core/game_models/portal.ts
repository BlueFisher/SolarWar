import config from '../../shared/config';
import Player from './player';
import * as GameProtocols from '../../shared/game_protocols'
import { SolarObject, FuncSolarObjectChanged } from './solar_object';

export default class Portal extends SolarObject {
	constructor(size: number, position: Point,
		protalChanged: FuncSolarObjectChanged) {
		super(size, 0, position, protalChanged);
	}

	dispose() { }

	protected _getOccupyingInterval() {
		return config.algorithm.getOccupyingInterval(this.size, this.allShips[0].count);
	}

	getBaseSolarObjectProtocol() {
		let protocol = super.getBaseSolarObjectProtocol();
		protocol.type = GameProtocols.SolarObjectType.portal;
		return protocol;
	}
}