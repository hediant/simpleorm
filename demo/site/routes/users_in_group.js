var global = require("../global");
var SimpleOrm = require("../../../");
var Model = SimpleOrm.Model;
var DbHelper = SimpleOrm.DbHelper;
var models = require("../database/models");
var Q = require("q");
var prepare_options = require('../utils/prepare_options');
var mysql = require('mysql');

module.exports = function (router){
	var base_ = global.BasePath;

	var response = function (res, err, results){
		res.json({
			"err" : err,
			"ret" : results
		});
	}

	// add user into group
	router.get(base_ + "groups/:group_id/add", function (req, res, next){
		var user_id = req.query.user;
		var group_id = req.params.group_id;

		var dbhelper = new DbHelper(global.DbConnection);
		dbhelper.execTransactionSeries(function (connection, commit, rollback){

			Q.fcall(function (){
				// is group exist?
				return Q.Promise(function (resolve, reject, notify){
					var group_mdl = new Model(connection, models.groups.orm, models.groups.primary_key);
					group_mdl.setTransactionFlag();

					group_mdl.get(group_id, ["id"], function (err, results){
						if (err)
							reject(err == "ER_OBJECT_NOT_EXIST" ? "ER_GROUP_NOT_EXIST" : err);
						else
							resolve();
					});
				});
			}).then(function (){
				// is user exist?
				return Q.Promise(function (resolve, reject, notify){
					var user_mdl = new Model(connection, models.users.orm, models.users.primary_key);
					user_mdl.setTransactionFlag();

					user_mdl.get(user_id, ["id"], function (err, results){
						if (err)
							reject(err == "ER_OBJECT_NOT_EXIST" ? "ER_USER_NOT_EXIST" : err);
						else
							resolve();
					})
				})
			}).then(function (){
				// try add
				return Q.Promise(function (resolve, reject, notify){
					var users_in_group_mdl = new Model(connection, models.users_in_group.orm);
					users_in_group_mdl.setTransactionFlag();

					users_in_group_mdl.create({
						"group_id" : group_id,
						"user_id" : user_id
					}, function (err, results){
						if (err){
							reject(err)
						}
						else
							resolve();
					})
				})
			}).then(function (){
				// commit
				return Q.Promise(function (resolve, reject, notify){
					commit(function (err){
						if (err)
							reject(err.code);
						else{
							response(res, null);
							resolve();
						}
					});
				})
			}).catch(function (err){
				rollback();
				response(res, err);
			})
		})
	});

	// remove user from group
	router.get(base_ + "groups/:group_id/remove", function (req, res, next){
		var user_id = req.query.user;
		var group_id = req.params.group_id;

		var dbhelper = new DbHelper(global.DbConnection);
		dbhelper.execTransactionSeries(function (connection, commit, rollback){

			Q.fcall(function (){
				// is group exist?
				return Q.Promise(function (resolve, reject, notify){
					var group_mdl = new Model(connection, models.groups.orm, models.groups.primary_key);
					group_mdl.setTransactionFlag();

					group_mdl.get(group_id, ["id"], function (err, results){
						if (err)
							reject(err == "ER_OBJECT_NOT_EXIST" ? "ER_GROUP_NOT_EXIST" : err);
						else
							resolve();
					});
				});
			}).then(function (){
				// is user exist?
				return Q.Promise(function (resolve, reject, notify){
					var user_mdl = new Model(connection, models.users.orm, models.users.primary_key);
					user_mdl.setTransactionFlag();

					user_mdl.get(user_id, ["id"], function (err, results){
						if (err)
							reject(err == "ER_OBJECT_NOT_EXIST" ? "ER_USER_NOT_EXIST" : err);
						else
							resolve();
					})
				})
			}).then(function (){
				// try remove
				return Q.Promise(function (resolve, reject, notify){
					var users_in_group_mdl = new Model(connection, models.users_in_group.orm);
					users_in_group_mdl.setTransactionFlag();

					users_in_group_mdl.dropAll({
						"and" : [
							{"=":{"group_id" : group_id}},
							{"=":{"user_id" : user_id}}
						]
					}, function (err, results){
						if (err){
							reject(err)
						}
						else{
							if (results <= 0) // affect 0 rows
								reject("ER_USER_NOT_IN_GROUP");
							else
								resolve();
						}
					})
				})
			}).then(function (){
				// commit
				return Q.Promise(function (resolve, reject, notify){
					commit(function (err){
						if (err)
							reject(err.code);
						else{
							response(res, null);
							resolve();
						}
					});
				})
			}).catch(function (err){
				rollback();
				response(res, err);
			})
		})
	})

	// query users in group
	router.get(base_ + "groups/:group_id/users", function (req, res, next){
		var group_id = req.params.group_id;
		var dbhelper = new DbHelper(global.DbConnection);
		var user_ids = [];

		Q.fcall(function (){
			return Q.Promise(function (resolve, reject){
				dbhelper.getConnection(function (err, connection){
					var group_mdl = new Model(connection, models.groups.orm, models.groups.primary_key);
					group_mdl.get(group_id, ["id"], function (err){
						if (err)
							reject("ER_OBJECT_NOT_EXIST" == err ? "ER_GROUP_NOT_EXIST" : err);
						else
							resolve();
					})
				})

			})
		}).then(function (){
			return Q.Promise(function (resolve, reject){
				dbhelper.getConnection(function (err, connection){
					var user_mdl = new Model(connection, models.users.orm, models.users.primary_key);
					var finder = user_mdl.Finder();
					var sql = mysql.format("__id__ in (select user_id from ?? where group_id=?)", ["t_users_in_group", group_id]);

					finder.addConditions(finder.parseQuery(req.query));
					finder.addConditions(sql);
					finder.setFields(["id", "code", "name"]);

					var options = prepare_options(req.query);
					finder.find(options, function (err, results){
						if (err)
							reject(err);
						else {
							response(res, null, results);
						}
					})
				})
			})
		}).catch(function (err){
			response(res, err);
		})
	})

}
