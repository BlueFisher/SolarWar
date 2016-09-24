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
		let $countRatio = $('#count-ratio input[type="range"]');
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

		this._stageManager = new StageManager(gameStageCanvas, uiStageCanvas, $countRatio);
		this._stageManager.on('protocolSend', (protocol: GameProtocols.BaseProtocol) => {
			this._ws.send(JSON.stringify(protocol));
		})

		$(window).on('resize', () => {
			gameStageCanvas.height = $window.innerHeight();
			gameStageCanvas.width = $window.innerWidth();
			uiStageCanvas.height = $window.innerHeight();
			uiStageCanvas.width = $window.innerWidth();

			this._stageManager.redrawGameStage();
		});

		this._connect();
	}

	private _connect() {
		this._ws = new WebSocket('ws://localhost:8080');

		this._ws.onopen = () => {
			console.log("WebSocket Connected");
			let playerName = prompt("请输入名字", "Default Player");

			let protocol: GameProtocols.RequestAddingPlayer = {
				type: GameProtocols.Type.requestAddingPlayer,
				name: playerName,
			};
			this._ws.send(JSON.stringify(protocol));
		}

		this._ws.onmessage = (e) => {
			let protocol = JSON.parse(e.data);
			switch (protocol.type) {
				case GameProtocols.Type.responseAddingPlayer:
					this._onResponseAddPlayer(<GameProtocols.ResponseAddingPlayer>protocol);
					break;
				case GameProtocols.Type.gameStatus:
					this._onGameStatusChange(<GameProtocols.GameStatus>protocol);
					break;
				case GameProtocols.Type.gameOver:
					this._onGameOver(<GameProtocols.GameOver>protocol);
					break;
			}
		}

		this._ws.onclose = e => {
			onClose();
		}
		this._ws.onerror = e => {
			onClose();
		}

		function onClose() {
			console.log('WebSocket Disconnected');
		}
	}

	private _onResponseAddPlayer(protocol: GameProtocols.ResponseAddingPlayer) {
		this._stageManager.refreshCurrPlayerId(protocol.id);
	}
	private _onGameStatusChange(protocol: GameProtocols.GameStatus) {
		this._stageManager.stageChange(protocol);
	}
	private _onGameOver(protocol: GameProtocols.GameOver) {
		alert('Game Over');
	}
}


$(document).ready(() => {
	new Main();
});
