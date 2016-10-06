import * as $ from 'jquery';
import * as HttpProtocols from '../protocols/http_protocols';
import * as GameProtocols from '../protocols/game_protocols';

import StageManager from './stage_manager';

class Main {
	private _stageManager: StageManager;
	private _ws: WebSocket;

	constructor() {
		let $countRatio = this._initializeCountRatio();
		this._initializeStageManager($countRatio);
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
		gameStageCanvas.height = $window.innerHeight();
		gameStageCanvas.width = $window.innerWidth();

		let $uiStage = $('#ui-stage');
		let uiStageCanvas = <HTMLCanvasElement>$uiStage[0];
		uiStageCanvas.height = $window.innerHeight();
		uiStageCanvas.width = $window.innerWidth();

		this._stageManager = new StageManager(gameStageCanvas, uiStageCanvas, $countRatio, (protocol) => {
			this._ws.send(JSON.stringify(protocol));
		});

		$(window).on('resize', () => {
			gameStageCanvas.height = $window.innerHeight();
			gameStageCanvas.width = $window.innerWidth();
			uiStageCanvas.height = $window.innerHeight();
			uiStageCanvas.width = $window.innerWidth();

			this._stageManager.redrawGameStage();
		});

		$.get('/websocketconfig').then((data: HttpProtocols.WebSocketConfigResProtocol) => {
			this._connect(data);
		});
	}

	private _connect(webSocketConfig: HttpProtocols.WebSocketConfigResProtocol) {
		this._ws = new WebSocket(`ws://${webSocketConfig.ip}:${webSocketConfig.port}`);

		this._ws.onopen = () => {
			console.log("WebSocket Connected");
			let playerName = prompt("请输入名字", "Default Player");

			let protocol: GameProtocols.RequestInitializeMap = {
				type: GameProtocols.Type.requestInitializeMap,
				name: playerName,
			};
			this._ws.send(JSON.stringify(protocol));
		};

		this._ws.onmessage = (e) => {
			let protocol = JSON.parse(e.data);
			this._stageManager.protocolReceived(protocol);
		};

		this._ws.onclose = () => {
			onClose();
		};
		this._ws.onerror = () => {
			onClose();
		};

		function onClose() {
			console.log('WebSocket Disconnected');
		}
	}
}


$(document).ready(() => {
	new Main();
});
