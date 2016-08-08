module.exports = function parse_sort(sorts) {
	if (!Array.isArray(sorts) || !sorts.length)
		return null;

	var ret = [];
	sorts.forEach(function(sort){
		var order_ = {}, sort = sort.replace(/(^\s*)|(\s*$)/g, "");	// trim space key

		if (sort.charAt(sort.length-1) == '-') {
			order_.orderby = sort.slice(0, sort.length-1);
			order_.order = "desc";
		}
		else{
			order_.orderby = sort;
			order_.order = "asc";
		}

		ret.push(order_);
	});

	return ret;
};