import * as crypto from 'crypto';
import * as mongodb from 'mongodb';
import serverConfig from '../../config';
import { user } from './db_models';

function _getHashedPassword(password: string) {
	return crypto.createHash("md5").update(password).digest('hex');
}
function _connect(): Promise<mongodb.Db> {
	return mongodb.MongoClient.connect(serverConfig.mongodbServer);
}
function findUser(id: string): Promise<user> {
	return _connect().then(function (db) {
		let usersColl = db.collection('users');

		return usersColl.findOne({}) as Promise<user>;
	});
}
export async function signup(email: string, password: string): Promise<user> {
	let db = await _connect();
	let usersColl = db.collection('users');
	let user: user = await usersColl.findOne({
		email: email
	});
	if (user) {
		return null;
	} else {
		user = {
			email: email,
			passwordHash: _getHashedPassword(password),
			scores: []
		}
		let result = await usersColl.insertOne(user);
		user._id = result.insertedId.toHexString()
		return user;
	}
}
export async function signin(email: string, password: string): Promise<user> {
	let db = await _connect();
	let usersColl = db.collection('users');
	let user = {
		email: email,
		passwordHash: _getHashedPassword(password)
	}
	return await usersColl.findOne(user);
}
export async function addNewScore(userId: string, maxShipsCount: number) {
	let db = await _connect();
	let usersColl = db.collection('users');
	await usersColl.findOneAndUpdate({
		_id: new mongodb.ObjectID(userId)
	}, {
			$push: {
				scores: {
					shipsCount: maxShipsCount,
					datetime: new Date()
				}
			}
		}
	);
}
