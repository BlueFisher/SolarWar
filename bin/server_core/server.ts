import * as path from 'path';

import * as express from 'express';
import * as session from 'express-session';
import * as bodyParser from 'body-parser';

import * as log4js from 'log4js';

import config from '../shared/config';
import * as HttpProtocols from '../shared/http_protocols';
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

		app.listen(config.httpPort, () => {
			callback(true, config.httpPort);
		});

		config.webSocketServers.forEach(s => {
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

		app.engine('.html', require('ejs').__express);
		app.set('views', path.resolve(__dirname, '../../') + '/views');
		app.set('view engine', 'html');

		log4js.configure({
			appenders: [
				{
					type: 'console',
					layout: {
						type: 'pattern',
						pattern: '%[[%r] [%p]%] - %m'
					}
				}
			],
			replaceConsole: true
		});
		let logger = log4js.getLogger();

		app.use(log4js.connectLogger(logger, {
			level: log4js.levels.INFO,
			format: ':remote-addr :method :url :status - :response-time ms'
		}));

		app.use('/public', express.static('public'));

		app.get('/', (req, res) => {
			res.render('index');
		});
		app.get('/websockets', (req, res) => {
			res.json(config.webSocketServers);
		});
	}
}

export default Server;