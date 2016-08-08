var EventEmitter = require('events').EventEmitter;

//
// @orm - object of Orm
// @object_id_key - string, key name of obejct identify.
//
function OrmObjectWrapper(orm, object_id_key, dbhelper) {
	var me = this;

	this.create = function(fields, cb) {
		dbhelper.getConnection(function (err, connection){
			orm.bind(connection).createObject(fields, function (err, results){
				connection.release();
				if (err)
					cb && cb(err == "ER_DUP_ENTRY" ? "ER_OBJECT_EXIST" : err);
				else
					cb && cb(null, results);	// results == id
			});
		});
	};

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

		dbhelper.getConnection(function(err, connection){
			var session = orm.bind(connection);
			var object_id = {};
			object_id[object_id_key] = id;

			var handle_results = function (err, results){
				//
				// release connection
				//
				connection.release();

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
		});		
	}

	this.set = function(id, fields, cb) {
		dbhelper.getConnection(function (err, connection){
			var object_id = {};
			object_id[object_id_key] = id;

			orm.bind(connection).setObjects({"and":[{"=":object_id}]}, fields, function (err, results){
				connection.release();
				if (err){
					cb && cb(err);
				}
				else {
					results > 0 ? cb && cb(null) : cb && cb("ER_OBJECT_NOT_EXIST");
				}			
			});
		});	
	}

	this.drop = function(id, cb) {
		dbhelper.getConnection(function (err, connection){
			var object_id = {};
			object_id[object_id_key] = id;
			var sel = {"and":[{"=":object_id}]};

			orm.bind(connection).deleteObjects(sel, function(err, results){
				connection.release();
				if (err){
					cb && cb(err, null);
				}
				else{
					results > 0 ? cb && cb(null, results) : cb && cb("ER_OBJECT_NOT_EXIST", null);
				}
			});
		});
	}
}

module.exports = OrmObjectWrapper;

