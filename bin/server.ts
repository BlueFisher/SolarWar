import * as express from 'express';
import * as session from 'express-session';
import * as bodyParser from 'body-parser';

import Config from './protocols/config';
import * as HttpProtocols from './protocols/http_protocols';
import GameServer from './game_server';

class Server {
	private _gameServers: GameServer[] = [];

	/**
	 * 主后台服务，管理HTTP服务与游戏服务
	 *
	 * @param httpPort HTTP端口号
	 * @param webSocketPort WebSocket端口号
	 * @param callback 监听成功回调函数 isHttp: 是否为HTTP服务器, port: 端口号
	 */
	constructor(callback: (isHttp: boolean, port: number) => void) {
		let app = express();

		this._configExpress(app);

		app.listen(Config.httpPort, () => {
			callback(true, Config.httpPort);
		});

		Config.webSocketServers.forEach(s => {
			this._gameServers.push(new GameServer(s.port, () => {
				callback(false, s.port);
			}));
		});

	}

	private _configExpress(app: express.Express) {
		app.use(bodyParser.json({
			limit: '1mb'
		}));
		app.use(bodyParser.urlencoded({
			extended: true
		}));
		app.use(session({
			secret: 'I6zoBZ0LVYPi9Ujt',
			resave: false,
			saveUninitialized: true,
		}));
		app.set('view engine', 'ejs');

		app.get('/', (req, res) => {
			res.render('index');
		});
		app.get('/websockets', (req, res) => {
			res.json(Config.webSocketServers);
		});

		app.use('/public', express.static('public'));
	}
}

export default Server;