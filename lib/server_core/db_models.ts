export interface user {
	_id?: string,
	email: string,
	passwordHash: string,
	scores: {
		shipsCount: number,
		datetime: string
	}[]
}