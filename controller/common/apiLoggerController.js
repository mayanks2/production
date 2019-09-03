var fs = require('fs');
var os = require("os");
var moment = require("moment");
module.exports = {
    createLogs: function (api_url, api_method, api_response) {
        var dateObj = new Date();
        var month = dateObj.getUTCMonth() + 1; //months from 1-12
        var day = dateObj.getUTCDate();
        var year = dateObj.getUTCFullYear();
        console.log("==========================>" + day + "_" + month + "_" + year);
        var logger = fs.createWriteStream('./API_LOGS/API_logs_' + day + "_" + month + "_" + year + '.txt', {
            flags: 'a' // 'a' means appending (old data will be preserved)
        });
        logger.write("Time:[" + new Date().toLocaleString() + "]" + os.EOL + "METHOD:[" + api_method + "]" + os.EOL + "Requested URL:[http://staging.dashboard.taplocalmarketing.com:3000" + api_url + "]" + os.EOL + "RESPONSE:[" + api_response + "]" + os.EOL + "===========================================================================================================================================================================================================================================================================" + os.EOL);
    },
    customOffersWrite: function (when, err, data = null) {
        var currentTime = moment().unix();
        var dateObj = new Date();
        var month = dateObj.getUTCMonth() + 1; //months from 1-12
        var day = dateObj.getUTCDate();
        var year = dateObj.getUTCFullYear();
        var logger = fs.createWriteStream('/var/www/nodeServer/logs/bulk-sms-custom-offer.log', {
            flags: 'a' // 'a' means appending (old data will be preserved)
        });
        var completeDate = `\n Date : ${month} - ${day} - ${year}`;
        logger.write(`${completeDate}  Current Time(UTC) : ${currentTime} - ${when} - ${err}  - ${data}\n`);
        logger.write(`--------------------Error----------------------\n`);
    },
    mobileWrite: function (data = null) {
        var currentTime = moment().unix();
        var dateObj = new Date();
        var month = dateObj.getUTCMonth() + 1; //months from 1-12
        var day = dateObj.getUTCDate();
        var year = dateObj.getUTCFullYear();
        var logger = fs.createWriteStream('/var/www/nodeServer/logs/API_logs_Mobile_Opt_In.log', {
            flags: 'a' // 'a' means appending (old data will be preserved)
        });
        var completeDate = `\n Date : ${month} - ${day} - ${year}`;
        logger.write(`${completeDate}  Current Time(UTC) : ${currentTime} - ${data}\n`);
        logger.write(`--------------------RESPONSE----------------------\n`);
    }
}