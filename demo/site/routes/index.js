var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

require('./models')(router);
require('./users_in_group')(router);

module.exports = router;
