var mysql = require('mysql')
	, copy = require('copy-to')
    , Promise = require("bluebird")
	, parse_sort = require('./parse_sort')
	, query_to_sel = require('./query_to_sel');

function Query(connection, orm, transaction_flag) {
	this.orm_ = orm;
	this.connection_ = connection;

	// init conditions - array
	// [{
	//		verb : "and"(default) || "or",
	//		cond : object || string
	// }, ...]
	this.conditions_ = [];
	this.transaction_flag_ = transaction_flag || false;

    //提供promise方法
    Promise.promisifyAll(this);
};

Query.prototype.setFields = function(field_names) {
	this.field_names_ = field_names;
};

// conditions - object, conditions
Query.prototype.addConditions = function (condition, verb) {
	if (condition) { // not null or ""
		switch (typeof condition) {
			case "object" :
				var sql_stat = this.orm_.generateWhereSql(condition);
				if (sql_stat){
					this.conditions_.push({
						"verb" : verb === "or" ? " or " : " and ",
						"cond" : sql_stat
					});
				}
				break;
			case "string" :
				this.conditions_.push({
					"verb" : verb === "or" ? " or " : " and ",
					"cond" : "(" + condition + ")"
				});
				break;
			default :
				break;
		}
	}
};

Query.prototype.clearConditions = function() {
	this.conditions_ = [];
};

Query.prototype.parseQuery = function(query, verb) {
	return Query.parse(query, verb ? verb : "and");
};

Query.prototype.generateWhereSql = function() {
	var self = this, sql = "";

	if (!this.conditions_.length)
		return sql;

	sql = this.conditions_[0].cond;
	for (var i=1; i<this.conditions_.length; i++) {
		var condition = this.conditions_[i];
		sql += condition.verb + condition.cond;
	}

	return sql;
};

//
// options - object
//		{ sorts - array, offset - int, limit - int, calc_sum - boolean }
// cb - function(err - null || string, results - null || array)
//
Query.prototype.find = function(options, cb) {
	var self = this;

	// set where sql
	var sql_where = this.generateWhereSql();

	// set options
	var options_ = {};
	if (options) {
		copy(options).to(options_);
		options_.sorts = parse_sort(options.sorts);
	}

	// do search
	this.orm_
	.bind(this.connection_)
	.searchWithWhere(sql_where, options_, this.field_names_, function(err, results){
		// NOTICE
		// DO NOT FORGET
		// callback && release connection
		if (!self.transaction_flag_)
			self.connection_.release();

		cb && cb(err, results);
	});
};

//
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
// verb "or" || "and"
//
Query.parse = function (query, verb) {
	return query_to_sel(query, verb);
};

module.exports = Query;
