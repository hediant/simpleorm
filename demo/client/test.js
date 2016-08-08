var assert = require('assert');
var request = require('request');
var base = "http://localhost:3000";

var users = [
	{
		"code" : "SZ001",
		"name" : "David",
		"sex" : 1,
		"email" : "david@test.com"
	},
	{
		"code" : "SZ002",
		"name" : "Alex",
		"sex" : 1,
		"email" : "alex@test.com"
	},
	{
		"code" : "SZ003",
		"name" : "Sophia",
		"sex" : 2,
		"email" : "sophia@test.com"
	}
];

var groups = [
	{
		"name" : "tech",
		"desc" : "R&D department"
	},
	{
		"name" : "admin",
		"desc" : "Administration department"
	}
]

var parseBody = function (body){
	var ret;
	if(typeof body =='string'){
		ret = JSON.parse(body);
	}
	else if(typeof body =='object') {
		if (body)
			ret = body;
		else
			ret = {};
	}

	return ret;	
}

// create user 0
describe("create user 0", function(){
	it("should without error", function(done){
		console.log(users[0]);
		request.post({
			url : base +"/users",
			json : users[0]
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			users[0].id = parseBody(body).ret;
			done();
		});
	});
});

// create user 1
describe("create user 1", function(){
	it("should without error", function(done){
		console.log(users[1]);
		request.post({
			url : base +"/users",
			json : users[1]
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			users[1].id = parseBody(body).ret;
			done();
		});
	});
});

// create user 2
describe("create user 2", function(){
	it("should without error", function(done){
		console.log(users[2]);
		request.post({
			url : base +"/users",
			json : users[2]
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			users[2].id = parseBody(body).ret;
			done();
		});
	});
});

// query users
describe("query count of users", function(){
	it("should without error", function(done){
		request.get({
			url : base +"/users?calc_sum=true" 
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});

// set user 0
describe("set user 0", function(){
	it("should without error", function(done){
		request.put({
			url : base +"/users/" + users[0].id,
			json : {
				"enabled" : 1
			}
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});

// set user 1
describe("set user 1", function(){
	it("should without error", function(done){
		request.put({
			url : base +"/users/" + users[1].id,
			json : {
				"enabled" : 1
			}
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});

// set user 2
describe("set user 2", function(){
	it("should without error", function(done){
		request.put({
			url : base +"/users/" + users[2].id,
			json : {
				"enabled" : 1
			}
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});

// query users
describe("query users", function(){
	it("should without error", function(done){
		request.get({
			url : base +"/users" 
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});

// create group 0
describe("create group 0", function(){
	it("should without error", function(done){
		console.log(groups[0]);
		request.post({
			url : base +"/groups",
			json : groups[0]
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			groups[0].id = parseBody(body).ret;
			done();
		});
	});
});


// create group 1
describe("create group 1", function(){
	it("should without error", function(done){
		console.log(groups[1]);
		request.post({
			url : base +"/groups",
			json : groups[1]
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			groups[1].id = parseBody(body).ret;
			done();
		});
	});
});

// query users
describe("query males", function(){
	it("should without error", function(done){
		request.get({
			url : base +"/users?sex=1" 
		},function (err, res, body){
			assert(null == err);
			assert(2 == parseBody(body).ret.length);
			console.log(body);
			done();
		});
	});
});

// add user 0 to group 0
describe("add user 0 to group 0", function(){
	it("should without error", function(done){
		request.get({
			url : base +"/groups/" + groups[0].id +"/add?user=" + users[0].id 
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});

// add user 1 to group 0
describe("add user 1 to group 0", function(){
	it("should without error", function(done){
		request.get({
			url : base +"/groups/" + groups[0].id +"/add?user=" + users[1].id 
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});

// add user 2 to group 1
describe("add user 2 to group 1", function(){
	it("should without error", function(done){
		request.get({
			url : base +"/groups/" + groups[1].id +"/add?user=" + users[2].id 
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});

// query users of group 0
describe("query count of users of group 0", function(){
	it("should without error", function(done){
		request.get({
			url : base +"/groups/" + groups[0].id +"/users?calc_sum=true" 
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});

// query users of group 0
describe("query users of group 0", function(){
	it("should without error", function(done){
		request.get({
			url : base +"/groups/" + groups[0].id +"/users?name=*vid*" 
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});

// query users of group 1
describe("query users of group 0", function(){
	it("should without error", function(done){
		request.get({
			url : base +"/groups/" + groups[1].id +"/users" 
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});

// remove user2 from group 1
describe("remove user2 from group 1", function(){
	it("should without error", function(done){
		request.get({
			url : base +"/groups/" + groups[1].id +"/remove?user=" + users[2].id 
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});

// query users of group 1
describe("query users of group 1", function(){
	it("should without error", function(done){
		request.get({
			url : base +"/groups/" + groups[1].id +"/users" 
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});


// delete user 0
describe("delete user 0", function(){
	it("should without error", function(done){
		request.del({
			url : base +"/users/" + users[0].id
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});

// query users of group 0
describe("query users of group 0", function(){
	it("should without error", function(done){
		request.get({
			url : base +"/groups/" + groups[0].id +"/users" 
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});

// delete user 1
describe("delete user 1", function(){
	it("should without error", function(done){
		request.del({
			url : base +"/users/" + users[1].id
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});

// query users of group 0
describe("query users of group 0", function(){
	it("should without error", function(done){
		request.get({
			url : base +"/groups/" + groups[0].id +"/users" 
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});

// delete user 2
describe("delete user 2", function(){
	it("should without error", function(done){
		request.del({
			url : base +"/users/" + users[2].id
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});


// delete group 0
describe("delete group 0", function(){
	it("should without error", function(done){
		request.del({
			url : base +"/groups/" + groups[0].id
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});

// delete group 1
describe("delete group 1", function(){
	it("should without error", function(done){
		request.del({
			url : base +"/groups/" + groups[1].id
		},function (err, res, body){
			assert(null == err);
			console.log(body);
			done();
		});
	});
});