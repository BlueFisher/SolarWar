import * as $ from 'jquery';
import * as HttpProtocols from '../protocols/http_protocols';
import * as GameProtocols from '../protocols/game_protocols';

import GameStage from './game_stage';

class Main {
	private _playerId: number;
	private _gameStage: GameStage;
	private _ws: WebSocket;

	constructor() {
		let $countRatio = this._initializeCountRatio();
		let playerName = prompt("请输入名字", "Default Player");

		$.ajax({
			url: "/addNewPlayer",
			method: "post",
			dataType: "json",
			contentType: "application/json",
			data: JSON.stringify({
				name: playerName
			}),
		}).then((data: HttpProtocols.AddNewPlayerResProtocol) => {
			this._playerId = data.id;
			this._initializeGameStage($countRatio);
		}, () => {
			alert('连接服务器失败');
		});
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

	private _initializeGameStage($countRatio: JQuery) {
		let $gameStageCanvas = $('#game-stage');
		let gameStageCanvas = <HTMLCanvasElement>$gameStageCanvas[0];
		gameStageCanvas.height = $(window).innerHeight();
		gameStageCanvas.width = $(window).innerWidth();

		this._gameStage = new GameStage($gameStageCanvas, $countRatio, this._playerId);
		this._gameStage.on('protocolSend', (protocol: GameProtocols.GameBaseProtocol) => {
			this._onProtocolSend(protocol);
		})

		$(window).on('resize', () => {
			gameStageCanvas.height = $(window).innerHeight();
			gameStageCanvas.width = $(window).innerWidth();

			this._gameStage.redrawStage();
		});

		this._connect();
	}

	private _connect() {
		this._ws = new WebSocket('ws://localhost:8080');

		this._ws.onopen = () => {
			this._onOpen();
		}

		this._ws.onmessage = (e) => {
			let protocol = JSON.parse(e.data);
			switch (protocol.type) {
				case GameProtocols.GameProtocolType.gameStatus:
					this._onGameStatusChange(<GameProtocols.GameStatusProtocol>protocol);
					break;
				case GameProtocols.GameProtocolType.gameOver:
					this._onGameOver(<GameProtocols.GameOverProtocol>protocol);
					break;
			}
		}

		this._ws.onclose = e => {
			this._onClose();
		}
		this._ws.onerror = e => {
			this._onClose();
		}
	}

	private _onOpen() {
		console.log("WebSocket Connected");

		let newPlayerConnectedProtocol: GameProtocols.NewPlayerConnectedProtocol = {
			type: GameProtocols.GameProtocolType.newPlayerConnected,
			id: this._playerId,
		};
		this._ws.send(JSON.stringify(newPlayerConnectedProtocol));
	}

	private _onClose() {
		console.log('WebSocket Disconnected');
	}


	private _onGameStatusChange(protocol: GameProtocols.GameStatusProtocol) {
		this._gameStage.stageChange(protocol);
	}
	private _onGameOver(protocol: GameProtocols.GameOverProtocol) {
		alert('Game Over');
	}

	private _onProtocolSend(protocol: GameProtocols.GameBaseProtocol) {
		this._ws.send(JSON.stringify(protocol));
	}
}


$(document).ready(() => {
	new Main();
});
