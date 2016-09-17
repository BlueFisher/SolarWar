import {GameStatusProtocol} from'./bin/protocols/game_protocols'
import HttpServer from './bin/http_server';

let httpServer = new HttpServer(80, 8080, () => {
	console.log(`Http Server listening, WebSocket Server listening`);
});

let gameManager = httpServer.getGameServer().getGameManager();
gameManager.on('statusChange', (status: GameStatusProtocol) => {
	displayStatus(status);
});
gameManager.addPlayer('fisher');

import readline = require('readline');
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.on('line', (input) => {
	let cmd = (<string>input).split(' ');

	switch (cmd[0]) {
		case 'add':
			let id = gameManager.addPlayer(cmd[1]);
			console.log(`${id} added\n`);
			displayStatus(gameManager.requestImmediateStatus());
			break;
		case 'move':
			gameManager.movePlayerShips(
				parseInt(cmd[1]),
				parseInt(cmd[2]),
				parseInt(cmd[3]),
				parseFloat(cmd[4]));
			break;
	}
});


function displayStatus(status: GameStatusProtocol) {
	let log = '';
	status.players.forEach(p => {
		log += `Player ${p.id}(${p.name}) ${p.currShipsCount}/${p.maxShipsCount}\n`;
	});

	log += '\n';
	status.planets.forEach(p => {
		log += `Planet ${p.id} (${p.status})\n`;
		log += `occupiedPlayerId: ${p.occupiedPlayerId}\n`;
		log += `occupyingPlayerId: ${p.occupyingPlayerId}\n`;
		if (p.occupyingStatus != null) {
			log += `occupyingStatus: ${p.occupyingStatus.playerId} ${p.occupyingStatus.percent}\n`;
		}
		p.allShips.forEach(s => {
			log += `${s.playerId}: ${s.count}\n`;
		});
	});

	log += '\nMovingShipsQueue:\n';
	status.movingShipsQueue.forEach(p => {
		log += `${p.playerId}: ${p.planetFromId} -> ${p.planetToId} ${p.count} ${p.distanceLeft}/${p.distance}`;
	})

	console.log(log);
}