import * as toastr from 'toastr';
import * as GameProtocols from '../shared/game_protocols';
import * as vueData from './vueData';
import GameManager from './game_manager';

class Main {
	private _gameStageManager: GameManager;

	private _ws: WebSocket = null;

	constructor() {
		this._gameStageManager = new GameManager(this._connectWebSocket.bind(this), this._webSocketSend.bind(this));
	}

	private _connectWebSocket() {
		let url = `ws://${vueData.vueIndexCommon.activeWebSocket.ip}:${vueData.vueIndexCommon.activeWebSocket.port}/`;
		if (this._ws == null) {
			this._connect(url);
		} else if (this._ws.url != url) {
			this._ws.close();
			this._connect(url);
		} else {
			this._webSocketSend(new GameProtocols.RequestInitializeMap(vueData.vueIndexCommon.name, vueData.vueGameInitModal.resumeGame));
		}
	}
	private _connect(url: string) {
		this._ws = new WebSocket(url);
		toastr.info('正在连接服务器...');

		this._ws.onopen = () => {
			toastr.clear();
			toastr.success('服务器连接成功');
			this._webSocketSend(new GameProtocols.RequestInitializeMap(vueData.vueIndexCommon.name, vueData.vueGameInitModal.resumeGame));
		};

		this._ws.onmessage = (e) => {
			let protocol = JSON.parse(e.data);
			this._protocolReceived(protocol);
		};

		this._ws.onclose = this._ws.onerror = () => {
			toastr.error('服务器断开连接');
		};
	}

	private _webSocketSend(protocol: GameProtocols.BaseProtocol) {
		this._ws.send(JSON.stringify(protocol));
	}

	private _protocolReceived(protocol: GameProtocols.BaseProtocol) {
		this._gameStageManager.protocolReceived(protocol);
	}
}

new Main();
