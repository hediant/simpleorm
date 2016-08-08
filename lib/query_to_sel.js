//
// options - query object
// [verb] - "or" | "and", default to "or"
//

var gt_exp = new RegExp(/^>(\d+|\w+)/);
var lt_exp = new RegExp(/^<(\d+|\w+)/);
var asterisk_wild_exp = new RegExp(/(\*)+/);

module.exports = function(options, verb) {
	var select = null;
	var verb_ = verb || "or";

	if (options && Object.keys(options).length) {
		select = {};
		select[verb_] = [];

		// 如果指定了id
		for (var key in options) {
			if (Array.isArray(options[key])) {

				var stat = {};
				//
				var values=[];
				(options[key]).forEach(function(val){
					var cond = key_val_to_sel(key, val);
					var op = Object.keys(cond)[0];
					if(op != '='){
						select[verb_].push(cond);	
					}else{
						values.push(val);
					}
				});
				if(values.length>0){
					stat[key] = values;
					select[verb_].push({"in":stat});
				}
			}
			else{
				var cond = key_val_to_sel(key, options[key]);
				select[verb_].push(cond);
			}
		}
	}

	return select;
};

function key_val_to_sel (key, val) {
	if (gt_exp.test(val)){
		var stat = {};
		stat[key] = val.substr(1);

		return {">":stat};
	}

	if (lt_exp.test(val)){
		var stat = {};
		stat[key] = val.substr(1);

		return {"<":stat};
	}

	if (asterisk_wild_exp.test(val)) {
		var stat = {};
		stat[key] = val.replace(/\*/g,"%");

		return {"like":stat};	
	}

	// else
	var stat = {};
	stat[key] = val;

	return {"=":stat};
}