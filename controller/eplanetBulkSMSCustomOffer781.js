//const tap_GenerateCouponBulk = require("../controller/tapGenerateBulkTesting.js");
var model = require("../model");
var moment = require('moment');
var fs = require('fs');
var helpher = require('./common/helper');
var textmessage = require("../language/textMessage");
var responseMsg = require("../language/resMessage");
// var custmerDetails = require('../customerDetails.js');
var createApiLogs = require("../controller/common/apiLoggerController");
var async = require("async");
var timestamp = require("unix-timestamp");
const uuidv4 = require('uuid/v4');
const getUrls = require("get-urls");
var https = require("https");
var to_json = require('xmljson').to_json;
var splitter = require('split-sms');
var config = require("../config/config");


//twilio crendetials for testing
// const accountSid = "ACc53796b0ce9a4abbee57f4c51b13d37e";
// const authToken = "2faaf46f058b127a02564313e78d40e9";
// const from = "+15005550006";
const accountSid = "ACbbfa5abc0f58bbb5a8a731df226e0a8f";
const authToken = "f2661610765efa06a6e5aea674150007";
const from = "71958";

//end twilio 
// const phone = req.body.phone;
const client = require("twilio")(accountSid, authToken);
const request = require('request');
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});
module.exports = {
    gettimestampForDays: function (days) {
        days = parseInt(days);
        var d = new Date();
        if (Number.isInteger(days)) {
            d.setDate(d.getDate() - days);
        } else {
            d.setDate(d.getDate() - 5);
        }
        return Math.floor(d.getTime() / 1000);
    },
    check_coupon_time: function (start_date, time, timezones, offer_id) {
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

        var givendate = moment.unix(start_date).format("YYYY-MM-DD");
        var selTime = moment(givendate + " " + time + ":00").unix();
        var currTime = moment.tz(zone).format("YYYY-MM-DD HH:mm:ss");
        var mainCurrTime = moment(currTime).unix();
        console.log(selTime + "<=" + mainCurrTime);
        if (selTime <= mainCurrTime) {
            console.log("true");
            return true;
        } else {
            console.log("false");
            return false;
        }
    },
    callCustomOffers: function () {
        return new Promise(function (resolve, reject) {
            // get all merchant offers 
            module.exports.getAllActiveCustomOffers().then(function (offers) {
                    // merchant wise offers loop itritaion 
                    async.forEachOf(offers, function (offerValue, key, callback) {
                        //loop for merchant offers and send below function filter customer details.
                        var generate_coupon = false;
                        if (
                            offerValue["time"] !== undefined &&
                            offerValue["time_zone"] !== undefined
                        ) {
                            generate_coupon = module.exports.check_coupon_time(
                                offerValue["start_date"],
                                offerValue["time"],
                                offerValue["time_zone"],
                                offerValue["offer_id"]
                            );
                        } else {
                            var curnttime = moment().unix();
                            generate_coupon = module.exports.check_coupon_time(
                                curnttime,
                                "12:00",
                                "UTC",
                                offerValue["offer_id"]
                            );
                        }
                        if (generate_coupon) {
                            module.exports.send_custome_coupon_to_customers(offerValue).then(function (customerDetails) {
                                // now message sent by by async await functionality by below loop
                                sendSmstoCustomerwithloop(customerDetails, offerValue).then(function (mesg) {
                                    model.tap_merchant_offers
                                        .update({
                                            is_sent: 1
                                        }, {
                                            where: {
                                                id: offerValue.id,
                                            }
                                        })
                                        .then(function (result) {
                                            console.log("update data for the merchant result : ", result);
                                            callback();
                                        })
                                        .catch(function (err) {
                                            console.log("update Error Message: ", err);
                                            createApiLogs.customOffersWrite('merchant offer sent SMS function error : ', err);
                                            callback();
                                        });
                                }, function (error) {
                                    createApiLogs.customOffersWrite('sendSmstoCustomerwithloop function error : ', error);
                                    callback();
                                });

                            }, function (error) {
                                createApiLogs.customOffersWrite('send_custome_coupon_to_customers response function error : ', error);
                                callback(error)
                            })
                        } else {
                            callback();
                        }

                    }, function (err) {

                        if (err) {
                            createApiLogs.customOffersWrite('Merchant offer forEachOF loop : ', err);
                            console.error(err.message);
                        }
                        console.log('merchant offer sent successfully');
                        resolve('done for merchant');

                    });
                },
                function (error) {
                    createApiLogs.customOffersWrite('Merchant offer not avalible.', error);
                    console.log('data complete');
                    reject(error);
                }
            );
        });
    },

    sentSms: (msgcontent, phone, log_data, prefContactMethod, emails, customerconsumeSms, merchantCustomerlimit, PuertoRico) => {
        var today = moment().unix();
        return new Promise(function (resolve, reject) {
            if (customerconsumeSms < merchantCustomerlimit) {
                console.log('if conditions', customerconsumeSms);
                sendSMSwithCheck(phone, PuertoRico).then(function (PuertoRico) {
                    if (PuertoRico) {
                        PuertoRicoSMS(msgcontent, phone, log_data).then(function (sentSsms) {
                            var queryparam = {
                                query: {
                                    "timestamp": today,
                                    "customer_phone": phone,
                                    "merchant_id": log_data.merchant_id,
                                    "message": log_data.message,
                                    "subject": log_data.subject,
                                    "sms_segment": log_data.sms_segment,
                                    "price": log_data.price,
                                    "type": "SMS",
                                    "numMedia": log_data.numMedia,
                                    "res_data": JSON.stringify(sentSsms)
                                },
                                prefContactMethod: prefContactMethod,
                                emails: emails
                            };
                            resolve(queryparam);
                        }, function (error) {
                            console.log('merchant offer sent successfully');
                            createApiLogs.customOffersWrite('PuertoRicoSMS Poryico SMS check', error);
                            resolve({});
                            //reject(error)
                        })
                    } else {
                        client.messages
                            .create(msgcontent)
                            .then(message => {
                                console.log(message);
                                createApiLogs.customOffersSentWrite(JSON.stringify(message));
                                log_data.message = message.body;
                                log_data.sms_segment = message.numSegments;
                                log_data.price = message.price;
                                log_data.numMedia = message.numMedia;
                                log_data.res_data = JSON.stringify(message)
                                var type = message.SmsType;
                                var queryparam = {
                                    query: {
                                        "timestamp": today,
                                        "customer_phone": phone,
                                        "merchant_id": log_data.merchant_id,
                                        "message": log_data.message,
                                        "subject": log_data.subject,
                                        "sms_segment": log_data.sms_segment,
                                        "price": log_data.price,
                                        "type": message.SmsType,
                                        "numMedia": log_data.numMedia,
                                        "res_data": log_data.res_data
                                    },
                                    prefContactMethod: prefContactMethod,
                                    emails: emails
                                };
                                resolve(queryparam);
                            })
                            .catch(function (err) {
                                console.log('Error Message', err);
                                createApiLogs.customOffersWrite(`Unbale to send SMS from twilio:`, err);
                                resolve({});
                            });
                    }
                }, function (error) {
                    console.log('Error Message', error);
                    createApiLogs.customOffersWrite(`Send SMS error to check sendSMSwithCheck  function:`, error);
                    var queryparam = {}
                    resolve(queryparam);
                });
            } else {
                createApiLogs.customOffersWrite(`Customer have not left message for this month :`, customerconsumeSms + '<' + merchantCustomerlimit);
                var queryparam = {}
                resolve(queryparam);
            }
        });
    },
    emailsending: (queryparam) => {
        return new Promise(function (resolve, reject) {
            resolve(queryparam);
        }, function (error) {
            createApiLogs.customOffersWrite(' Wehen send Email got error', error);
            resolve(error);
        });
    },
    sendBulkSMS: (message, phone, log_data, prefContactMethod, emails, customerconsumeSms, merchantCustomerlimit, PuertoRico) => {

        var msgcontent = {
            body: message,
            from: from,
            to: phone
        };
        return new Promise(function (resolve, reject) {
            var today = moment().unix();
            //below for both sms 
            if (prefContactMethod == 0) {
                console.log('insert in sent sms', typeof prefContactMethod);
                module.exports.sentSms(msgcontent, phone, log_data, prefContactMethod, emails, customerconsumeSms, merchantCustomerlimit, PuertoRico).then(function (msgdata) {
                    resolve(msgdata);
                }, function (error) {
                    createApiLogs.customOffersWrite(`When prefContactMethod is 0  `, error);
                    resolve({});
                })
                //below for both email 
            } else if (prefContactMethod == 1) {
                var queryparam = {
                    query: {
                        "timestamp": today,
                        "merchant_id": log_data.merchant_id,
                        "customer_phone": phone,
                        "from": 'admin@tapclover.com',
                        "message": log_data.message,
                        "subject": log_data.subject,
                        "to": emails,
                        "sms_segment": 1,
                    },
                    prefContactMethod: prefContactMethod,
                    emails: emails
                };
                module.exports.emailsending(queryparam).then(function (sentEmail) {
                    resolve(sentEmail);
                }, function (error) {
                    createApiLogs.customOffersWrite(`When prefContactMethod is 1  `, error);
                    resolve({});
                })
                //below for both sms and email 
            } else if (prefContactMethod == 2) {
                var queryparameboth = {
                    queryemail: {
                        "timestamp": today,
                        "merchant_id": log_data.merchant_id,
                        "customer_phone": phone,
                        "from": 'admin@tapclover.com',
                        "message": log_data.message,
                        "subject": log_data.subject,
                        "to": emails,
                        "sms_segment": 1,
                    },
                    prefContactMethod: prefContactMethod,
                    emails: emails
                };
                Promise.all([module.exports.sentSms(msgcontent, phone, log_data, prefContactMethod, emails, customerconsumeSms, merchantCustomerlimit, PuertoRico), module.exports.emailsending(queryparameboth.queryemail)]).then(function (values) {

                    queryparameboth.querySms = values[0].query;
                    queryparameboth.queryemail = values[1];
                    resolve(queryparameboth);
                }, function (error) {
                    createApiLogs.customOffersWrite(`When prefContactMethod is 2  `, error);
                    resolve({})
                    // reject(error);
                });
            }

        })
    },
    getAllActiveCustomOffers: () => {
        var today = Math.floor(Date.now() / 1000);
        return new Promise(function (resolve, reject) {
            var queryComeBackOffers =
                `SELECT mo.expires, mo.MerchantId, mer.nick_name, mo.id, mo.reward_text, mo.reward_text_media_image, mo.reward_text_message_type,
                    mo.spanish_reward_text_message_type, mo.spanish_reward_text_media_image,
                    mer.taptext_status, mo.id as offer_id, mo.Discount_Type, mo.time, mo.time_zone,
                    mer.merchant_id, mo.bd_start_date, mo.bd_end_date, mo.amount_spent, mo.amount_spent_sign,
                    mo.days_optin, mo.customer_name, mo.unfinished_profile, mo.randomly_customers_per,
                    mo.customer_type, mo.zipcode, mo.start_date, mo.last_visited, mo.coupons_available,
                    mer.sms_limit, mer.sms_limit_perUser, mer.sms_sent
                FROM tap_merchant_offers as mo
                Inner Join tap_merchants as mer on mo.MerchantId = mer.merchant_id
                WHERE Discount_Type = '3'
                AND(mo.active = 'true') AND mer.active = 'true'
                AND mer.taptext_status = 'true'
                AND mo.start_date <= :start_date AND mo.id = 781
                AND mo.min_to_earn = '0'`;
            model.sequelize
                .query(queryComeBackOffers, {
                    replacements: {
                        start_date: today
                    },
                    type: model.sequelize.QueryTypes.SELECT
                })
                .then(function (rows) {
                    if (rows.length > 0) {
                        resolve(rows);
                    } else {
                        reject("no Record");
                    }
                })
                .catch(function (err) {
                    // console.log(err);
                    createApiLogs.customOffersWrite(`query error when fetch getAllActiveCustomOffers offers  `, err);
                    reject(err);
                });
        });
    },
    send_custome_coupon_to_customers: (offer) => {

        //consume SMS number 
        var tmpDate = new Date();
        var y = tmpDate.getFullYear();
        var m = tmpDate.getMonth();
        var firstDay = new Date(y, m, 1);
        var lastDay = new Date(y, m + 1, 0);
        lastDay.setHours(23, 59, 59, 999);
        firstDay.setHours(0, 0, 0, 0);
        timestampStart = timestamp.fromDate(firstDay.toUTCString());
        timestampEnd = timestamp.fromDate(lastDay.toUTCString());



        var consumeSMSWithJoin = `(SELECT COALESCE(SUM(sms_segment),0) AS consume FROM tap_sent_sms WHERE merchant_id = cm.merchant_id AND customer_phone = cm.customer_phone AND timestamp >= ${
                                                timestampStart
                                            }
                                            AND timestamp <= ${
                                                timestampEnd
                                            }
                                            GROUP BY merchant_id) as customeConsume, `;
        var consumeSMS = `(SELECT COALESCE(SUM(sms_segment),0) AS consume FROM tap_sent_sms WHERE merchant_id = merchant_id AND customer_phone = customer_phone AND timestamp >= ${
                                                timestampStart
                                            }
                                            AND timestamp <= ${
                                                timestampEnd
                                            }
                                            GROUP BY merchant_id) as customeConsume, `;

        // Consume SMS number end

        var sql,
            sql_count = "";
        return new Promise(function (resolve, reject) {
            if (offer["customer_name"] !== null && offer["customer_name"] !== "") {
                sql =
                    "Select " + consumeSMSWithJoin + "  cm.customer_id,cm.customer_phone,cm.merchant_id, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.merchant_id=:merchant_id AND CONCAT(cm.firstName, ' ', cm.lastName)  LIKE :customer_name_like"; //'%' + offer['customer_name'] + '%'
            } else if (
                offer["last_visited"] !== null &&
                offer["last_visited"] != 0 &&
                offer["last_visited"] !== ""
            ) {
                sql =
                    "Select " + consumeSMS + " customer_id,customer_phone,merchant_id, prefContactMethod,emails from tap_customers_merchant Where optin='1' AND merchant_id=:merchant_id AND  last_visit_at >=:timestamp_last_visit "; //gettimestampForDays(offer['last_visited']
            } else if (
                offer["customer_type"] !== null &&
                offer["customer_type"] !== "normal" &&
                offer["customer_type"] !== ""
            ) {
                sql =
                    "Select " + consumeSMS + " customer_id,customer_phone,merchant_id, prefContactMethod,cm.emails from tap_customers_merchant Where optin='1' AND merchant_id=:merchant_id  AND type=:customer_type"; //offer['customer_type']
            } else if (
                offer["randomly_customers_per"] !== null &&
                offer["randomly_customers_per"] !== "" &&
                offer["randomly_customers_per"] != 0
            ) {
                sql_count =
                    "Select count(*) as total from tap_customers_merchant Where optin='1' AND  merchant_id=:merchant_id"; // + mysql.escape(offer.merchant_id);
                //limit=parseInt(ceil(((count/100)*offer['randomly_customers_per'])))
                sql =
                    "Select " + consumeSMSWithJoin + "  cm.customer_id,cm.customer_phone,cm.merchant_id, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm Where cm.optin='1' AND cm.merchant_id=:merchant_id and cm.customer_id NOT IN (5644,6850,7564,4164,8612,6858,11453,3413,3408,7276,10900,4228,4183,10554,3445,4693,4821,4614,5337,3703,3495,7142,8179,3468,3441,6139,5110,8685,7740,9813,13616,4360,7224,10392,4437,3394,13719,13484,11629,6045,12840,14573,7590,5663,14437,12988,11880,9432,2958,8760,6914,6863,8806,11478,12809,4263,12207,10391,3437,3443,3606,4431,11087,3586,14342,14024,12165,9618,3537,3016,7773,4774,10637,6326,11761,9343,5576,11264,3433,6416,3494,8012,4537,10504,3891,3147,5682,3675,7775,3424,6835,3667,7302,5651,3983,3810,12797,10385,9323,6103,9642,6097,8906,11798,6323,5587,4834,5284,4501,4415,4870,3331,7475,3141,4227,5082,11973,3144,8044,10795,8087,10662,12439,11441,9260,3899,8869,5798,3283,3635,3375,12059,8577,14196,5300,3874,3041,5642,13518,7741,7758,8978,6676,10328,8507,4191,4142,10483,10402,5597,4169,3573,3154,6473,13761,5573,7842,4526,8039,4270,11280,12020,7060,9810,6673,7228,11250,9875,8163,4374,6733,3834,9738,4063,14375,8166,6780,5975,10413,3123,7567,13317,13541,12315,12216,5973,9741,8072,7549,13000,10699,9362,3205,4557,3981,3421,4148,8779,12536,8194,4326,7147,10398,11515,3550,13354,7769,11787) Order By RAND() Limit 10";

            } else if (offer["zipcode"] !== null && offer["zipcode"] !== "") {
                sql =
                    "Select " + consumeSMSWithJoin + "  cm.customer_id,cm.customer_phone,cm.merchant_id, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.merchant_id=:merchant_id AND cm.zip IN (:zip)"; //('" + JSON.parse(offer['zipcode']).join("','") + "')";
            } else if (
                offer["days_optin"] !== null &&
                offer["days_optin"] !== "" &&
                offer["days_optin"] != 0
            ) {
                sql =
                    "Select " + consumeSMS + " customer_id,customer_phone,merchant_id, prefContactMethod,emails from tap_customers_merchant Where optin='1' AND merchant_id=:merchant_id AND optin_at>=:days_optin"; // + mysql.escape(offer['days_optin']);
            } else if (
                offer["coupons_available"] !== null &&
                offer["coupons_available"] !== "" &&
                offer["coupons_available"] != 0
            ) {
                sql =
                    "Select " + consumeSMSWithJoin + "  cm.customer_id,cm.merchant_id,cm.customer_phone,Count(cm.id) as total_coupon, cm.prefContactMethod,cm.emails  from tap_customers_merchant as cm Inner Join  tap_coupons as c ON (cm.customer_id=c.customer_id AND cm.merchant_id=c.merchant_id)   LEFT JOIN tap_coupons_used as cu ON c.id=cu.coupon_id Where cu.coupon_id IS  NULL AND cm.merchant_id=:merchant_id AND cm.optin='1'  Group BY cm.customer_id,cm.merchant_id";
                if (offer["coupons_available"] == "1") {
                    sql += "  Having Count(cm.id)>=1 and Count(cm.id)<=5";
                } else if (offer["coupons_available"] == "2") {
                    sql += "  Having Count(cm.id)>=6 and Count(cm.id)<=10";
                } else if (offer["coupons_available"] == "3") {
                    sql += "  Having Count(cm.id)>10";
                }
            } else if (
                offer["amount_spent"] !== null &&
                offer["amount_spent"] !== "" &&
                offer["amount_spent"] != 0 &&
                offer["amount_spent_sign"] !== null &&
                offer["amount_spent_sign"] !== ""
            ) {
                sql =
                    "Select " + consumeSMSWithJoin + "  cm.customer_id,cm.customer_phone,cm.merchant_id,sum(co.saleAmount) as total_spent, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where cm.merchant_id=:merchant_id group by customer_id,merchant_id";
                if (offer["amount_spent_sign"] == "less") {
                    sql += "  Having sum(co.saleAmount)<:amount_spent"; // + mysql.escape(offer['amount_spent']);
                } else if (offer["amount_spent_sign"] == "greater") {
                    sql += "  Having sum(co.saleAmount)>:amount_spent"; // + mysql.escape(offer['amount_spent']);
                } else if (offer["amount_spent_sign"] == "equal") {
                    sql += "  Having sum(co.saleAmount)=:amount_spent"; // + mysql.escape(offer['amount_spent']);
                }
            } else if (
                offer["bd_start_date"] !== null &&
                offer["bd_start_date"] !== "" &&
                offer["bd_start_date"] != 0 &&
                offer["bd_end_date"] !== null &&
                offer["bd_end_date"] !== "" &&
                offer["bd_end_date"] != 0
            ) {
                //mysql.escape(offer['bd_start_date'])
                sql =
                    "Select " + consumeSMSWithJoin + "  cm.customer_id,cm.merchant_id,cm.customer_phone, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where co.created_at>=:bd_start_date AND co.created_at<=:bd_end_date AND cm.merchant_id=:merchant_id AND cm.optin='1' group by co.customer_id,co.merchant_id";
                //sql="Select cm.customer_id,cm.merchant_id,sum(co.saleAmount) as total_sepnt from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where merchant_id="+mysql.escape(offer.merchant_id)+" group by cm.customer_id,cm.merchant_id Having sum(saleAmount)";
            } else if (
                offer["unfinished_profile"] !== null &&
                offer["unfinished_profile"] == 1
            ) {
                sql =
                    "Select " + consumeSMSWithJoin + " cm.customer_id,cm.customer_phone,cm.merchant_id, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.merchant_id=:merchant_id AND cm.profile_completed='0' group by cm.customer_id,cm.merchant_id";
            }
            if (sql_count !== "") {
                //for percentage of customers
                model.sequelize
                    .query(sql_count, {
                        replacements: {
                            merchant_id: offer.merchant_id
                        },
                        type: model.sequelize.QueryTypes.SELECT
                    })
                    .then(function (rows) {
                        if (rows.length > 0) {
                            var total = rows[0].total;
                            var limit = Math.floor(
                                (total / 100) * offer["randomly_customers_per"]
                            );
                            sql =
                                "Select " + consumeSMSWithJoin + " cm.customer_id,cm.customer_phone,cm.merchant_id, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm Where cm.optin='1' AND cm.merchant_id=:merchant_id AND cm.customer_id NOT IN(5644,6850,7564,4164,8612,6858,11453,3413,3408,7276,10900,4228,4183,10554,3445,4693,4821,4614,5337,3703,3495,7142,8179,3468,3441,6139,5110,8685,7740,9813,13616,4360,7224,10392,4437,3394,13719,13484,11629,6045,12840,14573,7590,5663,14437,12988,11880,9432,2958,8760,6914,6863,8806,11478,12809,4263,12207,10391,3437,3443,3606,4431,11087,3586,14342,14024,12165,9618,3537,3016,7773,4774,10637,6326,11761,9343,5576,11264,3433,6416,3494,8012,4537,10504,3891,3147,5682,3675,7775,3424,6835,3667,7302,5651,3983,3810,12797,10385,9323,6103,9642,6097,8906,11798,6323,5587,4834,5284,4501,4415,4870,3331,7475,3141,4227,5082,11973,3144,8044,10795,8087,10662,12439,11441,9260,3899,8869,5798,3283,3635,3375,12059,8577,14196,5300,3874,3041,5642,13518,7741,7758,8978,6676,10328,8507,4191,4142,10483,10402,5597,4169,3573,3154,6473,13761,5573,7842,4526,8039,4270,11280,12020,7060,9810,6673,7228,11250,9875,8163,4374,6733,3834,9738,4063,14375,8166,6780,5975,10413,3123,7567,13317,13541,12315,12216,5973,9741,8072,7549,13000,10699,9362,3205,4557,3981,3421,4148,8779,12536,8194,4326,7147,10398,11515,3550,13354,7769,11787) Order By RAND() Limit " +
                                limit;
                            model.sequelize
                                .query(sql, {
                                    replacements: {
                                        merchant_id: '374174960889',
                                        customer_name_like: "%" + offer["customer_name"] + "%",
                                        timestamp_last_visit: module.exports.gettimestampForDays(
                                            offer["last_visited"]
                                        ),
                                        customer_type: offer["customer_type"],
                                        zip: offer["zipcode"] == null || offer["zipcode"] == "" ?
                                            offer["zipcode"] : JSON.parse(offer["zipcode"]).join("','"), //JSON.parse(offer['zipcode']).join("','"),
                                        days_optin: offer["days_optin"],
                                        amount_spent: offer["amount_spent"],
                                        bd_start_date: offer["bd_start_date"],
                                        bd_end_date: offer["bd_end_date"]
                                    },
                                    type: model.sequelize.QueryTypes.SELECT
                                })
                                .then(function (customers) {
                                    // customers = custmerDetails.customerdata;
                                    resolve(customers);
                                })
                                .catch(function (err) {
                                    createApiLogs.customOffersWrite(`fetch customer for merchant :`, err);
                                    resolve({});
                                });
                        } else {
                            resolve("No customer found against merchant");
                        }
                    })
                    .catch(function (err) {
                        createApiLogs.customOffersWrite(`sql error when we get data from merchant data `, err);
                        resolve({});
                    });
            } else {
                //for remaining filters
                model.sequelize
                    .query(sql, {
                        replacements: {
                            merchant_id: offer.merchant_id,
                            customer_name_like: "%" + offer["customer_name"] + "%",
                            timestamp_last_visit: module.exports.gettimestampForDays(
                                offer["last_visited"]
                            ),
                            customer_type: offer["customer_type"],
                            zip: offer["zipcode"] == null || offer["zipcode"] == "" ?
                                offer["zipcode"] : JSON.parse(offer["zipcode"]).join("','"),
                            days_optin: offer["days_optin"],
                            amount_spent: offer["amount_spent"],
                            bd_start_date: offer["bd_start_date"],
                            bd_end_date: offer["bd_end_date"]
                        },
                        type: model.sequelize.QueryTypes.SELECT
                    })
                    .then(function (customers) {
                        // customers = custmerDetails.customerdata;
                        // console.log('All Customer', customers);
                        resolve(customers);
                    })
                    .catch(function (err) {
                        createApiLogs.customOffersWrite(`sql error when we get data from merchant data other than 100`, err);
                        resolve({});
                    });
            }
        });
    },
}


function saveEmailData(data) {
    return new Promise((resolve, reject) => {
        model.tap_sent_emails
            .bulkCreate(data)
            .then(function (issendSMSstored) {
                insertValues = [];
                couponsCreated = [];
                insertValuesEmail = [];
                resolve('ok');
            })
            .catch(function (err) {
                createApiLogs.customOffersWrite(`SQL Error happen when saveEmailData function `, err);
                reject(err);
            });
    });
}

function updatemerchantsmsdata(merchantsms, merchant_id) {
    return new Promise((resolve, reject) => {
        var rawquery = `UPDATE tap_merchants SET sms_sent =  sms_sent+ ${merchantsms}  WHERE merchant_id = '${merchant_id}'`;

        model.sequelize.query(rawquery).spread((results, metadata) => {
            resolve(metadata);
            // Results will be an empty array and metadata will contain the number of affected rows.
        }).catch(function (err) {
            createApiLogs.customOffersWrite(`get error when update tap_merchant table sms_sent`, err, data);
            console.log(err);
            reject(err);
        });
    });
}

function savesentSms(data) {
    return new Promise((resolve, reject) => {
        createApiLogs.customOffersWrite(`before save data for bulkSMS`, '', JSON.stringify(data));
        model.tap_sent_sms
            .bulkCreate(data)
            .then(function (issendSMSstored) {
                resolve('ok');
            })
            .catch(function (err) {
                createApiLogs.customOffersWrite(`before save data for bulkSMS `, err, JSON.stringify(data));
                reject(err);
            });
    })
}

function sendSmstoCustomer(start, end, customerDetails, offerValue) {
    return new Promise((resolve, reject) => {
        var insertValues = [];
        var couponsCreated = [];
        var insertValuesEmail = [];
        var incrementLoop = start;
        var merchantUsesms = 0;
        for (var i = start; i <= end; i++) {
            if (customerDetails[i].customer_phone != undefined) {
                var coupon_uuid = uuidv4();
                generateCustomersCoupon(coupon_uuid, customerDetails[i].customer_id, customerDetails[i].merchant_id, offerValue, customerDetails[i].customer_phone.toString(), customerDetails[i].prefContactMethod, customerDetails[i].emails, customerDetails[i].customeConsume).then(function (created_coupon_info) {

                        var customerPhone = created_coupon_info.customerPhone;
                        var phonenumber = created_coupon_info.customerPhone;
                        var PuertoRico = helpher.PuertoRico(phonenumber);
                        var message = textmessage.giveCoupon.english;
                        if (PuertoRico) {
                            message = textmessage.giveCoupon.spanish;
                        }

                        message = message.replace("%COUPON_ID%", created_coupon_info.coupon_uuid);

                        message = message.replace(
                            "%DBA%",
                            offerValue !== null ?
                            offerValue.nick_name :
                            ""
                        );
                        message = message.replace(
                            "%REWARD_TEXT%",
                            offerValue.reward_text !== null ?
                            decodeHTMLEntities(offerValue.reward_text) :
                            ""
                        );
                        message = message.replace(
                            "%SPANISH_REWARD_TEXT%",
                            offerValue.reward_text !== null ?
                            decodeHTMLEntities(offerValue.reward_text) :
                            ""
                        );
                        shorturl(message).then(function (message) {
                            var info = splitter.split(message);
                            var messagesegment = info.parts.length;
                            var log_data = {
                                timestamp: moment().unix(),
                                merchant_id: created_coupon_info.merchant_id,
                                customer_phone: customerPhone,
                                subject: 'Custom offer',
                                message: message,
                                sms_segment: messagesegment,
                                price: null,
                                type: 'SMS',
                                numMedia: null,
                                res_data: ''
                            };
                            var insertmesage = '';
                            // console.log(created_coupon_info);
                            //write here conodition for merchant consume sms and merchant customer consume SMS
                            module.exports.sendBulkSMS(message, customerPhone, log_data, created_coupon_info.prefContactMethod, created_coupon_info.emails, created_coupon_info.customeConsume, created_coupon_info.merchantcustomerlimit, PuertoRico).then(function (resultsdata) {

                                    if (resultsdata.prefContactMethod == 0) {
                                        if (resultsdata.query !== undefined) {
                                            merchantUsesms = parseInt(merchantUsesms) + parseInt(resultsdata.query.sms_segment);
                                            insertValues.push(resultsdata.query);
                                        }
                                    }
                                    if (resultsdata.prefContactMethod == 1) {
                                        if (resultsdata.query !== undefined) {
                                            insertValuesEmail.push(resultsdata.query);
                                        }

                                    }
                                    if (resultsdata.prefContactMethod == 2) {
                                        if (resultsdata.querySms !== undefined) {
                                            merchantUsesms = parseInt(merchantUsesms) + parseInt(resultsdata.querySms.sms_segment);
                                            console.log('sms count 343434------------------------------------------------------------------- \n', merchantUsesms);
                                            insertValues.push(resultsdata.querySms);
                                        }
                                        if (resultsdata.queryemail !== undefined) {
                                            insertValuesEmail.push(resultsdata.queryemail);
                                        }
                                    }

                                    couponsCreated.push(created_coupon_info);

                                    insertmesage += resultsdata.query;
                                    console.log(incrementLoop + '-------------SMS Loop outside--------------------------------------' + end);
                                    if (incrementLoop === end) {
                                        console.log(incrementLoop + '-------------SMS Loop Enter--------------------------------------' + end);
                                        incrementLoop++;
                                        createApiLogs.customOffersWrite(` befor creating data for bulkCreate coupon `, '', JSON.stringify(couponsCreated));
                                        //creating BULK coupon....
                                        model.tap_coupons.bulkCreate(couponsCreated)
                                            .then(function (isCouponcreated) {
                                                //storing SMS send info into database...
                                                Promise.all([savesentSms(insertValues), saveEmailData(insertValuesEmail), updatemerchantsmsdata(merchantUsesms, log_data.merchant_id)]).then(function (values) {

                                                    insertValues = [];
                                                    couponsCreated = [];
                                                    insertValuesEmail = [];
                                                    resolve(true);
                                                }, function (error) {
                                                    console.log('Error message :\n', error);
                                                    createApiLogs.customOffersWrite(`error when savesentSms/saveEmailData/updatemerchantsmsdata function call `, error);
                                                    reject(error);
                                                });
                                            })
                                            .catch(function (err) {
                                                createApiLogs.customOffersWrite(`sql error when create coupopnj  function call `, error);
                                                reject(err);
                                            });
                                        //  write here insert query for every 100 merchant
                                    } else {
                                        incrementLoop++;
                                        resolve('ok')
                                    }

                                },
                                function (error) {
                                    createApiLogs.customOffersWrite(`when sent sendBulkSMS get rejected`, error);
                                    incrementLoop++;
                                    resolve('ok error')
                                })
                        }, function (error) {
                            createApiLogs.customOffersWrite(`shorturl function promise error  `, error);
                            console.log(error);
                            incrementLoop++;
                            resolve('ok error')
                        })
                        //end here if condition and else condition resolve with any data.
                    },
                    function (error) {
                        createApiLogs.customOffersWrite(`When generateCustomersCoupon  created :`, error);
                        incrementLoop++;
                        resolve('ok error')
                    });

            } else {
                createApiLogs.customOffersWrite(' Number get undefined in function sendSmstoCustomer: ', customerDetails[i].customer_phone, JSON.stringify(customerDetails[i]));
                incrementLoop++
            }

        }

    });
}

function generateCustomersCoupon(coupon_uuid, customer_id, merchant_id, offer_info, customerPhone, prefContactMethod, emails, customeConsume) {

    return new Promise((resolve, reject) => {
        var coupon_detail = {
            customer_id: customer_id,
            merchant_id: merchant_id,
            offerid: offer_info.id,
            offer_type: offer_info.Discount_Type,
            created_at: Math.floor(Date.now() / 1000),
            expires: offer_info.expires,
            coupon_uuid: coupon_uuid,
            customerPhone: customerPhone,
            prefContactMethod: prefContactMethod,
            emails: emails,
            customeConsume: customeConsume,
            merchantcustomerlimit: offer_info.sms_limit_perUser
        };
        if (offer_info.expires != "0") {
            var expires = gettimestampForDays(offer_info.expires);
            if (expires) {
                coupon_detail.expires = expires;
            }
        }
        resolve(coupon_detail);
    });
}

async function sendSmstoCustomerwithloop(customerDetails, offerValue) {
    var total = customerDetails.length;
    var divisibleLength = 100;
    var divison = Math.floor((total) / divisibleLength);
    if (total > 0) {
        try {
            if (divison > 0) {
                for (var i = 0; i <= divison; i++) {
                    if (i == (divison)) {
                        await sendSmstoCustomer((i * divisibleLength), (total - 1), customerDetails, offerValue);
                    } else {
                        await sendSmstoCustomer((i * divisibleLength), (((i + 1) * divisibleLength) - 1), customerDetails, offerValue);
                    }
                }

            } else {
                await sendSmstoCustomer(0, (total - 1), customerDetails, offerValue)
            }
            return 'ok';
        } catch (error) {
            createApiLogs.customOffersWrite(' when catch error in function sendSmstoCustomerwithloop : ', error, data);
            return error;
        }
    } else {
        return 'ok';
    }


}
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

function PuertoRicoSMS(msgcontent, phone, log_data) {
    var message = log_data.message;
    return new Promise(function (resolve, reject) {
        var messageString =
            '<?xml version="1.0" encoding="ISO-8859-1"?><push-request><def-code>1019</def-code><password>b@nktech2017</password><application>71958</application><user>' +
            phone +
            "</user><text>" +
            message +
            "</text></push-request>";

        // Options and headers for the HTTP request
        var options = {
            host: "us3.dinama.com",
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
                        console.log(data);
                        resolve(data);
                    } else {
                        resolve(data);
                    }
                });
            });
        });

        // Handler for HTTP request errors.
        req.on("error", function (e) {
            console.log("Error Message :" + e);
            createApiLogs.customOffersWrite(`unbale to send message by mobisa`, e);
            resolve(e);
        });

        // Send the HTTP request to the dinama API.
        // Log the message we are sending to dinama.
        console.log("PuertoRicoSMS: " + messageString);
        req.write(messageString);
        req.end();
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
//short url making
function shorturl(message) {
    return new Promise(function (resolve, reject) {
        resolve(message);
        return false;
        var no_of_urls = 0;
        var all_ulrs = getUrls(message);
        all_ulrs.forEach(function (element) {
            no_of_urls++;
        }, this);

        var count_url_no = 0;
        all_ulrs.forEach(function (element) {
            if (
                element == config.app.TERMS_LINK.replace(/\/$/, "") ||
                element == config.app.TERMS_LINK
            ) {
                count_url_no++;
                message = message.replace(element, fortermlink);
                resolve(message);
            } else {
                request({
                        uri: "https://api.rebrandly.com/v1/links",
                        method: "POST",
                        body: JSON.stringify({
                            destination: element,
                            domain: {
                                fullName: "tpl.news"
                            }
                        }),
                        headers: {
                            "Content-Type": "application/json",
                            apikey: "4055fe0fd8704dfcb526f6e0222b82ed"
                        }
                    },
                    function (error, response, body) {
                        count_url_no++;
                        console.log(count_url_no);
                        var link = JSON.parse(body);
                        console.log("Link", link);
                        if (
                            link.destination == config.app.TERMS_LINK.replace(/\/$/, "")
                        ) {
                            message = message.replace(element, fortermlink);
                        }
                        message = message.replace(element, "https://" + link.shortUrl);
                        if (count_url_no == no_of_urls) {
                            resolve(message)
                        }
                    }
                );
            }
        }, this);
    });
}

function sendSMSwithCheck(to, PuertoRico) {
    return new Promise(function (resolve, reject) {
        if (!PuertoRico) {
            resolve(false)
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
                            if (
                                resData.carrier.type === "mobile"
                            ) {
                                if (
                                    resData.carrier.name === "CLARO Puerto Rico" ||
                                    resData.carrier.name ===
                                    "PR Wireless Inc dba Open Mobile - SVR/2"
                                ) {
                                    resolve(true);
                                } else {
                                    resolve(false)
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
                resolve(false);
            });
        }
    });
}