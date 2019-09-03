var model = require("../model");
var moment = require('moment');
var helpher = require('./common/helper');
// var custmerDetails = require('../customerDetails.js');
var textmessage = require("../language/textMessage");
var responseMsg = require("../language/resMessage");
var emailContent = require('../language/emailContent');
var createApiLogs = require("../controller/common/apiLoggerController");
var cronHelpers = require('../controller/cronsJobs/cronHelpers')
var trainingMode = require('../controller/common/checkTrainingMode')
const tierBillingScheduleInfo = require('../controller/tierBillingScheduleInfo');
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
const timeout = 1000;
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
                        console.log("offers" , offers)
                        var coupon_uuid = offerValue.offer_coupon_guid;
                        // var urlmessage = textmessage.CustomCouponURLs.urls;
                        let shortedurl = offerValue.coupon_short_url
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
                        console.log(generate_coupon)
                        if (generate_coupon) {
                            console.log("generate_coupon" , generate_coupon)
                            module.exports.send_custome_coupon_to_customers(offerValue).then(async function (customerDetails) {
                                // now message sent by by async await functionality by below loop
                                    insertCouponDatainTable(offerValue, customerDetails, coupon_uuid, shortedurl).then(function () {
                                        updateMerchantTable(offerValue).then(function (successTable) {
                                            sendSmstoCustomerwithloop(customerDetails, offerValue, coupon_uuid, shortedurl).then(function (mesg) {
                                                callback();
                                            }, function (error) {
                                                createApiLogs.customOffersWrite(`Error from sendSmstoCustomerwithloop function`, error);
                                                callback();
                                            });
                                        }, function (error) {
                                            callback(error)
                                        });
                                    }, function (error) {
                                        createApiLogs.customOffersWrite(`Error from send_custome_coupon_to_customers function`, error);
                                        callback(error)
                                    });
                            }, function (error) {
                                createApiLogs.customOffersWrite(`Error from send_custome_coupon_to_customers function`, error);
                                callback(error)
                            })
                        } else {
                            callback();
                        }

                    }, function (err) {
                        createApiLogs.customOffersWrite(`Error from async.forEachOf function`, err);
                        if (err) console.error(err.message);
                        resolve('done for merchant');

                    });
                },
                function (error) {
                    createApiLogs.customOffersWrite(`Error from getAllActiveCustomOffers function`, error);
                    reject(error);
                }
            );
        });
    },

    sentSms: (msgcontent, phone, log_data, prefContactMethod, emails, customerconsumeSms, merchantCustomerlimit, PuertoRico) => {
        return new Promise(async function (resolve, reject) {
            var today = moment().unix();
            var errorparam = {};
            errorparam.errormsg = {
                "offer_id": log_data.offer_id,
                "timestamp": today,
                "customer_phone": phone,
                "merchant_id": log_data.merchant_id,
                "message": log_data.message,
                "subject": log_data.subject,
            }
            // update the code and check the merchant limit
            console.log("customers, textmessage, merchant_customer_limit" , msgcontent, merchantCustomerlimit)
            var getMerchantInfo = await cronHelpers.getDba(log_data.merchant_id);
            var getSegmentsBeforeSending = await cronHelpers.getSegmentsForTextYourCustomers(msgcontent.body);
            var checkLeftMessages = getMerchantInfo.sms_limit - getMerchantInfo.sms_sent;
            var getMerchantTrainingMode = await trainingMode.checkTrainingMode(log_data.merchant_id);
            console.log("checkLeftMessages" ,checkLeftMessages)
            if(checkLeftMessages >= getSegmentsBeforeSending || (getMerchantInfo.sms_limit == 0 && getMerchantInfo.sms_unlimited == 1 || getMerchantTrainingMode)){
                if (customerconsumeSms < merchantCustomerlimit) {
                    sendSMSwithCheck(phone, PuertoRico).then(function (PuertoRico) {
                        if (PuertoRico) {
                            var puertoRicoLogData =  log_data;
                            PuertoRicoSMS(msgcontent, phone, puertoRicoLogData).then(async function (sentSsms) {
                                var queryparamPuertoRico = {
                                    query: {
                                        "offer_id": puertoRicoLogData.offer_id,
                                        "timestamp": today,
                                        "customer_phone": phone,
                                        "merchant_id": puertoRicoLogData.merchant_id,
                                        "message": puertoRicoLogData.message,
                                        "subject": puertoRicoLogData.subject,
                                        "sms_segment": puertoRicoLogData.sms_segment,
                                        "price": puertoRicoLogData.price,
                                        "type": "SMS",
                                        "numMedia": puertoRicoLogData.numMedia,
                                        "res_data": JSON.stringify(sentSsms)
                                    },
                                    prefContactMethod: prefContactMethod,
                                    emails: emails
                                };
                                if(getMerchantTrainingMode){
                                  // add training mode count
                                  var updateMerchantData = await updateMerchantSmsDataTraining(getSegmentsBeforeSending, log_data.merchant_id, 0)
                                  }else{
                                   var updateMerchantData = await updatemerchantsmsdata(getSegmentsBeforeSending, log_data.merchant_id, 0)
                                }
                                resolve(queryparamPuertoRico);
                            }, function (error) {
                                createApiLogs.customOffersWrite(`Error from PuertoRicoSMS function`, error);
                                reject(error);
                            })
                        } else {
                            client.messages
                                .create(msgcontent)
                                .then(async message => {
                                    // console.log(message);
                                    createApiLogs.customOffersWrite(`Create Message sent successfully: \n`);
                                    var queryparam = {
                                        query: {
                                            "offer_id": log_data.offer_id,
                                            "timestamp": today,
                                            "customer_phone": phone,
                                            "merchant_id": log_data.merchant_id,
                                            "message": message.body,
                                            "subject": log_data.subject,
                                            "sms_segment": message.numSegments,
                                            "price": message.price,
                                            "type": message.SmsType,
                                            "numMedia": message.numMedia,
                                            "res_data": JSON.stringify(message)
                                        },
                                        prefContactMethod: prefContactMethod,
                                        emails: emails
                                    };
                                    if(getMerchantTrainingMode){
                                        // add training mode count
                                         var updateMerchantData = await updateMerchantSmsDataTraining(getSegmentsBeforeSending, log_data.merchant_id, 0)
                                  
                                      }else{
                                         var updateMerchantData = await updatemerchantsmsdata(getSegmentsBeforeSending, log_data.merchant_id, 0)
                                      }
                                    resolve(queryparam);
                                })
                                .catch(async function (error) {
                                    // var sql2 = "UPDATE tap_merchants SET sms_sent = sms_sent + :value where merchant_id = :merchant_id";
                                    // var queryParam2 = {
                                    //     merchant_id: log_data.merchant_id,
                                    //     value: log_data.sms_segment
                                    // };
                                    // model.sequelize
                                    // .query(sql2, {
                                    //     replacements: queryParam2,
                                    //     type: model.sequelize.QueryTypes.UPDATE
                                    // }).then(function (data) {
                                    //     console.log('on fail count updated')
                                    // }).catch(function (err) {
                                    //     console.log('on error')
                                    // });
                                    if(getMerchantTrainingMode){
                                        // add training mode count
                                         var updateMerchantData = await updateMerchantSmsDataTraining(getSegmentsBeforeSending, log_data.merchant_id, 0)
                                  
                                      }else{
                                         var updateMerchantData = await updatemerchantsmsdata(getSegmentsBeforeSending, log_data.merchant_id, 0)
                                      }
                                    console.log(error);
                                    createApiLogs.customOffersWrite(`Create Message here: \n`, JSON.stringify(error));
                                    createApiLogs.customOffersWrite(`Unable to send sms by Twilio`, error);
                                    errorparam.errormsg.res_data = JSON.stringify(error);
                                    errorparam.prefContactMethod = prefContactMethod;
                                    errorparam.emails = emails;
                                    resolve(errorparam);
                                });
                        }
                    }, function (error) {
                        createApiLogs.customOffersWrite(`Error from sendSMSwithCheck`, error);
                        errorparam.errormsg.res_data = JSON.stringify(error);
                        errorparam.prefContactMethod = prefContactMethod;
                        errorparam.emails = emails;
                        resolve(errorparam);
                    });
                } else {
                    createApiLogs.customOffersWrite(`customer sms limit cross`);
                    errorparam.errormsg.res_data = 'SMS limit is not availble for this customer.';
                    errorparam.prefContactMethod = prefContactMethod;
                    errorparam.emails = emails;
                    resolve(errorparam);
                }
            }else{
                createApiLogs.customOffersWrite(`merchant sms limit crossed`);
                errorparam.errormsg.res_data = 'SMS limit is not availble for  merchant.';
                errorparam.prefContactMethod = prefContactMethod;
                errorparam.emails = emails;
                resolve(errorparam);
            }
        });
    },
    emailsending: (queryparam) => {
        return new Promise(function (resolve, reject) {
            resolve({});
            // let to = (queryparam.query == undefined) ? queryparam.to : queryparam.query.to;
            // let subject = (queryparam.query == undefined) ? queryparam.subject : queryparam.query.subject;
            // let message = (queryparam.query == undefined) ? queryparam.message : queryparam.query.message;

            // var body = emailContent.OPTIN_OFFER_MAIL.html;
            // body = body.replace('%BODY%', message);
            // body = body.replace('%SUBJECT%', subject);

            //     helpher.sendEmailFromSales(to, subject, body, attachment = null, fileName = null).then(function (emailsent) {
            //         console.log('in resolve', queryparam);
            //         resolve(queryparam);
            //     }, function (error) {
            //         console.log(error);
            //         createApiLogs.customOffersWrite(`unble to send email`, error);
            //         resolve(error);
            //     });
            // }, function (error) {
            //     resolve(error);
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
            if (prefContactMethod === 0) {
                module.exports.sentSms(msgcontent, phone, log_data, prefContactMethod, emails, customerconsumeSms, merchantCustomerlimit, PuertoRico).then(function (msgdata) {
                    resolve(msgdata);
                }, function (error) {
                    createApiLogs.customOffersWrite(`sendBulkSMS sentSms function error`, error);
                    reject(error);
                })
                //below for both email
            } else if (prefContactMethod === 1) {
                var queryparam = {
                    query: {
                        "offer_id": log_data.offer_id,
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
                    reject(error)
                })
                //below for both sms and email
            } else if (prefContactMethod === 2) {
                var queryparameboth = {
                    queryemail: {
                        "offer_id": log_data.offer_id,
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
                    queryparameboth.errormsg = values[0].errormsg;
                    queryparameboth.queryemail = values[1];
                    resolve(queryparameboth);
                }, function (error) {
                    console.log('Error', error);
                    createApiLogs.customOffersWrite(`Error from Promise.all function`, err);
                    reject(error);
                });

            }else{
                reject("neither selected in this case");
            }

        })
    },
    getAllActiveCustomOffers: () => {
        var today = Math.floor(Date.now() / 1000);
        return new Promise(function (resolve, reject) {
            var querycustomOffers =
                `SELECT mo.coupon_short_url, mo.offer_coupon_guid, mo.expires, mo.MerchantId, mer.nick_name, mo.id, mo.reward_text, mo.reward_text_media_image, mo.reward_text_message_type,
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
                AND mo.start_date <= :start_date AND mo.is_sent = 0
                AND mo.min_to_earn = '0'`;
            model.sequelize
                .query(querycustomOffers, {
                    replacements: {
                        start_date: today
                    },
                    type: model.sequelize.QueryTypes.SELECT
                })
                .then(function (rows) {
                    if (rows.length > 0) {
                        resolve(rows);
                    } else {
                        resolve([]);
                    }
                })
                .catch(function (err) {
                    reject(err);
                });
        });
    },
    send_custome_coupon_to_customers: (offer) => {
        console.log("offerrrrrrrrrrrrrrrrr"  , offer)
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
                                            console.log(consumeSMSWithJoin)
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
                    "Select " + consumeSMSWithJoin + "  cm.customer_id,cm.customer_phone,cm.merchant_id, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.prefContactMethod != '3' AND cm.prefContactMethod != '1' AND cm.merchant_id=:merchant_id AND CONCAT(cm.firstName, ' ', cm.lastName)  LIKE :customer_name_like"; //'%' + offer['customer_name'] + '%'
            } else if (
                offer["last_visited"] !== null &&
                offer["last_visited"] != 0 &&
                offer["last_visited"] !== ""
            ) {
                sql =
                    "Select " + consumeSMSWithJoin + " customer_id,customer_phone,merchant_id, prefContactMethod,emails from tap_customers_merchant as cm Where optin='1' AND prefContactMethod != '3' AND prefContactMethod != '1' AND merchant_id=:merchant_id AND  last_visit_at >=:timestamp_last_visit "; //gettimestampForDays(offer['last_visited']
            } else if (
                offer["customer_type"] !== null &&
                offer["customer_type"] !== "normal" &&
                offer["customer_type"] !== ""
            ) {
                sql =
                    "Select " + consumeSMSWithJoin + " customer_id,customer_phone,merchant_id, prefContactMethod,emails from tap_customers_merchant as cm Where optin='1' AND prefContactMethod != '3' AND prefContactMethod != '1' AND merchant_id=:merchant_id  AND type=:customer_type"; //offer['customer_type']
            } else if (
                offer["randomly_customers_per"] !== null &&
                offer["randomly_customers_per"] !== "" &&
                offer["randomly_customers_per"] != 0
            ) {
                sql_count =
                    "Select count(*) as total from tap_customers_merchant Where optin='1' AND prefContactMethod != '3' AND  merchant_id=:merchant_id"; // + mysql.escape(offer.merchant_id);
                //limit=parseInt(ceil(((count/100)*offer['randomly_customers_per'])))
                sql =
                    "Select " + consumeSMSWithJoin + "  cm.customer_id,cm.customer_phone,cm.merchant_id, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm Where cm.optin='1' AND cm.prefContactMethod != '3' AND cm.prefContactMethod != '1' AND cm.merchant_id=:merchant_id Order By RAND() Limit 10";

            } else if (offer["zipcode"] !== null && offer["zipcode"] !== "") {
                sql =
                    "Select " + consumeSMSWithJoin + "  cm.customer_id,cm.customer_phone,cm.merchant_id, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.prefContactMethod != '3' AND cm.prefContactMethod != '1' AND cm.merchant_id=:merchant_id AND cm.zip IN (:zip)"; //('" + JSON.parse(offer['zipcode']).join("','") + "')";
            } else if (
                offer["days_optin"] !== null &&
                offer["days_optin"] !== "" &&
                offer["days_optin"] != 0
            ) {
                sql =
                    "Select " + consumeSMSWithJoin + " customer_id,customer_phone,merchant_id, prefContactMethod,emails from tap_customers_merchant as cm Where optin='1' AND prefContactMethod != '3' AND prefContactMethod != '1' AND merchant_id=:merchant_id AND optin_at>=:days_optin"; // + mysql.escape(offer['days_optin']);
            } else if (
                offer["coupons_available"] !== null &&
                offer["coupons_available"] !== "" &&
                offer["coupons_available"] != 0
            ) {
                sql =
                    "Select " + consumeSMSWithJoin + "  cm.customer_id,cm.merchant_id,cm.customer_phone,Count(cm.id) as total_coupon, cm.prefContactMethod,cm.emails  from tap_customers_merchant as cm Inner Join  tap_coupons as c ON (cm.customer_id=c.customer_id AND cm.merchant_id=c.merchant_id)   LEFT JOIN tap_coupons_used as cu ON c.id=cu.coupon_id Where cu.coupon_id IS  NULL AND cm.merchant_id=:merchant_id AND cm.optin='1' AND cm.prefContactMethod != '3' AND cm.prefContactMethod != '1'  Group BY cm.customer_id,cm.merchant_id";
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
                    "Select " + consumeSMSWithJoin + "  cm.customer_id,cm.customer_phone,cm.merchant_id,sum(co.saleAmount) as total_spent, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where cm.merchant_id=:merchant_id AND cm.optin='1' AND cm.prefContactMethod != '3' AND cm.prefContactMethod != '1' group by customer_id,merchant_id";
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
                    "Select " + consumeSMSWithJoin + "  cm.customer_id,cm.merchant_id,cm.customer_phone, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where co.created_at>=:bd_start_date AND co.created_at<=:bd_end_date AND cm.merchant_id=:merchant_id AND cm.optin='1' AND cm.prefContactMethod != '3' AND cm.prefContactMethod != '1' group by co.customer_id,co.merchant_id";
                //sql="Select cm.customer_id,cm.merchant_id,sum(co.saleAmount) as total_sepnt from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where merchant_id="+mysql.escape(offer.merchant_id)+" group by cm.customer_id,cm.merchant_id Having sum(saleAmount)";
            } else if (
                offer["unfinished_profile"] !== null &&
                offer["unfinished_profile"] == 1
            ) {
                sql =
                    "Select " + consumeSMSWithJoin + " cm.customer_id,cm.customer_phone,cm.merchant_id, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.prefContactMethod != '3' AND cm.prefContactMethod != '1' AND cm.merchant_id=:merchant_id AND cm.profile_completed='0' group by cm.customer_id,cm.merchant_id";
            }
            if (sql_count !== "") {
                //for percentage of customers
                console.log("offer.merchant_id" , offer.merchant_id)
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
                                "Select " + consumeSMSWithJoin + " cm.customer_id,cm.customer_phone,cm.merchant_id, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm Where cm.optin='1' AND cm.prefContactMethod != '3' AND cm.prefContactMethod != '1' AND cm.merchant_id=:merchant_id Order By RAND() Limit " +
                                limit;
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
                                            offer["zipcode"] : JSON.parse(offer["zipcode"]).join("','"), //JSON.parse(offer['zipcode']).join("','"),
                                        days_optin: offer["days_optin"],
                                        amount_spent: offer["amount_spent"],
                                        bd_start_date: offer["bd_start_date"],
                                        bd_end_date: offer["bd_end_date"]
                                    },
                                    type: model.sequelize.QueryTypes.SELECT
                                })
                                .then(async function (customers) {
                                    if(customers.length > 0){
                                        var getDba = await cronHelpers.getDba(customers[0].merchant_id);
                                        var getTrainingModeStatus = await trainingMode.checkTrainingMode(customers[0].merchant_id)
                                        var getSegment = await cronHelpers.getSegments(customers , offer , {nick_name : getDba.nick_name})
                                        var getLeftSms = getDba.sms_limit - getDba.sms_sent ;   
                                        if((getLeftSms >= (getSegment.totalSegments)) || (getDba.sms_limit == 0 && getDba.sms_unlimited == 1) || getTrainingModeStatus){
                                            resolve(customers);
                                        }else{
                                            let upgradeTierData = { segmentNeedToAdd: (getDba.sms_sent + getSegment.totalSegments) , trigger : "custom offer" };
                                            console.log("++++++" , upgradeTierData ,customers[0].merchant_id )
                                            tierBillingScheduleInfo
                                              .updgardeTierWithOveragePrice(customers[0].merchant_id, upgradeTierData, "bulk_sms")
                                              .then(
                                                function (res) {
                                                    resolve(customers);
                                                },
                                                function (err) {
                                                    resolve([]);
                                                    
                                                }
                                              );
                                        }
                                    }else{
                                        resolve([]);
                                    }
                                })
                                .catch(function (err) {
                                    resolve([]);
                                });
                        } else {
                            resolve([]);
                        }
                    })
                    .catch(function (err) {
                        resolve([]);
                    });
            } else {
                //for remaining filters
                console.log("offer.merchant_id" , offer.merchant_id)
                
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
                    .then(async function (customers) {
                        // customers = custmerDetails.customerdata;
                        if(customers.length > 0){
                            console.log("customers[0].merchant_id" , customers[0].merchant_id)
                            
                            var getDba = await cronHelpers.getDba(customers[0].merchant_id)
                            var getTrainingModeStatus = await trainingMode.checkTrainingMode(customers[0].merchant_id)
                            var getSegment = await cronHelpers.getSegments(customers , offer , {nick_name : getDba.nick_name})
                            var getLeftSms = getDba.sms_limit - getDba.sms_sent ;   
                            if((getLeftSms >= (getSegment.totalSegments)) || (getDba.sms_limit == 0 && getDba.sms_unlimited == 1) || getTrainingModeStatus){
                                resolve(customers);
                            }else{
                                let upgradeTierData = { segmentNeedToAdd: (getDba.sms_sent + getSegment.totalSegments) , trigger : "custom offer" };
                                console.log("-----------" , upgradeTierData ,customers[0].merchant_id )
                                
                                tierBillingScheduleInfo
                                  .updgardeTierWithOveragePrice(customers[0].merchant_id, upgradeTierData, "bulk_sms")
                                  .then(
                                    function (res) {
                                        resolve(customers);
                                    },
                                    function (err) {
                                        resolve([]);
                                        
                                    }
                                  );
                            }
                        }else{
                            resolve([]);
                        }
                   
                    })
                    .catch(function (err) {
                        resolve([]);
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
                reject(err);
            });
    });
}

function updatemerchantsmsdata(merchantsms, merchant_id, merchantUseEmail) {
    return new Promise((resolve, reject) => {
        var rawquery = `UPDATE tap_merchants SET sms_sent =  sms_sent+ ${merchantsms}  WHERE merchant_id = '${merchant_id}'`;
        var rawqueryforEmail = `UPDATE tap_merchants SET email_sent =  email_sent + ${merchantUseEmail}  WHERE merchant_id = '${merchant_id}'`;
        model.sequelize.query(rawquery).spread((results, metadata) => {
            model.sequelize.query(rawqueryforEmail).spread((results, metadatas) => {
                resolve(metadatas);
                // Results will be an empty array and metadata will contain the number of affected rows.
            }).catch(function (err) {

                reject(err);
            });
            // Results will be an empty array and metadata will contain the number of affected rows.
        }).catch(function (err) {
            reject(err);
        });
    });
}


function updateMerchantSmsDataTraining(merchantsms, merchant_id, merchantUseEmail) {
    return new Promise((resolve, reject) => {
        var rawquery = `UPDATE tap_merchants SET sms_sent_training =  sms_sent_training+ ${merchantsms}  WHERE merchant_id = '${merchant_id}'`;
        var rawqueryforEmail = `UPDATE tap_merchants SET email_sent =  email_sent + ${merchantUseEmail}  WHERE merchant_id = '${merchant_id}'`;
        model.sequelize.query(rawquery).spread((results, metadata) => {
            model.sequelize.query(rawqueryforEmail).spread((results, metadatas) => {
                resolve(metadatas);
                // Results will be an empty array and metadata will contain the number of affected rows.
            }).catch(function (err) {

                reject(err);
            });
            // Results will be an empty array and metadata will contain the number of affected rows.
        }).catch(function (err) {
            reject(err);
        });
    });
}

function errormessagesave(data) {
    return new Promise((resolve, reject) => {
        model.tap_failed_sms
            .bulkCreate(data)
            .then(function (issendSMSstored) {
                resolve('ok');
            })
            .catch(function (err) {
                reject(err);
            });
    })
}

function savesentSms(data) {
    return new Promise((resolve, reject) => {
        model.tap_sent_sms
            .bulkCreate(data)
            .then(function (issendSMSstored) {
                resolve('ok');
            })
            .catch(function (err) {
                reject(err);
            });
    })
}

function sendSmstoCustomer(start, end, customerDetails, offerValue, coupon_uuid, shortedurl) {
    return new Promise((resolve, reject) => {
        var insertValues = [];
        var errorMessageValues = [];
        var insertValuesEmail = [];
        var merchantUsesms = 0;
        var merchantUseEmail = 0;
        let customerOfferData = []
        for (var i = start; i <= end; i++) {
            customerOfferData.push(customerDetails[i]);
        }
        var log_data = {
            offer_id: offerValue.offer_id,
            timestamp: moment().unix(),
            subject: 'Custom offer',
            price: null,
            type: 'SMS',
            numMedia: null,
            res_data: ''
        };
        async.forEachOfSeries(customerOfferData, function (customer, key, callback) {
            if (customer.customer_phone != undefined) {
                var customerPhone = (customer.customer_phone).toString();
                var PuertoRico = helpher.PuertoRico(customerPhone);
                var message = textmessage.giveCouponWithShortUrl.english;
                if (PuertoRico) {
                    message = textmessage.giveCouponWithShortUrl.spanish;
                }
                message = message.replace("%SHORTURL%", shortedurl);

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
                var info = splitter.split(message);
                var messagesegment = info.parts.length;
                log_data.merchant_id = customer.merchant_id;
                log_data.customer_phone = customerPhone;
                log_data.message = message;
                log_data.sms_segment = messagesegment;
                log_data.res_data = '';

                let merchantcustomerlimit = offerValue.sms_limit_perUser;
                module.exports.sendBulkSMS(message, customerPhone, log_data, customer.prefContactMethod, customer.emails, customer.customeConsume, merchantcustomerlimit, PuertoRico).then(function (resultsdata) {

                        if (resultsdata.prefContactMethod == 0) {
                            if (resultsdata.query !== undefined) {
                                merchantUsesms = parseInt(merchantUsesms) + parseInt(resultsdata.query.sms_segment);
                                insertValues.push(resultsdata.query);
                            } else {
                                errorMessageValues.push(resultsdata.errormsg);
                            }
                        }
                        if (resultsdata.prefContactMethod == 1) {
                            if (resultsdata.query !== undefined) {
                                merchantUseEmail = merchantUseEmail + 1
                                insertValuesEmail.push(resultsdata.query);
                            }

                        }
                        if (resultsdata.prefContactMethod == 2) {
                            if (resultsdata.querySms !== undefined) {
                                merchantUsesms = parseInt(merchantUsesms) + parseInt(resultsdata.querySms.sms_segment);

                                insertValues.push(resultsdata.querySms);
                            } else {
                                errorMessageValues.push(resultsdata.errormsg);
                            }
                            if (resultsdata.queryemail !== undefined) {
                                merchantUseEmail = merchantUseEmail + 1
                                insertValuesEmail.push(resultsdata.queryemail);
                            }
                        }
                        callback();
                    },
                    function (error) {
                        createApiLogs.customOffersWrite(`Error from async.forEachOf function for customer message`, error);
                        callback();
                    })

            } else {
                callback();
            }
        }, function (error) {
            if (error) {
                createApiLogs.customOffersWrite(`Error from async.forEachOf function for customer message`, error);
                reject(error)
            } else {
                Promise.all([savesentSms(insertValues), saveEmailData(insertValuesEmail), errormessagesave(errorMessageValues)]).then(function (values) {
                    insertValues = [];
                    couponsCreated = [];
                    insertValuesEmail = [];
                    errorMessageValues = [];
                    let wait = setTimeout(() => {
                        clearTimeout(wait);
                        resolve(true);
                    }, timeout);
                }, function (error) {
                    createApiLogs.customOffersWrite(`Error When save sent sms data`, error);
                    let wait = setTimeout(() => {
                        clearTimeout(wait);
                        // reject(error);
                        resolve(true)
                    }, timeout)

                });
            }

        });

    });
}

async function sendSmstoCustomerwithloop(customerDetails, offerValue, coupon_uuid, shortedurl) {
    var total = customerDetails.length;
    var divisibleLength = 25;
    var divison = Math.floor((total) / divisibleLength);
    if (total > 0) {
        try {
            if (divison > 0) {
                for (var i = 0; i <= divison; i++) {
                    if (i == (divison)) {
                        await sendSmstoCustomer((i * divisibleLength), (total - 1), customerDetails, offerValue, coupon_uuid, shortedurl);
                    } else {
                        await sendSmstoCustomer((i * divisibleLength), (((i + 1) * divisibleLength) - 1), customerDetails, offerValue, coupon_uuid, shortedurl);
                    }
                }

            } else {
                await sendSmstoCustomer(0, (total - 1), customerDetails, offerValue, coupon_uuid, shortedurl)
            }
            return 'ok';
        } catch (error) {
            console.error(` readFile failed: ${error}`);
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
            host: 'dinama.com',
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
                return (false);
            });
        }
    });
}

function updateMerchantTable(offerValue) {
    return new Promise(function (resolve, reject) {
        model.tap_merchant_offers
            .update({
                is_sent: 1
            }, {
                where: {
                    id: offerValue.id,
                }
            })
            .then(function (result) {
                resolve(result);
            })
            .catch(function (err) {
                reject(err);
            });
    });
}

function insertCouponDatainTable(offerValue, customerDetails, coupon_uuid, shortedurl) {

    var coupon_detail = []
    for (let i = 0; i < customerDetails.length; i++) {
        let customerdata = {
            customer_id: customerDetails[i].customer_id,
            merchant_id: customerDetails[i].merchant_id,
            offerid: offerValue.id,
            offer_type: offerValue.Discount_Type,
            created_at: Math.floor(Date.now() / 1000),
            expires: offerValue.expires,
            coupon_uuid: coupon_uuid
        }
        if (offerValue.expires != "0") {
            var expires = gettimestampForDays(offerValue.expires);
            if (expires) {
                customerdata.expires = expires;
            }
        }
        coupon_detail.push(customerdata)

    }

    return new Promise(function (resolve, reject) {
        model.tap_coupons.bulkCreate(coupon_detail)
            .then(function (isCouponcreated) {
                createApiLogs.customOffersWrite(`save coupon data successfully`);
                resolve(true);
            })
            .catch(function (err) {
                createApiLogs.customOffersWrite(`Error When save coupon data`, err);
                reject(err);
            });

    });
}