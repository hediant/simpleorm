var Orm = require("../../../").Orm;

module.exports = {
	"users" : {
		"orm" : new Orm("t_users", {
			"__id__" : { "alias":"id", "readonly":true, "auto":true },
			"code" : { "alias":"code", "readonly":true },
			"name" : { "alias":"name" },
			"sex" : { "alias":"sex"},
			"email" : { "alias":"email"},
			"address" : { "alias":"address" },
			"enabled" : { "alias":"enabled" },
			"create_time" : { "alias":"create_time", "readonly":true, "auto":true }
		}),
		"primary_key" : "id",
		"public" : true
	},
	"groups" : {
		"orm" : new Orm("t_groups", {
			"__id__" : { "alias":"id", "readonly":true, "auto":true },
			"name" : { "alias":"name" },
			"desc" : { "alias":"desc"},
			"enabled" : { "alias":"enabled" },
			"create_time" : { "alias":"create_time", "readonly":true, "auto":true }
		}),
		"primary_key" : "id",
		"public" : true		
	},
	"users_in_group" : {
		"orm" : new Orm("t_users_in_group", {
			"__id__" : { "alias":"id", "readonly":true, "auto":true },
			"user_id" : { "alias":"user_id" },
			"group_id" : { "alias":"group_id"},
			"create_time" : { "alias":"create_time", "readonly":true, "auto":true }
		}),
		"public" : false		
	}
}