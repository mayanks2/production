"use strict";
var model = require("../model");
var config = require("../config/config");
var timestamp = require("unix-timestamp");
var getUrls = require("get-urls");
var splitter = require("split-sms");
var request = require("request");
var tap_twilioSMSController = require("../controller/tap_twilioSMSController");
var tap_sendEmailController = require("../controller/tap_sendEmailController");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));
const common = require("../language/constantData");
var helper = require("../controller/common/helper");
var trainingMode = require('../controller/common/checkTrainingMode')
const tierBillingScheduleInfo = require('../controller/tierBillingScheduleInfo');
var splitter = require("split-sms");
var async = require('async')
var timeZoneForTcpa = require('../controller/common/checkTimeBetween')
var cronHelpers = require('../controller/cronsJobs/cronHelpers')

module.exports = {
  // get app version
  GenerateCoupon: function (req, callback) {
    responseMsg.RESPONSE200.message =
      "Coupon generated and send successfully.!";
    var offer_type = req.offer_type;
    var offer_id = req.offer_id !== undefined ? req.offer_id : "";
    var merchant_id = req.merchant_id;
    var customer_id = req.customer_id;
    var phone = req.phone;
    var message = req.message;
    var customer;
    var find_customer = false;
    var check_optin = req.check_optin || "true";
    const mediaURL = req.mediaUrl ? req.mediaUrl : common.DEFAULT_IMAGE;
    const msgType = req.msgType;
    const spanishmsgType = req.spanishmsgType;
    const spanishmediaUrl = req.spanishmediaUrl
      ? req.spanishmediaUrl
      : common.DEFAULT_IMAGE;
    getMerchantDetails(merchant_id).then(
      function (details) {
        Promise.all([
          merchant_customers_detail(merchant_id, customer_id),
          merchant_offer_detail(merchant_id, offer_type, offer_id)
        ]).then(
          async function (data) {
            console.log("merchant detail- " + details[0].country);
            var merchant_customer_info = data[0];
            var offer_info = data[1];
            var checkTimeZone;
            if(offer_info.time_zone){
              checkTimeZone = await timeZoneForTcpa.checkTimeVaildationForMessages(offer_info.time_zone)
            }else{
              var getTimeZone = await cronHelpers.getDba(merchant_id);
              checkTimeZone = await timeZoneForTcpa.checkTimeVaildationForMessages(getTimeZone.timezone)
            }
            var spanish_reward_text = "";
            if (offer_info.reward_text !== null) {
              spanish_reward_text = decodeHTMLEntities(offer_info.reward_text);
            }
            console.log("spanish_reward_text- " + spanish_reward_text);
            if (merchant_customer_info.optin == "1") {
               // Replace Short URL in SMS
               if (offer_info.coupon_short_url && offer_info.coupon_short_url != null && offer_info.coupon_short_url !== undefined) {
                console.log("short URL--------------------------------------------1");
                message = message.replace(
                  "%SHORTURL%",
                  offer_info.coupon_short_url
                );
              } else {
                  var shortUrlInfo = await helper.createCouponShortUrlAndUpdate(offer_info.id);
                  console.log("no short URL--------------------------------------------2");
                  message = message.replace(
                    "%SHORTURL%",
                    shortUrlInfo.short_url
                  );
                  offer_info.offer_coupon_guid = shortUrlInfo.offer_guid;
                  offer_info.coupon_short_url = shortUrlInfo.short_url;
              }
              //create coupon
              var coupon_detail = {
                customer_id: customer_id,
                merchant_id: merchant_id,
                offerid: offer_info.id,
                offer_type: offer_info.Discount_Type,
                created_at: Math.floor(Date.now() / 1000),
                expires: offer_info.expires,
                coupon_uuid: offer_info.offer_coupon_guid
              };
              if (offer_info.expires != "0") {
                var expires = gettimestampForDays(offer_info.expires);
                if (expires) {
                  coupon_detail.expires = expires;
                }
              }
              //generate coupon
              insertCoupon(coupon_detail).then(
                 function (coupon_id) {
                  if (offer_info.Discount_Type !== 4) {
                    if (merchant_customer_info.dba == "silk and chiffon llc") {
                      merchant_customer_info.dba = "Silk and Chiffon Boutique";
                    }
                    message = message.replace(
                      "%OFFER_NAME%",
                      offer_info.Data !== null ? offer_info.Data : ""
                    );
                    message = message.replace("%COUPON_ID%", coupon_id);
                    message = message.replace(
                      "%DBA%",
                      merchant_customer_info !== null
                        ? merchant_customer_info.nick_name
                        : ""
                    );
                    message = message.replace(
                      "%FREQUENCY%",
                      merchant_customer_info.sms_limit_PerUser
                    );
                    message = message.replace(
                      "%LINK%",
                      merchant_customer_info.id
                    );
                    message = message.replace(
                      "%FIRSTNAME%",
                      merchant_customer_info.firstName !== null
                        ? merchant_customer_info.firstName.ucfirst()
                        : "User"
                    );
                    message = message.replace(
                      "%AMOUNT%",
                      offer_info.Discount_Percentage
                    );
                    message = message.replace(
                      "%UNIT_DOL%",
                      offer_info.discount_unit == "$"
                        ? offer_info.discount_unit
                        : ""
                    );
                    message = message.replace(
                      "%UNIT_PER%",
                      offer_info.discount_unit == "%"
                        ? offer_info.discount_unit
                        : ""
                    );
                    message = message.replace(
                      "%REWARD_TEXT%",
                      offer_info.reward_text !== null
                        ? decodeHTMLEntities(offer_info.reward_text)
                        : ""
                    );
                    message = message.replace(
                      "%SPANISH_REWARD_TEXT%",
                      spanish_reward_text
                    );
                    if(!checkTimeZone && (merchant_customer_info.prefContactMethod === 0 || merchant_customer_info.prefContactMethod === 2)){
                      let getLength = splitter.split(message);
                      let getSegments = getLength.parts.length;
                      var logsparams = {
                        TableName: "tap_pending_messages",
                        Item: {
                          merchant_id: merchant_id,
                          customer_phone: merchant_customer_info.phoneNumber,
                          message: message,
                          sent_status: 'false',
                          timezone: offer_info.time_zone ? offer_info.time_zone : getTimeZone.timezone,
                          date:  Math.floor(Date.now() / 1000),
                          segment_count : getSegments,
                          offer : offer_info.Data,
                          offer_id : offer_info.id
                        }
                      };
                      model.tap_pending_messages
                        .create(logsparams.Item)
                        .then(function (info) {
                          return callback(null, responseMsg.RESPONSE200);
                        })
                        .catch(function (err) {
                          responseMsg.RESPONSE400.message = err;
                          return callback(null, responseMsg.RESPONSE400);
                        });
                    }else{
                      if (merchant_customer_info.prefContactMethod === 0) {
                        sendEmailSMS(
                          merchant_customer_info,
                          "sms",
                          message,
                          offer_info,
                          details[0].country,
                          mediaURL,
                          msgType,
                          spanishmediaUrl,
                          spanishmsgType,
                          offer_info.id
                        ).then(
                          function (resolve) {
                            console.log('qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
                            return callback(null, responseMsg.RESPONSE200);
                          },
                          function (reject) {
                            console.log('wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww');
                            return callback(null, responseMsg.RESPONSE200);
                          }
                        );
                      } else if (merchant_customer_info.prefContactMethod === 1) {
                        sendEmailSMS(
                          merchant_customer_info,
                          "email",
                          message,
                          offer_info,
                          details[0].country,
                          mediaURL,
                          msgType,
                          spanishmediaUrl,
                          spanishmsgType,
                          offer_info.id
                        ).then(
                          function (resolve) {
                            console.log('email eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
                            return callback(null, responseMsg.RESPONSE200);
                          },
                          function (reject) {
                            console.log('email eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', reject);
                            return callback(null, responseMsg.RESPONSE200);
                          }
                        );
                      } else if (merchant_customer_info.prefContactMethod === 2) {
                        console.log("prefffffffffffcontact222222222222222")
                        async.series([
                          function(inercallback) {
                            console.log('bothhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh sms')
                            sendEmailSMS(
                              merchant_customer_info,
                              "sms",
                              message,
                              offer_info,
                              details[0].country,
                              mediaURL,
                              msgType,
                              spanishmediaUrl,
                              spanishmsgType,
                              offer_info.id
                            ).then(function(res){inercallback(null, 'sms');},function(err){inercallback(null, 'sms');});
                              
                          },
                          function(inercallback) {
                            console.log('bothhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh email')
                            sendEmailSMS(
                              merchant_customer_info,
                              "email",
                              message,
                              offer_info,
                              details[0].country,
                              mediaURL,
                              msgType,
                              spanishmediaUrl,
                              spanishmsgType,
                              offer_info.id
                            ).then(function(res){inercallback(null, 'email');},function(err){inercallback(null, 'email');});
                          }
                      ],
                      // optional callback
                      function(err, results) {
                         return callback(null, responseMsg.RESPONSE200);
                      });
                      } else {
                        console.log('uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu');
                        return callback(null, responseMsg.RESPONSE200);
                      }
                    }

                  } else {
                    console.log('iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii');
                    return callback(null, responseMsg.RESPONSE200);
                  }
                },
                function (reject) {
                  console.log('ooooooooooooooooooooooooooooooooooooooooooooooooooooooooo');
                  responseMsg.RESPONSE400.message = reject;
                  return callback(null, responseMsg.RESPONSE400);
                }
              );
            } else {
              console.log('ppppppppppppppppppppppppppppppppppppppppppppppppppppppppppp');
              responseMsg.RESPONSE400.message =
                "Sorry! Customer is not Opt-in.";
              return callback(null, responseMsg.RESPONSE400);
            }
          },
          function (reject) {
            console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
            responseMsg.RESPONSE400.message = reject;
            return callback(null, responseMsg.RESPONSE400);
          }
        );
      },
      function (reject) {
        console.log('sssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss');
        responseMsg.RESPONSE400.message = reject;
        return callback(null, responseMsg.RESPONSE400);
      }
    );
  }
};
/**
 * Decode HTML content
 * @param {*} text
 */
function decodeHTMLEntities(text) {
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
}
/**
 * Get merchant details
 * @param {*} merchant_id
 */
function getMerchantDetails(merchant_id) {
  return new Promise(function (resolve, reject) {
    model.tap_merchants
      .findAll({
        attributes: [`taptext_status`, `country`],
        where: {
          active: "true",
          taptext_status: "true",
          merchant_id: merchant_id
        }
      })
      .then(function (merrow) {
        if (merrow.length > 0) {
          resolve(merrow);
        } else {
          reject("Merchant not active for");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * Send emails and SMS
 * @param {*} merchant_customer_info
 * @param {*} type
 * @param {*} message
 * @param {*} offer_detail
 * @param {*} merchant_region
 */
function sendEmailSMS(
  merchant_customer_info,
  type,
  message,
  offer_detail,
  merchant_region,
  mediaURL,
  msgType,
  spanishmediaUrl,
  spanishmsgType,
  offer_id
) {
  var today = Math.floor(Date.now() / 1000);
  return new Promise(function (resolve, reject) {
    if (type == "sms") {
      if (
        (merchant_customer_info.sms_limit === 0 && merchant_customer_info.sms_unlimited != '1') ||
        merchant_customer_info.sms_limit_PerUser === 0
      ) {
        reject("Sms sent Limit already reached.");
      } else {
        helper
          .getMerchantSMSCount(
            merchant_customer_info.merchant_id,
            "monthly",
            type
          )
          .then(function (sms_sent) {
            let upgradeTierData = {
              segmentNeedToAdd: (sms_sent + splitter.split(
                message
              ).parts.length) , trigger : message
            };
            console.log("segmentNeedToAdd-----------", upgradeTierData);
            console.log("segmentNeedToAdd-----------", merchant_customer_info.sms_limit, upgradeTierData.segmentNeedToAdd);
            // new code

            getMerchantCustomerSMSCount(
              merchant_customer_info.merchant_id,
              merchant_customer_info.phoneNumber,
              "monthly",
              type
            ).then(
              async function (consumed_count) {
                if (
                  consumed_count.consume >=
                  merchant_customer_info.sms_limit_PerUser
                ) {
                  reject(
                    "Sms sent limit against this customer already reached."
                  );
                } else {

                  // here  to add that code
                  var trainingModeCheckStatus = await trainingMode.checkTrainingMode(merchant_customer_info.merchant_id);
                  if (merchant_customer_info.sms_limit < upgradeTierData.segmentNeedToAdd && merchant_customer_info.sms_unlimited != '1' && !trainingModeCheckStatus) {
                    tierBillingScheduleInfo
                      .updgardeTierWithOveragePrice(merchant_customer_info.merchant_id, upgradeTierData)
                      .then(
                        function (res) {
                          console.log("Sms sent Limit already reached and Tier Upgraded.");
                          tap_twilioSMSController.twilioSMSSent(
                            {
                              phone: merchant_customer_info.phoneNumber,
                              message: message,
                              merchant_region: merchant_region,
                              mediaURL: mediaURL,
                              msgType: msgType,
                              spanishmediaUrl: spanishmediaUrl,
                              spanishmsgType: spanishmsgType
                            },
                            function (err, sendsms) {
                              if (err) {
                                reject(err);
                              } else {
                                console.log(
                                  "data----------------------------------\n",
                                  sendsms
                                );
                                let log_data = {
                                  timestamp: parseInt(today),
                                  merchant_id: merchant_customer_info.merchant_id,
                                  customer_phone:
                                    merchant_customer_info.phoneNumber,
                                  subject: offer_detail.Data,
                                  message: sendsms.data.body,
                                  sms_segment: sendsms.data.numSegments,
                                  price: sendsms.data.price,
                                  type: msgType,
                                  numMedia: sendsms.data.numMedia,
                                  res_data: JSON.stringify(sendsms.data),
                                  offer_id: offer_id
                                };
                                if (sendsms.statusCode == 200) {
                                  message = sendsms.sent_sms;
                                  Promise.all([
                                    insertLogsSMS_Email(type, log_data),
                                    updateMerchants({
                                      message: log_data.message,
                                      sms_sent: log_data.sms_segment,
                                      merchant_id: merchant_customer_info.merchant_id
                                    })
                                  ]).then(
                                    function (success) {
                                      resolve(success);
                                    },
                                    function (fail) {
                                      reject(fail);
                                    }
                                  );
                                } else {
                                  Promise.all([
                                    helper.insertFailedLogsSMS(log_data),
                                    updateMerchants({
                                      message: log_data.message,
                                      sms_sent: log_data.sms_segment,
                                      merchant_id: merchant_customer_info.merchant_id
                                    })
                                  ]).then(
                                    function (success) {
                                      resolve(success);
                                    },
                                    function (fail) {
                                      reject(fail);
                                    }
                                  );
                                }
                              }
                            }
                          );
                        },
                        function (err) {
                          console.log(err);
                          console.log("Sms sent Limit already reached and Tier not Upgraded.");
                          reject("Sms sent Limit already reached.");
                        }
                      );
                  } else {
                    tap_twilioSMSController.twilioSMSSent(
                      {
                        phone: merchant_customer_info.phoneNumber,
                        message: message,
                        merchant_region: merchant_region,
                        mediaURL: mediaURL,
                        msgType: msgType,
                        spanishmediaUrl: spanishmediaUrl,
                        spanishmsgType: spanishmsgType
                      },
                      function (err, sendsms) {
                        if (err) {
                          reject(err);
                        } else {
                          console.log(
                            "data----------------------------------\n",
                            sendsms
                          );
                          let log_data = {
                            timestamp: parseInt(today),
                            merchant_id: merchant_customer_info.merchant_id,
                            customer_phone:
                              merchant_customer_info.phoneNumber,
                            subject: offer_detail.Data,
                            message: sendsms.data.body,
                            sms_segment: sendsms.data.numSegments,
                            price: sendsms.data.price,
                            type: msgType,
                            numMedia: sendsms.data.numMedia,
                            res_data: JSON.stringify(sendsms.data),
                            offer_id: offer_id
                          };
                          if (sendsms.statusCode == 200) {
                            message = sendsms.sent_sms;
                            Promise.all([
                              insertLogsSMS_Email(type, log_data),
                              updateMerchants({
                                message: log_data.message,
                                sms_sent: log_data.sms_segment,
                                merchant_id: merchant_customer_info.merchant_id
                              })
                            ]).then(
                              function (success) {
                                resolve(success);
                              },
                              function (fail) {
                                reject(fail);
                              }
                            );
                          } else {
                            Promise.all([
                              helper.insertFailedLogsSMS(log_data),
                              updateMerchants({
                                message: log_data.message,
                                sms_sent: log_data.sms_segment,
                                merchant_id: merchant_customer_info.merchant_id
                              })
                            ]).then(
                              function (success) {
                                resolve(success);
                              },
                              function (fail) {
                                reject(fail);
                              }
                            );
                          }
                        }
                      }
                    );
                  } /////

                }
              },
              function (err) {
                reject(err);
              }
            );
            // new code

          });
      }
    } else {
      if (
        merchant_customer_info.email_limit === 0 ||
        merchant_customer_info.email_limit_perUser === 0
      ) {
        reject("Email sent Limit already reached.");
      } else {
        helper
          .getMerchantSMSCount(
            merchant_customer_info.merchant_id,
            "monthly",
            type
          )
          .then(
            function (emails_sent) {
              if (merchant_customer_info.email_limit <= emails_sent) {
                reject("Email sent Limit already reached.");
              } else {
                getMerchantCustomerSMSCount(
                  merchant_customer_info.merchant_id,
                  merchant_customer_info.phoneNumber,
                  "monthly",
                  type
                ).then(
                  function (consumed_count) {
                    if (
                      consumed_count.consume >=
                      merchant_customer_info.email_limit_perUser
                    ) {
                      return resolve(
                        "Email sent limit against this customer already reached."
                      );
                    } else {
                      tap_sendEmailController.sendEmail(
                        {
                          emails: merchant_customer_info.emails,
                          message: message,
                          timestamp: today,
                          subject: offer_detail.Data
                        },
                        function (error, sendsms) {
                          if (sendsms.statusCode == 200) {
                            var log_data = {
                              timestamp: parseInt(today),
                              merchant_id: merchant_customer_info.merchant_id,
                              customer_phone:
                                merchant_customer_info.phoneNumber,
                              subject: offer_detail.Data,
                              message: message
                            };
                            Promise.all([
                              insertLogsSMS_Email(type, log_data),
                              updateMerchants({
                                message: message,
                                email_sent: 1,
                                merchant_id: merchant_customer_info.merchant_id
                              })
                            ]).then(
                              function (success) {
                                resolve(success);
                              },
                              function (fail) {
                                reject(fail);
                              }
                            );
                          } else {
                            reject(sendsms);
                          }
                        }
                      );
                      //resolve(consumed_count.consume);
                    }
                  },
                  function (err) {
                    reject(err);
                  }
                );
              }
            },
            function (err) {
              reject(err);
            }
          );
      }
    }
  });
}
/**
 * Get merchant SMS count
 * @param {*} merchant_id
 * @param {*} customer_phone
 * @param {*} filter_by
 * @param {*} type
 */
function getMerchantCustomerSMSCount(
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
          " WHERE merchant_id = :merchant_id AND customer_phone = :customer_phone AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
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
          " WHERE merchant_id = :merchant_id AND customer_phone = :customer_phone AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
        break;
      case "quarterly":
        var today = new Date(),
          quarter = Math.floor(today.getMonth() / 3),
          firstday,
          lastday;
        firstday = new Date(today.getFullYear(), quarter * 3, 1);
        lastday = new Date(firstday.getFullYear(), firstday.getMonth() + 3, 0);
        firstday.setHours(0, 0, 0, 0);
        lastday.setHours(23, 59, 59, 999);
        timestampStart = timestamp.fromDate(firstday.toUTCString());
        timestampEnd = timestamp.fromDate(lastday.toUTCString());
        sql =
          "SELECT COUNT(id) AS consume FROM " +
          tableName +
          " WHERE merchant_id = :merchant_id AND customer_phone = :customer_phone AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
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
          " WHERE merchant_id = :merchant_id AND customer_phone = :customer_phone AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
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
          " WHERE merchant_id = :merchant_id AND customer_phone = :customer_phone AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
        break;
    }
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
}

/**
 * Get merchant, customer details
 * @param {*} merchant_id
 * @param {*} customer_id
 */
function merchant_customers_detail(merchant_id, customer_id) {
  var query =
    "Select * from merchant_customers_view Where merchant_active='true' AND id = :customer_id AND merchant_id = :merchant_id";
  return new Promise(function (resolve, reject) {
    model.sequelize
      .query(query, {
        replacements: {
          customer_id: customer_id,
          merchant_id: merchant_id
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function (rows) {
        if (rows.length > 0) {
          model.tap_merchants
            .findAll({
              attributes: [`nick_name`, "sms_unlimited", "sms_sent", "email_limit", "email_limit_perUser"],
              where: {
                merchant_id: merchant_id
              }
            })
            .then(function (mrows) {
              if (mrows.length > 0) {
                rows[0].nick_name = mrows[0].nick_name;
                rows[0].sms_unlimited = mrows[0].sms_unlimited;
                rows[0].sms_sent = mrows[0].sms_sent;
                rows[0].email_limit = mrows[0].email_limit;
                rows[0].email_limit_perUser = mrows[0].email_limit_perUser;
                resolve(rows[0]);
              } else {
                reject("Sorry no Record found against given information.");
              }
            })
            .catch(function (err) {
              reject(err);
            });
          // resolve(rows[0]);
        } else {
          reject("Sorry no Record found against given information.");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * Get merchant offer details
 * @param {*} merchant_id
 * @param {*} offer_type
 * @param {*} offer_id
 */
function merchant_offer_detail(merchant_id, offer_type, offer_id) {
  var today = Math.floor(Date.now() / 1000);
  var query =
    "Select * from tap_merchant_offers Where active='true'  AND start_date<=:today AND Discount_Type=:offer_type AND MerchantId=:merchant_id";
  if (offer_id !== "") query += " AND id=:offer_id";
  return new Promise(function (resolve, reject) {
    model.sequelize
      .query(query, {
        replacements: {
          today: today,
          offer_type: offer_type,
          merchant_id: merchant_id,
          offer_id: offer_id
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function (rows) {
        if (rows.length > 0) {
          resolve(rows[0]);
        } else {
          reject("Sorry no Record found against given offer.");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * Insert Coupon
 * @param {*} coupon_data
 */
function insertCoupon(coupon_data) {
  return new Promise(function (resolve, reject) {
    model.tap_coupons.create(coupon_data).then(
      data => {
        resolve(data.id);
      },
      function (err) {
        reject(err);
      }
    );
  });
}
/**
 * Insert SMS, Email log
 * @param {*} type
 * @param {*} log_data
 */
function insertLogsSMS_Email(type, log_data) {
  // var message = log_data.message;
  return new Promise(function (resolve, reject) {
    // shorturl(message).then(function (mesgseg) {
    var table = "tap_sent_emails";
    // log_data.message = mesgseg.message;
    if (type == "sms") {
      table = "tap_sent_sms";

      // log_data.sms_segment = mesgseg.segment;
      model.tap_sent_sms.create(log_data).then(
        result => {
          resolve(result);
        },
        function (err) {
          reject(err);
        }
      );
    } else {
      model.tap_sent_emails.create(log_data).then(
        result => {
          resolve(result);
        },
        function (err) {
          reject(err);
        }
      );
    }
  });
  // });
}

/**
 * making short url
 * @param {*} message
 */
function shorturl(message) {
  var mesgseg = {};
  return new Promise(function (resolve, reject) {
    var info = splitter.split(message);
    var segment = info.parts.length;
    mesgseg.message = message;
    mesgseg.segment = segment;
    resolve(mesgseg);
  });
}

/**
 * update the merchant limit of sms and email
 * @param {*} params
 */
function updateMerchants(params) {
  return new Promise(async function (resolve, reject) {
    var today = Math.floor(Date.now() / 1000);
    var getMerchantTrainingMode = await trainingMode.checkTrainingMode(params.merchant_id)
    var update_expression = "updated_at=:updated_at";
    if (params.sms_sent !== undefined && !getMerchantTrainingMode) {
      update_expression += ",sms_sent = sms_sent + " + params.sms_sent;
    }else if(params.sms_sent !== undefined && getMerchantTrainingMode){
      update_expression += ",sms_sent_training = sms_sent_training + " + params.sms_sent;
    }
    if (params.email_sent !== undefined) {
      update_expression += ",email_sent = email_sent + 1 ";
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
}
/**
 * Get timestamp for days
 * @param {*} days
 */
function gettimestampForDays(days) {
  days = parseInt(days);
  var d = new Date();
  if (Number.isInteger(days)) {
    d.setDate(d.getDate() + days);
    return Math.floor(d.getTime() / 1000);
  } else {
    return false;
  }
}

String.prototype.ucfirst = function () {
  return this.charAt(0).toUpperCase() + this.substr(1);
};
