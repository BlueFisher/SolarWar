/**
 * SolarWar入口文件
 */

import Server from './bin/server';
import Config from './bin/protocols/config';

// 初始化HTTP服务器WebSocket服务器
let httpServer = new Server(Config.httpPort, Config.webSocketPort, (isHttp, port) => {
	if (isHttp) {
		console.log(`Http Server is listening on port ${port}`);
	} else {
		console.log(`WebSocket Server is listening on port ${port}`);
	}
});

// DEBUG
let gameManager = httpServer.getGameServer().getGameManager();

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