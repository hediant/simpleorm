var mysql = require('mysql');

exports.DbConnection = mysql.createPool({
    "host" : "localhost",
    "user" : "root",
    "password" : "123456",
    "database" : "my_test_db",
    "connectionLimit" : 1,
    "multipleStatements" : true 
});

exports.BasePath = "/";

