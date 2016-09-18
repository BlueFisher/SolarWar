import * as events from 'events';
import Player from './player';
import Planet from './planet';
import {GameProtocolType, GameStatusProtocol} from '../protocols/game_protocols';

interface _movingShipsQueue {
	planetFrom: Planet,
	planetTo: Planet,
	player: Player,
	count: number,
	distance: number,
	distanceLeft: number
}

class GameManager extends events.EventEmitter {
	private _players: Player[] = [];
	private _planets: Planet[] = [];
	private _movingShipsQueue: _movingShipsQueue[] = [];

	constructor() {
		super();

		this._initializeMap();
	}

	private _initializeMap() {
		this._planets.push(new Planet(this._getNextPlanetId(), 50, {
			x: 50,
			y: 50
		}, () => {
			this._onStatusChange();
		}));

		this._onStatusChange();
	}

	addPlayer(name: string): number {
		let player = new Player(this._getNextPlayerId(), name, 0);
		this._players.push(player);
		this._planets.push(new Planet(this._getNextPlanetId(), 50, {
			x: Math.random() * 1500,
			y: Math.random() * 900
		}, this._onStatusChange.bind(this), player))

		this._onStatusChange();

		return player.id;
	}

	private _currPlanetId = 0;
	private _getNextPlanetId(): number {
		return ++this._currPlanetId;
	}
	private _currPlayerId = 0;
	private _getNextPlayerId(): number {
		return ++this._currPlayerId;
	}

	movePlayerShips(id: number, planetFromId: number, planetToId: number, countRatio: number) {
		if (planetFromId == planetToId) {
			return;
		}
		let planetFrom = this._planets.filter(p => p.id == planetFromId)[0];
		let planetTo = this._planets.filter(p => p.id == planetToId)[0];
		let player = this._players.filter(p => p.id == id)[0];
		if (planetFrom == undefined || planetTo == undefined || player == undefined) {
			return;
		}
		if (countRatio > 1 || countRatio < 0) {
			return;
		}
		let count = planetFrom.shipsLeft(player, countRatio);
		if (count > 0) {
			let distance = this._getTwoPlanetsDistance(planetFrom, planetTo);
			this._movingShipsQueue.push({
				planetFrom: planetFrom,
				planetTo: planetTo,
				player: player,
				count: count,
				distance: distance,
				distanceLeft: distance
			});
			this._startMovingShips();
		}
	}

	private _getTwoPlanetsDistance(planet1: Planet, planet2: Planet) {
		return Math.sqrt(Math.pow(planet1.position.x - planet2.position.x, 2) + Math.pow(planet1.position.y - planet2.position.y, 2))
	}

	private _isMovingShips = false;
	private _startMovingShips() {
		if (!this._isMovingShips) {
			this._moveShips();
		}
	}
	private _moveShips() {
		if (this._movingShipsQueue.length == 0) {
			this._isMovingShips = false;
			return;
		}

		this._isMovingShips = true;
		setTimeout(() => {
			this._movingShipsHandler();
		}, 16);
	}
	private _movingShipsHandler() {
		for (let i in this._movingShipsQueue) {
			let movingShip = this._movingShipsQueue[i];
			if ((movingShip.distanceLeft -= 10) <= 0) {
				movingShip.planetTo.shipsArrived(movingShip.player, movingShip.count);
				this._movingShipsQueue.splice(parseInt(i), 1);
			}
		}
		this._onStatusChange();
		this._moveShips();
	}

	requestImmediateStatus() {
		this._onStatusChange();
	}
	private _onStatusChange(): GameStatusProtocol {
		this._players.forEach((player, index) => {
			if (player.currShipsCount == 0) {
				let isGameOver = true;
				this._planets.forEach((planet, index) => {
					if (planet.occupiedPlayer == player || planet.occupyingPlayer == player) {
						isGameOver = false;
						return;
					}
				});
				if (isGameOver) {
					this._players.splice(index, 1);
					this.emit('gameOver', player.id);
				}
			}
		});

		let status: GameStatusProtocol = {
			type: GameProtocolType.gameStatus,
			players: this._players.map(p => {
				return p.getPlayerProtocol();
			}),
			planets: this._planets.map(p => {
				return p.getPlanetProtocol();
			}),
			movingShipsQueue: this._movingShipsQueue.map(elem => {
				return {
					planetFromId: elem.planetFrom.id,
					planetToId: elem.planetTo.id,
					playerId: elem.player.id,
					count: elem.count,
					distance: elem.distance,
					distanceLeft: elem.distanceLeft
				}
			})
		}

		this.emit('statusChange', status);
		return status;
	}
}

export default GameManager;