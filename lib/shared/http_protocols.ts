export interface ErrorResponse {
	message: string
}
export interface WebSocketResponse {
	ip: string,
	port: number,
	canResumeGame: boolean,
};

export interface AccountRequest {
	email: string,
	password: string
}
export interface AccountResponse {
	user: {
		_id?: string,
		email: string
	}
}