"use strict";
var async = require("async");
var model = require("../../model");
var moment = require("moment");
var textmessage = require("../../language/textMessage");
const moment_time = require("moment-timezone");
var emailConfig = require("../../config/emailConfig");
var nodemailer = require("nodemailer");
var timestamp = require("unix-timestamp");
var fs = require("fs");
var path = require("path");
var config = require("../../config/config");
var https = require("https");
var to_json = require("xmljson").to_json;
var constant = require('../../language/constantData');
const responseMsg = require('../../language/resMessage');
// const cronHelpers = require('../cronsJobs/cronHelpers');
const uuidv4 = require("uuid/v4");
const request = require("request");
var splitter = require('split-sms');
var trainingMode = require('./checkTrainingMode')
var accountSid = constant.ACCOUNTSID;
var authToken = constant.AUTHTOKEN;
var fromNumber = constant.SHORTCODE;

var transporterSales = nodemailer.createTransport({
  pool: true,
  host: emailConfig.Sales_config.host,
  port: emailConfig.Sales_config.port,
  secure: emailConfig.Sales_config.secure, // true for 465, false for other ports
  auth: {
    user: emailConfig.Sales_config.user, // generated ethereal user
    pass: emailConfig.Sales_config.password // generated ethereal password
  }
});
var transporterAdmin = nodemailer.createTransport({
  host: emailConfig.Admin_config.host,
  port: emailConfig.Admin_config.port,
  secure: emailConfig.Admin_config.secure, // true for 465, false for other ports
  auth: {
    user: emailConfig.Admin_config.user, // generated ethereal user
    pass: emailConfig.Admin_config.password // generated ethereal password
  }
});
module.exports = {
  twilioSentSms: (phone, message, type = null, media = null) => {
    console.log("-----------------------twilio----------------------");
    const client = require("twilio")(accountSid, authToken);
    return new Promise(function (resolve, reject) {
      var msgcontent = {
        body: message,
        from: fromNumber,
        to: phone
      };
      if (type === "MMS") {
        msgcontent = {
          body: message,
          from: fromNumber,
          mediaUrl: media,
          to: phone
        };
      }
      client.messages
        .create(msgcontent)
        .then(message => resolve(message))
        .catch(function (err) {
          reject(err);
        });
    });
  },
  mobisaSentSms: (phone, message, type = null, media = null) => {
    return new Promise(function (resolve, reject) {
      var messageString =
        '<?xml version="1.0" encoding="ISO-8859-1"?><push-request><def-code>1019</def-code><password>b@nktech2017</password><application>71958</application><user>' +
        phone +
        "</user><text>" +
        message +
        "</text></push-request>";

      // Options and headers for the HTTP request
      var options = {
        host: "dinama.com",
        //port: 443,
        path: "/smsApplications/campaigns/dinama/xmlInterfacePR.jsp",
        method: "POST",
        headers: {
          "Content-Type": "text/xml",
          "Content-Length": Buffer.byteLength(messageString)
        }
      };
      // Setup the HTTP request
      var req = https.request(options, function (res) {
        //res.setEncoding('utf-8');

        // Collect response data as it comes back.
        var responseString = "";
        res.on("data", function (data) {
          responseString += data;
        });

        // Log the responce received from Twilio.
        // Or could use JSON.parse(responseString) here to get at individual properties.
        res.on("end", function () {
          to_json(responseString, function (error, data) {
            console.log("Mobisa Response Data " + JSON.stringify(data));
            if (data["push-response"].status == 0) {
              responseMsg.RESPONSE200.path = "From Mobisa SMS";
              responseMsg.RESPONSE200.sent_sms = message;
              resolve(data);
            } else {
              reject(data);
            }
          });
        });
      });

      // Handler for HTTP request errors.
      req.on("error", function (e) {
        console.log("Error Message :" + e.message);
        responseMsg.RESPONSE400.message = e.message;
        reject(e);
      });

      // Send the HTTP request to the dinama API.
      // Log the message we are sending to dinama.
      console.log("PuertoRicoSMS: " + messageString);
      req.write(messageString);
      req.end();
    });
  },
  PuertoRico: function (phonenumber) {
    phonenumber = phonenumber.toString();
    return phonenumber.startsWith("1939") ||
      phonenumber.startsWith("+1939") ||
      phonenumber.startsWith("939") ||
      phonenumber.startsWith("+939") ||
      phonenumber.startsWith("1787") ||
      phonenumber.startsWith("787") ||
      phonenumber.startsWith("+1787") ||
      phonenumber.startsWith("+787")
      ? true
      : false;
  },
  //checking offer time has arrived or not according to timezone.....
  check_coupon_time: function (start_date, time, timezones, offer_id) {
    var zone = module.exports.timezone(timezones);

    var currentTimeInUTC = moment().unix();

    var givendate = moment.unix(start_date).format("YYYY-MM-DD");
    var selTime = moment(givendate + " " + time + ":00").unix();
    var currTime = moment.tz(zone).format("YYYY-MM-DD HH:mm:ss");
    var mainCurrTime = moment(currTime).unix();
    console.log(selTime + "<=" + mainCurrTime);
    if (selTime < mainCurrTime) {
      return true;
    } else {
      return false;
    }
  },
  // send email from admin@taplocalmarketing.com
  sendEmailFromAdmin: function (to, subject, body, attachment = null, fileName) {
    return new Promise(function (resolve, reject) {
      nodemailer.createTestAccount((err, account) => {
        // setup email data with unicode symbols
        let mailOptions = {
          from: '"Tap Local', // sender address
          to: to, // list of receivers
          subject: subject, // Subject line
          html: body
        };

        // send mail with defined transport object
        transporterAdmin.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log(error);
            reject(error);
          } else {
            resolve(true);
          }
        });
      });
    });
  },
  // send email from noreply@taplocalmarketing.com
  sendEmailFromNoReply: function (to, subject, body, attachment, fileName) {
    return new Promise(function (resolve, reject) {
      nodemailer.createTestAccount((err, account) => {
        // create reusable transporter object using the default SMTP transport
        let transporter = nodemailer.createTransport({
          host: emailConfig.NoReply_config.host,
          port: emailConfig.NoReply_config.port,
          secure: emailConfig.NoReply_config.secure, // true for 465, false for other ports
          auth: {
            user: emailConfig.NoReply_config.user, // generated ethereal user
            pass: emailConfig.NoReply_config.password // generated ethereal password
          }
        });

        // setup email data with unicode symbols
        let mailOptions = {
          from: '"Tap Local', // sender address
          to: to, // list of receivers
          //cc: 'amitk3@chetu.com', // list of receivers
          subject: subject, // Subject line
          html: body,
          attachments: [
            {
              // binary buffer as an attachment
              filename: fileName,
              content: new Buffer(attachment, "utf-8")
            }
          ]
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            reject(error);
          } else {
            resolve(true);
          }
        });
      });
    });
  },
  // send email from Sales@taplocalmarketing.com
  sendEmailFromSales: function (to, subject, body, attachment, fileName) {
    return new Promise(function (resolve, reject) {
      let mailOptions = {
        from: "Tap Local", // sender address
        to: to, // list of receivers
        subject: subject, // Subject line
        html: body
      };
      if (
        attachment != "" &&
        fileName != "" &&
        fileName != undefined &&
        attachment != undefined
      ) {
        mailOptions.attachments = [
          {
            // binary buffer as an attachment
            filename: fileName,
            content: new Buffer(attachment, "utf-8")
          }
        ];
      }
      // send mail with defined transport object
      transporterSales.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
          reject(error);
        } else {
          console.log(info);
          resolve(true);
        }
      });
    });
    // });
  },
  sendEmailToMerchant: function (to, subject, body, attachment, from, header) {
    return new Promise(function (resolve, reject) {
      nodemailer.createTestAccount((err, account) => {
        // create reusable transporter object using the default SMTP transport
        console.log(emailConfig.Admin_config.host);
        let transporter = nodemailer.createTransport({
          host: emailConfig.Admin_config.host,
          port: emailConfig.Admin_config.port,
          secure: emailConfig.Admin_config.secure, // true for 465, false for other ports
          auth: {
            user: emailConfig.Admin_config.user, // generated ethereal user
            pass: emailConfig.Admin_config.password // generated ethereal password
          }
        });

        // setup email data with unicode symbols
        let mailOptions = {
          from: '"Tap Local', // sender address
          to: to, // list of receivers
          //cc: 'amitk3@chetu.com', // list of receivers
          subject: subject, // Subject line
          html: body // html body
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            reject(error);
          } else {
            resolve(true);
          }
        });
      });
    });
  },
  timezone: function (timezones) {
    var zone = "";

    if (timezones == "MST" || timezones == "America/Denver") {
      zone = "America/Denver";
    } else if (timezones == "EST" || timezones == "America/New_York") {
      zone = "America/New_York";
    } else if (timezones == "PST" || timezones == "America/Los_Angeles") {
      zone = "America/Los_Angeles";
    } else if (timezones == "America/Phoenix") {
      zone = "America/Phoenix";
    } else if (timezones == "CST" || timezones == "America/Chicago") {
      zone = "America/Chicago";
    } else if (timezones == "AST" || timezones == "America/Puerto_Rico") {
      zone = "America/Puerto_Rico";
    } else if (timezones == "Pacific/Samoa") {
      zone = "Pacific/Samoa";
    } else {
      zone = timezones;
    }
    return zone;
  },
  /**
   *
   * @param {*} text
   */
  decodeHTMLEntities: function (text) {
    var entities = [
      ["amp", "&"],
      ["apos", "'"],
      ["#x27", "'"],
      ["#x2F", "/"],
      ["#39", "'"],
      ["#47", "/"],
      ["lt", "<"],
      ["gt", ">"],
      ["nbsp", " "],
      ["quot", '"']
    ];
    for (var i = 0, max = entities.length; i < max; ++i) {
      text = text.replace(
        new RegExp("&" + entities[i][0] + ";", "g"),
        entities[i][1]
      );
    }
    return text;
  },
  checkLimitEmailSMS: function (merchant_id, phone_number, type, filter_by) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../../language/resMessage"))
    );
    var today = Math.floor(Date.now() / 1000);
    return new Promise(function (resolve, reject) {
      module.exports.getMerchantById(merchant_id).then(
        function (successMerchant) {
          var total_limit = 0;
          if (type == "email")
            total_limit =
              successMerchant.email_limit !== undefined
                ? parseInt(successMerchant.email_limit)
                : 0;
          else if (type == "sms")
            total_limit =
              successMerchant.sms_limit !== undefined
                ? parseInt(successMerchant.sms_limit)
                : 0;

          var total_consume = 0;
          var total_limit_perUser = 0;
          if (type == "email") {
            total_limit_perUser =
              successMerchant.email_limit_perUser !== undefined
                ? parseInt(successMerchant.email_limit_perUser)
                : 0;
            module.exports
              .getMerchantSMSCount(
                successMerchant.merchant_id,
                filter_by,
                "email"
              )
              .then(function (email_sent) {
                total_consume = email_sent;
                if (total_limit_perUser === 0 || total_limit === 0) {
                  responseMsg.RESPONSE400.data = {};
                  responseMsg.RESPONSE400.data.type = type;
                  responseMsg.RESPONSE400.data.total_limit = total_limit;
                  responseMsg.RESPONSE400.data.total_consume = total_consume;
                  responseMsg.RESPONSE400.data.total_limit_perUser = total_limit_perUser;
                  responseMsg.RESPONSE400.data.total_consume_perUser = 0;
                  reject("SMS/Email Limit is per user or total is zero");
                } else {
                  module.exports
                    .getCustomerMerchantLogs(
                      merchant_id,
                      phone_number,
                      filter_by,
                      type
                    )
                    .then(
                      function (successLogs) {
                        var total_consume_perUser =
                          successLogs.consume !== undefined
                            ? successLogs.consume
                            : 0;

                        if (
                          total_limit_perUser > total_consume_perUser &&
                          total_consume < total_limit
                        ) {
                          responseMsg.OK.data = {};
                          responseMsg.OK.data.type = type;
                          responseMsg.OK.data.total_limit = total_limit;
                          responseMsg.OK.data.total_consume = total_consume;
                          responseMsg.OK.data.total_limit_perUser = total_limit_perUser;
                          responseMsg.OK.data.total_consume_perUser = total_consume_perUser;
                          resolve(responseMsg.OK);
                        } else {
                          responseMsg.RESPONSE400.data = {};
                          responseMsg.RESPONSE400.data.type = type;
                          responseMsg.RESPONSE400.data.total_limit = total_limit;
                          responseMsg.RESPONSE400.data.total_consume = total_consume;
                          responseMsg.RESPONSE400.data.total_limit_perUser = total_limit_perUser;
                          responseMsg.RESPONSE400.data.total_consume_perUser = total_consume_perUser;
                          reject("SMS/Email Limit is exceeded");
                        }
                      },
                      function (failLogs) {
                        reject(failLogs);
                      }
                    );
                }
              });
          } else if (type == "sms") {
            total_limit_perUser =
              successMerchant.sms_limit_perUser !== undefined
                ? parseInt(successMerchant.sms_limit_perUser)
                : 0;
            module.exports
              .getMerchantSMSCount(
                successMerchant.merchant_id,
                filter_by,
                "sms"
              )
              .then(function (sms_sent) {
                total_consume = sms_sent;
                if (total_limit_perUser === 0 || total_limit === 0) {
                  responseMsg.RESPONSE400.data = {};
                  responseMsg.RESPONSE400.data.type = type;
                  responseMsg.RESPONSE400.data.total_limit = total_limit;
                  responseMsg.RESPONSE400.data.total_consume = total_consume;
                  responseMsg.RESPONSE400.data.total_limit_perUser = total_limit_perUser;
                  responseMsg.RESPONSE400.data.total_consume_perUser = 0;
                  reject("SMS/Email Limit is per user or total is zero");
                } else {
                  module.exports
                    .getCustomerMerchantLogs(
                      merchant_id,
                      phone_number,
                      filter_by,
                      type
                    )
                    .then(
                      function (successLogs) {
                        var total_consume_perUser =
                          successLogs.consume !== undefined
                            ? successLogs.consume
                            : 0;

                        if (
                          total_limit_perUser > total_consume_perUser &&
                          total_consume < total_limit
                        ) {
                          responseMsg.OK.data = {};
                          responseMsg.OK.data.type = type;
                          responseMsg.OK.data.total_limit = total_limit;
                          responseMsg.OK.data.total_consume = total_consume;
                          responseMsg.OK.data.total_limit_perUser = total_limit_perUser;
                          responseMsg.OK.data.total_consume_perUser = total_consume_perUser;
                          resolve(responseMsg.OK);
                        } else {
                          responseMsg.RESPONSE400.data = {};
                          responseMsg.RESPONSE400.data.type = type;
                          responseMsg.RESPONSE400.data.total_limit = total_limit;
                          responseMsg.RESPONSE400.data.total_consume = total_consume;
                          responseMsg.RESPONSE400.data.total_limit_perUser = total_limit_perUser;
                          responseMsg.RESPONSE400.data.total_consume_perUser = total_consume_perUser;
                          reject("SMS/Email Limit is exceeded");
                        }
                      },
                      function (failLogs) {
                        reject(failLogs);
                      }
                    );
                }
              });
          }
        },
        function (failMerchant) {
          reject(failMerchant);
        }
      );
    });
  },

  // get merchant by id
  getMerchantById: function (merchant_id) {
    var merchant_id = merchant_id !== undefined ? merchant_id : null;
    return new Promise(function (resolve, reject) {
      model.tap_merchants
        .findAll({
          where: {
            merchant_id: merchant_id
          }
        })
        .then(function (data) {
          var result = data.map(function (data) {
            return data.toJSON();
          });
          if (result.length) resolve(result[0]);
          else reject("No Merchant Found.");
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },

  getMerchantSMSCount: function (merchant_id, filter_by, type) {
    return new Promise(function (resolve, reject) {
      var tableName;
      var sql;
      var timestampStart;
      var timestampEnd;
      switch (type) {
        case "sms":
          tableName = "tap_sent_sms";
          break;
        case "email":
          tableName = "tap_sent_emails";
          break;
      }
      console.log(
        "getMerchantSMSCount filter_by-------- " +
        filter_by +
        " getMerchantSMSCount type------------ " +
        type
      );
      switch (filter_by) {
        case "daily":
          var start = new Date();
          start.setHours(0, 0, 0, 0);
          var end = new Date();
          end.setHours(23, 59, 59, 999);
          timestampStart = timestamp.fromDate(start.toUTCString());
          timestampEnd = timestamp.fromDate(end.toUTCString());
          sql =
            "SELECT COUNT(id) AS consume FROM " +
            tableName +
            " WHERE merchant_id= :merchant_id AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
          break;
        case "weekly":
          var curr = new Date(); // get current date
          var first = curr.getDate() - curr.getDay(); // First day is the day of the month - the day of the week
          var firstday = new Date(curr.setDate(first));
          var last = firstday.getDate() + 6; // last day is the first day + 7
          var lastday = new Date(curr.setDate(last));
          firstday.setHours(0, 0, 0, 0);
          lastday.setHours(23, 59, 59, 999);
          timestampStart = timestamp.fromDate(firstday.toUTCString());
          timestampEnd = timestamp.fromDate(lastday.toUTCString());
          sql =
            "SELECT COUNT(id) AS consume FROM " +
            tableName +
            " WHERE merchant_id= :merchant_id AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
          runSql(sql);
          break;
        case "monthly":
          var tmpDate = new Date();
          var y = tmpDate.getFullYear();
          var m = tmpDate.getMonth();
          var firstDay = new Date(y, m, 1);
          var lastDay = new Date(y, m + 1, 0);
          lastDay.setHours(23, 59, 59, 999);
          firstDay.setHours(0, 0, 0, 0);
          timestampStart = timestamp.fromDate(firstDay.toUTCString());
          timestampEnd = timestamp.fromDate(lastDay.toUTCString());
          if (type == "email") {
            sql =
              "SELECT COUNT(id) AS consume FROM " +
              tableName +
              " WHERE merchant_id= :merchant_id AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
            runSql(sql);
          } else {
            // take startdate and end date from merchant_id
            model.tap_merchants
              .findAll({
                attributes: ["sms_sent"],
                where: {
                  merchant_id: merchant_id
                }
              })
              .then(function (data) {
                var merchantCount = data.map(function (data) {
                  return data.toJSON();
                });
                console.log("merchantCount----------- ", merchantCount);
                if (merchantCount.length > 0) {
                  resolve(merchantCount[0].sms_sent);
                } else {
                  reject("Some Error Occured");
                }
              }).catch(function (err) {
                reject("Some Error Occured");
              });
          }
          break;
        case "quarterly":
          var today = new Date(),
            quarter = Math.floor(today.getMonth() / 3),
            firstday,
            lastday;
          firstday = new Date(today.getFullYear(), quarter * 3, 1);
          lastday = new Date(
            firstday.getFullYear(),
            firstday.getMonth() + 3,
            0
          );
          firstday.setHours(0, 0, 0, 0);
          lastday.setHours(23, 59, 59, 999);
          timestampStart = timestamp.fromDate(firstday.toUTCString());
          timestampEnd = timestamp.fromDate(lastday.toUTCString());
          sql =
            "SELECT COUNT(id) AS consume FROM " +
            tableName +
            " WHERE merchant_id= :merchant_id AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
          runSql(sql);
          break;
        case "yearly":
          var d = new Date();
          var firstday = new Date(d.getFullYear(), 0, 1);
          var lastday = new Date(d.getFullYear(), 11, 31);
          firstday.setHours(0, 0, 0, 0);
          lastday.setHours(23, 59, 59, 999);
          timestampStart = timestamp.fromDate(firstday.toUTCString());
          timestampEnd = timestamp.fromDate(lastday.toUTCString());
          sql =
            "SELECT COUNT(id) AS consume FROM " +
            tableName +
            " WHERE merchant_id= :merchant_id AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
          runSql(sql);
          break;
        default:
          var start = new Date();
          start.setHours(0, 0, 0, 0);
          var end = new Date();
          end.setHours(23, 59, 59, 999);
          timestampStart = timestamp.fromDate(start.toUTCString());
          timestampEnd = timestamp.fromDate(end.toUTCString());
          sql =
            "SELECT COUNT(id) AS consume FROM " +
            tableName +
            " WHERE merchant_id= :merchant_id AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
          runSql(sql);
          break;
      }
      function runSql(sql) {
        model.sequelize
          .query(sql, {
            replacements: {
              merchant_id: merchant_id,
              timestampStart: timestampStart,
              timestampEnd: timestampEnd
            },
            type: model.sequelize.QueryTypes.SELECT
          })
          .then(function (rows) {
            if (rows.length > 0) {
              resolve(rows[0].consume);
            } else {
              var obj = 0;
              resolve(obj);
            }
          })
          .catch(function (err) {
            reject(err);
          });
      }
    });
  },

  getCustomerMerchantLogs: function (
    merchant_id,
    customer_phone,
    filter_by,
    type
  ) {
    return new Promise(function (resolve, reject) {
      var tableName;
      var sql;
      var timestampStart;
      var timestampEnd;
      switch (type) {
        case "sms":
          tableName = "tap_sent_sms";
          break;
        case "email":
          tableName = "tap_sent_emails";
          break;
      }
      console.log(
        "filter_by-------- " + filter_by + " type------------ " + type
      );
      switch (filter_by) {
        case "daily":
          var start = new Date();
          start.setHours(0, 0, 0, 0);
          var end = new Date();
          end.setHours(23, 59, 59, 999);
          timestampStart = timestamp.fromDate(start.toUTCString());
          timestampEnd = timestamp.fromDate(end.toUTCString());
          sql =
            "SELECT COUNT(id) AS consume FROM " +
            tableName +
            " WHERE merchant_id = :merchant_id AND customer_phone = :customer_phone AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
          break;
        case "weekly":
          var curr = new Date(); // get current date
          var first = curr.getDate() - curr.getDay(); // First day is the day of the month - the day of the week
          var firstday = new Date(curr.setDate(first));
          var last = firstday.getDate() + 6; // last day is the first day + 7
          var lastday = new Date(curr.setDate(last));
          firstday.setHours(0, 0, 0, 0);
          lastday.setHours(23, 59, 59, 999);
          timestampStart = timestamp.fromDate(firstday.toUTCString());
          timestampEnd = timestamp.fromDate(lastday.toUTCString());
          sql =
            "SELECT COUNT(id) AS consume FROM " +
            tableName +
            " WHERE merchant_id= :merchant_id AND customer_phone= :customer_phone AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
          break;
        case "monthly":
          var tmpDate = new Date();
          var y = tmpDate.getFullYear();
          var m = tmpDate.getMonth();
          var firstDay = new Date(y, m, 1);
          var lastDay = new Date(y, m + 1, 0);
          lastDay.setHours(23, 59, 59, 999);
          firstDay.setHours(0, 0, 0, 0);
          timestampStart = timestamp.fromDate(firstDay.toUTCString());
          timestampEnd = timestamp.fromDate(lastDay.toUTCString());
          sql =
            "SELECT COUNT(id) AS consume FROM " +
            tableName +
            " WHERE merchant_id= :merchant_id AND customer_phone= :customer_phone AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
          break;
        case "quarterly":
          var today = new Date(),
            quarter = Math.floor(today.getMonth() / 3),
            firstday,
            lastday;
          firstday = new Date(today.getFullYear(), quarter * 3, 1);
          lastday = new Date(
            firstday.getFullYear(),
            firstday.getMonth() + 3,
            0
          );
          firstday.setHours(0, 0, 0, 0);
          lastday.setHours(23, 59, 59, 999);
          timestampStart = timestamp.fromDate(firstday.toUTCString());
          timestampEnd = timestamp.fromDate(lastday.toUTCString());
          sql =
            "SELECT COUNT(id) AS consume FROM " +
            tableName +
            " WHERE merchant_id= :merchant_id AND customer_phone= :customer_phone AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
          break;
        case "yearly":
          var d = new Date();
          var firstday = new Date(d.getFullYear(), 0, 1);
          var lastday = new Date(d.getFullYear(), 11, 31);
          firstday.setHours(0, 0, 0, 0);
          lastday.setHours(23, 59, 59, 999);
          timestampStart = timestamp.fromDate(firstday.toUTCString());
          timestampEnd = timestamp.fromDate(lastday.toUTCString());
          sql =
            "SELECT COUNT(id) AS consume FROM " +
            tableName +
            " WHERE merchant_id= :merchant_id AND customer_phone= :customer_phone AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
          break;
        default:
          var start = new Date();
          start.setHours(0, 0, 0, 0);
          var end = new Date();
          end.setHours(23, 59, 59, 999);
          timestampStart = timestamp.fromDate(start.toUTCString());
          timestampEnd = timestamp.fromDate(end.toUTCString());
          sql =
            "SELECT COUNT(id) AS consume FROM " +
            tableName +
            " WHERE merchant_id= :merchant_id AND customer_phone= :customer_phone AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
          break;
      }
      model.sequelize
        .query(sql, {
          replacements: {
            merchant_id: merchant_id,
            customer_phone: customer_phone,
            timestampStart: timestampStart,
            timestampEnd: timestampEnd
          },
          type: model.sequelize.QueryTypes.SELECT
        })
        .then(function (rows) {
          if (rows.length > 0) {
            resolve(rows[0]);
          } else {
            var obj = {};
            obj.consume = 0;
            resolve(obj);
          }
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },
  insertLogsSMS_Email: function (type, params) {
    return new Promise(function (resolve, reject) {
      var timestamp = params.timestampEmailLog || Math.floor(Date.now() / 1000);
      var insertLogparams = {};
      insertLogparams.Item = {
        timestamp: parseInt(timestamp),
        merchant_id: params.merchant_id.toString(),
        customer_phone: parseInt(params.customer_phone),
        subject: params.subject,
        message: params.message
      };
      if (type == "sms") {
        insertLogparams.TableName = "tap_sent_sms";
        model.tap_sent_sms
          .create(insertLogparams.Item)
          .then(function (result) {
            resolve(result);
          })
          .catch(function (err) {
            reject(err);
          });
      } else {
        insertLogparams.TableName = "tap_sent_emails";
        insertLogparams.Item.from = params.email_from;
        insertLogparams.Item.to = params.email_to;
        model.tap_sent_emails
          .create(insertLogparams.Item)
          .then(function (result) {
            resolve(result);
          })
          .catch(function (err) {
            reject(err);
          });
      }
    });
  },
  // update the merchant limit of sms and email
  updateMerchants: function (params) {
    return new Promise(function (resolve, reject) {
      var today = Math.floor(Date.now() / 1000);
      var merchant_id =
        params.merchant_id !== undefined ? params.merchant_id.toString() : null;
      var updateparams = {
        TableName: "tap_merchants",
        Item: {
          updated_at: parseInt(today)
        }
      };
      updateparams.Item.updated_at = parseInt(today);
      if (params.sms_sent !== undefined) {
        updateparams.Item.sms_sent = parseInt(params.sms_sent);
      }
      if (params.email_sent !== undefined) {
        updateparams.Item.email_sent = parseInt(params.email_sent);
      }

      model.tap_merchants
        .update(updateparams.Item, {
          where: {
            merchant_id: merchant_id
          }
        })
        .then(function (info) {
          resolve(info);
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },
  objectCount: function (obj) {
    var size = 0,
      key;
    for (key in obj) {
      if (obj.hasOwnProperty(key) && obj[key] != "-1") size++;
    }
    return size;
  },
  unUsedResponseCount: function (obj) {
    var size = 0,
      key;
    for (key in obj) {
      if (
        obj.hasOwnProperty(key) &&
        obj[key] != "-1" &&
        obj[key].autoResponseUseSatus == 0
      )
        size++;
    }
    return size;
  },
  getEmailTemplateContent: function (templateName) {
    var jsonPath = path.join(
      __dirname,
      "..",
      "..",
      "language",
      "email_template",
      templateName
    );
    var templateContent = "";
    templateContent = fs.readFileSync(jsonPath, "utf8");
    templateContent = templateContent.replace(
      "%DASBOARD_LINK%",
      config.app.dashBoardURL
    );
    templateContent = templateContent.replace(
      "%CURRENT_YEAR%",
      moment().format("Y")
    );
    return templateContent;
  },
  LookupUsedForPuertoRico: (to, PuertoRico) => {
    console.log("LookupUsedForPuertoRico--------------------");
    return new Promise(function (resolve, reject) {
      if (!PuertoRico) {
        resolve(false);
      } else {
        // Setup the HTTP request
        var req = https.get(
          "https://" +
          accountSid +
          ":" +
          authToken +
          "@lookups.twilio.com/v1/PhoneNumbers/" +
          to +
          "?Type=carrier",
          res => {
            let data = "";
            // A chunk of data has been recieved.
            res.on("data", chunk => {
              data += chunk;
            });
            res.on("end", () => {
              var resData = JSON.parse(data);
              console.log(resData);
              if (resData.status == 404 || resData.status == 403) {
                resolve(false);
              } else {
                if (resData.carrier.type === "mobile") {
                  if (
                    resData.carrier.name === "CLARO Puerto Rico" ||
                    resData.carrier.name ===
                    "PR Wireless Inc dba Open Mobile - SVR/2"
                  ) {
                    resolve(true);
                  } else {
                    resolve(false);
                  }
                } else {
                  resolve(false);
                }
              }
            });
          }
        );

        // Handler for HTTP request errors.
        req.on("error", function (e) {
          console.error("HTTP error: " + e.message);
          return false;
        });
      }
    });
  },
  /**
   * Insert SMS log
   * @param {*} log_data
   */
  insertLogsSMS: function (log_data) {
    return new Promise(function (resolve, reject) {
      model.tap_sent_sms.create(log_data).then(
        result => {
          resolve(result);
        },
        function (err) {
          reject(err);
        }
      );
    });
  },
  /**
   * Insert Failed SMS log
   * @param {*} log_data
   */
  insertFailedLogsSMS: function (log_data) {
    return new Promise(function (resolve, reject) {
      model.tap_failed_sms.create(log_data).then(
        result => {
          resolve(result);
        },
        function (err) {
          reject(err);
        }
      );
    });
  },
  /**
   * update the merchant limit of sms and email
   * @param {*} params
   */
  updateMerchantsSentSMS: function (params) {
    return new Promise(async function (resolve, reject) {
      var today = Math.floor(Date.now() / 1000);
      var checkTrainingModeStatus = await trainingMode.checkTrainingMode(params.merchant_id);
      var update_expression = "updated_at=:updated_at";
      if (params.sms_sent !== undefined && !checkTrainingModeStatus) {
        update_expression += ",sms_sent = sms_sent + " + params.sms_sent;
      } else {
        update_expression += ",sms_sent_training = sms_sent_training + " + params.sms_sent;
      }
      var sql =
        "UPDATE tap_merchants SET " +
        update_expression +
        " WHERE merchant_id=:merchant_id";
      model.sequelize
        .query(sql, {
          replacements: {
            updated_at: today,
            merchant_id: params.merchant_id
          },
          type: model.sequelize.QueryTypes.UPDATE
        })
        .then(info => {
          resolve(info);
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },
  /**
   * Limit DBA nickname to specific character
   * @param {*} nickName
   * @param {*} count
   */
  limitNickName: function (nickName, count) {
    return str.substr(0, count);
  },
  /**
   * Replace UCS-2 Charetcter in SMS
   * @param {*} message
   */
  replaceUCSCharcter: message => {
    var tempMessage = message.replace(
      /[^a-zA-Z0-9!@#&"'$*<>()_+=|!\\/,.?%:; -/"]+/g,
      ""
    );
    console.log(tempMessage);
    return tempMessage;
  },

  /**
   * Function to convert the number to nth, rd, st
   * @param int i
   */
  ordinal_suffix_of: function (i) {
    if (i != '') {
      var j = i % 10,
        k = i % 100;
      if (j == 1 && k != 11) {
        return i + "st";
      }
      if (j == 2 && k != 12) {
        return i + "nd";
      }
      if (j == 3 && k != 13) {
        return i + "rd";
      }
      return i + "th";
    } else {
      return i;
    }
  },
  /**
 * Get merchant SMS count
 * @param {*} merchant_id
 * @param {*} customer_phone
 * @param {*} filter_by
 * @param {*} type
 */
  getMerchantCustomerSMSCount: function (
    merchant_id,
    customer_phone
  ) {
    return new Promise(function (resolve, reject) {
      var tableName;
      var sql;
      var timestampStart;
      var timestampEnd;
      tableName = "tap_sent_sms";
      var tmpDate = new Date();
      var y = tmpDate.getFullYear();
      var m = tmpDate.getMonth();
      var firstDay = new Date(y, m, 1);
      var lastDay = new Date(y, m + 1, 0);
      lastDay.setHours(23, 59, 59, 999);
      firstDay.setHours(0, 0, 0, 0);
      timestampStart = timestamp.fromDate(firstDay.toUTCString());
      timestampEnd = timestamp.fromDate(lastDay.toUTCString());
      sql =
        "SELECT COUNT(id) AS consume FROM " +
        tableName +
        " WHERE merchant_id = :merchant_id AND customer_phone = :customer_phone AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
      model.sequelize
        .query(sql, {
          replacements: {
            timestampStart: timestampStart,
            timestampEnd: timestampEnd,
            merchant_id: merchant_id,
            customer_phone: customer_phone
          },
          type: model.sequelize.QueryTypes.SELECT
        })
        .then(function (rows) {
          if (rows.length > 0) {
            resolve(rows[0]);
          } else {
            var obj = {
              consume: 0
            };
            resolve(obj);
          }
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },
  /**
 * Update SMS logs
 * @param {*} merchant_id
 * @param {*} phone_number
 * @param {*} message
 */
  updateOptInLogs: function (merchant_id, phone_number, message) {
    var today = Math.floor(Date.now() / 1000);
    return new Promise(function (resolve, reject) {
      let log_data = {
        timestamp: parseInt(today),
        merchant_id: merchant_id,
        customer_phone: phone_number,
        subject: "Opt In",
        message: message,
        sms_segment: "1",
        price: '0',
        type: "SMS",
        numMedia: "",
        res_data: JSON.stringify({}),
        offer_id: ""
      };
      Promise.all([
        module.exports.insertLogsSMS(log_data),
        module.exports.updateMerchantsSentSMS({
          sms_sent: log_data.sms_segment,
          merchant_id: merchant_id
        })
      ]).then(
        function (success) {
          console.log("sms send and log inserted");
          resolve(success);
        },
        function (fail) {
          console.log("sms send and log insert failed");
          reject(fail);
        }
      );
    });
  },
  /**
  *
  * Used for creating Short URL

  * @returns shortUrlInfo
  */
  createCouponShortUrl: function () {
    console.log("Inside createCouponShortUrl..............");
    var offerGuid = uuidv4();
    var createShortUrl = config.app.shortURLCouponURL + offerGuid;
    return new Promise(function (resolve, reject) {
      request({
        uri: "https://api.rebrandly.com/v1/links",
        method: "POST",
        body: JSON.stringify({
          destination: createShortUrl,
          domain: {
            fullName: "tpl.news",
          }
        }),
        headers: {
          "Content-Type": "application/json",
          apikey: "4055fe0fd8704dfcb526f6e0222b82ed"
        }
      },
        function (error, response, body) {
          if (error) {
            console.log("Inside createCouponShortUrl..............", error);
            reject(error);
          } else {
            var shortUrlLink = JSON.parse(body);
            var shortUrlInfo = {
              'offer_guid': offerGuid,
              'short_url': "https://" + shortUrlLink.shortUrl
            };
            console.log("Inside createCouponShortUrl..............comon", shortUrlInfo);
            resolve(shortUrlInfo);
          }
        }
      );
    });
  },
  /**
   * Create and Update short URL for offers
   * @param {*} couponId 
   */
  createCouponShortUrlAndUpdate: async function (couponId) {
    var shortUrlInfo = await module.exports.createCouponShortUrl();
    return new Promise(function (resolve, reject) {
      let insertparams = {};
      console.log("Call shortUrlInfo================>", shortUrlInfo);
      insertparams.coupon_short_url = shortUrlInfo.short_url;
      insertparams.offer_coupon_guid = shortUrlInfo.offer_guid;
      model.tap_merchant_offers
        .update(insertparams,
          {
            where: {
              id: couponId
            }
          })
        .then(function (info1) {
          resolve(shortUrlInfo);
        })
        .catch(function (err) {
          resolve(shortUrlInfo);
        });
    });
  },
  /**
  *
  * Used for creating Short URL
  * @param {*} req &id&Discount_Type&MerchantId&reward_text&coupon_short_url
  * @returns charactercount&segmentCount
  */
  updateSegmentAndCharacterCount: function (id, Discount_Type, MerchantId, reward_text, coupon_short_url) {
    console.log("Inside updateSegmentAndCharacterCount..............");
    console.log(id, Discount_Type, MerchantId, reward_text, coupon_short_url)

    return new Promise(async function (resolve, reject) {
      function updateOffers(segmentCountEnglish, characterCountEnglish, segmentCountSpanish, characterCountSpanish, MerchantId, id) {
        return new Promise((resolve, reject) => {
          try {
            model.tap_merchant_offers
              .update(
                {
                  segmentCountEnglish: segmentCountEnglish,
                  characterCountEnglish: characterCountEnglish,
                  segmentCountSpanish: segmentCountSpanish,
                  characterCountSpanish: characterCountSpanish
                },
                {
                  where: {
                    id: id,
                    MerchantId: MerchantId
                  }
                }
              )
              .then(offerResponse => {
                console.log(offerResponse)
                if (offerResponse) {
                  resolve({ status: true });
                } else {
                  resolve({ status: false });
                }
              })
          } catch (error) {
            resolve({ status: false });
          }
        })
      }
      function getSegmentsCharacter(defaultTextMessageEnglish, defaultTextMessageSpanish, getDba, reward_text, coupon_short_url) {
        return new Promise((resolve, reject) => {
          try {
            var textReplacementWithDataEnglish = defaultTextMessageEnglish;
            var replaceDbaEnglish = textReplacementWithDataEnglish.replace('%DBA%', getDba.nick_name);
            var replaceRewardTextEnglish = replaceDbaEnglish.replace('%REWARD_TEXT%', reward_text);
            var replaceShortUrlEnglish = replaceRewardTextEnglish.replace('%SHORTURL%', coupon_short_url);
            console.log("textReplacementWithDataEnglish", replaceShortUrlEnglish);
            var infoEnglish = splitter.split(replaceShortUrlEnglish);
            var segmentCountEnglish = infoEnglish.parts.length;
            var characterCountEnglish = infoEnglish.length;
            var textReplacementWithDataSpanish = defaultTextMessageSpanish;
            var replaceDbaSpanish = textReplacementWithDataSpanish.replace('%DBA%', getDba.nick_name);
            var replaceRewardTextSpanish = replaceDbaSpanish.replace('%SPANISH_REWARD_TEXT%', reward_text);
            var replaceShortUrlSpanish = replaceRewardTextSpanish.replace('%SHORTURL%', coupon_short_url);
            console.log("textReplacementWithDataSpanish", replaceShortUrlSpanish);
            var infoSpanish = splitter.split(replaceShortUrlSpanish);
            var segmentCountSpanish = infoSpanish.parts.length;
            var characterCountSpanish = infoSpanish.length;
            resolve({
              segmentCountEnglish: segmentCountEnglish,
              characterCountEnglish: characterCountEnglish,
              segmentCountSpanish: segmentCountSpanish,
              characterCountSpanish: characterCountSpanish
            })
          } catch (error) {
            resolve({ status: false });
          }
        })
      }
      function getSegmentsCharacterForCustomerType(defaultTextMessageEnglish, defaultTextMessageSpanish, getDba, reward_text, coupon_short_url, customerType) {
        return new Promise((resolve, reject) => {
          try {
            var textReplacementWithDataEnglish = defaultTextMessageEnglish;
            var replaceDbaEnglish = textReplacementWithDataEnglish.replace('%DBA%', getDba.nick_name);
            var replaceRewardTextEnglish = replaceDbaEnglish.replace('%REWARD_TEXT%', reward_text);
            var replaceShortUrlEnglish = replaceRewardTextEnglish.replace('%SHORTURL%', coupon_short_url);
            var replaceCustomerTypeEnglish = replaceShortUrlEnglish.replace('%OFFER_NAME%', customerType);
            console.log("textReplacementWithDataEnglish", replaceCustomerTypeEnglish);
            var infoEnglish = splitter.split(replaceCustomerTypeEnglish);
            var segmentCountEnglish = infoEnglish.parts.length;
            var characterCountEnglish = infoEnglish.length;
            var textReplacementWithDataSpanish = defaultTextMessageSpanish;
            var replaceDbaSpanish = textReplacementWithDataSpanish.replace('%DBA%', getDba.nick_name);
            var replaceRewardTextSpanish = replaceDbaSpanish.replace('%SPANISH_REWARD_TEXT%', reward_text);
            var replaceShortUrlSpanish = replaceRewardTextSpanish.replace('%SHORTURL%', coupon_short_url);
            var replaceCustomerTypeSpanish = replaceShortUrlSpanish.replace('%OFFER_NAME%', customerType);
            console.log("textReplacementWithDataSpanish", replaceCustomerTypeSpanish);
            var infoSpanish = splitter.split(replaceCustomerTypeSpanish);
            var segmentCountSpanish = infoSpanish.parts.length;
            var characterCountSpanish = infoSpanish.length;
            resolve({
              segmentCountEnglish: segmentCountEnglish,
              characterCountEnglish: characterCountEnglish,
              segmentCountSpanish: segmentCountSpanish,
              characterCountSpanish: characterCountSpanish
            })
          } catch (error) {
            resolve({ status: false });
          }
        })
      }
      function getDbaInfo(merchant_id) {
        return new Promise((resolve, reject) => {
          try {
            model.tap_merchants.find({
              attributes: ["dba", "sms_sent", "sms_limit", "sms_unlimited", "email_limit", "email_sent", "nick_name"],
              where: [{
                merchant_id: merchant_id
              }
              ]
            }).then(function (merchantDba) {
              if (merchantDba) {
                resolve(merchantDba)
              } else {
                reject(new Error("no response"))
              }
            })

          } catch (error) {
            reject(error)
          }
        })
      }
      if (!id || !Discount_Type || !MerchantId || !reward_text || !coupon_short_url) {
        resolve(false)
      } else {
        switch (Discount_Type) {
          case '0':
          case '1':
          case '2':
            console.log(id, Discount_Type, MerchantId, reward_text, coupon_short_url)
            var getDba = await getDbaInfo(MerchantId)
            var defaultTextMessageEnglish = textmessage.comeBackOfferWithShortUrl.english
            var defaultTextMessageSpanish = textmessage.comeBackOfferWithShortUrl.spanish
            var getSegmentsCharacterResponse = await getSegmentsCharacter(defaultTextMessageEnglish, defaultTextMessageSpanish, getDba, reward_text, coupon_short_url);
            if (getSegmentsCharacterResponse) {
              console.log("getSegmentsCharacterResponse", getSegmentsCharacterResponse)
              var updateOffersResponse = await updateOffers(getSegmentsCharacterResponse.segmentCountEnglish, getSegmentsCharacterResponse.characterCountEnglish, getSegmentsCharacterResponse.segmentCountSpanish, getSegmentsCharacterResponse.characterCountSpanish, MerchantId, id);
              if (updateOffersResponse.status) {
                resolve(true)
              } else {
                resolve(false)
              }
            } else {
              resolve(false)

            }
            break;
          case '3':
            console.log(id, Discount_Type, MerchantId, reward_text, coupon_short_url)
            var getDba = await getDbaInfo(MerchantId)
            var defaultTextMessageEnglish = textmessage.giveCouponWithShortUrl.english
            var defaultTextMessageSpanish = textmessage.giveCouponWithShortUrl.spanish
            var getSegmentsCharacterResponse = await getSegmentsCharacter(defaultTextMessageEnglish, defaultTextMessageSpanish, getDba, reward_text, coupon_short_url);
            if (getSegmentsCharacterResponse) {
              console.log("getSegmentsCharacterResponse", getSegmentsCharacterResponse)
              var updateOffersResponse = await updateOffers(getSegmentsCharacterResponse.segmentCountEnglish, getSegmentsCharacterResponse.characterCountEnglish, getSegmentsCharacterResponse.segmentCountSpanish, getSegmentsCharacterResponse.characterCountSpanish, MerchantId, id);
              if (updateOffersResponse.status) {
                resolve(true)
              } else {
                resolve(false)
              }
            } else {
              resolve(false)

            }
            break;
          case '4':
            console.log(id, Discount_Type, MerchantId, reward_text, coupon_short_url)
            var getDba = await getDbaInfo(MerchantId)
            // var defaultTextMessageEnglish =  textmessage.customOfferWithShortUrl.english
            // var defaultTextMessageSpanish =  textmessage.customOfferWithShortUrl.spanish
            // var getSegmentsCharacterResponse = await getSegmentsCharacter(defaultTextMessageEnglish , defaultTextMessageSpanish , getDba ,reward_text , coupon_short_url);
            console.log("getSegmentsCharacterResponse", getSegmentsCharacterResponse)
            var updateOffersResponse = await updateOffers(0, 0, 0, 0, MerchantId, id);
            resolve(true)
            break;
          case '5':
            console.log(id, Discount_Type, MerchantId, reward_text, coupon_short_url)
            var getDba = await getDbaInfo(MerchantId)
            var defaultTextMessageEnglish = textmessage.profileCompleteOfferWithShortUrl.english
            var defaultTextMessageSpanish = textmessage.profileCompleteOfferWithShortUrl.spanish
            var getSegmentsCharacterResponse = await getSegmentsCharacter(defaultTextMessageEnglish, defaultTextMessageSpanish, getDba, reward_text, coupon_short_url);
            if (getSegmentsCharacterResponse) {
              console.log("getSegmentsCharacterResponse", getSegmentsCharacterResponse)
              var updateOffersResponse = await updateOffers(getSegmentsCharacterResponse.segmentCountEnglish, getSegmentsCharacterResponse.characterCountEnglish, getSegmentsCharacterResponse.segmentCountSpanish, getSegmentsCharacterResponse.characterCountSpanish, MerchantId, id);
              if (updateOffersResponse.status) {
                resolve(true)
              } else {
                resolve(false)
              }
            } else {
              resolve(false)

            }
            break;
          case '6':
            console.log(id, Discount_Type, MerchantId, reward_text, coupon_short_url)
            var getDba = await getDbaInfo(MerchantId)
            var defaultTextMessageEnglish = textmessage.topSpentOfferWithShortUrl.english
            var defaultTextMessageSpanish = textmessage.topSpentOfferWithShortUrl.spanish
            var getSegmentsCharacterResponse = await getSegmentsCharacter(defaultTextMessageEnglish, defaultTextMessageSpanish, getDba, reward_text, coupon_short_url);
            if (getSegmentsCharacterResponse) {
              console.log("getSegmentsCharacterResponse", getSegmentsCharacterResponse)
              var updateOffersResponse = await updateOffers(getSegmentsCharacterResponse.segmentCountEnglish, getSegmentsCharacterResponse.characterCountEnglish, getSegmentsCharacterResponse.segmentCountSpanish, getSegmentsCharacterResponse.characterCountSpanish, MerchantId, id);
              if (updateOffersResponse.status) {
                resolve(true)
              } else {
                resolve(false)
              }
            } else {
              resolve(false)

            }
            break;
          case '7':
          case '8':
          case '9':
            var customerType;
            if (Discount_Type == '7') {
              customerType = 'Casual'
            } else if (Discount_Type == '8') {
              customerType = 'Regular'
            } else {
              customerType = 'VIP'
            }
            console.log(id, Discount_Type, MerchantId, reward_text, coupon_short_url)
            var getDba = await getDbaInfo(MerchantId)
            var defaultTextMessageEnglish = textmessage.customerTypeOfferWithShortUrl.english
            var defaultTextMessageSpanish = textmessage.customerTypeOfferWithShortUrl.spanish
            var getSegmentsCharacterResponse = await getSegmentsCharacterForCustomerType(defaultTextMessageEnglish, defaultTextMessageSpanish, getDba, reward_text, coupon_short_url, customerType);
            if (getSegmentsCharacterResponse) {
              console.log("getSegmentsCharacterResponse", getSegmentsCharacterResponse)
              var updateOffersResponse = await updateOffers(getSegmentsCharacterResponse.segmentCountEnglish, getSegmentsCharacterResponse.characterCountEnglish, getSegmentsCharacterResponse.segmentCountSpanish, getSegmentsCharacterResponse.characterCountSpanish, MerchantId, id);
              if (updateOffersResponse.status) {
                resolve(true)
              } else {
                resolve(false)
              }
            } else {
              resolve(false)

            }
            break;
          case '10':
          case '11':
          case '12':
            console.log(id, Discount_Type, MerchantId, reward_text, coupon_short_url)
            var getDba = await getDbaInfo(MerchantId)
            var defaultTextMessageEnglish = textmessage.punchCardOfferWithShortUrl.english
            var defaultTextMessageSpanish = textmessage.punchCardOfferWithShortUrl.spanish
            var getSegmentsCharacterResponse = await getSegmentsCharacter(defaultTextMessageEnglish, defaultTextMessageSpanish, getDba, reward_text, coupon_short_url);
            if (getSegmentsCharacterResponse) {
              console.log("getSegmentsCharacterResponse", getSegmentsCharacterResponse)
              var updateOffersResponse = await updateOffers(getSegmentsCharacterResponse.segmentCountEnglish, getSegmentsCharacterResponse.characterCountEnglish, getSegmentsCharacterResponse.segmentCountSpanish, getSegmentsCharacterResponse.characterCountSpanish, MerchantId, id);
              if (updateOffersResponse.status) {
                resolve(true)
              } else {
                resolve(false)
              }
            } else {
              resolve(false)

            }
            break;
          case '14':
            console.log(id, Discount_Type, MerchantId, reward_text, coupon_short_url)
            var getDba = await getDbaInfo(MerchantId)
            var defaultTextMessageEnglish = textmessage.happyBirthdayOfferWithShortUrl.english
            var defaultTextMessageSpanish = textmessage.happyBirthdayOfferWithShortUrl.spanish
            var getSegmentsCharacterResponse = await getSegmentsCharacter(defaultTextMessageEnglish, defaultTextMessageSpanish, getDba, reward_text, coupon_short_url);
            if (getSegmentsCharacterResponse) {
              console.log("getSegmentsCharacterResponse", getSegmentsCharacterResponse)
              var updateOffersResponse = await updateOffers(getSegmentsCharacterResponse.segmentCountEnglish, getSegmentsCharacterResponse.characterCountEnglish, getSegmentsCharacterResponse.segmentCountSpanish, getSegmentsCharacterResponse.characterCountSpanish, MerchantId, id);
              if (updateOffersResponse.status) {
                resolve(true)
              } else {
                resolve(false)
              }
            } else {
              resolve(false)

            }
            break;

          case 'text your customer':
            // have to work on this
            break;
          default:
            break;
        }
      }
    });
  },
  /**
   * Generate merchant id code uing base64 encode
   * @param {*} link 
   * @param {*} merchant_id 
   */
  generateBillingPageLink: function (link, merchant_id) {
    let buff = new Buffer(merchant_id);
    let merchantIdbase64 = buff.toString('base64');
    let billingPageLink = link + "?mid=" + merchantIdbase64;
    console.log('"' + merchant_id + '" converted to Base64 is "' + merchantIdbase64 + '"');
    return billingPageLink;
  },
  /**
   * Get merchant id code uing base64 encode
   * @param {*} link 
   * @param {*} merchant_id 
   */
  getMerchantIdFromEncodedLink: function (mid) {
    let buff = new Buffer(mid, 'base64');
    let merchant_id = buff.toString('ascii');
    console.log('"' + mid + '" converted from Base64 to ASCII is "' + merchant_id + '"');
    return merchant_id;
  },
  /**
   * Update merchant is_training flag
   * @param {*} merchant_id 
   * @param {*} flag 
   */
  updateMerchantIsTraining: function (merchant_id, flag) {
    return new Promise(function (resolve, reject) {
      var sql = "UPDATE tap_merchants SET is_training = :flag, sms_limit = :sms_limit, sms_unlimited = :sms_unlimited, sms_sent = :sms_sent where merchant_id = :merchant_id";
      var queryParam = {
        merchant_id: merchant_id,
        flag: flag,
        sms_limit: '0',
        sms_unlimited: '1',
        sms_sent: '0'
      };
      model.sequelize
        .query(sql, {
          replacements: queryParam,
          type: model.sequelize.QueryTypes.UPDATE
        }).then(function (data) {
          resolve(data);
        }).catch(function (err) {
          reject(err);
        });
    });
  },
  checkMerchantSchedule: function (merchant_id) {
    return new Promise(function (resolve, reject) {
      model.tap_merchants.belongsTo(model.tap_schedule_subscription, {
        foreignKey: "merchant_id",
        targetKey: "merchant_id"
      });
      model.tap_merchants
        .findAll({
          where: {
            merchant_id: merchant_id
          },
          include: [
            {
              attributes: [
                "schedule_id"
              ],
              model: model.tap_schedule_subscription
            }]
        })
        .then(function (result) {
          var merchantData = result.map(function (result) {
            return result.toJSON();
          });
          if(merchantData.length > 0){
            
          }else{
            reject(merchantData);
          }
        }).catch((error) => {
          reject(error);
        });
    });
  }
};
