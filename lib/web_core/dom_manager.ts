import * as $ from 'jquery';
import * as vue from 'vue';
import * as toastr from 'toastr';

import * as HttpProtocols from '../shared/http_protocols';
import * as GameProtocols from '../shared/game_protocols';
import * as vueData from './vueData';

export default class DomManager {
	private _connectWebSocket: () => void;

	constructor(connectWebSocket: () => void) {
		this._connectWebSocket = connectWebSocket;

		this._initializeModals();
		this._initializeCanvas();
		this._initializeCountRatio();
		this._initializeGame();
	}

	private _initializeModals() {
		new vue({
			el: '#ui',
			data: vueData.vueIndex,
			computed: {
				gameTime: function (): string {
					if (!vueData.vueIndex.gameTime || vueData.vueIndex.gameTime < 0) {
						return '00 : 00';
					}
					let sec = vueData.vueIndex.gameTime;
					let min = 0;
					if (sec > 60) {
						min = Math.floor(sec / 60);
						sec = Math.floor(sec % 60);
					}
					return `${min} : ${sec}`;
				}
			},
		});

		new vue({
			el: '#modal-gameinit',
			data: vueData.vueGameInitModal,
			methods: {
				startGame: () => {
					vueData.vueGameInitModal.resumeGame = false;
					$('#modal-gameinit').modal('hide');
					gameOn();
				},
				resumeGame: () => {
					vueData.vueGameInitModal.resumeGame = true;
					$('#modal-gameinit').modal('hide');
					gameOn();
				},
				signin: async () => {
					let protocol: HttpProtocols.AccountRequest = {
						email: vueData.vueGameInitModal.email,
						password: vueData.vueGameInitModal.password
					};
					await $.ajax('/signin', {
						method: 'POST',
						contentType: "application/json",
						data: JSON.stringify(protocol)
					}).then(function (data: HttpProtocols.AccountResponse) {
						location.reload();
					}, (function (xhr) {
						toastr.error((xhr.responseJSON as HttpProtocols.ErrorResponse).message);
					}));
				},
				signup: () => {
					let protocol: HttpProtocols.AccountRequest = {
						email: vueData.vueGameInitModal.email,
						password: vueData.vueGameInitModal.password
					};
					$.ajax('/signup', {
						method: 'POST',
						contentType: "application/json",
						data: JSON.stringify(protocol)
					}).then(function (data: HttpProtocols.AccountResponse) {
						location.reload();
					}, (function (xhr) {
						toastr.error((xhr.responseJSON as HttpProtocols.ErrorResponse).message);
					}));
				}
			}
		});

		new vue({
			el: '#modal-gameready',
			data: vueData.vueGameReadyModal
		});

		new vue({
			el: '#modal-gameover',
			data: vueData.vueGameOverModal,
			methods: {
				startGameFromGameOver: () => {
					$('#modal-gameover').modal('hide');
					gameOn();
				}
			}
		});

		let gameOn = () => {
			this._connectWebSocket();

			$('#modal-gameready').modal({
				backdrop: 'static',
				keyboard: false
			});
		}
	}

	private _initializeCanvas() {
		let canvases = this.getCanvases();

		adjustCanvasSize();
		$(window).on('resize', () => {
			adjustCanvasSize();
		});

		function adjustCanvasSize() {
			let $window = $(window);
			canvases.forEach(p => {
				p.height = $window.innerHeight();
				p.width = $window.innerWidth();
			});
		}
	}

	private _initializeCountRatio() {
		let div = $('.ratio #indicator');
		let path = $('.ratio #path');
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

			vueData.vueIndex.ratio = Math.round(-0.33 * angle + 109.9);

			path.css('stroke-dasharray', `${565 * (1 - (angle + 30) / 360)} 565`);

			div.css('transform', `rotate(${angle}deg)`);
		}
		$('.ratio').on('mousedown', function () {
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

	private _initializeGame() {
		$.getJSON('/websockets').then((protocol: HttpProtocols.WebSocketResponse[]) => {
			vueData.vueIndexCommon.webSockets = protocol;
			vueData.vueIndexCommon.activeWebSocket = protocol[0];

			$('#modal-gameinit').find('.form-control').focus();
		});

		$('#modal-gameinit').modal({
			backdrop: 'static',
			keyboard: false
		});
	}

	getCanvases(): [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement] {
		return [<HTMLCanvasElement>document.querySelector('#game-stage'),
		<HTMLCanvasElement>document.querySelector('#game-moving-ships-stage'),
		<HTMLCanvasElement>document.querySelector('#ui-stage')]
	}
	getBackgrounds(): [HTMLElement, HTMLElement] {
		return [<HTMLElement>document.querySelector('#star-bg'),
		<HTMLElement>document.querySelector('#star-bg2')];
	}

	gameOn() {
		$('#modal-gameready').modal('hide');
	}

	gameOver(protocol: GameProtocols.GameOver) {
		vueData.vueGameOverModal.historyMaxShipsCount = protocol.historyMaxShipsCount;

		$('#modal-gameover').modal({
			backdrop: 'static',
			keyboard: false
		}).on('shown.bs.modal', function () {
			$('#modal-gameover').find('.form-control').focus();
		});
	}

	readyTimeElapse(protocol: GameProtocols.ReadyTimeElapse) {
		vueData.vueGameReadyModal.gameReadyTime = protocol.time;
	}
	timeElapse(protocol: GameProtocols.TimeElapse) {
		vueData.vueIndex.gameTime = protocol.time;
	}
}