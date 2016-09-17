import player from './player';
import {Point, PlanetStatus, PlanetProtocol} from '../protocols/game_protocols'


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

	// 已占领的玩家
	occupiedPlayer: player;
	// 正在占领中的玩家
	occupyingPlayer: player;
	occupyingStatus: occupyingStatus;

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
			status: this._getStatus(),
			allShips: this.allShips.map(elem => {
				return {
					playerId: elem.player.id,
					count: elem.count
				}
			}),
			occupiedPlayerId: this.occupiedPlayer == null ? null : this.occupiedPlayer.id,
			occupyingPlayerId: this.occupyingPlayer == null ? null : this.occupyingPlayer.id,
			occupyingStatus: this.occupyingStatus == null ? null : {
				playerId: this.occupyingStatus.player.id,
				percent: this.occupyingStatus.percent
			}
		}
	}

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

		if (this.occupiedPlayer == null && this.occupyingPlayer == null) {
			this.occupyingPlayer = player;

			this.occupyingStatus = this.occupyingStatus != null ? this.occupyingStatus : {
				percent: 0,
				player: player
			}
		} else if (this.occupiedPlayer != null && this.allShips.filter(p => p.player == this.occupiedPlayer)[0] == undefined) {
			this.occupyingPlayer = player;
		}

		this._startOccupying();
		this._startCombat();
	}
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
			if (this.allShips[existedShipsIndex].player == this.occupyingPlayer) {
				this.occupyingPlayer = null;
			}
			if (this.allShips[existedShipsIndex].player != this.occupiedPlayer) {
				this.allShips.splice(existedShipsIndex, 1);
			}
		}

		return count;
	}

	private _getStatus(): PlanetStatus {
		if (this.occupiedPlayer == null && this.occupyingPlayer == null) {
			return PlanetStatus.none;
		}
		if (this.occupyingPlayer != null) {
			return PlanetStatus.occupying;
		}
		if (this.occupiedPlayer != null && this.occupiedPlayer == this.occupyingStatus.player && this.occupyingStatus.percent == 100) {
			return PlanetStatus.occupied;
		}
	}

	private _isOccupying = false;
	private _startOccupying() {
		if (!this._isOccupying)
			this._occupy();
	}
	private _occupy() {
		if (this.occupyingPlayer == null || this.allShips.length > 1) {
			this._isOccupying = false;
			return;
		}

		this._isOccupying = true;
		setTimeout(() => {
			this._occupyingHandler();
		}, 50);
	}
	private _occupyingHandler() {
		if (this.occupyingPlayer == this.occupyingStatus.player) {
			if (++this.occupyingStatus.percent == 100) {
				if (this.occupiedPlayer != this.occupyingPlayer) {
					this.occupiedPlayer = this.occupyingPlayer;
					this.occupiedPlayer.maxShipsCount += this.size;
				}

				this.occupyingPlayer = null;
			}
		} else {
			if (--this.occupyingStatus.percent == 0) {
				if (this.occupiedPlayer == this.occupyingStatus.player) {
					this.occupiedPlayer.maxShipsCount -= this.size;
					this.occupiedPlayer = null;
				}

				this.occupyingStatus.player = this.occupyingPlayer;
			}
		}

		this._onStatusChange();
		this._occupy();
	}

	private _isCombatting = false;
	private _startCombat() {
		if (!this._isCombatting)
			this._combat();
	}
	private _combat() {
		if (this.allShips.length < 2) {
			this._isCombatting = false;
			this._startOccupying();
			return;
		}

		this._isCombatting = true;
		setTimeout(() => {
			this._combattingHandler();
		}, 50);
	}
	private _combattingHandler() {
		this.allShips.forEach((elem, index) => {
			elem.player.currShipsCount--;
			elem.count--;
			if (elem.count <= 0) {
				this.allShips.splice(index, 1);
			}
		});

		if (this.allShips.length == 1) {
			if (this.occupiedPlayer != this.allShips[0].player) {
				this.occupyingPlayer = this.allShips[0].player;
			}
		}
		else if (this.allShips.length == 0) {
			if (this.occupiedPlayer != null) {
				this.allShips.push({
					player: this.occupiedPlayer,
					count: 0,
				});
			}
		}

		this._onStatusChange();
		this._combat();
	}

	private _startbuildingShips() {
		let interval = 800;
		setInterval(() => {
			this._buildShips();
		}, interval);
	}
	private _buildShips() {
		if (this.occupiedPlayer == null || this.occupyingStatus.percent != 100) {
			return;
		}
		let shipsOnThePlanet = this.allShips.filter(p => p.player == this.occupiedPlayer)[0];
		if (shipsOnThePlanet == undefined) {
			return;
		}
		if (this.occupiedPlayer.currShipsCount < this.occupiedPlayer.maxShipsCount) {
			this.occupiedPlayer.currShipsCount++;
			shipsOnThePlanet.count++;

			this._onStatusChange();
		}
	}
}

export default Planet; 