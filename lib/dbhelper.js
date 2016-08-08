var EventEmitter = require('events').EventEmitter;
var Promise = require("bluebird");

function DbHelper(pool) {
	EventEmitter.call(this);
	this.pool_ = pool;
    //此对象同时提供promise方法
    Promise.promisifyAll(this);
};
require('util').inherits(DbHelper, EventEmitter);
DbHelper.prototype.constructor = DbHelper;

module.exports = DbHelper;

DbHelper.prototype.getConnectionPool = function() {
	return this.pool_;
};

DbHelper.prototype.close = function() {
	this.pool_ && this.pool_.end();
	this.pool_.removeAllListeners();
	this.removeAllListeners();
};

//
// @sql - formatted sql string.
// @ cb - callback(err, ret), function.
//
DbHelper.prototype.execTransaction = function(sql, cb) {
	this.pool_.getConnection(function(err, connection){
		if (err){
			cb && cb(err);
			return;
		}

		connection.beginTransaction(function(err){
			if (err){
				connection.release();
				cb && cb(err);
				return;
			}
			connection.query(sql, function(err, ret){
				if (err){
					connection.rollback();
					connection.release();
					cb && cb(err);
					return;
				}
				connection.commit(function(err){
					if (err){
						connection.rollback();
						connection.release();
						cb && cb(err);
						return;
					}
					connection.release();
					cb && cb(err, ret);
				});

			});
		});
	});
};

//
// query with transaction
// @ cb - callback(connection, commit_function, error_clear_function or rollback), function.
//
DbHelper.prototype.execTransactionSeries = function(cb) {
	this.pool_.getConnection(function(err, connection){
		if (err){
			cb && cb(err);
			return;
		}

		connection.beginTransaction(function(err){
			if (err){
				connection.release();
				cb && cb(err);
				return;
			}

			cb && cb(
				connection,
				function(callback){ // 处理commit
					connection.commit(function(err){
						if (err){
							connection.rollback();
						}
						connection.release();
						callback && callback(err);
					});
				},
				function(){ // 处理错误
					connection.rollback();
					connection.release();
				}
			);

		});
	});
};

//
// query without transaction
// @ cb - callback(connection, done), function.
//
DbHelper.prototype.exec = function(cb){
	this.pool_.getConnection(function(err, connection){
		if (err){
			cb && cb(err);
			return;
		}

		cb && cb(
			connection,
			function(){
				connection.release();
			}
		);

	});
};

//
// @sql - formatted sql string.
// @ cb - callback(err, ret), function.
//
DbHelper.prototype.execQuery = function(sql, cb) {
	this.pool_.getConnection(function(err, connection){
		if (err){
			cb && cb(err);
			return;
		}

		connection.query(sql, function(err, ret){
			connection.release();
			cb && cb(err, ret);
		});
	});
};

//
// @cb - function(err, connection)
//
// 注意，使用该方法时一定要记得释放connection
// 调用connection.release()
//
DbHelper.prototype.getConnection = function(cb) {
	return this.pool_.getConnection(cb);
};
