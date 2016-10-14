/**
 * SolarWar入口
 */

import Server from './bin/server';
import Config from './bin/protocols/config';

// 初始化HTTP服务器WebSocket服务器
let httpServer = new Server((isHttp, port) => {
	if (isHttp) {
		console.log(`Http Server is listening on port ${port}`);
	} else {
		console.log(`WebSocket Server is listening on port ${port}`);
	}
});