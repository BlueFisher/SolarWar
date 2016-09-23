/**
 * SolarWar入口文件
 */

import {GameStatus as GameStatusProtocol} from'./bin/protocols/game_protocols'
import Server from './bin/server';


// 初始化HTTP服务器WebSocket服务器
let httpServer = new Server(80, 8080, (isHttp, port) => {
	if (isHttp) {
		console.log(`Http Server is listening on port ${port}`);
	} else {
		console.log(`WebSocket Server is listening on port ${port}`);
	}
});

// DEBUG
let gameManager = httpServer.getGameServer().getGameManager();
// 立即显示游戏状态
// gameManager.on('statusChange', (status: GameStatusProtocol) => {
// 	displayStatus(status);
// });

import readline = require('readline');
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.on('line', (input) => {
	let cmd = (<string>input).split(' ');

	switch (cmd[0]) {
		// 增加玩家
		case 'add':
			gameManager.addPlayer(cmd[1]);
			break;
		// 移动飞船
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
		log += `Planet ${p.id}\n`;
		log += `occupiedPlayerId: ${p.occupiedPlayerId}\n`;
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