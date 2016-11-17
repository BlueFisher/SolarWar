export default {
	/**HTTP端口号 */
	httpPort: 80,
	/**WebSocket服务器IP地址与端口号 */
	webSocketServers: [
		{ ip: 'localhost', port: 8080 }
	],
	/**MongoDB地址 */
	mongodbServer: 'mongodb://localhost:27017/solarwar',
	/**是否使用CDN */
	useCDN: true
}