"use strict";
const model = require("../model");
const config = require("../config/config");
var cronHelper = require("../controller/cronsJobs/cronHelpers")
var trainingMode = require("../controller/common/checkTrainingMode")
const tierBillingScheduleInfo = require('../controller/tierBillingScheduleInfo');
const textmessage = require("../language/textMessage");
const helper = require("./common/helper");
const responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));
const moment = require('moment');
const async = require("async");
var timestamp = require("unix-timestamp");
var BigNumber = require('bignumber.js')
//twilio crendetials
const accountSid = "ACbbfa5abc0f58bbb5a8a731df226e0a8f";
const authToken = "f2661610765efa06a6e5aea674150007";
const from = "71958";
const timeout = 1000;
const client = require("twilio")(accountSid, authToken);
const https = require("https");
const to_json = require('xmljson').to_json;
var checkTimeVaildation = require('../controller/common/checkTimeBetween')
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

module.exports = {
    // sending SMS to all number
    textYourcustomer: (req, res) => {
        let AllphoneNumbers = req.body.phoneNumbers;
        let merchantId = req.body.merchant_id;
        let textmessage = req.body.message;
        let external = req.body.external;
        if (external) {
            AllphoneNumbers = JSON.parse(AllphoneNumbers);
        }
        return new Promise(async(resolve, reject) => {
            var tapSendTextSegment = await cronHelper.getSegmentsForTextYourCustomers(textmessage); //okay
            var getMerchantData = await cronHelper.getDba(merchantId);
            var getMerchantTrainingModeStatus = await trainingMode.checkTrainingMode(merchantId)
            var getLeftSms = getMerchantData.sms_limit - getMerchantData.sms_sent;
            if ((getLeftSms >= (AllphoneNumbers.length * tapSendTextSegment)) || (getMerchantData.sms_limit == 0 && getMerchantData.sms_unlimited == 1) || getMerchantTrainingModeStatus) {
                getMerchantdetails(merchantId).then((resultData) => {
                    let merchant_customer_limit = resultData.sms_limit_perUser
                    sendTextMessageToCustomers(AllphoneNumbers, merchantId, textmessage, merchant_customer_limit).then((result) => {
                        if (external) {
                            resolve(result);
                        } else {
                            responseMsg.RESPONSE200.data = result;
                            res
                                .status(responseMsg.RESPONSE200.statusCode)
                                .send(responseMsg.RESPONSE200);
                        }
    
                    }, (error) => {
                        if (external) {
                            reject(error);
                        } else {
                            responseMsg.RESPONSE400.message = error;
                            res
                                .status(responseMsg.RESPONSE400.statusCode)
                                .send(responseMsg.RESPONSE400);
                        }
                    })
                }, (error) => {
                    if (external) {
                        reject(error);
                    } else {
                        responseMsg.RESPONSE400.message = error;
                        res
                            .status(responseMsg.RESPONSE400.statusCode)
                            .send(responseMsg.RESPONSE400);
                    }
                })
            }else{
                
                let upgradeTierData = { segmentNeedToAdd: (getMerchantData.sms_sent + (AllphoneNumbers.length * tapSendTextSegment)) , trigger : "text your customer"};
                tierBillingScheduleInfo
                    .updgardeTierWithOveragePrice(merchantId, upgradeTierData , "bulk_sms")
                    .then(
                    function (response) {
                
                        getMerchantdetails(merchantId).then((resultData) => {
                            let merchant_customer_limit = resultData.sms_limit_perUser
                            sendTextMessageToCustomers(AllphoneNumbers, merchantId, textmessage, merchant_customer_limit).then((result) => {
                                if (external) {
                                    resolve(result);
                                } else {
                                    responseMsg.RESPONSE200.data = result;
                                    res
                                        .status(responseMsg.RESPONSE200.statusCode)
                                        .send(responseMsg.RESPONSE200);
                                }
            
                            }, (error) => {
                                if (external) {
                                    reject(error);
                                } else {
                                    responseMsg.RESPONSE400.message = error;
                                    res
                                        .status(responseMsg.RESPONSE400.statusCode)
                                        .send(responseMsg.RESPONSE400);
                                }
                            })
                        }, (error) => {
                            if (external) {
                                reject(error);
                            } else {
                                responseMsg.RESPONSE400.message = error;
                                res
                                    .status(responseMsg.RESPONSE400.statusCode)
                                    .send(responseMsg.RESPONSE400);
                            }
                        })
                    },
                    function (err) {
                        console.log("err" , err)
                        if (external) {
                            reject(err);
                        } else {
                            responseMsg.RESPONSE400.message = err;
                            res
                                .status(responseMsg.RESPONSE400.statusCode)
                                .send(responseMsg.RESPONSE400);
                        }
                    }
                );
            }
    
        })
    },
    getcustomerdetails: (req, res) => {
        var tmpDate = new Date();
        var y = tmpDate.getFullYear();
        var m = tmpDate.getMonth();
        var firstDay = new Date(y, m, 1);
        var lastDay = new Date(y, m + 1, 0);
        lastDay.setHours(23, 59, 59, 999);
        firstDay.setHours(0, 0, 0, 0);
        let searchQuery = {
            merchant_id: req.params.merchant_id,
            customerName: (req.query.customerName) ? decodeURI(req.query.customerName) : "",
            lastVisited: (req.query.lastVisited) ? req.query.lastVisited : "",
            customerType: (req.query.customerType) ? req.query.customerType : "",
            randomlyCustomer: (req.query.randomlyCustomer) ? req.query.randomlyCustomer : "",
            daysOptIn: (req.query.daysOptIn) ? req.query.daysOptIn : "",
            bdStartDate: (req.query.bdStartDate) ? req.query.bdStartDate : "",
            bdEndtDate: (req.query.bdEndtDate) ? req.query.bdEndtDate : "",
            amountSpent: (req.query.amountSpent) ? req.query.amountSpent : "",
            amountSpentSign: (req.query.amountSpentSign) ? req.query.amountSpentSign : "",
            couponsAvailable: (req.query.couponsAvailable) ? req.query.couponsAvailable : "",
            unfinished_profile: (req.query.unfinished_profile === "on") ? 0 : "",
            zip: (req.query.zip !== null && req.query.zip !== "") ? req.query.zip : "",
            searchData: (req.query.searchData) ? req.query.searchData : "",
            searchall: (req.query.searchall) ? req.query.searchall : ""
        }
        let excessfrom = req.query.frominternal;
        let timestampStart = timestamp.fromDate(firstDay.toUTCString());
        let timestampEnd = timestamp.fromDate(lastDay.toUTCString());

        let consumeSMSWithJoin = `(SELECT COALESCE(SUM(sms_segment),0) AS consume FROM tap_sent_sms WHERE merchant_id = cm.merchant_id AND customer_phone = cm.customer_phone AND timestamp >= ${
            timestampStart
            }
        AND timestamp <= ${
            timestampEnd
            }
        GROUP BY merchant_id) as customerConsume, `;
        let consumeSMS = `(SELECT COALESCE(SUM(sms_segment),0) AS consume FROM tap_sent_sms WHERE merchant_id = merchant_id AND customer_phone = customer_phone AND timestamp >= ${
            timestampStart
            }
        AND timestamp <= ${
            timestampEnd
            }
        GROUP BY merchant_id) as customerConsume, `;
        var sql, sql_count = "";
        if (searchQuery.searchall == 1) {
            sql = `Select ${consumeSMSWithJoin} cm.prefContactMethod,cm.emails,  cm.customer_id,cm.customer_phone as phoneNumber,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  AND cm.merchant_id= :merchant_id`;
        } else if (searchQuery.customerName !== null && searchQuery.customerName !== "") {
            sql = `Select  ${consumeSMSWithJoin} cm.prefContactMethod,cm.emails,  cm.customer_id,cm.customer_phone as phoneNumber,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  AND cm.merchant_id=:merchant_id AND CONCAT(cm.firstName, ' ', cm.lastName) LIKE  '%' :customerName '%' `;
        } else if (searchQuery.lastVisited !== null && searchQuery.lastVisited != 0 && searchQuery.lastVisited !== "") {
            sql = `Select ${consumeSMSWithJoin} cm.prefContactMethod, cm.emails, cm.customer_id,cm.customer_phone as phoneNumber, cm.merchant_id from tap_customers_merchant cm Where cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  AND merchant_id= :merchant_id AND cm.last_visit_at >= ${(gettimestampForDays(searchQuery.lastVisited))}`;
        } else if (searchQuery.customerType !== null && searchQuery.customerType !== "normal" && searchQuery.customerType !== "") {
            sql = `Select ${consumeSMSWithJoin} cm.prefContactMethod, cm.emails, cm.customer_id,cm.customer_phone as phoneNumber,cm.merchant_id from tap_customers_merchant cm Where cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  AND cm.merchant_id= :merchant_id AND cm.type= :customerType`;
        } else if (searchQuery.randomlyCustomer !== null && searchQuery.randomlyCustomer !== "" && searchQuery.randomlyCustomer != 0) {
            sql_count = `Select count(*) as total from tap_customers_merchant Where optin='1' AND prefContactMethod != "3" AND prefContactMethod != "1" AND merchant_id= :merchant_id`;

        } else if (searchQuery.zip !== null && searchQuery.zip !== undefined && searchQuery.zip !== "") {
            var zipdata = searchQuery.zip.split(",");
            sql = `Select ${consumeSMSWithJoin} cm.prefContactMethod, cm.emails, cm.customer_id,cm.customer_phone as phoneNumber,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  AND cm.merchant_id= :merchant_id AND cm.zip IN (:completezipdata)`;
        } else if (searchQuery.daysOptIn !== null && searchQuery.daysOptIn !== "" && searchQuery.daysOptIn != 0) {
            sql = `Select ${consumeSMSWithJoin} cm.prefContactMethod,cm.emails,  cm.customer_id,cm.customer_phone as phoneNumber,cm.merchant_id from tap_customers_merchant cm Where cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  AND cm.merchant_id= :merchant_id AND cm.optin_at>= :daysOptIn`;
        } else if (searchQuery.couponsAvailable !== null && searchQuery.couponsAvailable !== "" && searchQuery.couponsAvailable != 0) {
            sql = `Select ${consumeSMSWithJoin} cm.prefContactMethod,cm.emails,  cm.customer_id,cm.merchant_id,cm.customer_phone as phoneNumber,Count(cm.id) as total_coupon  from tap_customers_merchant as cm Inner Join  tap_coupons as c ON (cm.customer_id=c.customer_id AND cm.merchant_id=c.merchant_id)   LEFT JOIN tap_coupons_used as cu ON c.id=cu.coupon_id Where cu.coupon_id IS  NULL AND cm.merchant_id= :merchant_id AND cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"   Group BY cm.customer_id,cm.merchant_id`;
            if (searchQuery.couponsAvailable == "1") {
                sql += "  Having Count(cm.id)>=1 and Count(cm.id)<=5";
            } else if (searchQuery.couponsAvailable == "2") {
                sql += "  Having Count(cm.id)>=6 and Count(cm.id)<=10";
            } else if (searchQuery.couponsAvailable == "3") {
                sql += "  Having Count(cm.id)>10";
            }

        } else if (searchQuery.amountSpent !== null && searchQuery.amountSpent !== "" && searchQuery.amountSpent != 0 && searchQuery.amountSpentSign !== null && searchQuery.amountSpentSign !== "") {
            sql = `Select ${consumeSMSWithJoin} cm.prefContactMethod,cm.emails,  cm.customer_id,cm.customer_phone as phoneNumber,cm.merchant_id,sum(co.saleAmount) as total_spent from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  AND cm.merchant_id= :merchant_id group by customer_id,merchant_id`;
            if (searchQuery.amountSpentSign == "less") {
                sql += `  Having sum(co.saleAmount)< ${searchQuery.amountSpent}`;
            } else if (searchQuery.amountSpentSign == "greater") {
                sql += `  Having sum(co.saleAmount)> ${searchQuery.amountSpent}`
            } else if (searchQuery.amountSpentSign == "equal") {
                var operator = parseFloat(parseFloat(searchQuery.amountSpent).toFixed(2));
                sql += `  Having sum(co.saleAmount)= :operator`;
            }
        } else if (searchQuery.bdStartDate !== null && searchQuery.bdStartDate !== "" && searchQuery.bdStartDate != 0 && searchQuery.bdEndtDate !== null && searchQuery.bdEndtDate !== "" && searchQuery.bdEndtDate != 0) {
            sql = `Select ${consumeSMSWithJoin} cm.prefContactMethod,cm.emails, cm.customer_id,cm.merchant_id,cm.customer_phone as phoneNumber from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where co.created_at>= :bdStartDate AND co.created_at<= :bdEndtDate AND cm.merchant_id= :merchant_id AND cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  group by co.customer_id,co.merchant_id`;
        } else if (searchQuery.unfinished_profile !== null && searchQuery.unfinished_profile == 0) {
            sql = `Select ${consumeSMSWithJoin} cm.prefContactMethod, cm.emails, cm.customer_id,cm.customer_phone as phoneNumber,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  AND cm.merchant_id=:merchant_id AND cm.profile_completed='0' group by cm.customer_id,cm.merchant_id`;
        }
        var reqMainData = {
            merchant_id: searchQuery.merchant_id,
            bdStartDate: searchQuery.bdStartDate,
            bdEndtDate: searchQuery.bdEndtDate,
            operator: operator,
            daysOptIn: searchQuery.daysOptIn,
            customerName: searchQuery.customerName,
            customerType: searchQuery.customerType,
            completezipdata: zipdata

        };
        return new Promise((resolve, reject) => {
            if (sql_count !== "") {
                model.sequelize
                    .query(sql_count, {
                        replacements: reqMainData,
                        type: model.sequelize.QueryTypes.SELECT
                    })
                    .then(function (rows) {
                        let total = rows[0].total;
                        let limit = Math.floor(
                            (total / 100) * searchQuery.randomlyCustomer
                        );
                        sql = `Select ${consumeSMSWithJoin} cm.prefContactMethod, cm.emails, cm.customer_id, cm.customer_phone as phoneNumber, cm.merchant_id from tap_customers_merchant cm  Where cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  AND cm.merchant_id= :merchant_id Order By RAND() Limit ${limit}`;
                        model.sequelize
                            .query(sql, {
                                replacements: reqMainData,
                                type: model.sequelize.QueryTypes.SELECT
                            })
                            .then(async function (rowsData) {
                                if (excessfrom) {
                                    resolve(rowsData);
                                } else {
                                    var getNickName = await cronHelper.getDba(req.params.merchant_id)
                                    responseMsg.RESPONSE200.data = rowsData;
                                    responseMsg.RESPONSE200.nickName = getNickName.nick_name
                                    res
                                        .status(responseMsg.RESPONSE200.statusCode)
                                        .send(responseMsg.RESPONSE200);
                                }
                            }).catch(function (err) {
                                if (excessfrom) {
                                    reject(err);
                                } else {
                                    responseMsg.RESPONSE400.message = err;
                                    res
                                        .status(responseMsg.RESPONSE400.statusCode)
                                        .send(responseMsg.RESPONSE400);
                                }
                            })
                    })
                    .catch(function (err) {
                        if (excessfrom) {
                            reject(err);
                        } else {
                            responseMsg.RESPONSE400.message = err;
                            res
                                .status(responseMsg.RESPONSE400.statusCode)
                                .send(responseMsg.RESPONSE400);
                        }

                    });
            } else {
                model.sequelize
                    .query(sql, {
                        replacements: reqMainData,
                        type: model.sequelize.QueryTypes.SELECT
                    })
                    .then(async function (processata) {
                        if (excessfrom) {
                            resolve(processata);
                        } else {
                            var getNickName = await cronHelper.getDba(req.params.merchant_id)
                            responseMsg.RESPONSE200.data = processata;
                            responseMsg.RESPONSE200.nickName = getNickName.nick_name
                            res
                                .status(responseMsg.RESPONSE200.statusCode)
                                .send(responseMsg.RESPONSE200);
                        }
                    })
                    .catch(function (err) {

                        if (excessfrom) {
                            reject(err);
                        } else {
                            responseMsg.RESPONSE400.message = err;
                            res
                                .status(responseMsg.RESPONSE400.statusCode)
                                .send(responseMsg.RESPONSE400);
                        }

                    });
            }


        }, (error) => {
            reject(error)
        })
    },
    getcustomerdetailsforpopup: (req, res) => {
        try {
        var tmpDate = new Date();
        var y = tmpDate.getFullYear();
        var m = tmpDate.getMonth();
        var firstDay = new Date(y, m, 1);
        var lastDay = new Date(y, m + 1, 0);
        lastDay.setHours(23, 59, 59, 999);
        firstDay.setHours(0, 0, 0, 0);
        let searchQuery = {
            merchant_id: req.params.merchant_id,
            customerName: (req.body.customerName) ? decodeURI(req.body.customerName) : "",
            lastVisited: (req.body.lastVisited) ? req.body.lastVisited : "",
            customerType: (req.body.customerType) ? req.body.customerType : "",
            randomlyCustomer: (req.body.randomlyCustomer) ? req.body.randomlyCustomer : "",
            daysOptIn: (req.body.daysOptIn) ? req.body.daysOptIn : "",
            bdStartDate: (req.body.bdStartDate) ? req.body.bdStartDate : "",
            bdEndtDate: (req.body.bdEndtDate) ? req.body.bdEndtDate : "",
            amountSpent: (req.body.amountSpent) ? req.body.amountSpent : "",
            amountSpentSign: (req.body.amountSpentSign) ? req.body.amountSpentSign : "",
            couponsAvailable: (req.body.couponsAvailable) ? req.body.couponsAvailable : "",
            unfinished_profile: (req.body.unfinished_profile === "on") ? 0 : "",
            zip: (req.body.zip !== null && req.body.zip !== "") ? req.body.zip : "",
            searchData: (req.body.searchData) ? req.body.searchData : "",
            searchall: (req.body.searchall) ? req.body.searchall : ""
        }
        console.log('zip +++++++++++++++++++++++++++++++', req.body.messagetosend);
        let excessfrom = req.query.frominternal;
        let timestampStart = timestamp.fromDate(firstDay.toUTCString());
        let timestampEnd = timestamp.fromDate(lastDay.toUTCString());
        let consumeSMSWithJoin = `(SELECT COALESCE(SUM(sms_segment),0) AS consume FROM tap_sent_sms WHERE merchant_id = cm.merchant_id AND customer_phone = cm.customer_phone AND timestamp >= ${
            timestampStart
            }
            AND timestamp <= ${
            timestampEnd
            }
            GROUP BY merchant_id) as customerConsume, `;
        let consumeSMS = `(SELECT COALESCE(SUM(sms_segment),0) AS consume FROM tap_sent_sms WHERE merchant_id = merchant_id AND customer_phone = customer_phone AND timestamp >= ${
            timestampStart
            }
            AND timestamp <= ${
            timestampEnd
            }
            GROUP BY merchant_id) as customerConsume, `;
        var sql, sql_count = "";
        if (searchQuery.searchall == 1) {
            sql =
                `Select ${consumeSMSWithJoin} cm.prefContactMethod,cm.emails,  cm.customer_id,cm.customer_phone as phoneNumber,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  AND cm.merchant_id= :merchant_id`;
        } else if (searchQuery.customerName !== null && searchQuery.customerName !== "") {
            sql =
                `Select  ${consumeSMSWithJoin} cm.prefContactMethod,cm.emails,  cm.customer_id,cm.customer_phone as phoneNumber,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  AND cm.merchant_id=:merchant_id AND CONCAT(cm.firstName, ' ', cm.lastName) LIKE  '%' :customerName '%' `;
        } else if (searchQuery.lastVisited !== null && searchQuery.lastVisited != 0 && searchQuery.lastVisited !== "") {
            sql =
                `Select ${consumeSMSWithJoin} cm.prefContactMethod, cm.emails, cm.customer_id,cm.customer_phone as phoneNumber, cm.merchant_id from tap_customers_merchant cm Where cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  AND merchant_id= :merchant_id AND cm.last_visit_at >= ${(gettimestampForDays(searchQuery.lastVisited))}`;
        } else if (searchQuery.customerType !== null && searchQuery.customerType !== "normal" && searchQuery.customerType !== "") {
            sql =
                `Select ${consumeSMSWithJoin} cm.prefContactMethod, cm.emails, cm.customer_id,cm.customer_phone as phoneNumber,cm.merchant_id from tap_customers_merchant cm Where cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  AND cm.merchant_id= :merchant_id AND cm.type= :customerType`;
        } else if (searchQuery.randomlyCustomer !== null && searchQuery.randomlyCustomer !== "" && searchQuery.randomlyCustomer != 0) {
            sql_count = `Select count(*) as total from tap_customers_merchant Where optin='1' AND prefContactMethod != "3" AND prefContactMethod != "1" AND merchant_id= :merchant_id`;
        } else if (searchQuery.zip !== null && searchQuery.zip !== undefined && searchQuery.zip !== "") {
            var zipdata = searchQuery.zip.split(",");
            sql =
                `Select ${consumeSMSWithJoin} cm.prefContactMethod, cm.emails, cm.customer_id,cm.customer_phone as phoneNumber,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  AND cm.merchant_id= :merchant_id AND cm.zip IN (:completezipdata)`;
        } else if (searchQuery.daysOptIn !== null && searchQuery.daysOptIn !== "" && searchQuery.daysOptIn != 0) {
            sql =
                `Select ${consumeSMSWithJoin} cm.prefContactMethod,cm.emails,  cm.customer_id,cm.customer_phone as phoneNumber,cm.merchant_id from tap_customers_merchant cm Where cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  AND cm.merchant_id= :merchant_id AND cm.optin_at>= :daysOptIn`;
        } else if (searchQuery.couponsAvailable !== null && searchQuery.couponsAvailable !== "" && searchQuery.couponsAvailable != 0) {
            sql =
                `Select ${consumeSMSWithJoin} cm.prefContactMethod,cm.emails,  cm.customer_id,cm.merchant_id,cm.customer_phone as phoneNumber,Count(cm.id) as total_coupon  from tap_customers_merchant as cm Inner Join  tap_coupons as c ON (cm.customer_id=c.customer_id AND cm.merchant_id=c.merchant_id)   LEFT JOIN tap_coupons_used as cu ON c.id=cu.coupon_id Where cu.coupon_id IS  NULL AND cm.merchant_id= :merchant_id AND cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"   Group BY cm.customer_id,cm.merchant_id`;
            if (searchQuery.couponsAvailable == "1") {
                sql += "  Having Count(cm.id)>=1 and Count(cm.id)<=5";
            } else if (searchQuery.couponsAvailable == "2") {
                sql += "  Having Count(cm.id)>=6 and Count(cm.id)<=10";
            } else if (searchQuery.couponsAvailable == "3") {
                sql += "  Having Count(cm.id)>10";
            }
        } else if (searchQuery.amountSpent !== null && searchQuery.amountSpent !== "" && searchQuery.amountSpent != 0 && searchQuery.amountSpentSign !== null &&
            searchQuery.amountSpentSign !== "") {
            sql =
                `Select ${consumeSMSWithJoin} cm.prefContactMethod,cm.emails,  cm.customer_id,cm.customer_phone as phoneNumber,cm.merchant_id,sum(co.saleAmount) as total_spent from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  AND cm.merchant_id= :merchant_id group by customer_id,merchant_id`;
            if (searchQuery.amountSpentSign == "less") {
                sql += `  Having sum(co.saleAmount)< ${searchQuery.amountSpent}`;
            } else if (searchQuery.amountSpentSign == "greater") {
                sql += `  Having sum(co.saleAmount)> ${searchQuery.amountSpent}`
            } else if (searchQuery.amountSpentSign == "equal") {
                var operator = parseFloat(parseFloat(searchQuery.amountSpent).toFixed(2));
                sql += `  Having sum(co.saleAmount)= :operator`;
            }
        } else if (searchQuery.bdStartDate !== null && searchQuery.bdStartDate !== "" && searchQuery.bdStartDate != 0 && searchQuery.bdEndtDate !== null &&
            searchQuery.bdEndtDate !== "" && searchQuery.bdEndtDate != 0) {
            sql =
                `Select ${consumeSMSWithJoin} cm.prefContactMethod,cm.emails, cm.customer_id,cm.merchant_id,cm.customer_phone as phoneNumber from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where co.created_at>= :bdStartDate AND co.created_at<= :bdEndtDate AND cm.merchant_id= :merchant_id AND cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  group by co.customer_id,co.merchant_id`;
        } else if (searchQuery.unfinished_profile !== null && searchQuery.unfinished_profile == 0) {
            sql =
                `Select ${consumeSMSWithJoin} cm.prefContactMethod, cm.emails, cm.customer_id,cm.customer_phone as phoneNumber,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  AND cm.merchant_id=:merchant_id AND cm.profile_completed='0' group by cm.customer_id,cm.merchant_id`;
        }
        var reqMainData = {
            merchant_id: searchQuery.merchant_id,
            bdStartDate: searchQuery.bdStartDate,
            bdEndtDate: searchQuery.bdEndtDate,
            operator: operator,
            daysOptIn: searchQuery.daysOptIn,
            customerName: searchQuery.customerName,
            customerType: searchQuery.customerType,
            completezipdata: zipdata
        };
        return new Promise((resolve, reject) => {
            console.log("sqllllllllllllllll",sql)
            if (sql_count !== "") {
                model.sequelize.query(sql_count, {
                    replacements: reqMainData,
                    type: model.sequelize.QueryTypes.SELECT
                }).then(function (rows) {
                    let total = rows[0].total;
                    let limit = Math.floor(
                        (total / 100) * searchQuery.randomlyCustomer);
                    sql =
                        `Select ${consumeSMSWithJoin} cm.prefContactMethod, cm.emails, cm.customer_id, cm.customer_phone as phoneNumber, cm.merchant_id from tap_customers_merchant cm  Where cm.optin='1' AND cm.prefContactMethod != "3" AND cm.prefContactMethod != "1"  AND cm.merchant_id= :merchant_id Order By RAND() Limit ${limit}`;
                    model.sequelize.query(sql, {
                        replacements: reqMainData,
                        type: model.sequelize.QueryTypes.SELECT
                    }).then(function (customers) {
                        console.log(customers)
                        if(customers.length == 0){
                            responseMsg.RESPONSE400.message = "no customers found";
                            return res.status(responseMsg.RESPONSE400.statusCode).send(
                              responseMsg.RESPONSE400);
                          }
                        var afterSmsSendLeft;
                        try {
                            model.tap_merchants.find({
                                attributes: ["sms_limit", "sms_sent", "dba" , "sms_unlimited" , "is_training" , "state" , "nick_name" , "timezone"],
                                where: {
                                    merchant_id: searchQuery.merchant_id
                                }
                            }).then(async merchantResponse => {
                                if(!merchantResponse.timezone){
                                    responseMsg.RESPONSE400.message = "No Timezone Set for your account . Please contact your Tap Local Marketing Account Manager.";
                                    return res
                                      .status(responseMsg.RESPONSE400.statusCode)
                                      .send(responseMsg.RESPONSE400);
                                 }
                                 var checkTimeVaildationResponse = await checkTimeVaildation.checkTimeVaildationForMessages(merchantResponse.timezone)
                                 if(!checkTimeVaildationResponse){
                                    responseMsg.RESPONSE400.message = 'You can only send messages between 08:00 A.M to 09:00 P.M';
                                    return res
                                      .status(responseMsg.RESPONSE400.statusCode)
                                      .send(responseMsg.RESPONSE400);
                                 }
                                if (merchantResponse) {
                                        if ((merchantResponse.sms_limit == 0 && merchantResponse.sms_unlimited == 1) ||  merchantResponse.is_training == 1) {
                                        responseMsg.RESPONSE200.data = 'NoPopUp';
                                        return res.status(responseMsg.RESPONSE200.statusCode).send(responseMsg.RESPONSE200);
                                    } else {
                                        var getHelplineNumberStatus = merchantResponse.state == 'PR' ?  true : false
                                        var getFinalNumber = getHelplineNumberStatus ? '(787)991-7331' : '(844)899-8559'
                                        var sendMessage = req.body.messagetosend.replace("%dbanick%" , merchantResponse.nick_name)
                                        console.log(sendMessage)
                                    
                                        var getSegments = await cronHelper.getSegmentsForTextYourCustomers(sendMessage) // okay
                                        var result;
                                        var getMessageLeft = merchantResponse.sms_limit - merchantResponse.sms_sent
                                        // var percentage = ((merchantResponse.sms_sent + (customers.length * getSegments)) /merchantResponse.sms_limit) * 100
                                        //here 
                                        var calculateTotal = BigNumber(merchantResponse.sms_sent).plus(customers.length * getSegments);
                                        var divideByTotal = BigNumber(calculateTotal).dividedBy(merchantResponse.sms_limit);
                                        var percentage = BigNumber(divideByTotal).multipliedBy(100);
                                        console.log("percentage" , percentage.toString() ,getSegments )
                                        //sending possible or not 2 conditions to work on
                                        var update;
                                        var threshold = await cronHelper.getThreshold()
                                        var getTier = await cronHelper.getMerchantSubscriptionDate(searchQuery.merchant_id)
                                        var getSchedule = await cronHelper.getScheduleTiers(getTier.data.schedule_id , calculateTotal , merchantResponse.sms_limit ,  merchantResponse.sms_sent , customers.length * getSegments );
                                        //will get info about the schedule data
                                        console.log(getSchedule)
                                        if(getSchedule.status && getSchedule.willGo != null && getSchedule.willFail != null){
                                          console.log('update message')
                                          update = true
                                          
                                        }else{
                                          console.log('no issue')
                                          update = false
                                          
                                        }
                                            var requestCompleteionDate = "";
                                            var startDate = "";
                                            var currentDate = "";
                                            startDate = moment(
                                                getTier.data.subscription_start_date * 1000
                                            ).format("MM-DD-YYYY");
                                            currentDate = moment().format("MM-DD-YYYY");
                                            console.log("currentDate2-------- ", currentDate);
                                            console.log(
                                                "startDate2-------- ",
                                                startDate
                                            );
                                            if (
                                                Date.parse(startDate) >
                                                Date.parse(currentDate)) {
                                                requestCompleteionDate = moment(getTier.data.subscription_start_date * 1000).format("MM-DD-YYYY");
                                            } else {
                                                requestCompleteionDate = moment(getTier.data.subscription_end_date * 1000).add(1, "days").format("MM-DD-YYYY");
                                            }
                                        var ifNewTier = await cronHelper.checkTierInfo(getTier.data.schedule_id, getTier.data.tier_id, merchantResponse.sms_sent)
                                        var tierUpgradePossibility = ifNewTier.status
                                        if (getMessageLeft >= (customers.length * getSegments)) {
                              
                                            if (((100 - percentage) <= threshold.data.first_threshold_val) && (percentage < 100) && ((
                                                100 - percentage) > threshold.data.second_threshold_val)) {
                                                afterSmsSendLeft = getMessageLeft - (customers.length * getSegments)
                                                var message = tierUpgradePossibility ? `
                                                You have ${threshold.data.first_threshold_val}% remaining of the SMS text messages allowed by your current text plan.  This leaves you with ${merchantResponse.sms_limit - merchantResponse.sms_sent} texts available to send in this cycle.<br/>
                                                Your plan permits ${merchantResponse.sms_limit} messages to be sent and you have sent ${merchantResponse.sms_sent} during
                                                this cycle.  Your text plan resets on ${requestCompleteionDate} .<br/>  
                                                If your text limit is reached, please contact your Tap Local Marketing Account Manager at ${getFinalNumber} to perform a text plan upgrade.<br/><br/>
                                                Customer reach: ${customers.length * getSegments}<br/>
                                                Remaining messages:<br/> 
                                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${afterSmsSendLeft}<br/>
                                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>
                                                ` : ` You have ${threshold.data.first_threshold_val}% remaining of the SMS text messages allowed by your current text plan.  This leaves you with ${merchantResponse.sms_limit - merchantResponse.sms_sent} texts available to send in this cycle.<br/>
                                                Your plan permits ${merchantResponse.sms_limit} messages to be sent and you have sent ${merchantResponse.sms_sent} during
                                                this cycle.  Your text plan resets on ${requestCompleteionDate} .<br/>  
                                                If your text limit is reached, please contact your Tap Local Marketing Account Manager at ${getFinalNumber} to perform a text plan upgrade.<br/><br/>
                                                Customer reach: ${customers.length * getSegments}<br/> 
                                                Remaining messages:<br/> 
                                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${afterSmsSendLeft}<br/>
                                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>`
                                                //first threshold
                                                result = {
                                                    leftMessagesAfterSend: afterSmsSendLeft,
                                                    limit: merchantResponse.sms_limit,
                                                    smsSent: merchantResponse.sms_sent,
                                                    message: message,
                                                    cancelFormSubmit: false
                                                }
                                                responseMsg.RESPONSE200.data = result;
                                                return res.status(responseMsg.RESPONSE200.statusCode).send(responseMsg.RESPONSE200);
                                            } else if (((100 - percentage) <= threshold.data.second_threshold_val)) {
                                                afterSmsSendLeft = getMessageLeft - (customers.length * getSegments)
                                                var message = tierUpgradePossibility ? `                  
                                                You have ${threshold.data.second_threshold_val}% remaining of the SMS text messages allowed by your current text plan.  This leaves you with ${merchantResponse.sms_limit - merchantResponse.sms_sent} texts available to send in this cycle.<br/>
                                                Your plan permits ${merchantResponse.sms_limit} messages to be sent and you have sent ${merchantResponse.sms_sent} during
                                                this cycle.  Your text plan resets on ${requestCompleteionDate} .<br/>  
                                                If your text limit is reached, please contact your Tap Local Marketing Account Manager at ${getFinalNumber} to perform a text plan upgrade.<br/><br/>
                                                Customer reach: ${customers.length * getSegments}<br/>
                                                Remaining messages:<br/> 
                                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${afterSmsSendLeft}<br/>
                                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>
                                                  ` : `You have ${threshold.data.second_threshold_val}% remaining of the SMS text messages allowed by your current text plan.  This leaves you with ${merchantResponse.sms_limit - merchantResponse.sms_sent} texts available to send in this cycle.<br/>
                                                  Your plan permits ${merchantResponse.sms_limit} messages to be sent and you have sent ${merchantResponse.sms_sent} during
                                                  this cycle.  Your text plan resets on ${requestCompleteionDate} .<br/>  
                                                  If your text limit is reached, please contact your Tap Local Marketing Account Manager at ${getFinalNumber}to perform a text plan upgrade.<br/><br/>
                                                  Customer reach: ${customers.length * getSegments}<br/>
                                                  Remaining messages:<br/> 
                                                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${afterSmsSendLeft}<br/>
                                                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>`
                                                //first threshold
                                                result = {
                                                    leftMessagesAfterSend: afterSmsSendLeft,
                                                    limit: merchantResponse.sms_limit,
                                                    smsSent: merchantResponse.sms_sent,
                                                    message: message,
                                                    cancelFormSubmit: false
                                                }
                                                responseMsg.RESPONSE200.data = result;
                                                return res.status(responseMsg.RESPONSE200.statusCode).send(responseMsg.RESPONSE200);
                                            }  else {
                                                // error
                                                responseMsg.RESPONSE200.data = 'NoPopUp';
                                                return res.status(responseMsg.RESPONSE200.statusCode).send(responseMsg.RESPONSE200);
                                            }
                                        } else if(update) {
                                                                      // check if not possible so no option giving for it
                                            afterSmsSendLeft = getMessageLeft -(customers.length * getSegments)
                                            var checkForOption =(customers.length * getSegments) + getSchedule.willFail 
                                            var message;
                                            console.log("checkForOption" , checkForOption)
                                            //if possible half send and half not checkForOption
                                            
                                            //else updagrade
                                            if(checkForOption == 0 || (getSchedule.maxLimit -merchantResponse.sms_sent) < getSegments ){
                                                message = `You can’t send messages for this Custom Offer.  You’ve sent A LOT of text messages this month which means your customers will be coming in more 
                                                often to redeem those rewards!  The bad news is that you’ve exceeded your monthly text message usage plan.  Your plan permits ${merchantResponse.sms_limit} messages to 
                                                be sent per month and you’ve sent ${merchantResponse.sms_sent} during your current cycle.<br/> 
                                                Don’t worry though, your customers can still redeem and gain promotions.  This just means that no text messages will go out until you give us a call and upgrade your plan or your 
                                                cycle refreshes on ${requestCompleteionDate}.  Please contact TAPLocal Marketing @ ${getFinalNumber} or email us at support@taplocalmarketing.com at your earliest convenience.<br/><br/>
    
                                                Thank you,<br/>
                                                TAPLocal Support<br/><br/>
    
                                                Customer reach: ${(customers.length * getSegments)}<br/>
                                                Remaining messages:<br/> 
                                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${0}<br/>`
                                                result = {
                                                    leftMessagesAfterSend: afterSmsSendLeft,
                                                    limit: merchantResponse.sms_limit,
                                                    smsSent: merchantResponse.sms_sent,
                                                    message: message,
                                                    cancelFormSubmit: true
                                                }
                                            }else if(checkForOption > 0){
                                                                        
                                               
                                                                      
                                                
                                                message = `By sending this message, you are going to exceed your text plan limit. Some of the texts will be sent and some will not be sent. You 
                                                have ${getMessageLeft} texts remaining in your plan and you are trying to send ${customers.length * getSegments} texts. The first  ${getSchedule.willGo}
                                                texts will be sent and the remaining ${ Math.abs(getSchedule.willFail)} texts will not be sent out.<br/> 
                                                ${tierUpgradePossibility ? `Your current customer reach exceeds your remaining text balance. You can upgrade your subscription <a href=%LINKTOUPGRADETIER%>Click here to upgrade</a> or proceed
                                                and be charged an overage fee of $ ${ BigNumber(getSchedule.overageData).minus(ifNewTier.data.subscribed_price).toFixed(2)}` : ""}<br/>
                                                Please contact your Tap Local Marketing Administrator to upgrade your text plan at ${getFinalNumber}.<br/><br/>
                                                
                                                Thank you,<br/>
                                                TAPLocal Support<br/><br/>
                                                Customer reach: ${customers.length * getSegments}<br/>
                                                Remaining messages:<br/> 
                                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${0}<br/>
                                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>
                                                `
                                                result = {
                                                leftMessagesAfterSend: afterSmsSendLeft,
                                                limit: merchantResponse.sms_limit,
                                                smsSent: merchantResponse.sms_sent,
                                                message: message,
                                                cancelFormSubmit: false
                                                }
                                            }else{
                                                message = `Your current customer reach exceeds your remaining text balance. You can upgrade your subscription <a href=%LINKTOUPGRADETIER%>Click here to upgrade</a> or proceed 
                                                and be charged an overage fee of $ ${ BigNumber(getSchedule.overageData).minus(ifNewTier.data.subscribed_price).toFixed(2)}<br/>
                                                Customer reach: ${customers.length * getSegments}<br/>
                                                Remaining messages:<br/> 
                                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${0}<br/>
                                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>
                                                `
                                                result = {
                                                leftMessagesAfterSend: afterSmsSendLeft,
                                                limit: merchantResponse.sms_limit,
                                                smsSent: merchantResponse.sms_sent,
                                                message: message,
                                                cancelFormSubmit: false
                                                }
                                            }
                                            responseMsg.RESPONSE200.data = result;
                                            return res.status(responseMsg.RESPONSE200.statusCode).send(responseMsg
                                                .RESPONSE200);
                                            // var message = tierUpgradePossibility ? 
                                            //   `Your current customer reach exceeds your remaining text balance. You can upgrade your subscription <a href=%LINKTOUPGRADETIER%>Click here to upgrade</a> or 
                                            //   and be charged an overage fee of ${ BigNumber(ifNewTier.overageData).minus(ifNewTier.data.subscribed_price).toFixed(2)}<br/>
                                            //   Customer reach: ${customers.length * getSegments}<br/>
                                            //   Remaining messages:<br/> 
                                            //   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                            //   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${0}<br/>
                                            //   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>
                                            //   Limit : ${merchantResponse.sms_limit}<br/>
                                            //   ` : `You can’t send messages for this Custom Offer.  You’ve sent A LOT of text messages this month which means your customers will be coming in more 
                                            //   often to redeem those rewards!  The bad news is that you’ve exceeded your monthly text message usage plan.  Your plan permits ${merchantResponse.sms_limit} messages to 
                                            //   be sent per month and you’ve sent ${merchantResponse.sms_sent} during your current cycle.<br/> 
                                            //   Don’t worry though, your customers can still redeem and gain promotions.  This just means that no text messages will go out until you give us a call and upgrade your plan or your 
                                            //   cycle refreshes on ${moment(getTier.data.subscription_end_date * 1000).add(1, "days").format("MM-DD-YYYY")}.  Please contact TAPLocal Marketing @ 844-899-8559 or email us at support@taplocalmarketing.com at your earliest convenience.<br/><br/>
    
                                            //   Thank you,<br/>
                                            //   TAPLocal Support<br/><br/>
    
                                            //   Customer reach: ${customers.length * getSegments}<br/>
                                            //   Remaining messages:<br/> 
                                            //   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                            //   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${0}<br/>`
                                            // result = {
                                            //     leftMessagesAfterSend: afterSmsSendLeft,
                                            //     limit: merchantResponse.sms_limit,
                                            //     smsSent: merchantResponse.sms_sent,
                                            //     message: message,
                                            //     cancelFormSubmit: tierUpgradePossibility ? false : true
                                            // }
                                            // responseMsg.RESPONSE200.data = result;
                                            // return res.status(responseMsg.RESPONSE200.statusCode).send(responseMsg.RESPONSE200);
                                        }else{
                                            // responseMsg.RESPONSE400.message = "Some Error Occured";
                                            // res
                                            //   .status(responseMsg.RESPONSE400.statusCode)
                                            //   .send(responseMsg.RESPONSE400);
                                            afterSmsSendLeft = getMessageLeft -(customers.length * getSegments)
                                            var message;
                                            message = `Your current customer reach exceeds your remaining text balance. You can upgrade your subscription <a href=%LINKTOUPGRADETIER%>Click here to upgrade</a>  or proceed 
                                            and be charged an overage fee of $ ${ BigNumber(getSchedule.overageData).minus(ifNewTier.data.subscribed_price).toFixed(2)}<br/>
                                            Customer reach: ${customers.length * getSegments}<br/>
                                            Remaining messages:<br/> 
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${0}<br/>
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>
                                            `
                                            result = {
                                            leftMessagesAfterSend: afterSmsSendLeft,
                                            limit: merchantResponse.sms_limit,
                                            smsSent: merchantResponse.sms_sent,
                                            message: message,
                                            cancelFormSubmit: false
                                            }
                                            responseMsg.RESPONSE200.data = result;
                                            return res.status(responseMsg.RESPONSE200.statusCode).send(responseMsg
                                                .RESPONSE200);
                                        }
                                    }
                                } else {
                                    responseMsg.RESPONSE400.message = "Invalid Merchant";
                                    return res
                                      .status(responseMsg.RESPONSE400.statusCode)
                                      .send(responseMsg.RESPONSE400);
                                 }
                            }).catch(err => {
                                responseMsg.RESPONSE400.message = err.message;
                                return res
                                  .status(responseMsg.RESPONSE400.statusCode)
                                  .send(responseMsg.RESPONSE400);
                            });
                        } catch (error) {
                            responseMsg.RESPONSE400.message = error.message;
                            return res
                              .status(responseMsg.RESPONSE400.statusCode)
                              .send(responseMsg.RESPONSE400);
                        }
                    }).catch(function (err) {
                        responseMsg.RESPONSE400.message = err.message;
                        return res.status(responseMsg.RESPONSE400.statusCode).send(responseMsg.RESPONSE400);
                    })
                }).catch(function (err) {
                    responseMsg.RESPONSE400.message = err.message;
                    return res.status(responseMsg.RESPONSE400.statusCode).send(responseMsg.RESPONSE400);
                });
            } else {
                model.sequelize.query(sql, {
                    replacements: reqMainData,
                    type: model.sequelize.QueryTypes.SELECT
                }).then(function (customers) {
                    console.log(customers)
                    
                    if(customers.length == 0){
                        responseMsg.RESPONSE400.message = "no customers found";
                        return res.status(responseMsg.RESPONSE400.statusCode).send(
                          responseMsg.RESPONSE400);
                      }
                    var afterSmsSendLeft;
                    try {
                        model.tap_merchants.find({
                            attributes: ["sms_limit", "sms_sent", "dba", "sms_unlimited" , "is_training" , "state" , "nick_name" , "timezone"],
                            where: {
                                merchant_id: searchQuery.merchant_id
                            }
                        }).then(async merchantResponse => {
                            if(!merchantResponse.timezone){
                                responseMsg.RESPONSE400.message = "No Timezone Set for your account . Please contact your Tap Local Marketing Account Manager.";
                                return res
                                  .status(responseMsg.RESPONSE400.statusCode)
                                  .send(responseMsg.RESPONSE400);
                             }
                             var checkTimeVaildationResponse = await checkTimeVaildation.checkTimeVaildationForMessages(merchantResponse.timezone)
                             if(!checkTimeVaildationResponse){
                                responseMsg.RESPONSE400.message = 'You can only send messages between 08:00 A.M to 09:00 P.M';
                                return res
                                  .status(responseMsg.RESPONSE400.statusCode)
                                  .send(responseMsg.RESPONSE400);
                             }
                            if (merchantResponse) {
                                if ((merchantResponse.sms_limit == 0 && merchantResponse.sms_unlimited == 1) ||  merchantResponse.is_training == 1) {
                                    responseMsg.RESPONSE200.data = 'NoPopUp';
                                    return res.status(responseMsg.RESPONSE200.statusCode).send(responseMsg.RESPONSE200);
                                } else {
                                    var getHelplineNumberStatus = merchantResponse.state == 'PR' ?  true : false
                                    var getFinalNumber = getHelplineNumberStatus ? '(787)991-7331' : '(844)899-8559'
                                    var sendMessage = req.body.messagetosend.replace("%dbanick%" , merchantResponse.nick_name)
                                    console.log(sendMessage)
                                    var getSegments = await cronHelper.getSegmentsForTextYourCustomers(sendMessage) // okay
                                    var result;
                                    var getMessageLeft = merchantResponse.sms_limit - merchantResponse.sms_sent
                                    // var percentage = ((merchantResponse.sms_sent + (customers.length * getSegments)) /merchantResponse.sms_limit) * 100
                                    //here 
                                    var calculateTotal = BigNumber(merchantResponse.sms_sent).plus(customers.length * getSegments);
                                    var divideByTotal = BigNumber(calculateTotal).dividedBy(merchantResponse.sms_limit);
                                    var percentage = BigNumber(divideByTotal).multipliedBy(100);
                                    console.log("percentage" , percentage.toString() ,getSegments )
                                    //sending possible or not 2 conditions to work on
                                    var update;
                                    var threshold = await cronHelper.getThreshold()
                                    var getTier = await cronHelper.getMerchantSubscriptionDate(searchQuery.merchant_id)
                                    var getSchedule = await cronHelper.getScheduleTiers(getTier.data.schedule_id , calculateTotal , merchantResponse.sms_limit ,  merchantResponse.sms_sent , customers.length * getSegments );
                                    //will get info about the schedule data
                                    console.log(getSchedule)
                                    if(getSchedule.status && getSchedule.willGo != null && getSchedule.willFail != null){
                                      console.log('update message')
                                      update = true
                                      
                                    }else{
                                      console.log('no issue')
                                      update = false
                                      
                                    }
                                        var requestCompleteionDate = "";
                                            var startDate = "";
                                            var currentDate = "";
                                            startDate = moment(
                                                getTier.data.subscription_start_date * 1000
                                            ).format("MM-DD-YYYY");
                                            currentDate = moment().format("MM-DD-YYYY");
                                            console.log("currentDate2-------- ", currentDate);
                                            console.log(
                                                "startDate2-------- ",
                                                startDate
                                            );
                                            if (
                                                Date.parse(startDate) >
                                                Date.parse(currentDate)) {
                                                requestCompleteionDate = moment(getTier.data.subscription_start_date * 1000).format("MM-DD-YYYY");
                                            } else {
                                                requestCompleteionDate = moment(getTier.data.subscription_end_date * 1000).add(1, "days").format("MM-DD-YYYY");
                                            }
                                    var ifNewTier = await cronHelper.checkTierInfo(getTier.data.schedule_id, getTier.data.tier_id, merchantResponse.sms_sent)
                                    var tierUpgradePossibility = ifNewTier.status
                                    if (getMessageLeft >= (customers.length * getSegments)) {
                          
                                        if (((100 - percentage) <= threshold.data.first_threshold_val) && (percentage < 100) && ((
                                            100 - percentage) > threshold.data.second_threshold_val)) {
                                            afterSmsSendLeft = getMessageLeft - (customers.length * getSegments)
                                            var message = tierUpgradePossibility ? `
                                            You have ${threshold.data.first_threshold_val}% remaining of the SMS text messages allowed by your current text plan.  This leaves you with ${merchantResponse.sms_limit - merchantResponse.sms_sent} texts available to send in this cycle.<br/>
                                            Your plan permits ${merchantResponse.sms_limit} messages to be sent and you have sent ${merchantResponse.sms_sent} during
                                            this cycle.  Your text plan resets on ${requestCompleteionDate} .<br/>  
                                            If your text limit is reached, please contact your Tap Local Marketing Account Manager at ${getFinalNumber} to perform a text plan upgrade.<br/><br/>
                                            Customer reach: ${customers.length * getSegments}<br/>
                                            Remaining messages:<br/> 
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${afterSmsSendLeft}<br/>
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>
                                            ` : ` You have ${threshold.data.first_threshold_val}% remaining of the SMS text messages allowed by your current text plan.  This leaves you with ${merchantResponse.sms_limit - merchantResponse.sms_sent} texts available to send in this cycle.<br/>
                                            Your plan permits ${merchantResponse.sms_limit} messages to be sent and you have sent ${merchantResponse.sms_sent} during
                                            this cycle.  Your text plan resets on ${requestCompleteionDate} .<br/>  
                                            If your text limit is reached, please contact your Tap Local Marketing Account Manager at ${getFinalNumber} to perform a text plan upgrade.<br/><br/>
                                            Customer reach: ${customers.length * getSegments}<br/> 
                                            Remaining messages:<br/> 
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${afterSmsSendLeft}<br/>
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>`
                                            //first threshold
                                            result = {
                                                leftMessagesAfterSend: afterSmsSendLeft,
                                                limit: merchantResponse.sms_limit,
                                                smsSent: merchantResponse.sms_sent,
                                                message: message,
                                                cancelFormSubmit: false
                                            }
                                            responseMsg.RESPONSE200.data = result;
                                            return res.status(responseMsg.RESPONSE200.statusCode).send(responseMsg.RESPONSE200);
                                        } else if (((100 - percentage) <= threshold.data.second_threshold_val)) {
                                            afterSmsSendLeft = getMessageLeft - (customers.length * getSegments)
                                            var message = tierUpgradePossibility ? `                  
                                            You have ${threshold.data.second_threshold_val}% remaining of the SMS text messages allowed by your current text plan.  This leaves you with ${merchantResponse.sms_limit - merchantResponse.sms_sent} texts available to send in this cycle.<br/>
                                            Your plan permits ${merchantResponse.sms_limit} messages to be sent and you have sent ${merchantResponse.sms_sent} during
                                            this cycle.  Your text plan resets on ${requestCompleteionDate} .<br/>  
                                            If your text limit is reached, please contact your Tap Local Marketing Account Manager at ${getFinalNumber} to perform a text plan upgrade.<br/><br/>
                                            Customer reach: ${customers.length * getSegments}<br/>
                                            Remaining messages:<br/> 
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${afterSmsSendLeft}<br/>
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>
                                              ` : `You have ${threshold.data.second_threshold_val}% remaining of the SMS text messages allowed by your current text plan.  This leaves you with ${merchantResponse.sms_limit - merchantResponse.sms_sent} texts available to send in this cycle.<br/>
                                              Your plan permits ${merchantResponse.sms_limit} messages to be sent and you have sent ${merchantResponse.sms_sent} during
                                              this cycle.  Your text plan resets on ${requestCompleteionDate} .<br/>  
                                              If your text limit is reached, please contact your Tap Local Marketing Account Manager at ${getFinalNumber} to perform a text plan upgrade.<br/><br/>
                                              Customer reach: ${customers.length * getSegments}<br/>
                                              Remaining messages:<br/> 
                                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${afterSmsSendLeft}<br/>
                                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>`
                                            //first threshold
                                            result = {
                                                leftMessagesAfterSend: afterSmsSendLeft,
                                                limit: merchantResponse.sms_limit,
                                                smsSent: merchantResponse.sms_sent,
                                                message: message,
                                                cancelFormSubmit: false
                                            }
                                            responseMsg.RESPONSE200.data = result;
                                            return res.status(responseMsg.RESPONSE200.statusCode).send(responseMsg.RESPONSE200);
                                        }  else {
                                            // error
                                            responseMsg.RESPONSE200.data = 'NoPopUp';
                                            return res.status(responseMsg.RESPONSE200.statusCode).send(responseMsg.RESPONSE200);
                                        }
                                    } else if(update) {
                                                                  // check if not possible so no option giving for it
                                        afterSmsSendLeft = getMessageLeft -(customers.length * getSegments)
                                        var checkForOption =(customers.length * getSegments) + getSchedule.willFail 
                                        var message;
                                        console.log("checkForOption" , checkForOption)
                                        //if possible half send and half not checkForOption
                                        
                                        //else updagrade
                                        if(checkForOption == 0 || (getSchedule.maxLimit -merchantResponse.sms_sent) < getSegments ){
                                            message = `You can’t send messages for this Custom Offer.  You’ve sent A LOT of text messages this month which means your customers will be coming in more 
                                            often to redeem those rewards!  The bad news is that you’ve exceeded your monthly text message usage plan.  Your plan permits ${merchantResponse.sms_limit} messages to 
                                            be sent per month and you’ve sent ${merchantResponse.sms_sent} during your current cycle.<br/> 
                                            Don’t worry though, your customers can still redeem and gain promotions.  This just means that no text messages will go out until you give us a call and upgrade your plan or your 
                                            cycle refreshes on ${requestCompleteionDate}.  Please contact TAPLocal Marketing @ ${getFinalNumber} or email us at support@taplocalmarketing.com at your earliest convenience.<br/><br/>

                                            Thank you,<br/>
                                            TAPLocal Support<br/><br/>

                                            Customer reach: ${(customers.length * getSegments)}<br/>
                                            Remaining messages:<br/> 
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${0}<br/>`
                                            result = {
                                                leftMessagesAfterSend: afterSmsSendLeft,
                                                limit: merchantResponse.sms_limit,
                                                smsSent: merchantResponse.sms_sent,
                                                message: message,
                                                cancelFormSubmit: true
                                            }
                                        }else if(checkForOption > 0){
                                            
                                         
                                                                  
                                            message = `By sending this message, you are going to exceed your text plan limit. Some of the texts will be sent and some will not be sent. You 
                                            have ${getMessageLeft} texts remaining in your plan and you are trying to send ${customers.length * getSegments} texts. The first  ${getSchedule.willGo}
                                            texts will be sent and the remaining ${ Math.abs(getSchedule.willFail)} texts will not be sent out.<br/> 
                                            ${tierUpgradePossibility ? `Your current customer reach exceeds your remaining text balance. You can upgrade your subscription <a href=%LINKTOUPGRADETIER%>Click here to upgrade</a> or proceed
                                            and be charged an overage fee of $ ${ BigNumber(getSchedule.overageData).minus(ifNewTier.data.subscribed_price).toFixed(2)}` : ""}<br/>
                                            Please contact your Tap Local Marketing Administrator to upgrade your text plan at ${getFinalNumber}.<br/><br/>
                                            
                                            Thank you,<br/>
                                            TAPLocal Support<br/><br/>
                                            Customer reach: ${customers.length * getSegments}<br/>
                                            Remaining messages:<br/> 
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${0}<br/>
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>
                                            `
                                            result = {
                                            leftMessagesAfterSend: afterSmsSendLeft,
                                            limit: merchantResponse.sms_limit,
                                            smsSent: merchantResponse.sms_sent,
                                            message: message,
                                            cancelFormSubmit: false
                                            }
                                        }else{
                                            message = `Your current customer reach exceeds your remaining text balance. You can upgrade your subscription <a href=%LINKTOUPGRADETIER%>Click here to upgrade</a> or proceed 
                                            and be charged an overage fee of $ ${ BigNumber(getSchedule.overageData).minus(ifNewTier.data.subscribed_price).toFixed(2)}<br/>
                                            Customer reach: ${customers.length * getSegments}<br/>
                                            Remaining messages:<br/> 
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${0}<br/>
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>
                                            `
                                            result = {
                                            leftMessagesAfterSend: afterSmsSendLeft,
                                            limit: merchantResponse.sms_limit,
                                            smsSent: merchantResponse.sms_sent,
                                            message: message,
                                            cancelFormSubmit: false
                                            }
                                        }
                                        responseMsg.RESPONSE200.data = result;
                                        return res.status(responseMsg.RESPONSE200.statusCode).send(responseMsg
                                            .RESPONSE200);
                                        // var message = tierUpgradePossibility ? 
                                        //   `Your current customer reach exceeds your remaining text balance. You can upgrade your subscription <a href=%LINKTOUPGRADETIER%>Click here to upgrade</a> or 
                                        //   and be charged an overage fee of ${ BigNumber(ifNewTier.overageData).minus(ifNewTier.data.subscribed_price).toFixed(2)}<br/>
                                        //   Customer reach: ${customers.length * getSegments}<br/>
                                        //   Remaining messages:<br/> 
                                        //   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                        //   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${0}<br/>
                                        //   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>
                                        //   Limit : ${merchantResponse.sms_limit}<br/>
                                        //   ` : `You can’t send messages for this Custom Offer.  You’ve sent A LOT of text messages this month which means your customers will be coming in more 
                                        //   often to redeem those rewards!  The bad news is that you’ve exceeded your monthly text message usage plan.  Your plan permits ${merchantResponse.sms_limit} messages to 
                                        //   be sent per month and you’ve sent ${merchantResponse.sms_sent} during your current cycle.<br/> 
                                        //   Don’t worry though, your customers can still redeem and gain promotions.  This just means that no text messages will go out until you give us a call and upgrade your plan or your 
                                        //   cycle refreshes on ${moment(getTier.data.subscription_end_date * 1000).add(1, "days").format("MM-DD-YYYY")}.  Please contact TAPLocal Marketing @ 844-899-8559 or email us at support@taplocalmarketing.com at your earliest convenience.<br/><br/>

                                        //   Thank you,<br/>
                                        //   TAPLocal Support<br/><br/>

                                        //   Customer reach: ${customers.length * getSegments}<br/>
                                        //   Remaining messages:<br/> 
                                        //   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                        //   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${0}<br/>`
                                        // result = {
                                        //     leftMessagesAfterSend: afterSmsSendLeft,
                                        //     limit: merchantResponse.sms_limit,
                                        //     smsSent: merchantResponse.sms_sent,
                                        //     message: message,
                                        //     cancelFormSubmit: tierUpgradePossibility ? false : true
                                        // }
                                        // responseMsg.RESPONSE200.data = result;
                                        // return res.status(responseMsg.RESPONSE200.statusCode).send(responseMsg.RESPONSE200);
                                    }else{
                                        // responseMsg.RESPONSE400.message = "Some Error Occured";
                                        // res
                                        //   .status(responseMsg.RESPONSE400.statusCode)
                                        //   .send(responseMsg.RESPONSE400);
                                        afterSmsSendLeft = getMessageLeft -(customers.length * getSegments)
                                        var message;
                                        message = `Your current customer reach exceeds your remaining text balance. You can upgrade your subscription <a href=%LINKTOUPGRADETIER%>Click here to upgrade</a> or proceed 
                                        and be charged an overage fee of $ ${ BigNumber(getSchedule.overageData).minus(ifNewTier.data.subscribed_price).toFixed(2)}<br/>
                                        Customer reach: ${customers.length * getSegments}<br/>
                                        Remaining messages:<br/> 
                                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${0}<br/>
                                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>
                                        `
                                        result = {
                                        leftMessagesAfterSend: afterSmsSendLeft,
                                        limit: merchantResponse.sms_limit,
                                        smsSent: merchantResponse.sms_sent,
                                        message: message,
                                        cancelFormSubmit: false
                                        }
                                        responseMsg.RESPONSE200.data = result;
                                        return res.status(responseMsg.RESPONSE200.statusCode).send(responseMsg
                                            .RESPONSE200);
                                    }
                                }
                            } else {
                                responseMsg.RESPONSE400.message = "Invalid Merchant";
                                return res
                                  .status(responseMsg.RESPONSE400.statusCode)
                                  .send(responseMsg.RESPONSE400);
                             }
                        }).catch(err => {
                            responseMsg.RESPONSE400.message = err.message;
                            return res
                              .status(responseMsg.RESPONSE400.statusCode)
                              .send(responseMsg.RESPONSE400);
                        });
                    } catch (error) {
                        responseMsg.RESPONSE400.message = error.message;
                        return res
                          .status(responseMsg.RESPONSE400.statusCode)
                          .send(responseMsg.RESPONSE400);
                    }
                }).catch(function (err) {
                    responseMsg.RESPONSE400.message = err.message;
                    return res.status(responseMsg.RESPONSE400.statusCode).send(responseMsg.RESPONSE400);
                });
            }
        }, (error) => {
            responseMsg.RESPONSE400.message = error.message;
            return res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
        })
            
        } catch (error) {
            responseMsg.RESPONSE400.message = error.message;
            return res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
        }
    },
    teptextschedular: () => {
        return new Promise(function (resolve, reject) {
            gettextmessagedetails().then((merchanttextMessage) => {
                async.forEachOf(merchanttextMessage, function (details, key, callback) {

                    let textmessage = details['message'];

                    let row_id = details['id'];
                    let req = {
                        params: {},
                        query: {},
                        body: {}
                    };
                    //GET NUBMER BY INVOKE
                    req.params.merchant_id = (details.merchant_id) ? (details.merchant_id) : "";
                    req.query.customerName = (details['customer_name']) ? (details['customer_name']) : "";
                    req.query.lastVisited = (details['customer_view_lastDay']) ? details['customer_view_lastDay'] : "";
                    req.query.customerType = (details['customer_profile_type']) ? details['customer_profile_type'] : "";
                    req.query.randomlyCustomer = (details['random_customers']) ? details['random_customers'] : "";
                    req.query.daysOptIn = (details['since_opte_in_date']) ? (details['since_opte_in_date']) : "";
                    req.query.bdStartDate = (details['last_purchase_start_date']) ? details['last_purchase_start_date'] : "";
                    req.query.bdEndtDate = (details['last_purchase_end_date']) ? details['customer_profile_type'] : "";
                    req.query.amountSpent = (details['ammount_spent']) ? details['ammount_spent'] : "";
                    req.query.amountSpentSign = (details['operator']) ? details['operator'] : "";
                    req.query.couponsAvailable = (details['coupen_available']) ? details['coupen_available'] : "";
                    req.query.unfinished_profile = (details['not_finished_profile']) ? details['not_finished_profile'] : "";
                    req.query.zip = (details['zipcode']) ? details['zipcode'] : "";
                    req.query.frominternal = 1;
                    req.query.searchall = (details['selectedNumber'] == 'All') ? 1 : "";

                    module.exports.getcustomerdetails(req).then(async (data) => {

                            updateTablefortapSentnoOffer(details.id).then((datafromupdate) => {
                                module.exports.getcustomerdetails(req).then((data) => {
                                    req.body.phoneNumbers = JSON.stringify(data);
                                    req.body.message = textmessage;
                                    req.body.merchant_id = details.merchant_id;
                                    req.body.external = 1;
                                    module.exports.textYourcustomer(req).then((sentdata) => {
                                        callback();
                                    }, (error) => {
                                        callback();
                                    })

                                }, (error) => {
                                    callback(error);
                                })

                            }, (error) => {
                                callback(error);
                            })
                    })
                }, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve('data succesfully sent');
                    }

                });
            }, (error) => {
                reject(error);
            })
        })
    }
}

const updateTablefortapSentnoOffer = (id) => {
    var rawquery = `UPDATE tap_sentsms_nooffer SET sent_status =  '1'  WHERE id = '${id}'`;
    return new Promise(function (resolve, reject) {
        model.sequelize.query(rawquery).spread((results, metadata) => {
            // Results will be an empty array and metadata will contain the number of affected rows.
            resolve(results);
        }).catch(function (err) {
            reject(err);
        });
    });
}
const updatemerchantsmsdata = (merchantsms, merchant_id, merchantUseEmail) => {
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
const updateMerchantsTrainingData = (merchantsms, merchant_id, merchantUseEmail) => {
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
//get data from nooffer table for schedular
const gettextmessagedetails = () => {
    var today = Math.floor(Date.now() / 1000);
    return new Promise(function (resolve, reject) {
        var noOfferQuery = "SELECT * FROM tap_sentsms_nooffer WHERE  date_time_with_timezone <= :today AND sent_status = '0'";
        model.sequelize
            .query(noOfferQuery, {
                replacements: {
                    today: today
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
}
const getMerchantdetails = (merchant_id) => {
    var today = Math.floor(Date.now() / 1000);
    return new Promise(function (resolve, reject) {
        var getmerchantsms =
            `SELECT sms_limit, sms_limit_perUser, sms_sent, active
            FROM tap_merchants as mer where active = 'true'
            AND taptext_status = 'true' AND merchant_id = :merchant_id`;
        model.sequelize
            .query(getmerchantsms, {
                replacements: {
                    merchant_id: merchant_id
                },
                type: model.sequelize.QueryTypes.SELECT
            })
            .then(function (rows) {
                if (rows.length > 0) {
                    resolve(rows[0]);
                } else {
                    reject("Merchant not active or tap text is not activate");
                }
            })
            .catch(function (err) {
                reject(err);
            });
    });
}

const gettimestampForDays = (days) => {
    days = parseInt(days);
    var d = new Date();
    if (Number.isInteger(days)) {
        d.setDate(d.getDate() - days);
    } else {
        d.setDate(d.getDate() - 5);
    }
    return Math.floor(d.getTime() / 1000);
}
// create a logic to manupulate data for 25sms/second
const sendTextMessageToCustomers = async (AllphoneNumbers, merchantId, textmessage, merchant_customer_limit) => {
    var total = AllphoneNumbers.length;
    var divisibleLength = 25;
    var divison = Math.floor((total) / divisibleLength);
    if (total > 0) {
        try {
            if (divison > 0) {
                for (var i = 0; i <= divison; i++) {
                    if (i == (divison)) {
                        await sendSmstoCustomer((i * divisibleLength), (total - 1), AllphoneNumbers, merchantId, textmessage, merchant_customer_limit);
                    } else {
                        await sendSmstoCustomer((i * divisibleLength), (((i + 1) * divisibleLength) - 1), AllphoneNumbers, merchantId, textmessage, merchant_customer_limit);
                    }
                }

            } else {
                await sendSmstoCustomer(0, (total - 1), AllphoneNumbers, merchantId, textmessage, merchant_customer_limit)
            }
            return 'All SMS sent Succesfully';
        } catch (error) {
            return error;
        }
    } else {
        return 'All SMS sent Succesfully';
    }
}
//sending sms with bunch of 25sms/second 
const sendSmstoCustomer = (start, end, AllphoneNumbers, merchantId, textmessage, merchant_customer_limit) => {

    let errorMessageValues = [];
    let messsageValues = [];
    let phoneNumbers = [];
    let emailValues = [];
    let emailcountsave = 0;
    let smscountsave = 0;
    for (let i = start; i <= end; i++) {
        phoneNumbers.push(AllphoneNumbers[i]);
    }


    //message to customer
    return new Promise(async(resolve, reject) => {
        var getSegmentsForJson = await cronHelper.getSegmentsForTextYourCustomers(textmessage);
        async.forEachOfSeries(phoneNumbers, function (customer, key, callback) {
            let sentSmsDetails = {
                timestamp: moment().unix(),
                merchant_id: merchantId,
                message: textmessage,
                subject: 'no offer',
                sms_segment: getSegmentsForJson,
                price: '0',
                type: 'SMS',
                numMedia: '0'
            }
            let sentErrorSmsDetails = {
                timestamp: moment().unix(),
                merchant_id: merchantId,
                message: textmessage,
                subject: 'no offer',
                sms_segment: getSegmentsForJson,
                price: '0',
                type: 'SMS',
                numMedia: '0'
            }
            let sendingEmail = {
                timestamp: moment().unix(),
                merchant_id: merchantId,
                message: textmessage,
                subject: 'no offer',
                sms_segment: '1',
            }
            console.log("neeeeeeeeeeeeeeeeeeeeeeeeeeee" , customer)
            if (customer.prefContactMethod == 0) {
                sentSms(customer, textmessage, merchant_customer_limit).then(async(sentSMS) => {
                    var getSegments = await cronHelper.getSegmentsForTextYourCustomers(textmessage);
                    smscountsave = smscountsave + getSegments
                    sentSmsDetails.customer_phone = customer.phoneNumber;
                    sentSmsDetails.res_data = JSON.stringify(sentSMS);
                    messsageValues.push(sentSmsDetails);
                    callback();
                },async (error) => {
                    // console.log("error222222222 " , error)
                    // if(error.code){
                    //     var getSegments = await cronHelper.getSegmentsForTextYourCustomers(textmessage);
                    //     smscountsave = smscountsave + getSegments
                    // }else{
                    //    console.log( "false")
                    // }
                    
                    sentErrorSmsDetails.customer_phone = customer.phoneNumber;
                    sentErrorSmsDetails.res_data = JSON.stringify(error);
                    errorMessageValues.push(sentErrorSmsDetails);
                    callback();
                })
            } else if (customer.prefContactMethod == 1) {
                sentEmail(customer, textmessage).then((sentemil) => {
                    emailcountsave++;
                    sendingEmail.customer_phone = customer.phoneNumber;
                    sendingEmail.to = customer.emails;
                    emailValues.push(sendingEmail);
                    callback();
                }, (error) => {
                    sentErrorSmsDetails.customer_phone = customer.phoneNumber;
                    sentErrorSmsDetails.res_data = JSON.stringify(error);
                    errorMessageValues.push(sentErrorSmsDetails);
                    callback();
                })
            } else if (customer.prefContactMethod == 2) {
                Promise.all([
                    // Resolves
                    sentSms(customer, textmessage, merchant_customer_limit),
                    // Rejects after 2 seconds
                    sentEmail(customer, textmessage)
                ].map(p => p.catch(async(error) => {
                    // if(error.code){
                    //     var getSegments = await cronHelper.getSegmentsForTextYourCustomers(textmessage);
                    //     smscountsave = smscountsave + getSegments
                    // }else{
                    //    console.log(false)
                    // }
                    sentErrorSmsDetails.customer_phone = customer.phoneNumber;
                    sentErrorSmsDetails.res_data = JSON.stringify(error);
                    errorMessageValues.push(sentErrorSmsDetails);

                }))).then(async(data) => {
                    if (data[0] !== undefined) {
                        var getSegments = await cronHelper.getSegmentsForTextYourCustomers(textmessage);
                        smscountsave = smscountsave + getSegments
                        sentSmsDetails.customer_phone = customer.phoneNumber;
                        sentSmsDetails.res_data = JSON.stringify(data[0]);
                        messsageValues.push(sentSmsDetails);
                    }
                    if (data[1] !== undefined) {
                        emailcountsave++;
                        sendingEmail.customer_phone = customer.phoneNumber;
                        sendingEmail.to = customer.emails;
                        emailValues.push(sentSmsDetails);
                    }
                    callback();
                })
            } else {
                // reject('prefContactMethod is  null');
                callback();
            }
        }, (error) => {
            if (error) {
                reject(error);
            } else {

                Promise.all([savesentSms(messsageValues), saveErrorSms(errorMessageValues), saveEmail(emailValues)]).then((dataInsert) => {
                    let wait = setTimeout(() => {
                        clearTimeout(wait);
                        resolve(dataInsert);
                    }, timeout);
                }, (error) => {
                    reject(error);
                })
            }

        });
    })
}
//sent sms from twilio and mobisa accoring to carrier
const sentSms = (customers, textmessage, merchant_customer_limit) => {
    let customerNumber = customers.phoneNumber;
    let PuertoRico = helper.PuertoRico(customerNumber);
    let msgcontent = {
        body: textmessage,
        from: from,
        to: customerNumber
    };
    return new Promise(async function (resolve, reject) {
        var customerlimit = 0;
        if (customers.customerConsume != null || customers.customerConsume != '') {
            customerlimit = customers.customerConsume;
        }
        // update the code and check the merchant limit
        console.log("customers, textmessage, merchant_customer_limit" ,customers, textmessage, merchant_customer_limit)
        var getMerchantInfo = await cronHelper.getDba(customers.merchant_id)
        var getMerchantTrainingMode = await trainingMode.checkTrainingMode(customers.merchant_id);
        var getSegmentsBeforeSending = await cronHelper.getSegmentsForTextYourCustomers(textmessage)
        var checkLeftMessages = getMerchantInfo.sms_limit - getMerchantInfo.sms_sent
        console.log("checkLeftMessages" ,checkLeftMessages)
        if(checkLeftMessages >= getSegmentsBeforeSending || (getMerchantInfo.sms_limit == 0 && getMerchantInfo.sms_unlimited == 1) || getMerchantTrainingMode){
            if (customerlimit < merchant_customer_limit) {
                sendSMSwithCheck(customerNumber, PuertoRico).then(function (PuertoRico) {
                    if (PuertoRico) {
                        PuertoRicoSMS(textmessage, customerNumber).then(async function (sentSsms) {
                            if(getMerchantTrainingMode){
                                var updateMerchants = await updateMerchantsTrainingData(getSegmentsBeforeSending, customers.merchant_id, 0)
                                
                            }else{
                                var updateMerchants = await updatemerchantsmsdata(getSegmentsBeforeSending, customers.merchant_id, 0)
                            }
                            resolve(sentSsms);
                        },async function (error) {
                            if(getMerchantTrainingMode){
                                var updateMerchants = await updateMerchantsTrainingData(getSegmentsBeforeSending, customers.merchant_id, 0)
                                
                            }else{
                                var updateMerchants = await updatemerchantsmsdata(getSegmentsBeforeSending, customers.merchant_id, 0)
                            }
                            reject(error);
                        })
                    } else {
                        console.log('data coming from sentSms :', customers);
                        client.messages
                            .create(msgcontent)
                            .then(async message => {
                                if(getMerchantTrainingMode){
                                    var updateMerchants = await updateMerchantsTrainingData(getSegmentsBeforeSending, customers.merchant_id, 0)
                                    
                                }else{
                                    var updateMerchants = await updatemerchantsmsdata(getSegmentsBeforeSending, customers.merchant_id, 0)
                                }
                                resolve(message);
                            })
                            .catch(async function (error) {
                                if(getMerchantTrainingMode){
                                    var updateMerchants = await updateMerchantsTrainingData(getSegmentsBeforeSending, customers.merchant_id, 0)
                                    
                                }else{
                                    var updateMerchants = await updatemerchantsmsdata(getSegmentsBeforeSending, customers.merchant_id, 0)
                                }
                                reject(error);
                            });
                    }
                }, function (error) {
                    reject(error);
                });
            } else {
                reject('Customer SMS limit end ');
            }
        }else{
            reject('Merchant SMS limit end ');
        }
    });

}
const sentEmail = (customer, message) => {

    return new Promise(function (resolve, reject) {
        resolve({});
        // let to = customer.emails;
        // let subject = 'Tap Local';
        // let body = message;
        // helper.sendEmailFromSales(to, subject, body, null, null).then(function (emailsent) {
        //     resolve(emailsent);
        // }, function (error) {
        //     reject(error);
        // });
    });
}
// check carrier lookup from twilio that for 787 and 939 numbers
const sendSMSwithCheck = (to, PuertoRico) => {
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
                resolve(false);
            });
        }
    });
}
// sent PuertoRicoSMS number sms
const PuertoRicoSMS = (message, phone) => {
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
                        reject(data);
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
//save twilio and mobisa number success response in database
const savesentSms = (data) => {
    console.log(data);
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
//save twilio and mobisa number error response in database
const saveErrorSms = (data) => {
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
//save email sent data in database
const saveEmail = (data) => {
    return new Promise((resolve, reject) => {
        model.tap_sent_emails
            .bulkCreate(data)
            .then(function (issendSMSstored) {
                resolve('ok');
            })
            .catch(function (err) {
                reject(err);
            });
    })
}