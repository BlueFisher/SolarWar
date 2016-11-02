// import * as path from 'path';

import * as express from 'express';
import * as session from 'express-session';
import * as bodyParser from 'body-parser';
import * as log4js from 'log4js';
import { useLogger } from './log';

import * as DAO from './db_access_funcs';

import config from '../shared/config';
import * as HttpProtocols from '../shared/http_protocols';
import GameServer from './game_server';

class Server {
	private _gameServers: GameServer[] = [];

	private _sessionParser = session({
		secret: 'I6zoBZ0LVYPi9Ujt',
		name: 'sid',
		resave: false,
		saveUninitialized: true,
	});

	/**
	 * 主后台服务，管理HTTP服务与游戏服务
	 *
	 * @param callback 监听成功回调函数 isHttp: 是否为HTTP服务器, port: 端口号
	 */
	constructor(callback: (isHttp: boolean, port: number) => void) {
		let app = express();

		this._configExpress(app);

		app.listen(config.httpPort, () => {
			callback(true, config.httpPort);
		});

		config.webSocketServers.forEach(s => {
			this._gameServers.push(new GameServer(s.ip, s.port, this._sessionParser, () => {
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

		app.use(this._sessionParser);

		// app.engine('.html', require('ejs').__express);
		// app.set('views', path.resolve(__dirname, '../../') + '/views');
		app.set('view engine', 'ejs');

		app.use(useLogger);

		app.use('/public', express.static('public'));

		app.get('/', (req, res) => {
			let render = {
				user: null
			}
			let userId: string = (req.session as any).userId;
			if (userId) {
				DAO.findUser(userId).then(function (user) {
					render.user = user;
					res.render('index', render);
				});
			} else {
				res.render('index', render);
			}
		});
		app.get('/websockets', (req, res) => {
			let protocol: HttpProtocols.WebSocketResponse[] = [];
			this._gameServers.forEach(s => {
				protocol.push({
					ip: s.ip,
					port: s.port,
					canResumeGame: s.isPlayerOnGame(req.sessionID)
				});
			})
			res.json(protocol);
		});

		app.post('/signup', (req, res) => {
			let body = req.body as HttpProtocols.AccountRequest;
			DAO.signup(body.email, body.password).then(user => {
				let protocol: HttpProtocols.AccountResponse = {
					succeeded: user != null,
					user: user
				};
				if (user) {
					delete user.passwordHash;
					(req.session as any).userId = user._id;
				}
				res.json(protocol);
			});
		});

		app.post('/signin', (req, res) => {
			let body = req.body as HttpProtocols.AccountRequest;
			DAO.signin(body.email, body.password).then(user => {
				let protocol: HttpProtocols.AccountResponse = {
					succeeded: user != null,
					user: user
				};
				if (user) {
					delete user.passwordHash;
					(req.session as any).userId = user._id;
				}
				res.json(protocol);
			});
		});
	}
}

export default Server;