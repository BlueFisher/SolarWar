export class WebSocketResponse {
	constructor(ip: string, port: number, canResumeGame = false) {
		this.ip = ip;
		this.port = port;
		this.canResumeGame = canResumeGame;
	}
	ip: string;
	port: number;
	canResumeGame: boolean;
};