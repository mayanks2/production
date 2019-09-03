'use strict';
var config = require('../config/config');
var Request = require("request");
var fs = require('fs');
var os = require("os");
/*
 * Get the AWS api server base endpoint with base URL and requested routes
 */
function getApiUrl(req) {
    return new Promise(function (resolve, reject) {
        var str = req.originalUrl;
        str = str.substring(1);
        var n = str.indexOf("/");
        var apiPath = str.substring(n + 1);
        var apiBaseUrl = config.app.API_BASE_URL;
        var fullApiUrl = apiBaseUrl + apiPath;
        console.log("fullApiUrl : ", fullApiUrl);
        var dateObj = new Date();
        var month = dateObj.getUTCMonth() + 1; //months from 1-12
        var day = dateObj.getUTCDate();
        var year = dateObj.getUTCFullYear();
        //var logger = fs.createWriteStream('./API_LOGS/Requested_Lamdafunction_API_' + day + "_" + month + "_" + year + '.txt', {
        //    flags: 'a' // 'a' means appending (old data will be preserved)
        //})
        //logger.write("[" + new Date().toLocaleString() + "],[METHOD:" + req.method + "]" + os.EOL + "[Requested URL:" + fullApiUrl + "]" + os.EOL);

        if (fullApiUrl) {
            resolve(fullApiUrl);
        } else {
            reject("no api url found!");
        }
    });
}
module.exports = {
    // Handle the get request and return response form Lambda function
    getRequest: function (req, res) {
        getApiUrl(req).then(function (fullApiUrl) {
            try {
                Request.get({
                    headers: {
                        "content-type": "application/json"
                    },
                    url: fullApiUrl,
                    json: true
                }, (error, response, body) => {
                    if (error) {
                        res.json({
                            status: 'failed',
                            statusCode: 400,
                            message: "no routes found on AWS API gateway",
                            response: error
                        });
                        res.end();
                    } else {
                        res.send(body);
                    }
                });
            } catch (e) {
                console.log(e);
                res.json({
                    status: 'failed',
                    statusCode: 400,
                    message: "no routes found on AWS API gateway",
                    response: error
                });
            }
        }, function (error) {
            res.json({
                status: 'failed',
                statusCode: 400,
                message: error,
                response: error
            });
        });

    },
    // Handle the post request and return response form Lambda function
    postRequest: function (req, res) {
        getApiUrl(req).then(function (fullApiUrl) {
            try {
                Request.post({
                    headers: {
                        "content-type": "application/json"
                    },
                    url: fullApiUrl,
                    body: req.body,
                    json: true
                }, (error, response, body) => {
                    if (error) {
                        res.json({
                            status: 'failed',
                            statusCode: 400,
                            message: "no routes found on AWS API gateway",
                            response: error
                        });
                    } else {
                        res.send(body);
                    }
                    res.end();
                });
            } catch (e) {
                console.log(e);
                res.json({
                    status: 'failed',
                    statusCode: 400,
                    message: "no routes found on AWS API gateway",
                    response: error
                });
            }
        }, function (error) {
            res.json({
                status: 'failed',
                statusCode: 400,
                message: error,
                response: error
            });
        });
    },
    // Handle the put request and return response form Lambda function
    putRequest: function (req, res) {
        getApiUrl(req).then(function (fullApiUrl) {
            try {
                Request.put({
                    headers: {
                        "content-type": "application/json"
                    },
                    url: fullApiUrl,
                    body: req.body,
                    json: true
                }, (error, response, body) => {
                    if (error) {
                        res.json({
                            status: 'failed',
                            statusCode: 400,
                            message: "no routes found on AWS API gateway",
                            response: error
                        });
                    } else {
                        res.send(body);
                    }
                });
            } catch (e) {
                console.log(e);
                res.json({
                    status: 'failed',
                    statusCode: 400,
                    message: "no routes found on AWS API gateway",
                    response: error
                });
            }
        }, function (error) {
            res.json({
                status: 'failed',
                statusCode: 400,
                message: error,
                response: error
            });
        });
    },
    // Handle the delete request and return response form Lambda function
    deleteRequest: function (req, res) {
        getApiUrl(req).then(function (fullApiUrl) {
            try {
                Request.delete({
                    headers: {
                        "content-type": "application/json"
                    },
                    url: fullApiUrl,
                    body: req.body,
                    json: true
                }, (error, response, body) => {
                    if (error) {
                        res.json({
                            status: 'failed',
                            statusCode: 400,
                            message: "no routes found on AWS API gateway",
                            response: error
                        });
                    } else {
                        res.send(body);
                    }
                });
            } catch (e) {
                console.log(e);
                res.json({
                    status: 'failed',
                    statusCode: 400,
                    message: "no routes found on AWS API gateway",
                    response: error
                });
            }
        }, function (error) {
            res.json({
                status: 'failed',
                statusCode: 400,
                message: error,
                response: error
            });
        });
    },
};