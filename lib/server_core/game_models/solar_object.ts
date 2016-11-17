import config from '../../shared/config';
import Player from './player';
import * as GameProtocols from '../../shared/game_protocols'

interface ShipsOnTheObject {
	player: Player,
	count: number
}
interface occupyingStatus {
	// 占领比率
	percent: number,
	// 该占领比率属于的玩家
	player: Player
}

export type FuncSolarObjectChanged = (obj: SolarObject, players: Player[], interval?: number) => void;

export abstract class SolarObject {
	private static currId = 1;

	protected _solarObjectChanged: FuncSolarObjectChanged;

	id: number;
	size: number;
	population: number;
	position: Point;
	allShips: ShipsOnTheObject[] = [];
	occupiedPlayer: Player;
	occupyingStatus: occupyingStatus;

	constructor(size: number, population: number, position: Point, solarObjectChanged: FuncSolarObjectChanged) {
		this.id = SolarObject.currId++;
		this.population = population;
		this.size = size;
		this.position = position;
		this._solarObjectChanged = solarObjectChanged;
	}

	abstract dispose(): void;

	getBaseSolarObjectProtocol(): GameProtocols.BaseSolarObject {
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

	protected _changeSolarObject(players: Player[] = []) {
		this._solarObjectChanged(this, players);
	}

	/**飞船到达 */
	shipsArrived(player: Player, count: number) {
		if (count == 0) {
			return;
		}

		let existedShips = this.allShips.find(p => p.player == player);
		if (existedShips == undefined) {
			this.allShips.push({
				player: player,
				count: count
			});
		} else {
			existedShips.count += count;
		}

		this._changeSolarObject([]);

		this._startOccupying();
		this._startCombat();
	}

	/**飞船离开 */
	shipsLeft(player: Player, countRatio: number): number {
		let existedShipsIndex = this.allShips.findIndex(p => p.player == player);
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

		this._changeSolarObject([]);

		this._startOccupying();
		return count;
	}

	// Occupying
	private _isOccupying = false;
	private _timerDuration = 0;
	private _newStart = false;

	private _sendstartingOccupying(players: Player[], interval: number) {
		this._timerDuration = 0;
		this._solarObjectChanged(this, players, interval);
	}

	private _sendstopingOccupying(players: Player[]) {
		this._sendstartingOccupying(players, -1);
	}

	private _canOccupy(): boolean {
		if (this.allShips.length != 1) {
			return false;
		}
		return !(this.occupiedPlayer != null &&
			this.allShips[0].player == this.occupiedPlayer &&
			this.occupiedPlayer == this.occupyingStatus.player &&
			this.occupyingStatus.percent == 100);
	}

	protected abstract _getOccupyingInterval(): number;

	private _startOccupying() {
		this._newStart = true;
		if (!this._isOccupying) {
			this._occupy();
		}
	}

	private _occupy() {
		if (!(this._isOccupying = this._canOccupy())) {
			return;
		}

		if (this._newStart) {
			this._sendstartingOccupying([], this._getOccupyingInterval());
			this._newStart = false;
		}

		if (this.occupyingStatus == null) {
			this.occupyingStatus = {
				player: this.allShips[0].player,
				percent: 0
			};
		}

		let interval = this._getOccupyingInterval();

		setTimeout(() => {
			if (!(this._isOccupying = this._canOccupy())) {
				return;
			}

			let occupyingPlayer = this.allShips[0].player;
			let changedPlayer: Player = null;

			if (occupyingPlayer == this.occupyingStatus.player) {
				if (++this.occupyingStatus.percent == 100) {
					if (this.occupiedPlayer != occupyingPlayer) {
						this.occupiedPlayer = occupyingPlayer;
						this.occupiedPlayer.addMaxShipsCount(this.population)
						changedPlayer = this.occupiedPlayer;
					}
					this._sendstopingOccupying(changedPlayer == null ? [] : [changedPlayer]);
				}
			} else {
				if (--this.occupyingStatus.percent == 0) {
					if (this.occupiedPlayer == this.occupyingStatus.player) {
						this.occupiedPlayer.addMaxShipsCount(-this.population);
						changedPlayer = this.occupiedPlayer;
						this.occupiedPlayer = null;
					}

					this.occupyingStatus.player = occupyingPlayer;
				}
				this._sendstartingOccupying(changedPlayer == null ? [] : [changedPlayer], interval);
			}

			this._timerDuration += interval;
			if (this._timerDuration >= 1000) {
				this._sendstartingOccupying(changedPlayer == null ? [] : [changedPlayer], interval);
			}

			this._occupy();
		}, interval);
	}

	// Combatting
	private _isCombatting = false;
	private _canCombat = (): boolean => {
		if (this.allShips.length < 2) {
			this._isCombatting = false;
			this._startOccupying();
			return this._isCombatting = false;
		}
		return this._isCombatting = true;
	};

	private _startCombat() {
		if (!this._isCombatting)
			this._combat();
	}

	private _combat() {
		if (!this._canCombat())
			return;

		setTimeout(() => {
			if (!this._canCombat())
				return;

			let changedPlayers: Player[] = this.allShips.map(p => p.player);

			for (let i = this.allShips.length - 1; i >= 0; i--) {
				let ships = this.allShips[i];

				if (ships.count > 0) {
					ships.player.addCurrShipsCount(-1);
					ships.count--;
				}

				if (ships.count == 0) {
					this.allShips.splice(i, 1);
				}
			}

			this._changeSolarObject(changedPlayers);
			this._combat();
		}, config.algorithm.getCombatInterval());
	}
}