export default {
	httpPort: <number>process.env.npm_package_config_httpPort || 80,
	webSocketPort: <number>process.env.npm_package_config_webSocketPort || 8080,
	ip: <string>process.env.npm_package_config_ip || 'localhost'
}