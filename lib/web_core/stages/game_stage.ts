import * as GameProtocols from '../../shared/game_protocols';

import StageMediator from './stage_mediator';

export default class GameStage {
	private _canvas: HTMLCanvasElement;
	private _mediator: StageMediator;

	private _solarObjects: GameProtocols.BaseSolarObject[] = [];
	private _planetImgs: HTMLImageElement[] = [];

	constructor(gameStageCanvas: HTMLCanvasElement, gameStageMediator: StageMediator) {
		this._canvas = gameStageCanvas;
		this._mediator = gameStageMediator;

		for (let i = 1; i <= 5; i++) {
			let img = new Image();
			img.src = `/public/images/planets_0${i}.png`;
			this._planetImgs.push(img);
		}
	}

	getCoveredSolarObject(point: Point, distance: number): GameProtocols.BaseSolarObject {
		return this._solarObjects.find(obj => {
			if (Math.sqrt((point.x - obj.position.x) ** 2 + (point.y - obj.position.y) ** 2) < obj.size / 2 + distance) {
				return true;
			}
		})
	}

	draw() {
		let players = this._mediator.players;
		let transformation = this._mediator.getTrans();

		let ctx = this._canvas.getContext('2d');
		ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

		ctx.save();
		ctx.setTransform(transformation.scaling, 0, 0, transformation.scaling, transformation.horizontalMoving, transformation.verticalMoving);

		this._solarObjects.forEach(obj => {
			// 绘制星球
			ctx.save();

			let color = '#ddd';
			if (obj.occupiedPlayerId != null) {
				color = players.find(player => player.id == obj.occupiedPlayerId).color;
			}

			var grd = ctx.createRadialGradient(obj.position.x - obj.size * 0.2, obj.position.y - obj.size * 0.2, obj.size / 2,
				obj.position.x - obj.size * 0.2, obj.position.y - obj.size * 0.2, obj.size * 1.5);
			grd.addColorStop(0, color);
			grd.addColorStop(1, 'rgba(0,0,0,.5)');

			ctx.fillStyle = grd;
			ctx.strokeStyle = grd;
			// setShadow(ctx, 1, 1, 15, color);

			if (obj.type == GameProtocols.SolarObjectType.planet) {
				ctx.beginPath();
				ctx.arc(obj.position.x, obj.position.y, obj.size / 2, 0, Math.PI * 2);
				ctx.fill();
				ctx.drawImage(this._planetImgs[obj.id % this._planetImgs.length], obj.position.x - obj.size / 2, obj.position.y - obj.size / 2, obj.size, obj.size);
			} else {
				ctx.beginPath();
				ctx.arc(obj.position.x, obj.position.y, obj.size / 2 - 5, 0, Math.PI * 2);
				ctx.lineWidth = 10;
				ctx.stroke();
			}

			ctx.restore();

			// 绘制星球争夺或平静状态
			ctx.save();
			ctx.font = '10px Arial,Microsoft YaHei';
			if (obj.allShips.length == 1) {
				ctx.textAlign = 'center';
				let player = players.find(player => player.id == obj.allShips[0].playerId);
				ctx.fillStyle = player.color;
				// setShadow(ctx, 1, 1, 15, player.color);
				ctx.fillText(`${player.name} ${obj.allShips[0].count}`, obj.position.x, obj.position.y + obj.size / 2 + 12);
			} else if (obj.allShips.length > 1) {
				let sum = 0;
				obj.allShips.forEach(p => sum += p.count);

				// 将当前玩家移至数组第一位
				let index = 0;
				obj.allShips.forEach((s, i) => {
					if (s.playerId == this._mediator.currPlayerId) {
						index = i;
						return;
					}
				});
				let currShips = obj.allShips.splice(index, 1)[0];
				obj.allShips.unshift(currShips);

				let currAngle = -Math.PI / 2 - Math.PI * obj.allShips[0].count / sum;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.lineWidth = 2;
				obj.allShips.forEach(ship => {
					ctx.beginPath();
					let nextAngle = currAngle + Math.PI * 2 * ship.count / sum;
					ctx.arc(obj.position.x, obj.position.y, obj.size / 2 + 5, currAngle, nextAngle);

					let player = players.find(player => player.id == ship.playerId);
					ctx.strokeStyle = ctx.fillStyle = player.color;
					let x = obj.position.x + Math.cos((currAngle + nextAngle) / 2) * (obj.size / 2 + 12);
					let y = obj.position.y + Math.sin((currAngle + nextAngle) / 2) * (obj.size / 2 + 12);

					ctx.fillText(ship.count.toString(), x, y);
					currAngle = nextAngle;
					setShadow(ctx, 0, 0, 30, player.color);
					ctx.stroke();
				});
			}
			ctx.restore();

			// 绘制星球占领中状态
			if ((obj.allShips.length == 1 || obj.allShips.length == 0)
				&& obj.occupyingStatus != null && obj.occupyingStatus.percent < 100) {
				ctx.save();
				let player = players.find(player => player.id == obj.occupyingStatus.playerId);
				ctx.beginPath();
				let angle = Math.PI * 2 * obj.occupyingStatus.percent / 100 - Math.PI / 2;
				ctx.arc(obj.position.x, obj.position.y, obj.size / 2 + 3, -Math.PI / 2, angle);

				setShadow(ctx, 0, 0, 30, player.color);
				ctx.lineCap = 'round';
				ctx.strokeStyle = player.color;
				ctx.lineWidth = 2;
				ctx.stroke();
				ctx.restore();
			}
		});

		ctx.restore();

		function setShadow(ctx: CanvasRenderingContext2D, x: number, y: number, blur: number, color: string) {
			ctx.shadowOffsetX = x; // 阴影Y轴偏移
			ctx.shadowOffsetY = y; // 阴影X轴偏移
			ctx.shadowBlur = blur; // 模糊尺寸
			ctx.shadowColor = color; // 颜色
		}
	}

	private _occupyingTimers: {
		objId: number,
		timer: NodeJS.Timer
	}[] = [];
	private _setOccupyingInterval(objId: number, timer: NodeJS.Timer) {
		let occupyingTimer = this._occupyingTimers.find(p => p.objId == objId);
		if (occupyingTimer == undefined) {
			this._occupyingTimers.push({
				objId: objId,
				timer: timer
			});
		} else {
			occupyingTimer.timer = timer;
		}
	}
	private _clearOccupyingInterval(objId: number) {
		let occupyingTimer = this._occupyingTimers.find(p => p.objId == objId);
		if (occupyingTimer != undefined) {
			clearInterval(occupyingTimer.timer);
		}
	}
	startOccupyingSolarObject(protocol: GameProtocols.StartOccupyingSolarObject) {
		this.changeSolarObjects([protocol.object]);
		let obj = this._solarObjects.find(p => p.id == protocol.object.id);
		this._clearOccupyingInterval(obj.id);
		if (protocol.interval == -1) {
			return;
		}

		let occupyingPlayerId = obj.allShips[0].playerId;

		if (obj.occupyingStatus == null) {
			obj.occupyingStatus = {
				playerId: occupyingPlayerId,
				percent: 0
			};
		}

		let timer = setInterval(() => {
			obj = this._solarObjects.find(p => p.id == protocol.object.id);
			if (obj.allShips.length != 1) {
				this._clearOccupyingInterval(obj.id);
				return;
			}

			let occupyingPlayerId = obj.allShips[0].playerId;

			if (occupyingPlayerId == obj.occupyingStatus.playerId) {
				if ((obj.occupyingStatus.percent += 0.5) >= 100) {
					obj.occupiedPlayerId = occupyingPlayerId;

					this._clearOccupyingInterval(obj.id);
				}
			} else {
				if ((obj.occupyingStatus.percent -= 0.5) <= 0) {
					if (obj.occupiedPlayerId == obj.occupyingStatus.playerId) {
						obj.occupiedPlayerId = null;
					}
					obj.occupyingStatus.playerId = occupyingPlayerId;

					this._clearOccupyingInterval(obj.id);
				}
			}

			this.draw();
		}, Math.ceil(protocol.interval * 0.5));

		this._setOccupyingInterval(obj.id, timer);
	}



	getSolarObjects(): GameProtocols.BaseSolarObject[] {
		return this._solarObjects;
	}

	changeSolarObjects(objs: GameProtocols.BaseSolarObject[]) {
		objs.forEach(p => {
			if (!this._solarObjects[p.id - 1]) {
				this._solarObjects.push(p);
			} else {
				this._solarObjects[p.id - 1] = p;
			}
		});
		this.draw();
	}
}