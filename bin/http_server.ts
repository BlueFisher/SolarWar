import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as path from 'path';

import GameServer from './game_server';
import * as httpProtocols from './protocols/http_protocols';

class HttpServer {
	private _gameServer: GameServer;
	constructor(httpPort, webSocketPort, callBack: () => void) {
		let app = express();
		this._gameServer = new GameServer(webSocketPort);

		this._configExpress(app, this._gameServer);

		app.listen(httpPort, () => {
			callBack();
		});
	}
	private _configExpress(app: express.Express, gameServer: GameServer) {
		app.use(bodyParser.json({
			limit: '1mb'
		}));
		app.use(bodyParser.urlencoded({
			extended: true
		}));

		app.get('/', (req, res) => {
			res.sendFile(path.join(__dirname, '../views', 'index.html'));
		});
		app.post('/addNewPlayer', (req, res) => {
			let json: httpProtocols.AddNewPlayerReqProtocol = req.body;
			let id = gameServer.addNewPlayerName(json.name);

			let result: httpProtocols.AddNewPlayerResProtocol = {
				id: id
			};
			res.json(result);
		})

		app.use('/static', express.static('public'));
	}

	getGameServer(): GameServer {
		return this._gameServer;
	}
}

export default HttpServer;