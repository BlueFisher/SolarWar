export class WebSocketResProtocol {
	constructor(ip: string, port: number) {
		this.ip = ip;
		this.port = port;
	}
	ip: string;
	port: number;
};