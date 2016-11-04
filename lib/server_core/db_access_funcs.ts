import * as mongodb from 'mongodb';
import config from '../shared/config';
import { user } from './db_models';


function _connect(): Promise<mongodb.Db> {
	return mongodb.MongoClient.connect(config.mongodbServer);
}
export function findUser(id): Promise<user> {
	return _connect().then(function (db) {
		let usersColl = db.collection('users');

		return usersColl.findOne({ _id: new mongodb.ObjectID(id) });
	});
}
export async function signup(email, password): Promise<user> {
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
			passwordHash: password
		}
		let result = await usersColl.insertOne(user);
		user._id = result.insertedId.toHexString()
		return user;
	}
}
export async function signin(email, password): Promise<user> {
	let db = await _connect();
	let usersColl = db.collection('users');
	let user: user = {
		email: email,
		passwordHash: password
	}
	return await usersColl.findOne(user);
}
