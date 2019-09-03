
var app = require('../config/enviroment');
var api_routes = require('../routes/api_routes');
require('../controller/cronsJobs')
var config = require('../config/config');
app.use('/'+config.app.environment, api_routes);
app.get('/', (req, res) => {
    res.send('HEY! Node Js testing server....')
});
