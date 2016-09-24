import player from './player';
import {Point, PlanetStatus, Planet as PlanetProtocol} from '../protocols/game_protocols'


interface ShipsOnThePlanet {
	player: player,
	count: number
}
interface occupyingStatus {
	// 占领比率
	percent: number,
	// 该占领比率属于的玩家
	player: player
}

class Planet {
	private _onStatusChange: () => void;

	id: number;
	size: number;
	position: Point;

	allShips: ShipsOnThePlanet[] = [];
	occupiedPlayer: player;
	occupyingStatus: occupyingStatus;

	/**
	 * 星球
	 * 
	 * @param id 星球id
	 * @param size 星球直径大小
	 * @param position 星球所在坐标
	 * @param onStatusChange 星球状态改变回调函数
	 * @param occupiedPlayer 星球初始化时就占领的玩家
	 */
	constructor(id: number, size: number, position: Point, onStatusChange: () => void, occupiedPlayer: player = null) {
		this.id = id;
		this.size = size;
		this.position = position;
		this._onStatusChange = onStatusChange;

		this._startbuildingShips();

		if (occupiedPlayer != null) {
			this.allShips.push({
				player: occupiedPlayer,
				count: this.size
			});
			this.occupyingStatus = {
				player: occupiedPlayer,
				percent: 100
			}
			occupiedPlayer.currShipsCount += this.size;
			occupiedPlayer.maxShipsCount += this.size;

			this.occupiedPlayer = occupiedPlayer;
		}
	}

	getPlanetProtocol(): PlanetProtocol {
		return {
			id: this.id,
			size: this.size,
			position: this.position,
			allShips: this.allShips.map(elem => {
				return {
					playerId: elem.player.id,
					count: elem.count
				}
			}),
			occupiedPlayerId: this.occupiedPlayer == null ? null : this.occupiedPlayer.id,
			occupyingStatus: this.occupyingStatus == null ? null : {
				playerId: this.occupyingStatus.player.id,
				percent: this.occupyingStatus.percent
			}
		}
	}

	/**飞船到达 */
	shipsArrived(player: player, count: number) {
		if (count == 0) {
			return;
		}

		let existedShips = this.allShips.filter(p => p.player == player)[0];
		if (existedShips == undefined) {
			this.allShips.push({
				player: player,
				count: count
			});
		} else {
			existedShips.count += count;
		}

		this._startOccupying();
		this._startCombat();
	}
	/**飞船离开 */
	shipsLeft(player: player, countRatio: number): number {
		let existedShipsIndex = -1;
		for (let i in this.allShips) {
			if (this.allShips[i].player == player) {
				existedShipsIndex = parseInt(i);
				break;
			}
		}

		if (existedShipsIndex == -1) {
			return -1;
		}

		let count = parseInt((this.allShips[existedShipsIndex].count * countRatio).toFixed());
		this.allShips[existedShipsIndex].count -= count;
		if (this.allShips[existedShipsIndex].count == 0) {
			if (this.allShips[existedShipsIndex].player != this.occupiedPlayer) {
				this.allShips.splice(existedShipsIndex, 1);
			}
		}

		return count;
	}

	private _isOccupying = false;
	private _startOccupying() {
		if (!this._isOccupying) {
			this._occupy();
		}
	}
	private _occupy() {
		let canOccupy = (): boolean => {
			if (this.allShips.length != 1) {
				return this._isOccupying = false;
			}
			if (this.occupiedPlayer != null &&
				this.allShips[0].player == this.occupiedPlayer &&
				this.occupiedPlayer == this.occupyingStatus.player &&
				this.occupyingStatus.percent == 100) {
				return this._isOccupying = false;
			}
			return this._isOccupying = true;
		}

		if (!canOccupy()) {
			return;
		}
		

		setTimeout(() => {
			if (!canOccupy()) {
				return;
			}

			let occupyingPlayer = this.allShips[0].player;

			if (this.occupyingStatus == null) {
				this.occupyingStatus = {
					player: occupyingPlayer,
					percent: 0
				};
			}
			if (occupyingPlayer == this.occupyingStatus.player) {
				if (++this.occupyingStatus.percent == 100) {
					if (this.occupiedPlayer != occupyingPlayer) {
						this.occupiedPlayer = occupyingPlayer;
						this.occupiedPlayer.maxShipsCount += this.size;
					}
				}
			} else {
				if (--this.occupyingStatus.percent == 0) {
					if (this.occupiedPlayer == this.occupyingStatus.player) {
						this.occupiedPlayer.maxShipsCount -= this.size;
						this.occupiedPlayer = null;
					}

					this.occupyingStatus.player = occupyingPlayer;
				}
			}

			this._onStatusChange();
			this._occupy();
		}, (3 * Math.pow(this.size / this.allShips[0].count, 0.25) + 2) * 1000 / 100);
	}

	private _isCombatting = false;
	private _startCombat() {
		if (!this._isCombatting)
			this._combat();
	}
	private _combat() {
		let canCombat = (): boolean => {
			if (this.allShips.length < 2) {
				this._isCombatting = false;
				this._startOccupying();
				return this._isCombatting = false;
			}
			return this._isCombatting = true;
		}

		if (!canCombat())
			return;

		setTimeout(() => {
			if (!canCombat())
				return;

			this.allShips.forEach((elem, index) => {
				elem.player.currShipsCount--;
				elem.count--;
				if (elem.count <= 0) {
					this.allShips.splice(index, 1);
				}
			});

			this._onStatusChange();
			this._combat();
		}, 50);
	}


	private _startbuildingShips() {
		let interval = (-0.005 * this.size + 1) * 1000;
		setInterval(() => {
			this._buildShips();
		}, interval);
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

		let occupiedShipsOnThePlanet = this.allShips.filter(p => p.player == this.occupiedPlayer)[0];
		if (occupiedShipsOnThePlanet == undefined) {
			return;
		}
		if (this.occupiedPlayer.currShipsCount < this.occupiedPlayer.maxShipsCount) {
			this.occupiedPlayer.currShipsCount++;
			occupiedShipsOnThePlanet.count++;

			this._onStatusChange();
		}
	}
}

export default Planet;