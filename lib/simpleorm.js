var mysql = require('mysql');

/*
	@table - string, table name,
	@mapping - object, eg.
	{
		"field_name_1" : { "alias":"alias_1", "readonly":true},
		"field_name_2" : { "alias":"alias_2", "readonly":false},
		...
		"field_name_N" : { "alias":"alias_N", "readonly":false}
	}
 */
function SimpleOrm(table, mapping){
	this.table_ = table;

	this.mapping_ = {};
	this.field_alias_ = {};

	for (var key in mapping) {
		this.mapping_[mapping[key].alias] = {
			"field_name" : key,
			"readonly" : mapping[key].readonly,
			"auto" : mapping[key].auto,
            "parse_object": mapping[key].parse_object,
            "size" : mapping[key].size || 65536
		}

		this.field_alias_[key] = mapping[key].alias;
	}
}
module.exports = SimpleOrm;

SimpleOrm.prototype.getTableName = function() {
	return this.table_;
};

SimpleOrm.prototype.getFieldName = function(alias) {
	var field = this.mapping_[alias];
	return (field ? field.field_name : null);
};

SimpleOrm.prototype.getKeys = function(includeReadonly) {
	var keys = [];
	for (var key in this.mapping_) {
		var map_key_ = this.mapping_[key];
		var field_name = map_key_.field_name;
		map_key_.readonly ?
			(includeReadonly ? keys.push(field_name) : null)
			: keys.push(field_name);
	}
	return keys;
};

//
// @fields - object
// @keys - array
//
SimpleOrm.prototype.generateKeyValueSql = function(fields, includeReadonly) {
	if (!fields)
		return "";
	var fields_={}, count_=0;
	for (var key in fields) {
		if (key in this.mapping_) {
			var map_key_ = this.mapping_[key];
			if ((!map_key_.auto) &&
				(!map_key_.readonly || includeReadonly)) {
				fields_[map_key_.field_name] = type_cast(fields[key], map_key_);
				count_++;
			}
		}
	}

	return count_ ? mysql.format("?", fields_) : "";
};

function type_cast(data, options) {
	switch(typeof data) {
		case "number":
		case "boolean":
		case "string":
			if (data.length > options.size)
				throw new Error('ER_FIELD_TOO_BIG');
			return data;
		case "object": 		// object, array, null
			var parsed = (data == null) ? null : JSON.stringify(data);
			if (parsed && parsed.length > options.size)
				throw new Error('ER_FIELD_TOO_BIG');
			return parsed;
		case "function":
		case "undefined":
		default:
			return "";
	}
};

//
// @conditions - object
// @keys - array
// @ver - string, "and"|"or"
//
// 查询条件字段形式：array
/*
	array - sample:
	[
		// statement_1
		{"or" : [	// op_ver_1
			// sub_cond_1
			{"eq":{"field_name":<field_value>}},	// must only on item
			// sub_cond_2
			{"=":{ // op_comp
				// field_1
				"field_name":<field_value>,
				// field_2
				"field_name":<field_value>
			}},
			...
		]},	// must only on item
		// statement_2
		{"and" : [	// op_ver_2
			{"eq":{"field_name":<field_value>}},
			...
		]},
		... ...
	]
	其中statement_1和statement_2之间由ver连接, field_1和field_2之间由"and"连接, sub_cond_1和sub_cond_2之间由op_ver_1连接

	object - sample:
	{"or" : [	// op_ver_1
		// sub_cond_1
		{"eq":{"field_name":<field_value>}},	// must only on item
		// sub_cond_2
		{"=":{ // op_comp
			// field_1
			"field_name":<field_value>,
			// field_2
			"field_name":<field_value>
		}},
		...
	]},	// must only on item
*/
SimpleOrm.prototype.generateWhereSql = function(conditions, ver) {
	var self = this;
	var ver_ = ver || "and";
	if (!conditions)
		return "";
	var statements_ = [], logic_op = {"and":1, "or":1};

	if (typeof conditions === "object" && !Array.isArray(conditions)) {
		return this.generateWhereSql([conditions]);
	}

	for (var i=0; i<conditions.length; i++) {
		var op_ver = Object.keys(conditions[i])[0];	// must only one item

		if (!(op_ver in logic_op))
			continue;

		var sub_conds_ = [], statement_arr = conditions[i][op_ver];
		for (var j=0; j<statement_arr.length; j++) {
			var op_comp = Object.keys(statement_arr[j])[0];	// must only one item
			var field = statement_arr[j][op_comp], field_conds_ = [];

			for (var key in field) {
				if (key in self.mapping_) {
					var sub = mysql.escapeId(self.mapping_[key].field_name)
						+ " " + op_comp + " ";
					if (Array.isArray(field[key]))
						sub += " (";

					sub	+= mysql.escape(field[key]);

					if (Array.isArray(field[key]))
						sub += ") ";

					field_conds_.push(sub);
				}
			}

			field_conds_.length ? sub_conds_.push(field_conds_.join(" and ")) : null;
		}

		sub_conds_.length ? statements_.push("(" + sub_conds_.join(" " + op_ver + " ") + ")") : null;
	}

	// return
	return statements_.join(" " + ver_ + " ");
};

//
// @fields - object
// cb - function
// 		if err, return err's code
//		else return err=null, object's id
// @overwrite - boolean
//
SimpleOrm.prototype.createObject = function(connection, fields, overwrite, cb) {
	var self = this;
	connection.query(this.createObjectSql(fields, overwrite), function(err, results){
		self.createObjectResults(err, results, cb);
	});
};

SimpleOrm.prototype.createObjectSql = function(fields, overwrite) {
	// for create, we need set include readonly fields
	var values = this.generateKeyValueSql(fields, true);
	var sql = "insert into " + this.table_
		+ " set " + values
		+ (overwrite ? " on duplicate key update " + values : "")
		+ ";"
		+ "select last_insert_id() as last_insert_id;";
	return sql;
};

SimpleOrm.prototype.createObjectResults = function(err, results, cb) {
	if (err) {
		cb && cb (err.code);
	}
	else{
		cb && cb(null, results[1][0].last_insert_id);
	}
};

//
// @conditions - object
// @fields - object
// cb - function, 如果成功返回修改的对象总数，如果失败返回error code
//
SimpleOrm.prototype.setObjects = function(connection, conditions, fields, cb) {
	var self = this;
	connection.query(this.setObjectsSql(conditions, fields), function(err, results){
		self.setObjectsResults(err, results, cb);
	});
};

SimpleOrm.prototype.setObjectsSql = function(conditions, fields) {
	var values = this.generateKeyValueSql(fields);
	var where = " where " + this.generateWhereSql(conditions);
	var sql = "update " + this.table_
		+ " set " + values
		+ where
		+ ";";
	return sql;
};

SimpleOrm.prototype.setObjectsResults = function(err, results, cb) {
	if (err) {
		cb && cb (err.code, null);
	}
	else{
		cb && cb (null, results.affectedRows);
	}
};

//
// @conditions - object
// @field_names - array
// cb - function
//
SimpleOrm.prototype.getObjects = function(connection, conditions, field_names, update, ver, cb) {
	var self = this;
	connection.query(this.getObjectsSql(conditions, field_names, update), function(err, results){
		self.getObjectsResults(err, results, cb);
	});
};

SimpleOrm.prototype.generateSelectSql = function(field_names) {
	var self = this;
	var alias_ = [];

	if (Array.isArray(field_names)) {
		field_names.forEach(function(alias_name){
			var field_ = self.getFieldName(alias_name);
			if (field_)
				alias_.push(mysql.escapeId(field_));
		});
	}

	var sel_ = (alias_.length ? alias_.join(',') : "*");
	return sel_;
};

SimpleOrm.prototype.getObjectsSql = function(conditions, field_names, update, ver) {
	var self = this;
	var sel_ = "select "
		+ this.generateSelectSql(field_names)
		+ " from ";
	var where = " where " + this.generateWhereSql(conditions, ver);
	var sql = sel_ + this.table_
		+ where
		+ (update ? " for update;" : ";");

	return sql;
};

SimpleOrm.prototype.getObjectsResults = function(err, results, cb) {
	var self = this;
	if (err){
		cb && cb(err.code, null);
	}
	else{
		var rows = [];
		results.forEach(function(row){
			var obj = {};
			for (key in row) {
                if(key in self.field_alias_){
                    var value = row[key];
                    (self.mapping_[self.field_alias_[key]]['parse_object']) ? value=JSON.parse(value) : null;
                    obj[self.field_alias_[key]]=value;
                }
				//(key in self.field_alias_) ? obj[self.field_alias_[key]]=row[key] : null
			}
			rows.push(obj);
		});

		cb && cb(null, rows);
	}
};

//
// @conditions - object
// cb - function, 如果成功返回删除的对象总数，如果失败返回error code
//
SimpleOrm.prototype.deleteObjects = function(connection, conditions, cb) {
	var self = this;
	connection.query(this.deleteObjectsSql(conditions), function(err, results){
		self.deleteObjectsResults(err, results, cb);
	});
};

SimpleOrm.prototype.deleteObjectsSql = function(conditions) {
	var where = " where " + this.generateWhereSql(conditions);
	var sql = "delete from "
		+ this.table_
		+ where
		+ ";";
	return sql;
};

SimpleOrm.prototype.deleteObjectsResults = function(err, results, cb) {
	if (err) {
		cb && cb(err.code);
	}
	else {
		cb && cb(null, results.affectedRows);
	}
};

/*
	sorts - null || array, example:
	[
		{
			"orderby" : <field_name>,
			"order" : "asc" | "desc"
		},
		{
			"orderby" : <field_name>,
			"order" : "asc" | "desc"
		},
		...
	]
 */
SimpleOrm.prototype.search = function(connection, conditions, options, cb) {
	var self = this;
	connection.query(
		this.searchSql(conditions, options.sorts, options.offset, options.limit, options.calc_sum),
		function(err, results){
			options.calc_sum ?
				self.searchCountResults(err, results, cb)
				: self.searchResults(err, results, cb);
	});
};

SimpleOrm.prototype.searchSql = function(conditions, sorts, offset, limit, calc_sum) {
	var where_statement = this.generateWhereSql(conditions);
	var where_ = where_statement ? " where " + where_statement : " ";
	var orders_
		, default_limit_ = 10
		, self = this
		, sql;

	if (calc_sum) {
		sql = "select count(*) as count from " + this.table_ + where_ + ";"
		return sql;
	}

	// limits sql
	var limits_ = mysql.format(" limit ?, ?", [
			( typeof(offset) === "number" && offset > 0 ? parseInt(offset) : 0),
			( typeof(limit) === "number" && limit > 0 ? parseInt(limit) : default_limit_)
		]);

	// orders sql
	if (sorts) {
		var order_statement_ = [];
		sorts.forEach(function(sort){
			var field_name_ = self.getFieldName(sort.orderby);
			if (!field_name_)
				return;
			order_statement_.push(
				// 记得从alias转换为字段名
				mysql.escapeId(field_name_) + " " + (sort.order === "desc" ? "desc" : "asc")
			);
		});
		// compond orders statements
		if (order_statement_.length)
			orders_ = " order by " + order_statement_.join(',');
	}

	sql = "select * from " + this.table_
		+ where_
		+ (orders_ ? orders_ : "")
		+ (limits_ ? limits_ : "")
		+ ";"
	// return
	return sql;
};

//
// 在自动生成的sql where语句无法满足查询需要的情况下使用
// 传入裸where字句（字符串）
//
// NOTE:
// 使用者需要自己处理where sql字句的封装问题，避免sql注入攻击
//
SimpleOrm.prototype.searchWithWhere = function(connection, where, options, field_names, cb) {
	var self = this;
	connection.query(
		this.searchSqlWithWhere(field_names, where, options.sorts, options.offset, options.limit, options.calc_sum),
		function(err, results){
			options.calc_sum ?
				self.searchCountResults(err, results, cb)
				: self.searchResults(err, results, cb);
	});
};

SimpleOrm.prototype.searchSqlWithWhere = function(field_names, where, sorts, offset, limit, calc_sum) {
	var where_ = where ? " where " + where : " ";
	var orders_
		, default_limit_ = 10
		, self = this
		, sql;

	if (calc_sum) {
		sql = "select count(*) as count from " + this.table_ + where_ + ";"
		return sql;
	}

	// limits sql
	var limits_ = mysql.format(" limit ?, ?", [
			( typeof(offset) === "number" && offset > 0 ? parseInt(offset) : 0),
			( typeof(limit) === "number" && limit > 0 ? parseInt(limit) : default_limit_)
		]);

	// orders sql
	if (sorts) {
		var order_statement_ = [];
		sorts.forEach(function(sort){
			var field_name_ = self.getFieldName(sort.orderby);
			if (!field_name_)
				return;
			order_statement_.push(
				// 记得从alias转换为字段名
				mysql.escapeId(field_name_) + " " + (sort.order === "desc" ? "desc" : "asc")
			);
		});

		// compond orders statements
		orders_ = " order by " + order_statement_.join(',');
	}

	sql = "select " + this.generateSelectSql(field_names)
		+ " from " + this.table_
		+ where_
		+ (orders_ ? orders_ : "")
		+ (limits_ ? limits_ : "")
		+ ";"
	// return
	return sql;
};

SimpleOrm.prototype.searchResults = function(err, results, cb) {
	this.getObjectsResults(err, results, cb);
};

SimpleOrm.prototype.searchCountResults = function(err, results, cb) {
	if (err)
		cb && cb(err.code, null)
	else
		cb && cb(null, results.length ? results[0].count : 0);
};

//
// bind a session (connection)
//
SimpleOrm.prototype.bind = function(connection) {
	var self = this;

	//
	// create a new session bind to connection
	//
	function Session(){
		// fields [, overwrite] [, cb]
		this.createObject = function() {
			switch(arguments.length) {
				case 1:
					self.createObject(connection, arguments[0]);	// fields
					break;
				case 3:
					self.createObject(connection, arguments[0], arguments[1], arguments[2]); // fields, overwrite, cb
					break;
				case 2:
				default:
					self.createObject(connection, arguments[0], false, arguments[arguments.length-1]); // fields, cb
					break;

			}
		};

		this.setObjects = function(conditions, fields, cb) {
			self.setObjects(connection, conditions, fields, cb);
		};

		// getObjects (conditions [, field_names] [, ver] [, cb])
		this.getObjects = function() {
			var field_names_ = null, update_ = false, ver_ = "and";
			switch(arguments.length) {
				case 1:
					// conditions
					self.getObjects(connection, arguments[0], field_names_, update_, ver_);
					break;
				case 2:
					// conditions, cb
					self.getObjects(connection, arguments[0], field_names_, update_, ver_, arguments[1]);
					break;
				case 3:
					if (typeof arguments[1] === "string") {
						self.getObjects(connection, arguments[0]	// conditions
							, field_names_
							, update_
							, arguments[1]							// ver
							, arguments[2]							// callback
						);
					}
					else {
						self.getObjects(connection, arguments[0]	// conditions
							, arguments[1]							// field_names
							, update_
							, ver_
							, arguments[2]							// callback
						);
					}
					break;
				case 4:
				default:
					self.getObjects(connection, arguments[0] 		// conditions
						, arguments[1] 								// field_names
						, update_
						, arguments[2]								// ver
						, arguments[arguments.length-1]);			// callback
					break;
			}
		};

		// getObjectsForUpdate (conditions [, field_names] [, ver] [, cb])
		this.getObjectsForUpdate = function() {
			var field_names_ = null, update_ = true, ver_ = "and";
			switch(arguments.length) {
				case 1:
					// conditions
					self.getObjects(connection, arguments[0], field_names_, update_, ver_);
					break;
				case 2:
					// conditions, cb
					self.getObjects(connection, arguments[0], field_names_, update_, ver_, arguments[1]);
					break;
				case 3:
					if (typeof arguments[1] === "string") {
						self.getObjects(connection, arguments[0]	// conditions
							, field_names_
							, update_
							, arguments[1]							// ver
							, arguments[2]							// callback
						);
					}
					else {
						self.getObjects(connection, arguments[0]	// conditions
							, arguments[1]							// field_names
							, update_
							, ver_
							, arguments[2]							// callback
						);
					}
					break;
				case 4:
				default:
					self.getObjects(connection, arguments[0] 		// conditions
						, arguments[1] 								// field_names
						, update_
						, arguments[2]								// ver
						, arguments[arguments.length-1]);			// callback
					break;
			}
		};

		this.deleteObjects = function(conditions, cb) {
			self.deleteObjects(connection, conditions, cb);
		};

		// search (conditions [, options] [, cb])
		this.search = function() {
			switch(arguments.length) {
				case 1:
					// conditions
					self.search(connection, arguments[0]);
					break;
				case 2:
					// conditions, cb
					self.search(connection, arguments[0], {}, arguments[1]);
					break;
				case 3:
				default:
					// conditions, options, ..., cb
					self.search(connection, arguments[0], arguments[1], arguments[arguments.length-1]);
					break;
			}
		};

		// search with where statement
		//
		// 在自动生成的sql where语句无法满足查询需要的情况下使用
		// 传入裸where字句（字符串）
		//
		// NOTE:
		// 使用者需要自己处理where sql字句的封装问题，避免sql注入攻击
		//
		this.searchWithWhere = function() {
			switch(arguments.length) {
				case 1:
					// where statement string
					self.searchWithWhere(connection, arguments[0]);
					break;
				case 2:
					// where statement string, cb
					self.searchWithWhere(connection, arguments[0], {}, null, arguments[1]);
					break;
				case 3:
					// where statement string, options, ..., cb
					self.searchWithWhere(connection, arguments[0], arguments[1], null, arguments[2]);
					break;
				case 4:
				default:
					// where statement string, options, field_names, ..., cb
					self.searchWithWhere(connection, arguments[0], arguments[1], arguments[2], arguments[arguments.length-1]);
					break;
			}
		}
	}

	return new Session();
};

//
// bind a session (connection) to batch
// NOTE:
// 		need : connection = mysql.createConnection({multipleStatements: true}) support
//
SimpleOrm.prototype.batch = function(connection) {
	var self = this;
	var batch_ = [];

	//
	// create a new session bind to connection
	//
	function Session(){
		this.createObject = function(fields, overwrite) {
			batch_.push({
				"handle_results" : self.createObjectResults,
				"sql" : self.createObjectSql(fields, overwrite)
			});
		};

		this.setObjects = function(conditions, fields) {
			batch_.push({
				"handle_results" : self.getObjectsResults,
				"sql" : self.setObjectsSql(conditions, fields)
			});
		};

		this.getObjects = function(conditions, field_names, ver) {
			var field_names_ = arguments[1] ? arguments[1] : null
				, ver_ = arguments[2] ? arguments[2] : "and";
			batch_.push({
				"handle_results" : self.getObjectsResults,
				"sql" : self.getObjectsSql(conditions, field_names_, false, ver_)
			});
		};

		this.getObjectsForUpdate = function(conditions, field_names, ver) {
			var field_names_ = arguments[1] ? arguments[1] : null
				, ver_ = arguments[2] ? arguments[2] : "and";
			batch_.push({
				"handle_results" : self.getObjectsResults,
				"sql" : self.getObjectsSql(conditions, field_names_, true, ver_)
			});
		};

		this.deleteObjects = function(conditions) {
			batch_.push({
				"handle_results" : self.deleteObjectsResults,
				"sql" : self.deleteObjectsSql(conditions)
			});
		};

		this.seach = function(conditions, options) {
			batch_.push({
				"handle_results" : self.searchResults,
				"sql" : self.searchSql(conditions, options.sorts, options.offset, options.limit)
			});
		};

		// cb - function(err, results)
		// 		results - array, corresponding to batch_ array
		this.execute = function(cb) {
			var sqls = new Array(batch_.length);
			for (var i=0; i<batch_.length; i++) {
				sqls[i] = batch_[i].sql;
			}

			connection.query(sqls.join('\n'), function(err, results){
				if (err) {
					cb && cb (err.code, null);
				}
				else {
					var ret = new Array(results.length);
					for (var i=0; i<results.length; i++) {
						batch_[i].handle_results(null, results[i], function(err, result){
							ret.push(result);
						});
					}
				}

				// 注意：
				// 这里要求batch_[i].handle_results的回调必须是立即执行的，否则cb调用的时候并非所有的batch_[i]都处理完成。
				//
				cb && cb(null, ret);
			});
		}
	}

	return new Session();
};
