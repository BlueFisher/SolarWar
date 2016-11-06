import * as GameProtocols from '../../shared/game_protocols'

type funcCanAddProp = (player: Player, type: GameProtocols.SolarObjectType) => void;

export default class Player {
	private static currId = 1;

	private _propStages = [{
		shipsCount: 100,
		propType: GameProtocols.SolarObjectType.portal
	}];
	propReadyToAdd: GameProtocols.SolarObjectType[] = [];
	private _canAddProp: funcCanAddProp;

	id: number;
	name: string;
	color: string;
	historyMaxShipsCount: number;
	maxShipsCount: number;
	currShipsCount: number;

	isGameOver = false;

	constructor(name: string, maxShipsCount: number, canAddProp: funcCanAddProp) {
		this.id = Player.currId++;
		this.name = name;
		this.color = this._getRandomColor();
		this.historyMaxShipsCount = this.maxShipsCount = this.currShipsCount = maxShipsCount;
		this._canAddProp = canAddProp;
	}

	addMaxShipsCount(count: number) {
		this.maxShipsCount += count;
		if (this.maxShipsCount > this.historyMaxShipsCount) {
			this.historyMaxShipsCount = this.maxShipsCount;
		}
		if (this._propStages.length > 0 && this.historyMaxShipsCount >= this._propStages[0].shipsCount) {
			let type = this._propStages.shift().propType;
			this._canAddProp(this, type);
			this.propReadyToAdd.push(type);
		}
	}

	private _getRandomColor(): string {
		let ss = [0.4, 0.7, 1];
		let [h, s, v] = [Math.random() * 360, ss[Math.round(Math.random() * ss.length)], 1];
		let [r, g, b] = this._hslToRgb(h, s, v);
		return `#${this._toHexString(r, g, b)}`;
	}

	private _hslToRgb(h, s, v): [number, number, number] {
		let r = 0, g = 0, b = 0;
		let i = Math.floor(h / 60) % 6;
		let f = (h / 60) - i;
		let p = v * (1 - s);
		let q = v * (1 - f * s);
		let t = v * (1 - (1 - f) * s);
		switch (i) {
			case 0:
				r = v;
				g = t;
				b = p;
				break;
			case 1:
				r = q;
				g = v;
				b = p;
				break;
			case 2:
				r = p;
				g = v;
				b = t;
				break;
			case 3:
				r = p;
				g = q;
				b = v;
				break;
			case 4:
				r = t;
				g = p;
				b = v;
				break;
			case 5:
				r = v;
				g = p;
				b = q;
				break;
			default:
				break;
		}
		return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
	}

	private _toHexString(r, g, b) {
		return ("00000" + (r << 16 | g << 8 | b).toString(16)).slice(-6);
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