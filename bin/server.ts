import * as express from 'express';
import * as bodyParser from 'body-parser';

import Config from './protocols/config';
import * as HttpProtocols from './protocols/http_protocols';
import GameServer from './game_server';

class Server {
	private _gameServer: GameServer;

	/**
	 * 主后台服务，管理HTTP服务与游戏服务
	 *
	 * @param httpPort HTTP端口号
	 * @param webSocketPort WebSocket端口号
	 * @param callback 监听成功回调函数 isHttp: 是否为HTTP服务器 port: 端口号
	 */
	constructor(httpPort: number, webSocketPort: number, callback: (isHttp: boolean, port: number) => void) {
		let app = express();

		this._configExpress(app);

		app.listen(httpPort, () => {
			callback(true, httpPort);
		});

		this._gameServer = new GameServer(webSocketPort, () => {
			callback(false, webSocketPort);
		});
	}

	private _configExpress(app: express.Express) {
		app.use(bodyParser.json({
			limit: '1mb'
		}));
		app.use(bodyParser.urlencoded({
			extended: true
		}));
		app.set('view engine', 'ejs');

		app.get('/', (req, res) => {
			res.render('index', {
				ip: Config.ip,
				port: Config.webSocketPort
			});
		});

		app.use('/public', express.static('public'));
	}

	/**获取游戏服务器实例 */
	getGameServer(): GameServer {
		return this._gameServer;
	}
}

export default Server;