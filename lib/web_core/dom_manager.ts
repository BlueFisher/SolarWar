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

		this._initializeVue();
		this._initializeCanvas();
		this._initializeCountRatio();
		this._initializeGame();
	}

	private _initializeVue() {
		new vue({
			el: '#ui',
			data: vueData.index,
			computed: {
				ranklist: function () {
					vueData.index.ranklist.sort((a, b) => b.currShipsCount - a.currShipsCount).filter(p => p.currShipsCount > 0).slice(0, 10);
					return vueData.index.ranklist;
				},
				gameTime: function (): string {
					if (!vueData.index.gameTime || vueData.index.gameTime < 0) {
						return '00 : 00';
					}
					let sec = vueData.index.gameTime;
					let min = 0;
					if (sec > 60) {
						min = Math.floor(sec / 60);
						sec = Math.floor(sec % 60);
					}
					return `${min} : ${sec}`;
				},
				props: function (): string[] {
					let propStrings: string[] = [];
					vueData.index.props.forEach(p => {
						if (p == GameProtocols.SolarObjectType.portal)
							propStrings.push('传送门');
					});
					return propStrings;
				}
			},
			methods: {
				addProp: (prop: GameProtocols.SolarObjectType) => {
					if (!vueData.index.addingProp)
						vueData.index.addingProp = prop;
				}
			}
		});

		new vue({
			el: '#modal-gameinit',
			data: vueData.gameInitModal,
			methods: {
				startGame: () => {
					vueData.gameInitModal.resumeGame = false;
					$('#modal-gameinit').modal('hide');
					gameOn();
				},
				resumeGame: () => {
					vueData.gameInitModal.resumeGame = true;
					$('#modal-gameinit').modal('hide');
					gameOn();
				},
				signin: () => {
					let protocol: HttpProtocols.AccountRequest = {
						email: vueData.gameInitModal.email,
						password: vueData.gameInitModal.password
					};
					$.ajax('/signin', {
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
						email: vueData.gameInitModal.email,
						password: vueData.gameInitModal.password
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
			data: vueData.gameReadyModal
		});

		new vue({
			el: '#modal-gameover',
			data: vueData.gameOverModal,
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
		let $countRatio = $('#ratio input[type="range"]');
		$countRatio.rangeslider({
			polyfill: false
		});

		let $rangesliderHandle = $('.rangeslider__handle');
		$rangesliderHandle.text(`${$countRatio.val()}%`);
		$(document).on('input', $countRatio, () => {
			$rangesliderHandle.text(`${$countRatio.val()}%`);
			vueData.index.ratio = $countRatio.val();
		});
	}

	private _initializeGame() {
		$.getJSON('/websockets').then((protocol: HttpProtocols.WebSocketResponse[]) => {
			vueData.indexCommon.webSockets = protocol;
			vueData.indexCommon.activeWebSocket = protocol[0];

			$('#modal-gameinit').find('.form-control').focus();
		});

		$('#modal-gameinit').modal({
			backdrop: 'static',
			keyboard: false
		});
	}

	gettransStageContainer() {
		return document.querySelector('#trans-stage-container') as HTMLElement;
	}

	getCanvases(): [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement] {
		return [<HTMLCanvasElement>document.querySelector('#bg-stage'),
		<HTMLCanvasElement>document.querySelector('#game-moving-ships-stage'),
		<HTMLCanvasElement>document.querySelector('#game-stage'),
		<HTMLCanvasElement>document.querySelector('#ui-stage')]
	}

	gameOn() {
		$('#modal-gameready').modal('hide');
	}

	gameOver(protocol: GameProtocols.GameOver) {
		vueData.gameOverModal.historyMaxShipsCount = protocol.historyMaxShipsCount;

		$('#modal-gameover').modal({
			backdrop: 'static',
			keyboard: false
		}).on('shown.bs.modal', function () {
			$('#modal-gameover').find('.form-control').focus();
		});
	}

	readyTimeElapse(protocol: GameProtocols.ReadyTimeElapse) {
		vueData.gameReadyModal.gameReadyTime = protocol.time;
	}
	timeElapse(protocol: GameProtocols.TimeElapse) {
		vueData.index.gameTime = protocol.time;
	}
}