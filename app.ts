/**
 * SolarWar入口
 */

import { logger } from './lib/server_core/log';
import Server from './lib/server_core/server';

// 初始化HTTP服务器WebSocket服务器
let httpServer = new Server((isHttp, port) => {
	if (isHttp) {
		logger.info(`Http Server is listening on port ${port}`);
	} else {
		logger.info(`WebSocket Server is listening on port ${port}`);
	}
});