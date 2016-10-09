import * as $ from 'jquery';
import * as toastr from 'toastr';
import * as HttpProtocols from '../protocols/http_protocols';
import * as GameProtocols from '../protocols/game_protocols';

import StageManager from './stage_manager';

class Main {
	private _stageManager: StageManager;
	private _ws: WebSocket;

	constructor() {
		this._initializeUI();
		let $countRatio = this._initializeCountRatio();
		this._initializeStageManager($countRatio);
	}

	private _initializeUI() {
		let $gameonModal = $('#modal-gameon');
		let $gameonModalInput = $gameonModal.find('.form-control');
		$gameonModal.modal({
			backdrop: 'static',
			keyboard: false
		});
		$gameonModal.find('.form-gameon').submit(e => {
			e.preventDefault();
			let protocol = new GameProtocols.RequestInitializeMap($gameonModalInput.val());
			this._ws.send(JSON.stringify(protocol));
			$gameonModal.modal('hide');
		})

		let $gameoverModal = $('#modal-gameover');
		let $gameoverModalInput = $gameoverModal.find('.form-control');
		$gameoverModal.find('.form-gameover').submit(e => {
			e.preventDefault();
			let protocol = new GameProtocols.RequestInitializeMap($gameoverModalInput.val());
			this._ws.send(JSON.stringify(protocol));
			$gameoverModal.modal('hide');
		});
	}

	private _initializeCountRatio(): JQuery {
		let $countRatio = $('#count-ratio').find('input[type="range"]');
		$countRatio.rangeslider({
			polyfill: false
		});

		let $rangesliderHandle = $('.rangeslider__handle');
		$rangesliderHandle.text(`${$countRatio.val()}%`);
		$(document).on('input', $countRatio, () => {
			$rangesliderHandle.text(`${$countRatio.val()}%`);
		});

		return $countRatio;
	}

	private _initializeStageManager($countRatio: JQuery) {
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

		this._stageManager = new StageManager(gameStageCanvas, uiStageCanvas, $countRatio);
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
		});
		$gameonModal.find('.form-control').focus();
	}
	private _gameover(protocol: GameProtocols.GameOver) {
		let $gameoverModal = $('#modal-gameover');
		$gameoverModal.find('.history-max-ships-count').text(protocol.historyMaxShipsCount);
		$gameoverModal.modal({
			backdrop: 'static',
			keyboard: false
		});
	}
}

$(document).ready(() => {
	new Main();
});
