import * as $ from 'jquery';
import * as Vue from 'vue';
import * as toastr from 'toastr';
import * as HttpProtocols from '../shared/http_protocols';
import * as GameProtocols from '../shared/game_protocols';
import * as Utils from './utils';

export default class DomManager {
	private _vueIndex: Utils.VueIndex;
	private _connectWebSocket: () => void;

	constructor(vueIndex: Utils.VueIndex, connectWebSocket: () => void) {
		this._vueIndex = vueIndex;
		this._connectWebSocket = connectWebSocket;

		this._initializeCanvas();
		this._initializeModals();
		this._initializeCountRatio();
	}

	private _initializeCanvas() {
		let canvases = this.getCanvas();

		this._adjustCanvasSize(canvases);
		$(window).on('resize', () => {
			this._adjustCanvasSize(canvases);
		});
	}
	private _adjustCanvasSize(canvases: HTMLCanvasElement[]) {
		let $window = $(window);
		canvases.forEach(p => {
			p.height = $window.innerHeight();
			p.width = $window.innerWidth();
		});
	}

	getCanvas(): [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement] {
		return [<HTMLCanvasElement>document.querySelector('#game-stage'),
		<HTMLCanvasElement>document.querySelector('#game-moving-ships-stage'),
		<HTMLCanvasElement>document.querySelector('#ui-stage')]
	}

	private _initializeModals() {
		new Vue({
			el: '#modal-gameinit',
			data: this._vueIndex,
			methods: {
				onSubmit: () => {
					this._connectWebSocket();
					$('#modal-gameinit').modal('hide');
					$('#modal-gameready').modal({
						backdrop: 'static',
						keyboard: false
					});
				}
			}
		});

		new Vue({
			el: '#modal-gameready',
			data: this._vueIndex
		});

		new Vue({
			el: '#modal-gameover',
			data: this._vueIndex,
			methods: {
				onSubmit: () => {
					this._connectWebSocket();
					$('#modal-gameover').modal('hide');
					$('#modal-gameready').modal({
						backdrop: 'static',
						keyboard: false
					});
				}
			}
		});
	}

	private _initializeCountRatio() {
		let vm = new Vue({
			el: '#range',
			data: this._vueIndex
		});

		let div = $('#range #indicator');
		let path = $('#range #path');
		let [x, y] = [div.width() / 2 + div.offset().left, div.height() / 2 + div.offset().top];

		$(window).on('resize', function () {
			[x, y] = [div.width() / 2 + div.offset().left, div.height() / 2 + div.offset().top];
		});

		let setAngle = (pageX, pageY) => {
			let width = pageX - x;
			let height = y - pageY;

			let angle = Math.atan(width / height);
			if (isNaN(angle)) {
				angle = 0;
			} else if (height < 0) {
				angle += Math.PI;
			} else if (width < 0) {
				angle += Math.PI * 2;
			}

			angle = angle * 180 / Math.PI;

			if (angle < 30 || angle > 330) {
				return;
			}

			this._vueIndex.range = Math.round(-0.33 * angle + 109.9);

			path.css('stroke-dasharray', `${565 * (1 - (angle + 30) / 360)} 565`);

			div.css('transform', `rotate(${angle}deg)`);
		}
		$('#range').on('mousedown', function () {
			$(document).one('mousedown', function (e) {
				setAngle(e.pageX, e.pageY)
			});
			$(document).on('mousemove', function (e) {
				setAngle(e.pageX, e.pageY)
			});
		});

		$(document).on('mouseup', function () {
			$(document).off('mousemove')
		});
	}

	gameInit() {
		$('#modal-gameinit').modal({
			backdrop: 'static',
			keyboard: false
		}).on('shown.bs.modal', function () {
			$('#modal-gameinit').find('.form-control').focus();
		});
	}

	gameOn() {
		$('#modal-gameready').modal('hide');
	}

	gameOver(protocol: GameProtocols.GameOver) {
		this._vueIndex.historyMaxShipsCount = protocol.historyMaxShipsCount;

		$('#modal-gameover').modal({
			backdrop: 'static',
			keyboard: false
		}).on('shown.bs.modal', function () {
			$('#modal-gameover').find('.form-control').focus();
		});
	}

	readyTimeElapse(protocol: GameProtocols.ReadyTimeElapse) {
		this._vueIndex.gameReadyTime = protocol.time;
	}
}