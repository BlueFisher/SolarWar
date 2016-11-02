export interface CommonResponse {
	succeeded: boolean
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
export interface AccountResponse extends CommonResponse {
	user: {
		_id?: string,
		email: string
	}
}