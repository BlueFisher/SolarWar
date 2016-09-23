import {Player as PlayerProtocol} from '../protocols/game_protocols'

class Player {
	id: number;
	name: string;
	color: string;
	maxShipsCount: number;
	currShipsCount: number;

	constructor(id: number, name: string, maxShipsCount: number) {
		this.id = id;
		this.name = name;
		this.color = this._getRandomColor();
		this.maxShipsCount = this.currShipsCount = maxShipsCount;
	}

	private _getRandomColor(): string {
		let color = '#';
		let getNextNum = (): string => {
			return '0123456789abcdef'[Math.floor(Math.random() * 16)];
		}
		for (let i = 0; i < 6; i++) {
			color += getNextNum();
		}
		
		return color;
	}

	getPlayerProtocol(): PlayerProtocol {
		return {
			id: this.id,
			name: this.name,
			color: this.color,
			maxShipsCount: this.maxShipsCount,
			currShipsCount: this.currShipsCount
		}
	}
}

export default Player;