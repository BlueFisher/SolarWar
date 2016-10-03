import * as GameProtocols from '../protocols/game_protocols'

export default class Player {
	id: number;
	name: string;
	color: string;
	historyMaxShipsCount: number;
	maxShipsCount: number;
	currShipsCount: number;

	constructor(id: number, name: string, maxShipsCount: number) {
		this.id = id;
		this.name = name;
		this.color = this._getRandomColor();
		this.historyMaxShipsCount = this.maxShipsCount = this.currShipsCount = maxShipsCount;
	}

	addMaxShipsCount(count: number) {
		this.maxShipsCount += count;
		if (this.maxShipsCount > this.historyMaxShipsCount) {
			this.historyMaxShipsCount = this.maxShipsCount;
		}
	}

	private _getRandomColor(): string {
		let color = '#';
		let getNextNum = (): string => {
			return '0123456789abcdef'[Math.floor(Math.random() * 16)];
		};
		for (let i = 0; i < 6; i++) {
			color += getNextNum();
		}

		return color;
	}

	getBasePlayerProtocol(): GameProtocols.BasePlayer {
		return {
			id: this.id,
			name: this.name,
			color: this.color,
			maxShipsCount: this.maxShipsCount,
			currShipsCount: this.currShipsCount
		}
	}
}