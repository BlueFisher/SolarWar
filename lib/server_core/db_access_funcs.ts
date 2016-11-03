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
export function signup(email, password) {
	return _connect().then(function (db) {
		let usersColl = db.collection('users');

		return usersColl.findOne({
			email: email
		}).then(function (user: user) {
			if (user) {
				return null;
			} else {
				user = {
					email: email,
					passwordHash: password
				}
				return usersColl.insertOne(user).then(function (result) {
					user._id = result.insertedId.toHexString()
					return user;
				});
			}
		});
	});
}
export function signin(email, password) {
	return _connect().then(function (db) {
		let usersColl = db.collection('users');
		let user: user = {
			email: email,
			passwordHash: password
		}
		return usersColl.findOne(user);
	}).then(function (user: user) {
		return user;
	});
}
