var http = require('http');
var path = require('path');
var global = require('./global');
var app = require('./app');

//////////////////////////////////////////////////////////////////////
/// init services
///
function init(){
    //var sconfig = ServiceConfig.loadConfig();
    var port = 3000;
    http.createServer(app).listen(port, function(){
        console.log("pid",process.pid);
        console.log("Express server listening on port " + port);
        console.log("===================================================");
        console.log("Start Console Service.")
        console.log('PID %s.', process.pid);
        console.log('Server listening on port %s.', port);
        console.log('Ready.');
    });
}

init();
