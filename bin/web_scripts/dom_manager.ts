import * as $ from 'jquery';
import * as Vue from 'vue';
import * as toastr from 'toastr';
import * as HttpProtocols from '../protocols/http_protocols';
import * as GameProtocols from '../protocols/game_protocols';
import * as VueData from './vue_data';

export default class DomManager {
	private _vueIndex: VueData.Index;
	private _connectWebSocket: () => void;

	constructor(vueIndex: VueData.Index, connectWebSocket: () => void) {
		this._vueIndex = vueIndex;
		this._connectWebSocket = connectWebSocket;

		this._initializeCanvas();
		this._initializeModals();
		this._initializeCountRatio();
	}

	private _initializeCanvas() {
		let [gameStageCanvas, uiStageCanvas] = this.getCanvas();

		this._adjustCanvasSize(gameStageCanvas, uiStageCanvas);
		$(window).on('resize', () => {
			this._adjustCanvasSize(gameStageCanvas, uiStageCanvas);
		});
	}
	private _adjustCanvasSize(gameStageCanvas: HTMLCanvasElement, uiStageCanvas: HTMLCanvasElement) {
		let $window = $(window);
		gameStageCanvas.height = $window.innerHeight();
		gameStageCanvas.width = $window.innerWidth();
		uiStageCanvas.height = $window.innerHeight();
		uiStageCanvas.width = $window.innerWidth();
	}

	getCanvas(): [HTMLCanvasElement, HTMLCanvasElement] {
		return [<HTMLCanvasElement>document.querySelector('#game-stage'), <HTMLCanvasElement>document.querySelector('#ui-stage')]
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
			el: '#count-ratio',
			data: this._vueIndex
		});

		let $countRatio = $('#count-ratio').find('input[type="range"]');
		$countRatio.rangeslider({
			polyfill: false
		});

		let $rangesliderHandle = $('.rangeslider__handle');
		$rangesliderHandle.text(`${$countRatio.val()}%`);
		$(document).on('input', $countRatio, () => {
			this._vueIndex.range = parseInt($countRatio.val());
			$rangesliderHandle.text(`${$countRatio.val()}%`);
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