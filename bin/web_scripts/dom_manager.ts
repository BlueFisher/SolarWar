import * as $ from 'jquery';
import * as Vue from 'vue';
import * as toastr from 'toastr';
import * as HttpProtocols from '../protocols/http_protocols';
import * as GameProtocols from '../protocols/game_protocols';

export default class DomManager {
	private _vueUIData: VueUIData;
	private _webSocketSend: (protocol: GameProtocols.BaseProtocol) => void;

	constructor(vueUIData: VueUIData, webSocketSend: (protocol: GameProtocols.BaseProtocol) => void) {
		this._vueUIData = vueUIData;
		this._webSocketSend = webSocketSend;

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
			el: '#modal-gameon .modal-body',
			data: this._vueUIData,
			methods: {
				onSubmit: () => {
					let protocol = new GameProtocols.RequestInitializeMap(this._vueUIData.name);
					this._webSocketSend(protocol);
					$('#modal-gameon').modal('hide');
				}
			}
		});

		new Vue({
			el: '#modal-gameover .modal-body',
			data: this._vueUIData,
			methods: {
				onSubmit: () => {
					let protocol = new GameProtocols.RequestInitializeMap(this._vueUIData.name);
					this._webSocketSend(protocol);
					$('#modal-gameover').modal('hide');
				}
			}
		});
	}

	private _initializeCountRatio() {
		let vm = new Vue({
			el: '#count-ratio',
			data: this._vueUIData
		});

		let $countRatio = $('#count-ratio').find('input[type="range"]');
		$countRatio.rangeslider({
			polyfill: false
		});

		let $rangesliderHandle = $('.rangeslider__handle');
		$rangesliderHandle.text(`${$countRatio.val()}%`);
		$(document).on('input', $countRatio, () => {
			this._vueUIData.range = parseInt($countRatio.val());
			$rangesliderHandle.text(`${$countRatio.val()}%`);
		});
	}

	gameOn() {
		let $gameonModal = $('#modal-gameon');

		$gameonModal.modal({
			backdrop: 'static',
			keyboard: false
		}).on('shown.bs.modal', function (e) {
			$gameonModal.find('.form-control').focus();
		});
	}

	gameOver(protocol: GameProtocols.GameOver) {
		this._vueUIData.historyMaxShipsCount = protocol.historyMaxShipsCount;

		$('#modal-gameover').modal({
			backdrop: 'static',
			keyboard: false
		}).on('shown.bs.modal', function (e) {
			$('#modal-gameover').find('.form-control').focus();
		});
	}
}