var Query = require('./query');
var Promise = require("bluebird");

function Model (connection, orm, primary_key_name){
	var me = this;
	var primary_key_name_ = primary_key_name || "id";
	var transaction_flag_ = false;

	this.setTransactionFlag = function (){
		transaction_flag_ = true;
	}

	this.clearTransactionFlag = function (){
		transaction_flag_ = false;
	}

	//
	// Get an object while object_id == id
	//
	this.get = function() {
		if (arguments.length<2)
			throw new Error("At least 2 params needed.");
		switch(arguments.length) {
			case 2:
				return me.get(arguments[0], null, arguments[1]);
			case 3:
			default: // >= 3
				var id = arguments[0];
				var field_names = arguments[1];
				var cb = arguments[2];
				break;
		}

		var session = orm.bind(connection);
		var object_id = {};
		object_id[primary_key_name_] = id;

		var handle_results = function (err, results){
			if (!transaction_flag_) connection.release();
			if (err) {
				cb && cb(err, null);
			}
			else{
				results.length ?
					cb && cb(null, results[0])
					: cb && cb("ER_OBJECT_NOT_EXIST", null);
			}
		}
		if (field_names){
			session.getObjects({"and":[{"=":object_id}]}, field_names, handle_results);
		}
		else{
			session.getObjects({"and":[{"=":object_id}]}, handle_results);
		}
	}

	//
	// Get an object for update while object_id == id
	//
	this.getForUpdate = function() {
		if (arguments.length<2)
			throw new Error("At least 2 params needed.");
		switch(arguments.length) {
			case 2:
				return me.get(arguments[0], null, arguments[1]);
			case 3:
			default: // >= 3
				var id = arguments[0];
				var field_names = arguments[1];
				var cb = arguments[2];
				break;
		}

		var session = orm.bind(connection);
		var object_id = {};
		object_id[primary_key_name_] = id;

		var handle_results = function (err, results){
			if (!transaction_flag_) connection.release();
			if (err) {
				cb && cb(err, null);
			}
			else{
				results.length ?
					cb && cb(null, results[0])
					: cb && cb("ER_OBJECT_NOT_EXIST", null);
			}
		}

		if (field_names){
			session.getObjectsForUpdate({"and":[{"=":object_id}]}, field_names, handle_results);
		}
		else{
			session.getObjectsForUpdate({"and":[{"=":object_id}]}, handle_results);
		}
	}

	//
	// Get all objects that meet the conditions
	//
	this.getAll = function (){
		if (arguments.length<2)
			throw new Error("At least 2 params needed.");
		switch(arguments.length) {
			case 2:
				return me.getAll(arguments[0], null, arguments[1]);
			case 3:
			default: // >= 3
				var conditions = arguments[0];
				var field_names = arguments[1];
				var cb = arguments[2];
				break;
		}

		var session = orm.bind(connection);
		var object_id = {};

		var handle_results = function (err, results){
			if (!transaction_flag_)
				connection.release();
			cb && cb(err, results);
		}

		session.getObjects(conditions, field_names, handle_results);
	}

	//
	// Set an object while object_id == id
	//
	this.set = function(id, fields, cb) {
		var object_id = {};
		object_id[primary_key_name_] = id;
		orm.bind(connection).setObjects({"and":[{"=":object_id}]}, fields, function (err, results){
			if (!transaction_flag_) connection.release();
			if (err){
				cb && cb(err);
			}
			else {
				cb && cb(results > 0 ? null : "ER_OBJECT_NOT_EXIST");
			}
		});
	}

	//
	// Set all objects that meet the conditions
	//
	this.setAll = function (conditions, fields, cb){
		orm.bind(connection).setObjects(conditions, fields, function (err, results){
			if (!transaction_flag_)
				connection.release();
			cb && cb(err, results);
		});
	}

	//
	// Drop an object while object_id == id
	//
	this.drop = function(id, cb) {
		var object_id = {};
		object_id[primary_key_name_] = id;
		var sel = {"and":[{"=":object_id}]};

		orm.bind(connection).deleteObjects(sel, function(err, results){
			if (!transaction_flag_) connection.release();
			if (err){
				cb && cb(err);
			}
			else{
				cb && cb(results > 0 ? null : "ER_OBJECT_NOT_EXIST");
			}
		});
	}

	//
	// Drop all objects that meet the conditions
	//
	this.dropAll = function (conditions, cb){
		orm.bind(connection).deleteObjects(conditions, function(err, results){
			if (!transaction_flag_)
				connection.release();
			cb && cb(err, results);
		});
	}

	//
	// Object can be inserted if it not exists
	//
	this.create = function (fields, cb){
		orm.bind(connection).createObject(fields, function (err, results){
			if (!transaction_flag_) connection.release();
			if (err)
				cb && cb(err == "ER_DUP_ENTRY" ? "ER_OBJECT_EXIST" : err);
			else
				cb && cb(null, results);	// results == id
		});
	}

	//
	// The object is updated if it exists or inserted if it does not
	//
	this.save = function (fields, cb){
		orm.bind(connection).createObject(fields, true, function (err, results){
			if (!transaction_flag_) connection.release();
			if (err)
				cb && cb(err);
			else
				cb && cb(null);
		});
	}

	//
	// Return an Finder for the model
	//
	this.Finder = function (){
		return new Query(connection, orm, transaction_flag_);
	}

	// query
	/*
		{
			field_1 : <statement>,
			field_2 : <statement>
			field_3 : <statement>,
			...
		}
		field ::= string
		statement ::= [<op>](string|number)
		op ::= [">"|"<"|"*"|"%"]
	*/
	// [options]
	/*
		{
			sorts - array,
			offset - int,
			limit - int,
			calc_sum - boolean
		}
	*/
	// cb - function (err, results)
	//
	this.find = function (){
		if (arguments.length<2)
			throw new Error("At least 2 params needed.");
		switch(arguments.length) {
			case 2:
				return me.find(arguments[0], {}, arguments[1]);
			case 3:
			default: // >= 3
				var query = arguments[0];
				var options = arguments[1];
				var cb = arguments[2];
				break;
		}

		var finder_ = me.Finder();

		// add conditions
		finder_.addConditions(Query.parse(query));

		// do search
		finder_.find(options, cb);
	}
    //提供promise方法
    Promise.promisifyAll(this);
}

module.exports = Model;
