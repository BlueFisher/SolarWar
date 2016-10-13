import * as $ from 'jquery';
import * as Vue from 'vue';
import * as toastr from 'toastr';
import * as HttpProtocols from '../protocols/http_protocols';
import * as GameProtocols from '../protocols/game_protocols';

import StageManager from './stage_manager';

class Main {
	private _stageManager: StageManager;
	private _ws: WebSocket;

	private _vueData: {
		name: string,
		historyMaxShipsCount: number
	};

	constructor() {
		this._initializeUI();
		let $countRatio = this._initializeCountRatio();
		this._initializeStageManager($countRatio);
	}

	private _initializeUI() {
		this._vueData = {
			name: 'Default Player',
			historyMaxShipsCount: 0
		};

		new Vue({
			el: '#modal-gameon .modal-body',
			data: this._vueData,
			methods: {
				onSubmit: () => {
					let protocol = new GameProtocols.RequestInitializeMap(this._vueData.name);
					this._ws.send(JSON.stringify(protocol));
					$('#modal-gameon').modal('hide');
				}
			}
		});

		new Vue({
			el: '#modal-gameover .modal-body',
			data: this._vueData,
			methods: {
				onSubmit: () => {
					let protocol = new GameProtocols.RequestInitializeMap(this._vueData.name);
					this._ws.send(JSON.stringify(protocol));
					$('#modal-gameover').modal('hide');
				}
			}
		});
	}

	private _initializeCountRatio(): { range: number } {
		let vueData = {
			range: 100
		};
		let vm = new Vue({
			el: '#count-ratio',
			data: vueData
		});

		let $countRatio = $('#count-ratio').find('input[type="range"]');
		$countRatio.rangeslider({
			polyfill: false
		});

		let $rangesliderHandle = $('.rangeslider__handle');
		$rangesliderHandle.text(`${$countRatio.val()}%`);
		$(document).on('input', $countRatio, () => {
			vm.$data.range = parseInt($countRatio.val());
			$rangesliderHandle.text(`${$countRatio.val()}%`);
		});

		return vueData;
	}

	private _initializeStageManager(countRatioData: { range: number }) {
		let $window = $(window);

		let $gameStage = $('#game-stage');
		let gameStageCanvas = <HTMLCanvasElement>$gameStage[0];

		let $uiStage = $('#ui-stage');
		let uiStageCanvas = <HTMLCanvasElement>$uiStage[0];

		this._adjustCanvasSize(gameStageCanvas, uiStageCanvas);
		$window.on('resize', () => {
			this._adjustCanvasSize(gameStageCanvas, uiStageCanvas);
			this._stageManager.redrawGameStage();
		});

		this._stageManager = new StageManager(gameStageCanvas, uiStageCanvas, countRatioData);
		this._stageManager.on(StageManager.events.sendProtocol, (protocol: GameProtocols.BaseProtocol) => {
			this._ws.send(JSON.stringify(protocol));
		});
		this._stageManager.on(StageManager.events.gameOver, (protocol: GameProtocols.GameOver) => {
			this._gameover(protocol);
		});

		this._connect($gameStage.attr('data-ip'), parseInt($gameStage.attr('data-port')));
	}

	private _adjustCanvasSize(gameStageCanvas: HTMLCanvasElement, uiStageCanvas: HTMLCanvasElement) {
		let $window = $(window);
		gameStageCanvas.height = $window.innerHeight();
		gameStageCanvas.width = $window.innerWidth();
		uiStageCanvas.height = $window.innerHeight();
		uiStageCanvas.width = $window.innerWidth();
	}

	private _connect(ip: string, port: number) {
		this._ws = new WebSocket(`ws://${ip}:${port}`);
		toastr.info('正在连接服务器...');

		this._ws.onopen = () => {
			toastr.clear();
			toastr.success('服务器连接成功');
			this._gameon();
		};

		this._ws.onmessage = (e) => {
			let protocol = JSON.parse(e.data);
			this._stageManager.protocolReceived(protocol);
		};

		this._ws.onclose = this._ws.onerror = () => {
			toastr.error('服务器断开连接');
		};
	}

	private _gameon() {
		let $gameonModal = $('#modal-gameon');
		$gameonModal.modal({
			backdrop: 'static',
			keyboard: false
		}).on('shown.bs.modal', function (e) {
			$gameonModal.find('.form-control').focus();
		});
	}

	private _gameover(protocol: GameProtocols.GameOver) {
		this._vueData.historyMaxShipsCount = protocol.historyMaxShipsCount;

		$('#modal-gameover').modal({
			backdrop: 'static',
			keyboard: false
		});
	}
}

$(document).ready(() => {
	new Main();
});
