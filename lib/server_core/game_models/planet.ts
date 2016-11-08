import config from '../../shared/config';
import Player from './player';
import * as GameProtocols from '../../shared/game_protocols'
import { SolarObject, FuncSolarObjectChanged } from './solar_object';

class Planet extends SolarObject {
	private
	private _buildingShipsTimer: NodeJS.Timer;

	/**
	 * 星球
	 *
	 * @param id 星球id
	 * @param size 星球直径大小
	 * @param position 星球所在坐标
	 * @param planetChanged 星球状态改变回调函数
	 * @param occupiedPlayer 星球初始化时就占领的玩家
	 */
	constructor(size: number, position: Point,
		planetChanged: FuncSolarObjectChanged,
		occupiedPlayer: Player = null) {
		super(size, size, position, planetChanged);

		this._startbuildingShips();

		if (occupiedPlayer != null) {
			this.allShips.push({
				player: occupiedPlayer,
				count: this.size
			});
			this.occupyingStatus = {
				player: occupiedPlayer,
				percent: 100
			};
			occupiedPlayer.addCurrShipsCount(this.population);
			occupiedPlayer.addMaxShipsCount(this.size);

			this.occupiedPlayer = occupiedPlayer;
		}
	}

	dispose() {
		clearInterval(this._buildingShipsTimer);
	}

	protected _getOccupyingInterval() {
		return config.gameAlgorithm.getOccupyingInterval(this.size, this.allShips[0].count);
	}

	getBaseSolarObjectProtocol() {
		let protocol = super.getBaseSolarObjectProtocol();
		protocol.type = GameProtocols.SolarObjectType.planet;
		return protocol;
	}

	// Building
	private _startbuildingShips() {
		this._buildingShipsTimer = setInterval(() => {
			this._buildShips();
		}, config.gameAlgorithm.getBuildingShipsInterval(this.size));
	}

	private _buildShips() {
		if (this.occupiedPlayer == null || this.occupiedPlayer != this.occupyingStatus.player || this.occupyingStatus.percent != 100) {
			return;
		}
		if (this.allShips.length == 0) {
			this.allShips.push({
				player: this.occupiedPlayer,
				count: 0
			});
		}

		let occupiedShipsOnThePlanet = this.allShips.find(p => p.player == this.occupiedPlayer);
		if (occupiedShipsOnThePlanet == undefined) {
			return;
		}
		if (this.occupiedPlayer.currShipsCount < this.occupiedPlayer.maxShipsCount) {
			this.occupiedPlayer.addCurrShipsCount(1);
			occupiedShipsOnThePlanet.count++;

			this._changeSolarObject([this.occupiedPlayer]);
		}
	}
}

export default Planet;