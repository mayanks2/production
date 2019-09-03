"use strict";

const model = require("../model");
const config = require("../config/config");
const commonFunction = require("../controller/common");
const createApiLogs = require("../controller/common/apiLoggerController");
const bulkSmsCustomOffer = require("../controller/bulkCustomOfferSMS");
const invokeFunction = require("../controller/invoked");
const requestIp = require("request-ip");
const BigNumber = require('bignumber.js')
const publicIp = require("public-ip");
const RES_MESSAGE = require("../language/errorMsg");
const moment = require("moment");
const atob = require("atob");
const unixtimestamp = require("unix-timestamp");
const request = require("request");
const async = require("async");
const multer = require("multer");
const path = require("path");
const responseMsg = require("../language/resMessage");
const crypto = require("crypto");
const helper = require("../controller/common/helper");
var cronHelper = require("../controller/cronsJobs/cronHelpers")
const textyourCustomer = require('../controller/tapTextYoursCustomerController.js');
var timestamp = require("unix-timestamp");
const tierBillingScheduleInfo = require('../controller/tierBillingScheduleInfo.js');
var checkTimeVaildation = require('../controller/common/checkTimeBetween')
const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./uploads");
  },
  filename: function (req, file, callback) {
    const mainFileName =
      file.originalname.replace(path.extname(file.originalname), "") +
      "-" +
      Date.now() +
      path.extname(file.originalname);
    callback(null, mainFileName);
  }
});

module.exports = {
  // 
  getMerchantLimit: async function (req, res) {
    try {
    var result;
    function gettimestampForDays(days) {
      days = parseInt(days);
      var d = new Date();
      if (Number.isInteger(days)) {
        d.setDate(d.getDate() - days);
      } else {
        d.setDate(d.getDate() - 5);
      }
      return Math.floor(d.getTime() / 1000);
    }
    
    var offer = {}
    var sql,
      sql_count = "";
    if (req.body.length) {
      req.body.forEach(function (elements) {
        offer[elements.name] = elements.value
      })
    } else {
      offer = req.body
    }
    console.log(offer)
    var tmpDate = new Date();
    var y = tmpDate.getFullYear();
    var m = tmpDate.getMonth();
    var firstDay = new Date(y, m, 1);
    var lastDay = new Date(y, m + 1, 0);
    lastDay.setHours(23, 59, 59, 999);
    firstDay.setHours(0, 0, 0, 0);
    var timestampStart = timestamp.fromDate(firstDay.toUTCString());
    var timestampEnd = timestamp.fromDate(lastDay.toUTCString());
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
      var array1 = []
      String.prototype.replaceAll = function(search, replacement) {
        var target = this;
        return target.replace(new RegExp(search, 'g'), replacement);
    };
      req.body.forEach(function(getZip){
        if(getZip.name == "zipcode[]"){
           array1.push(getZip.value)
        }
      })
      
      if (offer["customer_name"] !== null && offer["customer_name"] !== "") {
        sql = "Select " + consumeSMSWithJoin +
          "  cm.customer_id,cm.customer_phone,cm.merchant_id, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.prefContactMethod != '3' AND cm.prefContactMethod != '1' AND cm.merchant_id=:merchant_id AND CONCAT(cm.firstName, ' ', cm.lastName)  LIKE :customer_name_like"; //'%' + offer['customer_name'] + '%'
      } else if (offer["last_visited"] !== null && offer["last_visited"] != 0 && offer["last_visited"] !== "") {
        sql = "Select " + consumeSMSWithJoin +
          " customer_id,customer_phone,merchant_id, prefContactMethod,emails from tap_customers_merchant as cm Where optin='1' AND prefContactMethod != '3'  AND prefContactMethod != '1' AND merchant_id=:merchant_id AND  last_visit_at >=:timestamp_last_visit "; //gettimestampForDays(offer['last_visited']
      } else if (offer["customer_type"] !== null && offer["customer_type"] !== "normal" && offer["customer_type"] !== "") {
        sql = "Select " + consumeSMSWithJoin +
          " customer_id,customer_phone,merchant_id, prefContactMethod,emails from tap_customers_merchant as cm Where optin='1' AND prefContactMethod != '3'  AND prefContactMethod != '1' AND merchant_id=:merchant_id  AND type=:customer_type"; //offer['customer_type']
      } else if (offer["randomly_customers_per"] !== null && offer["randomly_customers_per"] !== "" && offer["randomly_customers_per"] != 0) {
        sql_count =
          "Select count(*) as total from tap_customers_merchant Where optin='1' AND prefContactMethod != '3' AND merchant_id=:merchant_id"; // + mysql.escape(offer.merchant_id);
        //limit=parseInt(ceil(((count/100)*offer['randomly_customers_per'])))
        sql = "Select " + consumeSMSWithJoin +
          "  cm.customer_id,cm.customer_phone,cm.merchant_id, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm Where cm.optin='1' AND cm.prefContactMethod != '3'  AND cm.prefContactMethod != '1' AND cm.merchant_id=:merchant_id Order By RAND() Limit 10";
      } else if (offer["zipcode[]"] !== null && offer["zipcode[]"] !== "" && offer["zipcode[]"] !== undefined) {
        sql = "Select " + consumeSMSWithJoin +
          "  cm.customer_id,cm.customer_phone,cm.merchant_id, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1'  AND cm.prefContactMethod != '3'  AND cm.prefContactMethod != '1' AND cm.merchant_id=:merchant_id AND cm.zip IN (:zip)"; //('" + JSON.parse(offer['zipcode']).join("','") + "')";
      } else if (offer["days_optin"] !== null && offer["days_optin"] !== "" && offer["days_optin"] != 0) {
        sql = "Select " + consumeSMSWithJoin +
          " customer_id,customer_phone,merchant_id, prefContactMethod,emails from tap_customers_merchant as cm Where optin='1' AND prefContactMethod != '3'  AND prefContactMethod != '1' AND merchant_id=:merchant_id AND optin_at>=:days_optin"; // + mysql.escape(offer['days_optin']);
      } else if (offer["coupons_available"] !== null && offer["coupons_available"] !== "" && offer["coupons_available"] != 0) {
        sql = "Select " + consumeSMSWithJoin +
          "  cm.customer_id,cm.merchant_id,cm.customer_phone,Count(cm.id) as total_coupon, cm.prefContactMethod,cm.emails  from tap_customers_merchant as cm Inner Join  tap_coupons as c ON (cm.customer_id=c.customer_id AND cm.merchant_id=c.merchant_id)   LEFT JOIN tap_coupons_used as cu ON c.id=cu.coupon_id Where cu.coupon_id IS  NULL AND cm.merchant_id=:merchant_id AND cm.optin='1'   AND cm.prefContactMethod != '3'  AND cm.prefContactMethod != '1'  Group BY cm.customer_id,cm.merchant_id";
        if (offer["coupons_available"] == "1") {
          sql += "  Having Count(cm.id)>=1 and Count(cm.id)<=5";
        } else if (offer["coupons_available"] == "2") {
          sql += "  Having Count(cm.id)>=6 and Count(cm.id)<=10";
        } else if (offer["coupons_available"] == "3") {
          sql += "  Having Count(cm.id)>10";
        }
      } else if (offer["amount_spent"] !== null && offer["amount_spent"] !== "" && offer["amount_spent"] != 0 && offer[
        "amount_spent_sign"] !== null && offer["amount_spent_sign"] !== "") {
        sql = "Select " + consumeSMSWithJoin +
          "  cm.customer_id,cm.customer_phone,cm.merchant_id,sum(co.saleAmount) as total_spent, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where cm.merchant_id=:merchant_id AND cm.optin='1'  AND cm.prefContactMethod != '3'  AND cm.prefContactMethod != '1' group by customer_id,merchant_id";
        if (offer["amount_spent_sign"] == "less") {
          sql += "  Having sum(co.saleAmount)<:amount_spent"; // + mysql.escape(offer['amount_spent']);
        } else if (offer["amount_spent_sign"] == "greater") {
          sql += "  Having sum(co.saleAmount)>:amount_spent"; // + mysql.escape(offer['amount_spent']);
        } else if (offer["amount_spent_sign"] == "equal") {
          sql += "  Having sum(co.saleAmount)=:amount_spent"; // + mysql.escape(offer['amount_spent']);
        }
      } else if (offer["bd_start_date"] !== null && offer["bd_start_date"] !== "" && offer["bd_start_date"] != 0 && offer["bd_end_date"] !==
        null && offer["bd_end_date"] !== "" && offer["bd_end_date"] != 0) {
        //mysql.escape(offer['bd_start_date'])
        sql = "Select " + consumeSMSWithJoin +
          "  cm.customer_id,cm.merchant_id,cm.customer_phone, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where co.created_at>=:bd_start_date AND co.created_at<=:bd_end_date AND cm.merchant_id=:merchant_id AND cm.optin='1'   AND cm.prefContactMethod != '3'  AND cm.prefContactMethod != '1' group by co.customer_id,co.merchant_id";
        //sql="Select cm.customer_id,cm.merchant_id,sum(co.saleAmount) as total_sepnt from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where merchant_id="+mysql.escape(offer.merchant_id)+" group by cm.customer_id,cm.merchant_id Having sum(saleAmount)";
      } else if (offer["unfinished_profile"] !== null && offer["unfinished_profile"] == 'on') {
        sql = "Select " + consumeSMSWithJoin +
          " cm.customer_id,cm.customer_phone,cm.merchant_id, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1'  AND cm.prefContactMethod != '3'  AND cm.prefContactMethod != '1' AND cm.merchant_id=:merchant_id AND cm.profile_completed='0' group by cm.customer_id,cm.merchant_id";
      }
      if (sql_count !== "") {
        //for percentage of customers
        model.sequelize.query(sql_count, {
          replacements: {
            merchant_id: offer.mid
          },
          type: model.sequelize.QueryTypes.SELECT
        }).then(function (rows) {
          if (rows.length > 0) {
            var total = rows[0].total;
            var limit = Math.floor(
              (total / 100) * offer["randomly_customers_per"]);
            sql = "Select " + consumeSMSWithJoin +
              " cm.customer_id,cm.customer_phone,cm.merchant_id, cm.prefContactMethod,cm.emails from tap_customers_merchant as cm Where cm.optin='1' AND cm.prefContactMethod != '3'  AND cm.prefContactMethod != '1' AND cm.merchant_id=:merchant_id Order By RAND() Limit " +
              limit;
            model.sequelize.query(sql, {
              replacements: {
                merchant_id: offer.mid,
                customer_name_like: "%" + offer["customer_name"] + "%",
                timestamp_last_visit: gettimestampForDays(offer["last_visited"]),
                customer_type: offer["customer_type"],
                zip: offer["zipcode[]"] == null || offer["zipcode[]"] == "" || offer["zipcode[]"] == undefined ? "" :  array1, //JSON.parse(offer['zipcode']).join("','"),
                days_optin: Math.round((new Date(offer["days_optin"])).getTime() / 1000),
                amount_spent: offer["amount_spent"],
                bd_start_date: Math.round((new Date(offer["bd_start_date"])).getTime() / 1000),
                bd_end_date: Math.round((new Date(offer["bd_end_date"])).getTime() / 1000) 
              },
              type: model.sequelize.QueryTypes.SELECT
            }).then(function (customers) {
              
              if(customers.length == 0){
                responseMsg.RESPONSE200.data = 'NoPopUp';
                return res.status(responseMsg.RESPONSE200.statusCode).send(responseMsg.RESPONSE200);
             }
              var afterSmsSendLeft;
              try {
                model.tap_merchants.find({
                  attributes: ["sms_limit", "sms_sent", "dba", "sms_unlimited" , "nick_name" , "is_training" , "state" , "timezone"],
                  where: {
                    merchant_id: offer.mid
                  }
                }).then(async merchantResponse => {
                  if (merchantResponse) {
                   var checkTimeVaildationResponse = await checkTimeVaildation.checkTimeVaildationForMessages(offer["time_zone"])
                   if(!checkTimeVaildationResponse && offer["time"] == "start_now"){
                      responseMsg.RESPONSE400.message = 'You can only send offers between 08:00 A.M to 09:00 P.M';
                      return res
                        .status(responseMsg.RESPONSE400.statusCode)
                        .send(responseMsg.RESPONSE400);
                   }
                      if ((merchantResponse.sms_limit == 0 && merchantResponse.sms_unlimited == 1) ||  merchantResponse.is_training == 1) {
                  
                          responseMsg.RESPONSE200.data = 'NoPopUp';
                          return res.status(responseMsg.RESPONSE200.statusCode).send(responseMsg.RESPONSE200);
                      } else {
                        var getHelplineNumberStatus = merchantResponse.state == 'PR' ?  true : false
                        var getFinalNumber = getHelplineNumberStatus ? '(787)991-7331' : '(844)899-8559'
                        var getSegments = await cronHelper.getSegments(customers, offer, merchantResponse);
                        console.log(getSegments.totalSegments)
                        var getMessageLeft = merchantResponse.sms_limit - merchantResponse.sms_sent;
                        // var percentage = (((merchantResponse.sms_sent + getSegments)) / merchantResponse.sms_limit) * 100
                        var calculateTotal = BigNumber(merchantResponse.sms_sent).plus(getSegments.totalSegments);
                        var divideByTotal = BigNumber(calculateTotal).dividedBy(merchantResponse.sms_limit);
                        var percentage = BigNumber(divideByTotal).multipliedBy(100);
                        console.log("percentage" , percentage.toString())
                        //sending possible or not 2 conditions to work on
                        var update;
                        var threshold = await cronHelper.getThreshold();
                        var getTier = await cronHelper.getMerchantSubscriptionDate(offer.mid)
                        console.log(getTier)
                        var getSchedule = await cronHelper.getScheduleTiers(getTier.data.schedule_id , calculateTotal , merchantResponse.sms_limit ,  merchantResponse.sms_sent , getSegments.totalSegments );
                        //will get info about the schedule data
                        console.log(getSchedule)
                        if(getSchedule.status && getSchedule.willGo != null && getSchedule.willFail != null){
                          console.log('update message')
                          update = true
                          
                        }else{
                          console.log('no issu1')
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
                        if (getMessageLeft >= getSegments.totalSegments) {
    
                          if (((100 - percentage) <= threshold.data.first_threshold_val) && (
                            percentage < 100) && ((100 - percentage) > threshold.data
                              .second_threshold_val)) {
                            afterSmsSendLeft = getMessageLeft - getSegments.totalSegments
                            var message = tierUpgradePossibility ? `
                                                      You have ${threshold.data.first_threshold_val}% remaining of the SMS text messages allowed by your current text plan.  This leaves you with ${merchantResponse.sms_limit - merchantResponse.sms_sent} texts available to send in this cycle.<br/>
                                                      Your plan permits ${merchantResponse.sms_limit} messages to be sent and you have sent ${merchantResponse.sms_sent} during
                                                      this cycle.  Your text plan resets on ${requestCompleteionDate} .<br/>  
                                                      If your text limit is reached, please contact your Tap Local Marketing Account Manager at ${getFinalNumber} to perform a text plan upgrade.<br/><br/>
                                                      Customer reach: ${getSegments.totalSegments}<br/>
                                                      Remaining messages:<br/> 
                                                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${afterSmsSendLeft}<br/>
                                                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>
                                                      ` : `       You have ${threshold.data.first_threshold_val}% remaining of the SMS text messages allowed by your current text plan.  This leaves you with ${merchantResponse.sms_limit - merchantResponse.sms_sent} texts available to send in this cycle.<br/>
                                                      Your plan permits ${merchantResponse.sms_limit} messages to be sent and you have sent ${merchantResponse.sms_sent} during
                                                      this cycle.  Your text plan resets on ${requestCompleteionDate} .<br/>  
                                                      If your text limit is reached, please contact your Tap Local Marketing Account Manager at ${getFinalNumber} to perform a text plan upgrade.<br/><br/>
                                                      Customer reach: ${getSegments.totalSegments}<br/> 
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
                            return res.status(responseMsg.RESPONSE200.statusCode).send(
                              responseMsg.RESPONSE200);
                          } else if (((100 - percentage) <= threshold.data.second_threshold_val)) {
                            afterSmsSendLeft = getMessageLeft - getSegments.totalSegments
                            var message = tierUpgradePossibility ? `
                                                              You have ${threshold.data.second_threshold_val}% remaining of the SMS text messages allowed by your current text plan.  This leaves you with ${merchantResponse.sms_limit - merchantResponse.sms_sent} texts available to send in this cycle.<br/>
                                                              Your plan permits ${merchantResponse.sms_limit} messages to be sent and you have sent ${merchantResponse.sms_sent} during
                                                              this cycle.  Your text plan resets on ${requestCompleteionDate} .<br/>  
                                                              If your text limit is reached, please contact your Tap Local Marketing Account Manager at ${getFinalNumber} to perform a text plan upgrade.<br/><br/>
                                                              Customer reach: ${getSegments.totalSegments}<br/>
                                                              Remaining messages:<br/> 
                                                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${afterSmsSendLeft}<br/>
                                                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>
                                                              ` : ` You have ${threshold.data.second_threshold_val}% remaining of the SMS text messages allowed by your current text plan.  This leaves you with ${merchantResponse.sms_limit - merchantResponse.sms_sent} texts available to send in this cycle.<br/>
                                                              Your plan permits ${merchantResponse.sms_limit} messages to be sent and you have sent ${merchantResponse.sms_sent} during
                                                              this cycle.  Your text plan resets on ${requestCompleteionDate} .<br/>  
                                                              If your text limit is reached, please contact your Tap Local Marketing Account Manager at ${getFinalNumber} to perform a text plan upgrade.<br/><br/>
                                                              Customer reach: ${getSegments.totalSegments}<br/>
                                                              Remaining messages:<br/> 
                                                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${afterSmsSendLeft}<br/>
                                                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>`
                            result = {
                              leftMessagesAfterSend: afterSmsSendLeft,
                              limit: merchantResponse.sms_limit,
                              smsSent: merchantResponse.sms_sent,
                              message: message,
                              cancelFormSubmit: false
                            }
                            responseMsg.RESPONSE200.data = result;
                            return res.status(responseMsg.RESPONSE200.statusCode).send(
                              responseMsg.RESPONSE200);
                          } else {
                    
                            responseMsg.RESPONSE200.data = 'NoPopUp';
                            return res.status(responseMsg.RESPONSE200.statusCode).send(
                              responseMsg.RESPONSE200);
                          }
                        } else if(update) {
                          // check if not possible so no option giving for it
                          afterSmsSendLeft = getMessageLeft - getSegments.totalSegments
                          var checkForOption = getSegments.totalSegments + getSchedule.willFail 
                          var message;
                          //if possible half send and half not checkForOption
                          
                          //else updagrade
                          if(checkForOption == 0 || (getSegments.englishMerchantsSegmentCount/getSegments.englishMerchants > (getSchedule.maxLimit -merchantResponse.sms_sent)) || (getSegments.spanishMerchantsSegmentCount/getSegments.spanishMerchants > (getSchedule.maxLimit -merchantResponse.sms_sent)) ){
                              message = `You can’t send messages for this Custom Offer.  You’ve sent A LOT of text messages this month which means your customers will be coming in more 
                              often to redeem those rewards!  The bad news is that you’ve exceeded your monthly text message usage plan.  Your plan permits ${merchantResponse.sms_limit} messages to 
                              be sent per month and you’ve sent ${merchantResponse.sms_sent} during your current cycle.<br/> 
                              Don’t worry though, your customers can still redeem and gain promotions.  This just means that no text messages will go out until you give us a call and upgrade your plan or your 
                              cycle refreshes on ${requestCompleteionDate}.  Please contact TAPLocal Marketing @ ${getFinalNumber} or email us at support@taplocalmarketing.com at your earliest convenience.<br/><br/>

                              Thank you,<br/>
                              TAPLocal Support<br/><br/>

                              Customer reach: ${getSegments.totalSegments}<br/>
                              Remaining messages:<br/> 
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${0}<br/>`
                              result = {
                                leftMessagesAfterSend: afterSmsSendLeft,
                                limit: merchantResponse.sms_limit,
                                smsSent: merchantResponse.sms_sent,
                                message: message,
                                cancelFormSubmit: false
                              }
                          }else if(checkForOption > 0){
                            // console.log(getSchedule)
                            // console.log(getSegments,"xxxxxxxxxxxx")     
                                                  
                            message = `By sending this message, you are going to exceed your text plan limit. Some of the texts will be sent and some will not be sent. You 
                            have ${merchantResponse.sms_limit - merchantResponse.sms_sent} texts remaining in your plan and you are trying to send ${getSegments.totalSegments} texts. The first  ${getSchedule.willGo}
                            texts will be sent and the remaining ${ Math.abs(getSchedule.willFail)} texts will not be sent out.<br/>
                            ${tierUpgradePossibility ? `Your current customer reach exceeds your remaining text balance. You can upgrade your subscription <a href=%LINKTOUPGRADETIER%>Click here to upgrade</a> or proceed
                              and be charged an overage fee of $ ${ BigNumber(getSchedule.overageData).minus(ifNewTier.data.subscribed_price).toFixed(2)}` : ""}<br/>
                            Please contact your Tap Local Marketing Administrator to upgrade your text plan at ${getFinalNumber}.<br/>
                            
                            Customer reach: ${getSegments.totalSegments}<br/>
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
                            Customer reach: ${getSegments.totalSegments}<br/>
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
                        }else{
                          // responseMsg.RESPONSE400.message = "Some Error Occured";
                          // res
                          //   .status(responseMsg.RESPONSE400.statusCode)
                          //   .send(responseMsg.RESPONSE400);
                          var message;
                          afterSmsSendLeft = getMessageLeft - getSegments.totalSegments;
                          message = `Your current customer reach exceeds your remaining text balance. You can upgrade your subscription <a href=%LINKTOUPGRADETIER%>Click here to upgrade</a> or proceed
                          and be charged an overage fee of $ ${ BigNumber(getSchedule.overageData).minus(ifNewTier.data.subscribed_price).toFixed(2)}<br/>
                          Customer reach: ${getSegments.totalSegments}<br/>
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
                    return responseMsg.RESPONSE400.message = "Invalid Merchant";
                    res
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
              //  reject(err);
              responseMsg.RESPONSE400.message = err.message;
              return res
                .status(responseMsg.RESPONSE400.statusCode)
                .send(responseMsg.RESPONSE400);
            });
          } else {
          
            responseMsg.RESPONSE400.message = "No Customer Found";
            return res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          }
        }).catch(function (err) {
          responseMsg.RESPONSE400.message = err.message;
          return res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        });
      } else {
        model.sequelize.query(sql, {
          replacements: {
            merchant_id: offer.mid,
            customer_name_like: "%" + offer["customer_name"] + "%",
            timestamp_last_visit: gettimestampForDays(offer["last_visited"]),
            customer_type: offer["customer_type"],
            zip: offer["zipcode[]"] == null || offer["zipcode[]"] == ""  || offer["zipcode[]"] == undefined ? "" : array1,
            days_optin: Math.round((new Date(offer["days_optin"])).getTime() / 1000),
            amount_spent: offer["amount_spent"],
            bd_start_date: Math.round((new Date(offer["bd_start_date"])).getTime() / 1000),
            bd_end_date: Math.round((new Date(offer["bd_end_date"])).getTime() / 1000) 
          },
          type: model.sequelize.QueryTypes.SELECT
        }).then(function (customers) {
          console.log("customers2" , customers)
          
          if(customers.length == 0){
            responseMsg.RESPONSE200.data = 'NoPopUp';
            return res.status(responseMsg.RESPONSE200.statusCode).send(responseMsg.RESPONSE200);
          }
          var afterSmsSendLeft;
          try {
            model.tap_merchants.find({
              attributes: ["sms_limit", "sms_sent", "dba", "sms_unlimited" , "nick_name" , "is_training", "state" , "timezone"],
              where: {
                merchant_id: offer.mid
              }
            }).then(async merchantResponse => {
              if (merchantResponse) {
               var checkTimeVaildationResponse = await checkTimeVaildation.checkTimeVaildationForMessages(offer["time_zone"])
               if(!checkTimeVaildationResponse && offer["time"] == "start_now"){
                  responseMsg.RESPONSE400.message = 'You can only send Offers between 08:00 A.M to 09:00 P.M';
                  return res
                    .status(responseMsg.RESPONSE400.statusCode)
                    .send(responseMsg.RESPONSE400);
               }
                if ((merchantResponse.sms_limit == 0 && merchantResponse.sms_unlimited == 1) ||  merchantResponse.is_training == 1) {
                  responseMsg.RESPONSE200.data = 'NoPopUp';
                  return res.status(responseMsg.RESPONSE200.statusCode).send(responseMsg.RESPONSE200);
              } else {
                var getHelplineNumberStatus = merchantResponse.state == 'PR' ?  true : false
                var getFinalNumber = getHelplineNumberStatus ? '(787)991-7331' : '(844)899-8559'
                var getSegments = await cronHelper.getSegments(customers, offer, merchantResponse);
                var getMessageLeft = merchantResponse.sms_limit - merchantResponse.sms_sent;
                // var percentage = (((merchantResponse.sms_sent + getSegments)) / merchantResponse.sms_limit) * 100
                var calculateTotal = BigNumber(merchantResponse.sms_sent).plus(getSegments.totalSegments);
                var divideByTotal = BigNumber(calculateTotal).dividedBy(merchantResponse.sms_limit);
                var percentage = BigNumber(divideByTotal).multipliedBy(100);
                console.log("percentage" , percentage.toString())
                //sending possible or not 2 conditions to work on
                var update;
                var threshold = await cronHelper.getThreshold();
                var getTier = await cronHelper.getMerchantSubscriptionDate(offer.mid)
                var getSchedule = await cronHelper.getScheduleTiers(getTier.data.schedule_id , calculateTotal , merchantResponse.sms_limit ,  merchantResponse.sms_sent , getSegments.totalSegments );
                //will get info about the schedule data
                console.log(getSchedule)
                if(getSchedule.status && getSchedule.willGo != null && getSchedule.willFail != null){
                  console.log('update message')
                  update = true
                  
                }else{
                  console.log('no issue2')
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
                if (getMessageLeft >= getSegments.totalSegments) {

                  if (((100 - percentage) <= threshold.data.first_threshold_val) && (
                    percentage < 100) && ((100 - percentage) > threshold.data
                      .second_threshold_val)) {
                    afterSmsSendLeft = getMessageLeft - getSegments.totalSegments
                    var message = tierUpgradePossibility ? `
                                              You have ${threshold.data.first_threshold_val}% remaining of the SMS text messages allowed by your current text plan.  This leaves you with ${merchantResponse.sms_limit - merchantResponse.sms_sent} texts available to send in this cycle.<br/>
                                              Your plan permits ${merchantResponse.sms_limit} messages to be sent and you have sent ${merchantResponse.sms_sent} during
                                              this cycle.  Your text plan resets on ${requestCompleteionDate} .<br/>  
                                              If your text limit is reached, please contact your Tap Local Marketing Account Manager at ${getFinalNumber} to perform a text plan upgrade.<br/><br/>
                                              Customer reach: ${getSegments.totalSegments}<br/>
                                              Remaining messages:<br/> 
                                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${afterSmsSendLeft}<br/>
                                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>
                                              ` : `       You have ${threshold.data.first_threshold_val}% remaining of the SMS text messages allowed by your current text plan.  This leaves you with ${merchantResponse.sms_limit - merchantResponse.sms_sent} texts available to send in this cycle.<br/>
                                              Your plan permits ${merchantResponse.sms_limit} messages to be sent and you have sent ${merchantResponse.sms_sent} during
                                              this cycle.  Your text plan resets on ${requestCompleteionDate} .<br/>  
                                              If your text limit is reached, please contact your Tap Local Marketing Account Manager at ${getFinalNumber}  to perform a text plan upgrade.<br/><br/>
                                              Customer reach: ${getSegments.totalSegments}<br/> 
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
                    return res.status(responseMsg.RESPONSE200.statusCode).send(
                      responseMsg.RESPONSE200);
                  } else if (((100 - percentage) <= threshold.data.second_threshold_val)) {
                    afterSmsSendLeft = getMessageLeft - getSegments.totalSegments
                    var message = tierUpgradePossibility ? `
                                                      You have ${threshold.data.second_threshold_val}% remaining of the SMS text messages allowed by your current text plan.  This leaves you with ${merchantResponse.sms_limit - merchantResponse.sms_sent} texts available to send in this cycle.<br/>
                                                      Your plan permits ${merchantResponse.sms_limit} messages to be sent and you have sent ${merchantResponse.sms_sent} during
                                                      this cycle.  Your text plan resets on ${requestCompleteionDate} .<br/>  
                                                      If your text limit is reached, please contact your Tap Local Marketing Account Manager at ${getFinalNumber}  to perform a text plan upgrade.<br/><br/>
                                                      Customer reach: ${getSegments.totalSegments}<br/>
                                                      Remaining messages:<br/> 
                                                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${afterSmsSendLeft}<br/>
                                                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>
                                                      ` : ` You have ${threshold.data.second_threshold_val}% remaining of the SMS text messages allowed by your current text plan.  This leaves you with ${merchantResponse.sms_limit - merchantResponse.sms_sent} texts available to send in this cycle.<br/>
                                                      Your plan permits ${merchantResponse.sms_limit} messages to be sent and you have sent ${merchantResponse.sms_sent} during
                                                      this cycle.  Your text plan resets on ${requestCompleteionDate} .<br/>  
                                                      If your text limit is reached, please contact your Tap Local Marketing Account Manager at ${getFinalNumber}  to perform a text plan upgrade.<br/><br/>
                                                      Customer reach: ${getSegments.totalSegments}<br/>
                                                      Remaining messages:<br/> 
                                                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                                                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${afterSmsSendLeft}<br/>
                                                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Do you wish to proceed?<br/>`
                    result = {
                      leftMessagesAfterSend: afterSmsSendLeft,
                      limit: merchantResponse.sms_limit,
                      smsSent: merchantResponse.sms_sent,
                      message: message,
                      cancelFormSubmit: false
                    }
                    responseMsg.RESPONSE200.data = result;
                    return res.status(responseMsg.RESPONSE200.statusCode).send(
                      responseMsg.RESPONSE200);
                  } else {
                    responseMsg.RESPONSE200.data = 'NoPopUp';
                    return res.status(responseMsg.RESPONSE200.statusCode).send(
                      responseMsg.RESPONSE200);
                  }
                } else if(update) {
                        // check if not possible so no option giving for it
                        afterSmsSendLeft = getMessageLeft - getSegments.totalSegments
                        var checkForOption = getSegments.totalSegments + getSchedule.willFail 
                        var message;
                        //if possible half send and half not checkForOption
                        
                        //else updagrade
                        if(checkForOption == 0 || (getSegments.englishMerchantsSegmentCount/getSegments.englishMerchants > (getSchedule.maxLimit -merchantResponse.sms_sent)) || (getSegments.spanishMerchantsSegmentCount/getSegments.spanishMerchants > (getSchedule.maxLimit -merchantResponse.sms_sent)) ){
                            message = `You can’t send messages for this Custom Offer.  You’ve sent A LOT of text messages this month which means your customers will be coming in more 
                            often to redeem those rewards!  The bad news is that you’ve exceeded your monthly text message usage plan.  Your plan permits ${merchantResponse.sms_limit} messages to 
                            be sent per month and you’ve sent ${merchantResponse.sms_sent} during your current cycle.<br/> 
                            Don’t worry though, your customers can still redeem and gain promotions.  This just means that no text messages will go out until you give us a call and upgrade your plan or your 
                            cycle refreshes on ${requestCompleteionDate}.  Please contact TAPLocal Marketing @ ${getFinalNumber} or email us at support@taplocalmarketing.com at your earliest convenience.<br/><br/>

                            Thank you,<br/>
                            TAPLocal Support<br/><br/>

                            Customer reach: ${getSegments.totalSegments}<br/>
                            Remaining messages:<br/> 
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Before:${merchantResponse.sms_limit - merchantResponse.sms_sent}<br/>
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; After: ${0}<br/>`
                            result = {
                              leftMessagesAfterSend: afterSmsSendLeft,
                              limit: merchantResponse.sms_limit,
                              smsSent: merchantResponse.sms_sent,
                              message: message,
                              cancelFormSubmit: false
                            }
                        }else if(checkForOption > 0){
                          // console.log(getSchedule)
                          // console.log(getSegments,"xxxxxxxxxxxx")     
                                                
                          message = `By sending this message, you are going to exceed your text plan limit. Some of the texts will be sent and some will not be sent. You 
                          have ${merchantResponse.sms_limit - merchantResponse.sms_sent} texts remaining in your plan and you are trying to send ${getSegments.totalSegments} texts. The first  ${getSchedule.willGo}
                          texts will be sent and the remaining ${ Math.abs(getSchedule.willFail)} texts will not be sent out.<br/>
                          ${tierUpgradePossibility ? `Your current customer reach exceeds your remaining text balance. You can upgrade your subscription <a href=%LINKTOUPGRADETIER%>Click here to upgrade</a> or proceed
                            and be charged an overage fee of $ ${ BigNumber(getSchedule.overageData).minus(ifNewTier.data.subscribed_price).toFixed(2)}` : ""}<br/>
                          Please contact your Tap Local Marketing Administrator to upgrade your text plan at ${getFinalNumber}.<br/>
                          
                          Customer reach: ${getSegments.totalSegments}<br/>
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
                          Customer reach: ${getSegments.totalSegments}<br/>
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
                }else{
                  // responseMsg.RESPONSE400.message = "Some Error Occured";
                  // res
                  //   .status(responseMsg.RESPONSE400.statusCode)
                  //   .send(responseMsg.RESPONSE400);
                  var message;
                  afterSmsSendLeft = getMessageLeft - getSegments.totalSegments;
                  message = `Your current customer reach exceeds your remaining text balance. You can upgrade your subscription <a href=%LINKTOUPGRADETIER%>Click here to upgrade</a> or proceed 
                  and be charged an overage fee of $ ${ BigNumber(getSchedule.overageData).minus(ifNewTier.data.subscribed_price).toFixed(2)}<br/>
                  Customer reach: ${getSegments.totalSegments}<br/>
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
          return res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        });
       }
     });
    } catch (error) {
      responseMsg.RESPONSE400.message = error.message;
      return res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    }
    //catch
  },
  // merchant details by merchant id get method
  merchantDetailsById: function (req, res) {
    commonFunction.generateCouponAndSend(a, b);
  },
  /**
   *
   * @param {*} req
   * @param {*} res
   */
  updatePerformance: function (req, res) {
    const performance = req.body.performance;
    const merchant_id = req.body.merchant_id;
    if (merchant_id && performance == "") {
      responseMsg.RESPONSE400.message =
        "Please provide merchant id and performance";
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    }
    model.tap_merchants
      .update(
        {
          performance: performance
        },
        {
          where: {
            merchant_id: merchant_id
          }
        }
      )
      .then(function (result) {
        responseMsg.OK.message = "Performance Successfully updated";
        res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
      })
      .catch(function (err) {
        responseMsg.RESPONSE400.message = err;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      });
  },
  // merchant current active coupon by merchant id
  MerchantcurrentoffersRDS: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    var merchant_id = req.params.merchant_id;
    model.tap_merchant_offers
      .findAll({
        where: {
          MerchantId: merchant_id,
          active: "true"
        }
      })
      .then(function (result) {
        responseMsg.RESPONSE200.data = result;
        res
          .status(responseMsg.RESPONSE200.statusCode)
          .send(responseMsg.RESPONSE200);
      })
      .catch(function (err) {
        responseMsg.RESPONSE400.message = err;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      });
  },
  // Function to display reporting for dashboard index.
  tapDashboardReportRDS: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    const merchant_id = req.params.merchant_id;
    const type = req.params.type;
    commonFunction
      .selectfilterwise(merchant_id, type)
      .then(function (details) {
        console.log("merchant all details ", details);
        var dataset = {
          total_optins: details.total_optins.total_optins,
          total_revenue: details.total_revenue.total_revenue,
          total_push_notifications: details.total_click.total_click,
          total_optout: 0,
          gotu_push_revenue: details.sql_total_revenue.total_revenue,
          push_revenue: details.sql_push_revenue.total_revenue,
          gotu_revenue: details.sql_gotu_revenue.total_revenue,
          gotu_counter: details.sql_gotu_counter.gotu_counter
        };
        console.log("all data", dataset);
        responseMsg.RESPONSE200.data = dataset;
        responseMsg.RESPONSE200.message = "Merchant data found successfully.!";
        res
          .status(responseMsg.RESPONSE200.statusCode)
          .send(responseMsg.RESPONSE200);
      })
      .catch(err => {
        responseMsg.RESPONSE400.message = err;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      });
  },
  MerchantCurrentOffersReportRDS: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    var merchant_id = req.params.merchant_id;
    model.tap_merchant_offers
      .findAll({
        where: {
          MerchantId: merchant_id,
          active: "true"
        }
      })
      .then(function (result) {
        if (result.length > 0) {
          var recursiveOffers = function (offer_index) {
            if (offer_index == result.length) {
              responseMsg.RESPONSE200.data = result;
              res
                .status(responseMsg.RESPONSE200.statusCode)
                .send(responseMsg.RESPONSE200);
            } else {
              model.tap_coupons
                .findOne({
                  attributes: [
                    [
                      model.sequelize.fn("COUNT", model.sequelize.col("id")),
                      "coupons_sent"
                    ]
                  ],
                  where: {
                    offerid: result[offer_index].dataValues.id,
                    merchant_id: merchant_id
                  }
                })
                .then(function (couponResult) {
                  result[offer_index].dataValues.coupons_sent =
                    couponResult.dataValues.coupons_sent;
                  var sql_coupon_visits =
                    "SELECT COUNT(c.id) AS customer_visits FROM tap_coupons c JOIN tap_coupons_used cu ON c.id=cu.coupon_id WHERE c.offerid=:rowId AND c.merchant_id=:merchant_id";
                  var repData = {
                    rowId: result[offer_index].dataValues.id,
                    merchant_id: merchant_id
                  };

                  model.sequelize
                    .query(sql_coupon_visits, {
                      replacements: repData,
                      type: model.sequelize.QueryTypes.SELECT
                    })
                    .then(function (visitdata) {
                      result[offer_index].dataValues.customer_visits =
                        visitdata[0].customer_visits;
                      var reqMainData = {
                        rowId: result[offer_index].dataValues.id,
                        merchant_id: merchant_id
                      };
                      var sql_revenue =
                        "SELECT SUM(saleAmount) as total_revenue FROM tap_customer_orders WHERE offer_id=:rowId AND merchant_id=:merchant_id";
                      model.sequelize
                        .query(sql_revenue, {
                          replacements: reqMainData,
                          type: model.sequelize.QueryTypes.SELECT
                        })
                        .then(function (revenueData) {
                          console.log("revenueData----------", revenueData);
                          result[offer_index].dataValues.total_revenue =
                            revenueData[0].total_revenue;
                          recursiveOffers(++offer_index);
                        })
                        .catch(function (err) {
                          console.log(
                            "Error----s--------------------------------------------------",
                            err
                          );
                          responseMsg.RESPONSE400.message = err;
                          res
                            .status(responseMsg.RESPONSE400.statusCode)
                            .send(responseMsg.RESPONSE400);
                        });
                    })
                    .catch(function (err) {
                      console.log(
                        "Error------------------------------------------------------",
                        err
                      );
                      responseMsg.RESPONSE400.message = err;
                      res
                        .status(responseMsg.RESPONSE400.statusCode)
                        .send(responseMsg.RESPONSE400);
                    });
                })
                .catch(function (err) {
                  console.log(
                    "Error--3----------------------------------------------------",
                    err
                  );
                  responseMsg.RESPONSE400.message = err;
                  res
                    .status(responseMsg.RESPONSE400.statusCode)
                    .send(responseMsg.RESPONSE400);
                });
            }
          };
          recursiveOffers(0);
        }
      })
      .catch(function (err) {
        console.log(
          "Error--7----------------------------------------------------"
        );
        responseMsg.RESPONSE400.message = err;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      });
  },

  //create PIN for device.
  createDevicePin: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    console.log("merchant id", req.body.merchant_id);
    console.log("request.connection.remoteAddress=================", requestIp);
    console.log(
      "req.header('x-forwarded-for')====",
      req.connection.remoteAddress.split(":").slice(-1)[0]
    );
    const clientIp = requestIp.getClientIp(req);
    const Client_IP = req.connection.remoteAddress.split(":").slice(-1)[0];

    const merchant_id = req.body.merchant_id;
    const device_uuid = req.body.device_uuid;
    if (
      merchant_id == "" ||
      device_uuid == "" ||
      device_uuid == undefined ||
      merchant_id == undefined
    ) {
      responseMsg.RESPONSE400.message = "Merchant id and device id is required";
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      var merchant_pin = commonFunction.randomString(4, "0123456789");
      commonFunction
        .removeUnusedToken(merchant_id, device_uuid)
        .then(function (statusinfo) {
          commonFunction
            .checkDeviceAlredyHavePin(merchant_id, device_uuid)
            .then(
              function (details) {
                if (details != "create_new") {
                  console.log("qwertyuiop");
                  console.log(details.dataValues.pin);
                  details.dataValues.remaing_time;
                  if (details.dataValues.pin) {
                    var today_time = Math.floor(Date.now() / 1000);
                    details.dataValues.remaining_time_second =
                      details.dataValues.expire_on - today_time > 0
                        ? details.dataValues.expire_on - today_time
                        : 1;
                    console.log("providing existing pin....");
                    responseMsg.RESPONSE200.data = details;
                    res
                      .status(responseMsg.RESPONSE200.statusCode)
                      .send(responseMsg.RESPONSE200);
                  } else {
                    commonFunction.createNewPin_and_check(merchant_pin, 0).then(
                      function (rewrite_number) {
                        commonFunction
                          .overwrite_pin(
                            merchant_id,
                            device_uuid,
                            rewrite_number,
                            Client_IP
                          )
                          .then(
                            function (newpindetail) {
                              var today_time = Math.floor(Date.now() / 1000);
                              newpindetail.remaining_time_second =
                                newpindetail.expire_on - today_time > 0
                                  ? newpindetail.expire_on - today_time
                                  : 1;
                              responseMsg.RESPONSE200.data = "";
                              responseMsg.RESPONSE200.data = newpindetail;
                              res
                                .status(responseMsg.RESPONSE200.statusCode)
                                .send(responseMsg.RESPONSE200);
                            },
                            function (error) {
                              responseMsg.RESPONSE400.message = error;
                              res
                                .status(responseMsg.RESPONSE400.statusCode)
                                .send(responseMsg.RESPONSE400);
                            }
                          );
                      },
                      function (error) {
                        responseMsg.RESPONSE400.message = error;
                        res
                          .status(responseMsg.RESPONSE400.statusCode)
                          .send(responseMsg.RESPONSE400);
                      }
                    );
                  }
                } else {
                  commonFunction.createNewPin_and_check(merchant_pin, 0).then(
                    function (unique_pin_number) {
                      console.log("pin_number==========" + unique_pin_number);
                      commonFunction
                        .create_pin(
                          merchant_id,
                          device_uuid,
                          unique_pin_number,
                          Client_IP
                        )
                        .then(
                          function (newpindetail) {
                            var today_time = Math.floor(Date.now() / 1000);
                            newpindetail.remaining_time_second =
                              newpindetail.expire_on - today_time > 0
                                ? newpindetail.expire_on - today_time
                                : 1;
                            responseMsg.RESPONSE200.data = newpindetail;
                            res
                              .status(responseMsg.RESPONSE200.statusCode)
                              .send(responseMsg.RESPONSE200);
                          },
                          function (error) {
                            responseMsg.RESPONSE400.message = error;
                            res
                              .status(responseMsg.RESPONSE400.statusCode)
                              .send(responseMsg.RESPONSE400);
                          }
                        );
                    },
                    function (error) {
                      responseMsg.RESPONSE400.message = error;
                      res
                        .status(responseMsg.RESPONSE400.statusCode)
                        .send(responseMsg.RESPONSE400);
                    }
                  );
                }
              },
              function (error) {
                responseMsg.RESPONSE400.message = error;
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              }
            );
        });
    }
  },

  /**
   *
   *
   * @param {*} req unique_id.
   * @param {*} res  PIN is expired or not.
   */
  ckeckPinExpired: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    const unique_id = req.body.unique_id;
    commonFunction
      .getePinexpireStatus(unique_id)
      .then(function (is_expired) {
        responseMsg.RESPONSE200.data = is_expired;
        res
          .status(responseMsg.RESPONSE200.statusCode)
          .send(responseMsg.RESPONSE200);
      })
      .catch(err => {
        responseMsg.RESPONSE400.message = err;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      });
  },

  /**
   *
   * USED FOR VARIFY THE PIN DURING THE SOCKET CONNECTION.
   * @param {*} req PIN or UNIQUE ID
   * @param {*} res
   */
  getdevicePin: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    const pin = req.body.pin;
    commonFunction
      .varifyPin(pin)
      .then(function (pinDetails) {
        responseMsg.RESPONSE200.data = pinDetails;
        res
          .status(responseMsg.RESPONSE200.statusCode)
          .send(responseMsg.RESPONSE200);
      })
      .catch(err => {
        responseMsg.RESPONSE400.message = err;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      });
  },

  /**
   *
   * Using for release PIN and Unpaired the device.
   * @param {*} req unique_id:String,api_for:String
   * @param {*} res
   */
  releasePin: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    const unique_id = req.body.unique_id;
    const API_FOR = req.body.api_for;
    if (API_FOR == "RELESE_PIN") {
      var pin = req.body.pin;
      //updating field of PIN release.
      commonFunction
        .rleasePin(pin, unique_id)
        .then(function (pinDetails) {
          responseMsg.RESPONSE200.data = pinDetails;
          res
            .status(responseMsg.RESPONSE200.statusCode)
            .send(responseMsg.RESPONSE200);
        })
        .catch(err => {
          responseMsg.RESPONSE400.message = err;
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        });
    } else if (API_FOR == "UNPAIR_DEVICE") {
      //removing all data related to unique_id from table
      commonFunction
        .unPairedDevice(unique_id)
        .then(function (pinDetails) {
          responseMsg.RESPONSE200.data = pinDetails;
          res
            .status(responseMsg.RESPONSE200.statusCode)
            .send(responseMsg.RESPONSE200);
        })
        .catch(err => {
          responseMsg.RESPONSE400.message = err;
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        });
    }
  },
  /**
   * Get number of redeems for physical web campaign
   * @param {*} req merchant_id:String,fromdate:String,todate:String
   * @param {*} res
   */
  getPhysicalWebRedeemStatsByMerchantId: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    delete responseMsg.OK.message;
    var merchantId = req.params.merchant_id ? req.params.merchant_id : "";
    var fromDate = req.query.fromdate ? req.query.fromdate : "";
    var toDate = req.query.todate ? req.query.todate : "";
    getRedeemsCount(merchantId, fromDate, toDate).then(
      function (redeemData) {
        responseMsg.OK.data = {
          redeems: redeemData
        };
        res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
      },
      function (error) {
        responseMsg.RESPONSE400.message = error;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    );
  },
  getPhysicalWebClickStatsByMerchantIdRDS: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    var merchant_id = req.params.merchant_id;
    commonFunction.physicalWebClick(merchant_id).then(
      function (result) {
        responseMsg.RESPONSE200.data = result;
        res
          .status(responseMsg.RESPONSE200.statusCode)
          .send(responseMsg.RESPONSE200);
      },
      function (error) {
        responseMsg.RESPONSE400.message = {
          statusCode: responseMsg.RESPONSE400.statusCode,
          message: error
        };
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    );
  },
  /**
   * Get number of redeems for physical web campaign by invoking
   * @param {*} req merchantId:String,fromdate:String,todate:String
   * @param {*} res
   */
  getPhysicalWebRedeemStatsByMerchantIdInvoke: function (req, callback) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    var merchantId = req.merchantId ? req.merchantId : "";
    var fromDate = req.fromdate ? req.fromdate : "";
    var toDate = req.todate ? req.todate : "";
    getRedeemsCount(merchantId, fromDate, toDate).then(
      function (redeemData) {
        responseMsg.OK.data = {
          redeems: redeemData
        };
        callback(null, responseMsg.OK);
      },
      function (error) {
        responseMsg.RESPONSE400.message = error;
        callback(null, responseMsg.RESPONSE400);
      }
    );
  },
  getPushWebstats: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    let merchantId = req.params.id;
    let fromDate = req.query.fromdate ? req.query.fromdate : "";
    let toDate = req.query.todate ? req.query.todate : "";
    Promise.all([
      commonFunction.physicalWebClick(merchantId),
      getRedeemsCount(merchantId, fromDate, toDate)
    ]).then(
      function (data) {
        responseMsg.OK.data = {
          redeems: redeemData
        };
        RESPONSE.OK.data.clicks = data[0].data;
        RESPONSE.OK.data.redeems = data[1];
        return res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
      },
      function (error) {
        responseMsg.RESPONSE400.message = {
          statusCode: responseMsg.RESPONSE400.statusCode,
          message: error
        };
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    );
  },
  merchantActiveInactivestatusreport: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    var activityDay = req.body.last_login ? req.body.last_login : 0;
    var couponDay = req.body.last_coupon_created
      ? req.body.last_coupon_created
      : 0;
    var customeryDay = req.body.last_optin_order
      ? req.body.last_optin_order
      : 0;
    responseMsg.RESPONSE200.dates = {
      activityDay: activityDay,
      couponDay: couponDay,
      customeryDay: customeryDay
    };
    responseMsg.RESPONSE200.dates = {
      activityDay: activityDay,
      couponDay: couponDay,
      customeryDay: customeryDay
    };
    responseMsg.RESPONSE200.unixdate = {
      loginactivity: moment()
        .subtract(activityDay, "days")
        .unix(),
      coupon: moment()
        .subtract(couponDay, "days")
        .unix(),
      customer: moment()
        .subtract(customeryDay, "days")
        .unix()
    };
    responseMsg.RESPONSE200.unixdate = {
      loginactivity: moment()
        .subtract(activityDay, "days")
        .unix(),
      coupon: moment()
        .subtract(couponDay, "days")
        .unix(),
      customer: moment()
        .subtract(customeryDay, "days")
        .unix()
    };
    Promise.all([
      commonFunction.merchant_activity_detail(activityDay),
      commonFunction.merchant_coupon_detail(couponDay),
      commonFunction.merchant_customers_detail(customeryDay)
    ]).then(
      function (data) {
        var activity = JSON.stringify(data[0]);
        var merchant_Coupon = JSON.stringify(data[1]);
        var customers_details = JSON.stringify(data[2]);

        var parseactivitydata = JSON.parse(activity);
        var perseCoupon = JSON.parse(merchant_Coupon);
        var persecustomers_details = JSON.parse(customers_details);
        commonFunction
          .couponDetailspromise(parseactivitydata, perseCoupon)
          .then(
            function (data) {
              commonFunction
                .customersdetailspromise(data, persecustomers_details)
                .then(
                  function (maindata) {
                    responseMsg.RESPONSE200.message = "Merchant Details";
                    responseMsg.RESPONSE200.data = maindata;
                    return res
                      .status(responseMsg.RESPONSE200.statusCode)
                      .send(responseMsg.RESPONSE200);
                  },
                  function (reject) {
                    responseMsg.RESPONSE400.message = reject;
                    return res
                      .status(responseMsg.RESPONSE400.statusCode)
                      .send(responseMsg.RESPONSE400);
                  }
                );
            },
            function (reject) {
              responseMsg.RESPONSE400.message = reject;
              return res
                .status(responseMsg.RESPONSE400.statusCode)
                .send(responseMsg.RESPONSE400);
            }
          );
      },
      function (reject) {
        responseMsg.RESPONSE400.message = reject;
        return res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    );
  },
  /**
   * Get number of redeems for physical web campaign by invoking
   * @param {*} req merchant_id:String,active:String,coupon_id:Integer
   * @param {*} res
   */
  updateOfferStatus: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    var merchant_id = req.params.merchant_id;
    var active = req.body.active;
    var id = req.params.coupon_id;
    if (!id || !merchant_id) {
      responseMsg.RESPONSE400.message = RES_MESSAGE.ERROR_PARAM_MISSING;
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    }

    if (!active) {
      active = "false";
    } else {
      active = "true";
    }

    model.tap_merchant_offers
      .findAll({
        where: {
          id: id
        }
      })
      .then(function (rows) {
        var data = rows.map(function (rows) {
          return rows.toJSON();
        });
        if (data.length > 0) {
          console.log("tap_merchant_offers : ", data);
          var update_queryParam = {
            active: active
          };
          var update_query = "UPDATE tap_merchant_offers SET active=:active";
          if (active == "false") {
            update_query += ",deactivated_at=:deactivated_at";
            update_queryParam.deactivated_at = Math.floor(Date.now() / 1000);
          }
          update_query += " WHERE id=:id";
          update_queryParam.id = id;
          model.sequelize
            .query(update_query, {
              replacements: update_queryParam,
              type: model.sequelize.QueryTypes.UPDATE
            })
            .then(function (data) {
              responseMsg.OK.message = RES_MESSAGE.RECORD_SAVED;
              res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
            })
            .catch(function (err) {
              responseMsg.RESPONSE400.message = err;
              res
                .status(responseMsg.RESPONSE400.statusCode)
                .send(responseMsg.RESPONSE400);
            });
        } else {
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        }
      })
      .catch(function (err) {
        responseMsg.RESPONSE400.message = err;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      });
  },
  /**
   * Get number of redeems for physical web campaign by invoking
   * @param {*} req merchant_id:String,discount_type:String,coupon_id:Integer
   * @param {*} res
   */
  getMerchantCouponById: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    var offer_id = req.params.coupon_id;
    var Mid = req.params.merchant_id;
    var discount_type = req.query.discount_type ? true : false;

    if (
      !Mid ||
      Mid === "" ||
      Mid.length <= 0 ||
      !offer_id ||
      offer_id === "" ||
      offer_id.length <= 0 ||
      offer_id === "0"
    ) {
      responseMsg.RESPONSE400.message = RES_MESSAGE.ERROR_PARAM_MISSING;
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    }
    getMerchantOffers(Mid, offer_id, discount_type).then(
      function (resolve) {
        delete responseMsg.OK.message;
        responseMsg.OK.data = resolve;
        res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
      },
      function (reject) {
        responseMsg.RESPONSE400.message = reject;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    );
  },
  /**
   * Function for Tap Local Text Reporting
   * @param {*} req merchant_id:String
   * @param {*} res
   */
  tapLocalTextReporting: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    responseMsg.OK.data = {
      total_optins: 0,
      total_visits: 0,
      total_new_members: 0,
      total_casual_customers: 0,
      total_regular_customers: 0,
      total_vip_customers: 0,
      total_normal_customers: 0
    };
    responseMsg.OK.message = RES_MESSAGE.MERCHANT_DATA_FOUND;
    var merchant_id = req.params.merchant_id;
    unixtimestamp.round = true;
    if (merchant_id === "" || merchant_id === undefined) {
      responseMsg.RESPONSE400.message = RES_MESSAGE.ERROR_PARAM_MISSING;
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    }
    var sql_optin =
      "SELECT COUNT(c.id) as total_optin FROM tap_customers c INNER JOIN tap_customers_merchant cm ON c.id=cm.customer_id WHERE  merchant_id=:merchant_id";
    model.sequelize
      .query(sql_optin, {
        replacements: {
          merchant_id: merchant_id
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function (data) {
        responseMsg.OK.data.total_optins = data[0].total_optin;
        var start = new Date();
        start.setHours(0, 0, 0, 0);
        var end = new Date();
        end.setHours(23, 59, 59, 999);
        var firstday_timestamp = unixtimestamp.fromDate(start);
        var lastday_timestamp = unixtimestamp.fromDate(end);
        var sql_total_visits =
          "SELECT COUNT(cv.customer_id) as total_visits FROM tap_customers c INNER JOIN tap_customers_merchant cm ON c.id=cm.customer_id INNER JOIN tab_customers_visitlog cv ON c.id=cv.customer_id WHERE cv.merchant_id=:merchant_id";
        console.log("total visit: " + sql_total_visits);
        model.sequelize
          .query(sql_total_visits, {
            replacements: {
              merchant_id: merchant_id
            },
            type: model.sequelize.QueryTypes.SELECT
          })
          .then(function (data) {
            responseMsg.OK.data.total_visits = data[0].total_visits;
            var sql_new_members =
              "SELECT COUNT(c.id) as total_new_members FROM tap_customers c INNER JOIN tap_customers_merchant cm ON c.id=cm.customer_id WHERE  merchant_id=:merchant_id";
            console.log("total new memenber: " + sql_new_members);
            model.sequelize
              .query(sql_new_members, {
                replacements: {
                  merchant_id: merchant_id
                },
                type: model.sequelize.QueryTypes.SELECT
              })
              .then(function (data) {
                responseMsg.OK.data.total_new_members =
                  data[0].total_new_members;
                var sql_types =
                  "SELECT c.type AS type, COUNT(c.id) as total_count FROM tap_customers_merchant c WHERE c.merchant_id=:merchant_id GROUP BY c.type";
                console.log(sql_types);

                model.sequelize
                  .query(sql_types, {
                    replacements: {
                      merchant_id: merchant_id
                    },
                    type: model.sequelize.QueryTypes.SELECT
                  })
                  .then(function (data) {
                    if (data.length > 0) {
                      var recursiveTypes = function (index) {
                        if (index == data.length) {
                          responseMsg.OK.message =
                            RES_MESSAGE.MERCHANT_DATA_FOUND;
                          res
                            .status(responseMsg.OK.statusCode)
                            .send(responseMsg.OK);
                        } else {
                          switch (data[index].type) {
                            case "regular":
                              responseMsg.OK.data.total_regular_customers =
                                data[index].total_count;
                              break;
                            case "normal":
                              responseMsg.OK.data.total_normal_customers =
                                data[index].total_count;
                              break;
                            case "casual":
                              responseMsg.OK.data.total_casual_customers =
                                data[index].total_count;
                              break;
                            case "vip":
                              responseMsg.OK.data.total_vip_customers =
                                data[index].total_count;
                              break;
                          }
                          recursiveTypes(++index);
                        }
                      };
                      recursiveTypes(0);
                    } else {
                      responseMsg.OK.message = RES_MESSAGE.MERCHANT_DATA_FOUND;
                      res
                        .status(responseMsg.OK.statusCode)
                        .send(responseMsg.OK);
                    }
                  })
                  .catch(function (err) {
                    responseMsg.RESPONSE400.message = err;
                    res
                      .status(responseMsg.RESPONSE400.statusCode)
                      .send(responseMsg.RESPONSE400);
                  });
              })
              .catch(function (err) {
                responseMsg.RESPONSE400.message = err;
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              });
          })
          .catch(function (err) {
            responseMsg.RESPONSE400.message = err;
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          });
      })
      .catch(function (err) {
        responseMsg.RESPONSE400.message = err;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      });
  },
  /**
   * Count clicks of push ads
   * USED for get the number of click of landing page URL.
   * @param {*} req ads-url
   * @param {*} res
   */
  CountPushAdsClicks: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    const ads_name = atob(req.params.ads_url);
    commonFunction.checkAdsalreadyExist(ads_name).then(
      function (isAlreadyExist) {
        console.log("isAlreadyExist...........", isAlreadyExist);
        if (isAlreadyExist == "insert_ad") {
          console.log("insert here with 1 count...");
          commonFunction.createNewAdsRecord(ads_name).then(
            function (insertNewAdsRecord) {
              responseMsg.RESPONSE200.data = insertNewAdsRecord;
              res
                .status(responseMsg.RESPONSE200.statusCode)
                .send(responseMsg.RESPONSE200);
            },
            function (error) {
              responseMsg.RESPONSE400.message = error;
              res
                .status(responseMsg.RESPONSE400.statusCode)
                .send(responseMsg.RESPONSE400);
            }
          );
        } else {
          console.log("update count here..." + isAlreadyExist.click_count);
          commonFunction
            .updateAdsCount(
              isAlreadyExist.click_count,
              isAlreadyExist.id,
              ads_name
            )
            .then(
              function (updateAdsClicksRecord) {
                responseMsg.RESPONSE200.data = updateAdsClicksRecord;
                res
                  .status(responseMsg.RESPONSE200.statusCode)
                  .send(responseMsg.RESPONSE200);
              },
              function (error) {
                responseMsg.RESPONSE400.message = error;
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              }
            );
        }
      },
      function (error) {
        responseMsg.RESPONSE400.message = error;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    );
  },
  /**
   *
   * Used for get the all available offer of merchant
   * @param {*} req merchant_id,
   * @param {*} res
   */
  MerchantAvaliableOffersRDS: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    const Mid = req.params.merchant_id;
    commonFunction.getAllMerchantAvailableOffers(Mid).then(
      function (allCouponsOfMerchant) {
        responseMsg.RESPONSE200.data = allCouponsOfMerchant;
        res
          .status(responseMsg.RESPONSE200.statusCode)
          .send(responseMsg.RESPONSE200);
      },
      function (error) {
        responseMsg.RESPONSE400.message = error;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    );
  },
  /**
   *
   * Used for Create and Update Merchant (RDS).
   * @param {*} req
   * @param {*} res
   */
  MerchantsRDS: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    commonFunction.updateMerchantInfo(req, res).then(
      function (ragistrationStatus) {
        responseMsg.OK.message = "Record saved successfully.";
        res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
      },
      function (error) {
        responseMsg.RESPONSE400.message = error;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    );
  },
  filterCustomerNumberRDS: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    commonFunction.filterCustomerNumber(req, res, {}).then(
      function (datafromcustomeNumber) {
        responseMsg.RESPONSE200.message = RES_MESSAGE.CUSTOMERS_DATA_FOUND;
        responseMsg.RESPONSE200.data = datafromcustomeNumber;
        res
          .status(responseMsg.RESPONSE200.statusCode)
          .send(responseMsg.RESPONSE200);
      },
      function (error) {
        responseMsg.RESPONSE400.message = error;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    );
  },
  /**
   * Function for Tap Local Text Reporting
   * @param {*} req campaign_code:String
   * @param {*} res
   */
  gotuRevenue: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    var campaign_code = req.query.campaign_code;
    var activated = req.query.activated;
    delete responseMsg.OK.message;
    getMerchantId(campaign_code).then(
      function (MerchantDetails) {
        console.log("Merchant_id==" + MerchantDetails[0].merchant_id);
        var query =
          "SELECT IFNULL(SUM(orders.saleAmount),0) as total_sales from tap_customer_orders orders INNER JOIN tap_gotu_campaigns campaign on orders.coupon_id = campaign.campaign_id and campaign.type = 'gotu' WHERE orders.merchant_id = :merchant_id";
        model.sequelize
          .query(query, {
            replacements: {
              merchant_id: MerchantDetails[0].merchant_id
            },
            type: model.sequelize.QueryTypes.SELECT
          })
          .then(function (data) {
            responseMsg.OK.data = data;
            res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
          })
          .catch(function (err) {
            responseMsg.RESPONSE400.message = err;
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          });
      },
      function (error) {
        responseMsg.RESPONSE400.message = error;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    );
  },
  /**
   *
   * Used for update the merchant information using merchant id
   * @param {*} req
   * @param {*} res
   */
  CreateMerchantByIdRDS: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    var _event = null;
    var id = req.params.merchant_id;
    var dba = req.body.dba;
    var email = req.body.email;
    var owner_id = req.body.owner_id;
    var owner_email = req.body.owner_email;
    var goal = req.body.signupgoal
      ? req.body.signupgoal
      : req.body.goal
        ? req.body.goal
        : "";
    var keyword = req.body.keyword !== undefined ? req.body.keyword : "";
    var active = req.body.active;
    var yext = req.body.yext !== undefined ? parseInt(req.body.yext) : null;
    var estimote =
      req.body.estimote !== undefined ? parseInt(req.body.estimote) : null;
    var frequency = req.body.frequency;
    var token = req.body.token;
    var sms_limit =
      req.body.sms_limit && !isNaN(req.body.sms_limit)
        ? parseInt(req.body.sms_limit)
        : null;
    var email_limit =
      req.body.email_limit && !isNaN(req.body.email_limit)
        ? parseInt(req.body.email_limit)
        : null;
    var email_limit_perUser =
      req.body.email_limit_perUser && !isNaN(req.body.email_limit_perUser)
        ? parseInt(req.body.email_limit_perUser)
        : null;
    var sms_limit_perUser =
      req.body.sms_limit_perUser && !isNaN(req.body.sms_limit_perUser)
        ? parseInt(req.body.sms_limit_perUser)
        : null;
    var gotu_id = req.body.gotu_id !== undefined ? req.body.gotu_id : "";
    var clover_mid = req.body.clover_mid ? req.body.clover_mid : "";
    var address1 = req.body.address1 ? req.body.address1 : "";
    var address2 = req.body.address2 ? req.body.address2 : "";
    var address3 = req.body.address3 ? req.body.address3 : "";
    var city = req.body.city ? req.body.city : "";
    var country = req.body.country ? req.body.country : "";
    var state = req.body.state ? req.body.state : "";
    var phoneNumber = req.body.phoneNumber ? req.body.phoneNumber : "";
    var zip = req.body.zip ? req.body.zip : "";
    var first_name = req.body.first_name ? req.body.first_name : "";
    var last_name = req.body.last_name ? req.body.last_name : "";
    var push_active = req.body.push_active ? req.body.push_active : "";
    var push_url = req.body.push_url ? req.body.push_url : "";
    var beacons = req.body.beacons ? req.body.beacons : [];
    var text_active =
      req.body.text_active == "true" ? req.body.text_active : "false";
    _event = req.body;
    var timeZone = req.body.timeZone ? req.body.timeZone : "";
    var smsSent = (req.body.sms_sent || req.body.sms_sent == '0')  ? req.body.sms_sent : null;
    if (!id) {
      responseMsg.RESPONSE400.message = "Missing mandatory fields.";
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    }
    if (
      owner_id !== undefined &&
      owner_id !== null &&
      owner_id !== "" &&
      owner_email !== undefined &&
      owner_email !== null &&
      owner_email !== ""
    ) {
      if (keyword !== "") {
        commonFunction.checkKeyword(id, keyword).then(
          function (resolve_data) {
            console.log("inside checkKeyword....");
            commonFunction.createGlobalMerchant(owner_id, owner_email).then(
              function (resolve_data) {
                console.log("createGlobalMerchant....");
                commonFunction
                  .update_merchant(
                    _event,
                    id,
                    text_active,
                    dba,
                    email,
                    owner_id,
                    owner_email,
                    goal,
                    active,
                    frequency,
                    token,
                    sms_limit,
                    email_limit,
                    email_limit_perUser,
                    sms_limit_perUser,
                    yext,
                    clover_mid,
                    estimote,
                    keyword,
                    gotu_id,
                    address1,
                    address2,
                    address3,
                    city,
                    country,
                    state,
                    phoneNumber,
                    zip,
                    first_name,
                    last_name,
                    push_active,
                    push_url,
                    beacons,
                    timeZone,
                    smsSent
                  )
                  .then(
                    function (resolve) {
                      invokeFunction.UpdateMerchantStatusRDS(id).then(
                        function (info) {
                          console.log("success");
                        },
                        function (error) {
                          console.log("UpdateMerchantStatusRDS", error);
                        }
                      );
                      console.log("update_merchant....");
                      responseMsg.OK.message = "Record Updated successfully.";
                      responseMsg.OK.data = {};
                      responseMsg.OK.data.id = id;
                      responseMsg.OK.data.body = _event;
                      res
                        .status(responseMsg.OK.statusCode)
                        .send(responseMsg.OK);
                    },
                    function (reject) {
                      invokeFunction.UpdateMerchantStatusRDS(id).then(
                        function (info) {
                          console.log("success");
                        },
                        function (error) {
                          console.log("UpdateMerchantStatusRDS", error);
                        }
                      );
                      responseMsg.RESPONSE400.message = reject;
                      res
                        .status(responseMsg.RESPONSE400.statusCode)
                        .send(responseMsg.RESPONSE400);
                    }
                  );
              },
              function (err) {
                console.log("error3");
                responseMsg.RESPONSE400.message = reject;
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              }
            );
          },
          function (reject_msg) {
            console.log("error2");
            responseMsg.RESPONSE400.message = reject_msg;
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          }
        );
      } else {
        console.log("inside keyword else");
        commonFunction.createGlobalMerchant(owner_id, owner_email).then(
          function (resolve) {
            console.log("inside keyword else createGlobalMerchant");
            commonFunction
              .update_merchant(
                _event,
                id,
                text_active,
                dba,
                email,
                owner_id,
                owner_email,
                goal,
                active,
                frequency,
                token,
                sms_limit,
                email_limit,
                email_limit_perUser,
                sms_limit_perUser,
                yext,
                clover_mid,
                estimote,
                keyword,
                gotu_id,
                address1,
                address2,
                address3,
                city,
                country,
                state,
                phoneNumber,
                zip,
                first_name,
                last_name,
                push_active,
                push_url,
                beacons,
                timeZone,
                smsSent
              )
              .then(
                function (resolve) {
                  console.log("inside keyword else update_merchant");
                  invokeFunction.UpdateMerchantStatusRDS(id).then(
                    function (info) {
                      console.log("success");
                    },
                    function (error) {
                      console.log("UpdateMerchantStatusRDS", error);
                    }
                  );
                  responseMsg.OK.message = "Record Updated successfully.";
                  responseMsg.OK.data = {};
                  responseMsg.OK.data.id = id;
                  responseMsg.OK.data.body = _event;
                  res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
                },
                function (reject) {
                  invokeFunction.UpdateMerchantStatusRDS(id).then(
                    function (info) {
                      console.log("success");
                    },
                    function (error) {
                      console.log("UpdateMerchantStatusRDS", error);
                    }
                  );
                  responseMsg.RESPONSE400.message = reject;
                  res
                    .status(responseMsg.RESPONSE400.statusCode)
                    .send(responseMsg.RESPONSE400);
                }
              );
          },
          function (err) {
            responseMsg.RESPONSE400.message = err;
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          }
        );
      }
    } else {
      if (keyword !== "") {
        commonFunction.checkKeyword(id, keyword).then(
          function (resolve) {
            commonFunction
              .update_merchant(
                _event,
                id,
                text_active,
                dba,
                email,
                owner_id,
                owner_email,
                goal,
                active,
                frequency,
                token,
                sms_limit,
                email_limit,
                email_limit_perUser,
                sms_limit_perUser,
                yext,
                clover_mid,
                estimote,
                keyword,
                gotu_id,
                address1,
                address2,
                address3,
                city,
                country,
                state,
                phoneNumber,
                zip,
                first_name,
                last_name,
                push_active,
                push_url,
                beacons,
                timeZone,
                smsSent
              )
              .then(
                function (resolve) {
                  invokeFunction.UpdateMerchantStatusRDS(id).then(
                    function (info) {
                      console.log("success");
                    },
                    function (error) {
                      console.log("UpdateMerchantStatusRDS", error);
                    }
                  );
                  responseMsg.OK.message = "Record Updated successfully.";
                  responseMsg.OK.data = {};
                  responseMsg.OK.data.id = id;
                  responseMsg.OK.data.body = _event;
                  res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
                },
                function (reject) {
                  invokeFunction.UpdateMerchantStatusRDS(id).then(
                    function (info) {
                      console.log("success");
                    },
                    function (error) {
                      console.log("UpdateMerchantStatusRDS", error);
                    }
                  );
                  responseMsg.RESPONSE400.message = reject;
                  res
                    .status(responseMsg.RESPONSE400.statusCode)
                    .send(responseMsg.RESPONSE400);
                }
              );
          },
          function (reject) {
            responseMsg.RESPONSE400.message = reject;
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          }
        );
      } else {
        commonFunction
          .update_merchant(
            _event,
            id,
            text_active,
            dba,
            email,
            owner_id,
            owner_email,
            goal,
            active,
            frequency,
            token,
            sms_limit,
            email_limit,
            email_limit_perUser,
            sms_limit_perUser,
            yext,
            clover_mid,
            estimote,
            keyword,
            gotu_id,
            address1,
            address2,
            address3,
            city,
            country,
            state,
            phoneNumber,
            zip,
            first_name,
            last_name,
            push_active,
            push_url,
            beacons,
            timeZone,
            smsSent
          )
          .then(
            function (resolve) {
              invokeFunction.UpdateMerchantStatusRDS(id).then(
                function (info) {
                  console.log("success");
                },
                function (error) {
                  console.log("UpdateMerchantStatusRDS", error);
                }
              );
              responseMsg.OK.message = "Record Updated successfully.";
              responseMsg.OK.data = {};
              responseMsg.OK.data.id = id;
              responseMsg.OK.data.body = _event;
              res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
            },
            function (reject) {
              invokeFunction.UpdateMerchantStatusRDS(id).then(
                function (info) {
                  console.log("success");
                },
                function (error) {
                  console.log("UpdateMerchantStatusRDS", error);
                }
              );
              responseMsg.RESPONSE400.message = reject;
              res
                .status(responseMsg.RESPONSE400.statusCode)
                .send(responseMsg.RESPONSE400);
            }
          );
      }
    }
  },
  /**
   *USED FOR API AND SCHEDULER TO PROVIDE CUSTOME OFFERS.
   *
   * @param {*} req
   * @param {*} res
   */
  CustomOffer: function (req, res) {
    bulkSmsCustomOffer.callCustomOffers().then(
      function (datafromcustomeNumber) {
        responseMsg.RESPONSE200.message = "Success";
        res
          .status(responseMsg.RESPONSE200.statusCode)
          .send(responseMsg.RESPONSE200);
      },
      function (error) {
        responseMsg.RESPONSE400.message = error;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    );
  },
  /**
   *
   * Upload new image file for offer coupon
   * @param {*} req
   * @param {*} res
   */
  uploadNewImageFile: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    var merchant_id = req.params.merchant_id;
    model.tap_merchants
      .findAll({
        where: {
          active: "true",
          merchant_id: merchant_id
        }
      })
      .then(function (merrow) {
        if (merrow.length > 0) {
          var upload = multer({
            storage: storage,
            limits: {
              fileSize: 500000
            },
            fileFilter: function (req, file, callback) {
              var ext = path.extname(file.originalname);
              if (
                ext !== ".png" &&
                ext !== ".jpg" &&
                ext !== ".gif" &&
                ext !== ".jpeg" &&
                ext !== ".bmp"
              ) {
                return callback(
                  "Only JPG, GIF, PNG or BMP files are allowed !",
                  null
                );
              }
              callback(null, true);
            }
          }).single("upload_drop_file");
          upload(req, res, function (err, data) {
            console.log(err);
            if (err) {
              if (err.message) {
                responseMsg.RESPONSE400.message = err.message;
              } else {
                responseMsg.RESPONSE400.message = err;
              }
              res
                .status(responseMsg.RESPONSE400.statusCode)
                .send(responseMsg.RESPONSE400);
            } else {
              if (req.file.filename) {
                console.log("file name : ", req.file.filename);
                var merchant_id = req.params.merchant_id;
                var imagelog = {
                  Item: {
                    merchant_id: merchant_id,
                    image: req.file.filename,
                    created_at: Math.floor(Date.now() / 1000),
                    image_from: "MERC"
                  }
                };
                model.tap_merchant_image_gallery
                  .create(imagelog.Item)
                  .then(function (result) {
                    responseMsg.RESPONSE200.message =
                      "Image successfully uploaded";
                    responseMsg.RESPONSE200.data = {
                      fileName: req.file.filename,
                      uploadedFileId: result.id
                    };
                    res
                      .status(responseMsg.RESPONSE200.statusCode)
                      .send(responseMsg.RESPONSE200);
                  })
                  .catch(function (err) {
                    responseMsg.RESPONSE400.message = err;
                    res
                      .status(responseMsg.RESPONSE400.statusCode)
                      .send(responseMsg.RESPONSE400);
                  });
              } else {
                responseMsg.RESPONSE400.message = "there is somtheing error!";
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              }
            }
          });
        } else {
          responseMsg.RESPONSE400.message = "Merchant not found or active";
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        }
      })
      .catch(function (err) {
        responseMsg.RESPONSE400.message = err;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
        reject(err);
      });
  },
  /**
   *
   * USED FOR GET ALL MERCHANT LIST WITH FILTRATION.
   * @param {*} req
   * @param {*} res
   */
  GetMerchantsRDS: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    commonFunction.getMerchantList(req, res).then(
      function (responsedetails) {
        res.status(responseMsg.RESPONSE200.statusCode).send(responsedetails);
      },
      function (error) {
        console.log("have error....");
        responseMsg.RESPONSE400.message = error;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    );
  },
  /**
   *
   * @param {*} req
   * @param {*} res
   */
  getMerchantZip: function (req, res) {
    var merchant_id = req.params.merchant_id;
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    commonFunction.getMerchantZip_promise(merchant_id).then(
      function (responsedetails) {
        res.status(responseMsg.RESPONSE200.statusCode).send(responsedetails);
      },
      function (error) {
        responseMsg.RESPONSE400.message = error;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    );
  },
  /**
   * insert merchant offer coupon details
   * @param {*} req
   * @param {*} res
   */
  SaveMerchantCoupon: async function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    console.log("body params" , req.body , req.params)
    var shortUrlInfo = await helper.createCouponShortUrl()
    
    var merchant_id = req.params.merchant_id;
    var sentsmscount = req.body.earn_times ? req.body.earn_times : 0;
    var type = parseInt(req.body.type);
    var coupon_data = req.body.data;
    var min_Purchase = parseFloat(req.body.min_Purchase);
    var min_to_earn =
      req.body.min_to_earn !== undefined ? parseFloat(req.body.min_to_earn) : 0;
    var active = req.body.active;
    var expires = parseInt(req.body.expires);
    var discount_percentage = parseFloat(req.body.discount_percentage);
    var id = req.body.id;
    var background_image = req.body.background_image;
    var coupon_image = req.body.coupon_image;
    var discount_unit = req.body.discount_unit;
    // parameter for MMS implimention
    var reward_text_message_type = req.body.reward_text_message_type;
    var reward_text_media_id = req.body.reward_text_media_id;
    var reward_text_media_image = req.body.reward_text_media_image;

    var before_profile_complete_reward_text_message_type =
      req.body.before_profile_complete_reward_text_message_type;
    var before_profile_complete_reward_text_media_id =
      req.body.before_profile_complete_reward_text_media_id;
    var before_profile_complete_reward_text_media_image =
      req.body.before_profile_complete_reward_text_media_image;

    var spanish_reward_text_message_type =
      req.body.spanish_reward_text_message_type;
    var spanish_reward_text_media_id = req.body.spanish_reward_text_media_id;
    var spanish_reward_text_media_image =
      req.body.spanish_reward_text_media_image;

    var before_profile_complete_spanish_reward_text_message_type =
      req.body.before_profile_complete_spanish_reward_text_message_type;
    var before_profile_complete_spanish_reward_text_media_id =
      req.body.before_profile_complete_spanish_reward_text_media_id;
    var before_profile_complete_spanish_reward_text_media_image =
      req.body.before_profile_complete_spanish_reward_text_media_image;

    // var coupon_header = req.body.coupon_header;

    var background_color = req.body.background_color;
    var button_color = req.body.button_color;
    var discount_name = String(req.body.discount_name).replace(/&#39;/g, "'");
    var description = String(req.body.description).replace(/&#39;/g, "'");
    var reward_text = req.body.reward_text
      ? String(req.body.reward_text).replace(/&#39;/g, "'")
      : "";
    var spanish_reward_text = req.body.spanish_reward_text
      ? String(req.body.spanish_reward_text).replace(/&#39;/g, "'")
      : "";
    var before_profile_complete_reward_text = req.body
      .before_profile_complete_reward_text
      ? String(req.body.before_profile_complete_reward_text).replace(
        /&#39;/g,
        "'"
      )
      : "";
    var before_profile_complete_spanish_reward_text = req.body
      .before_profile_complete_spanish_reward_text
      ? String(req.body.before_profile_complete_spanish_reward_text).replace(
        /&#39;/g,
        "'"
      )
      : "";
    var terms = req.body.terms;
    var start_date = req.body.start_date;
    var end_date =
      req.body.end_date !== undefined && req.body.end_date !== ""
        ? req.body.end_date
        : null;
    var title_color = req.body.title_color;
    var description_color = req.body.description_color;
    var body_color = req.body.body_color;
    var terms_color = req.body.terms_color;
    var time_zone = req.body.time_zone;
    var time = req.body.time;
    var owner_id = req.body.owner_id;
    var spending_period = req.body.spending_period;
    var send_date =
      req.body.send_date !== undefined && req.body.send_date !== ""
        ? parseInt(req.body.send_date)
        : "";
    var zipcode = req.body.zipcode;
    var last_visited =
      req.body.last_visited !== undefined && req.body.last_visited !== ""
        ? parseInt(req.body.last_visited)
        : "";
    var customer_type = req.body.customer_type;
    var randomly_customers_per =
      req.body.randomly_customers_per !== undefined &&
        req.body.randomly_customers_per !== ""
        ? parseInt(req.body.randomly_customers_per)
        : "";
    var coupons_available =
      req.body.coupons_available !== undefined &&
        req.body.coupons_available !== ""
        ? parseInt(req.body.coupons_available)
        : "";
    var unfinished_profile =
      req.body.unfinished_profile !== undefined &&
        req.body.unfinished_profile !== ""
        ? parseInt(req.body.unfinished_profile)
        : ""; // 0 ,1
    var customer_name = req.body.customer_name;
    var days_optin =
      req.body.days_optin !== undefined && req.body.days_optin !== ""
        ? parseInt(req.body.days_optin)
        : null;
    var last_purchase =
      req.body.last_purchase !== undefined && req.body.last_purchase !== ""
        ? parseInt(req.body.last_purchase)
        : null;
    var amount_spent =
      req.body.amount_spent !== undefined && req.body.amount_spent !== ""
        ? parseInt(req.body.amount_spent)
        : null;
    var amount_spent_sign = req.body.amount_spent_sign;
    var spent_amount_end =
      req.body.spent_amount_end !== undefined &&
        req.body.spent_amount_end !== ""
        ? parseInt(req.body.spent_amount_end)
        : "";
    var bd_start_date =
      req.body.bd_start_date !== undefined && req.body.bd_start_date !== ""
        ? parseInt(req.body.bd_start_date)
        : null;
    var bd_end_date =
      req.body.bd_end_date !== undefined && req.body.bd_end_date !== ""
        ? parseInt(req.body.bd_end_date)
        : null;
    var created_at = Math.floor(Date.now() / 1000);
    if (
      (!type && type != 0) ||
      (!expires && expires != 0) ||
      ((!discount_percentage && discount_percentage != 0) ||
        discount_percentage < 0) ||
      !id ||
      !merchant_id ||
      !coupon_data ||
      (!min_Purchase && min_Purchase != 0) ||
      !discount_unit ||
      !discount_name ||
      !description ||
      !start_date ||
      !terms
    ) {
      console.log("check fields" ,      (type , type != 0) ,
      (expires , expires != 0) ,
      ((discount_percentage , discount_percentage != 0) ,
        discount_percentage < 0) ,
      id ,
      merchant_id ,
      coupon_data ,
      (min_Purchase , min_Purchase != 0) ,
      discount_unit ,
      discount_name ,
      description ,
      start_date ,
      terms )
      responseMsg.RESPONSE400.message = RES_MESSAGE.ERROR_PARAM_MISSING;
      return res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    }
    if (!active) {
      active = "false";
    } else {
      active = "true";
    }
    id = id.toString();
    console.log(
      description + " Rew:" + reward_text + "discount:  " + discount_name
    );
    console.log(
      description +
      " Rew:" +
      spanish_reward_text +
      "discount:  " +
      discount_name
    );
    model.tap_merchant_offers
      .findAll({
        where: {
          MerchantId: merchant_id,
          id: id
        }
      })
      .then(function (rows) {
        var data = rows.map(function (rows) {
          return rows.toJSON();
        });
        if (data.length > 0) {
          responseMsg.CUSTOMERROR.message =
            "Offer with provided id already exist";
          res
            .status(responseMsg.CUSTOMERROR.statusCode)
            .send(responseMsg.CUSTOMERROR);
        } else {
          var sql =
            "SELECT * FROM tap_merchant_offers WHERE MerchantId=:MerchantId AND Discount_Type=:Discount_Type AND (start_date + (86400*expires)) > " +
            created_at +
            " AND active='true'";
          var sqlParam = {
            MerchantId: merchant_id,
            Discount_Type: type.toString()
          };
          model.sequelize
            .query(sql, {
              replacements: sqlParam,
              type: model.sequelize.QueryTypes.SELECT
            })
            .then(function (rows) {
              if (rows.length > 0 && type.toString() != "3") {
                responseMsg.CUSTOMERROR.message =
                  "Offer already exist with same discount type for this Merchant.";
                res
                  .status(responseMsg.CUSTOMERROR.statusCode)
                  .send(responseMsg.CUSTOMERROR);
              } else {
                // async waterfall
                //  check if start date is today
                //  no
                //      check if deactivated today
                //          yes
                //              set start time as current time
                //          no
                //              set start time as start of day
                //  yes
                //      set start time as start of day
                async.waterfall(
                  [
                    function (callback) {
                      // check if start date is today
                      var start = new Date();
                      start.setHours(0, 0, 0, 0);
                      var end = new Date();
                      end.setHours(23, 59, 59, 999);
                      console.log(
                        "start.getUnixTime() < start_date && start_date < end.getUnixTime()",
                        start.getUnixTime() +
                        " < " +
                        start_date +
                        " && " +
                        start_date +
                        " < " +
                        end.getUnixTime()
                      );

                      if (
                        start.getUnixTime() <= start_date &&
                        start_date <= end.getUnixTime()
                      ) {
                        // start date is today
                        console.log("start date is today");
                        callback(null, start_date);
                      } else {
                        // check if deactivated today
                        checkDeactivatedToday(
                          merchant_id,
                          start.getUnixTime(),
                          end.getUnixTime(),
                          type.toString()
                        ).then(
                          function (data) {
                            // send current time
                            console.log("this offer was deactivated today");
                            var currentTime = new Date();

                            callback(null, start_date);
                          },
                          function (reject) {
                            console.log("No.. offer was not deactivated today");
                            callback(null, start_date);
                          }
                        );
                      }
                    },
                    function (start_date, callback) {
                      console.log("received Time: ", start_date);
                      var insertparams = {
                        TableName: "tap_merchant_offers",
                        Item: {
                          Discount_Type: type.toString(),
                          Data: coupon_data,
                          expires: expires,
                          active: active,
                          Min_Purchase: min_Purchase,
                          min_to_earn: min_to_earn,
                          MerchantId: merchant_id,
                          Discount_Percentage: discount_percentage,
                          created_at: created_at,
                          discount_unit: discount_unit,
                          discount_name: discount_name,
                          description: description,
                          start_date: start_date,
                          terms: terms
                        }
                      };
                      // coupon header
                      // if (coupon_header && coupon_header != undefined) {
                      //   insertparams.Item["coupon_header"] = coupon_header;
                      // }
                      // Prepare MMS implimention data
                      if (
                        reward_text_message_type &&
                        reward_text_message_type != undefined
                      ) {
                        insertparams.Item[
                          "reward_text_message_type"
                        ] = reward_text_message_type;
                      }
                      if (
                        reward_text_media_id &&
                        reward_text_media_id != undefined
                      ) {
                        insertparams.Item[
                          "reward_text_media_id"
                        ] = reward_text_media_id;
                      }
                      if (
                        reward_text_media_image &&
                        reward_text_media_image != undefined
                      ) {
                        insertparams.Item[
                          "reward_text_media_image"
                        ] = reward_text_media_image;
                      }

                      if (
                        before_profile_complete_reward_text_message_type &&
                        before_profile_complete_reward_text_message_type !=
                        undefined
                      ) {
                        insertparams.Item[
                          "before_profile_complete_reward_text_message_type"
                        ] = before_profile_complete_reward_text_message_type;
                      }
                      if (
                        before_profile_complete_reward_text_media_id &&
                        before_profile_complete_reward_text_media_id !=
                        undefined
                      ) {
                        insertparams.Item[
                          "before_profile_complete_reward_text_media_id"
                        ] = before_profile_complete_reward_text_media_id;
                      }
                      if (
                        before_profile_complete_reward_text_media_image &&
                        before_profile_complete_reward_text_media_image !=
                        undefined
                      ) {
                        insertparams.Item[
                          "before_profile_complete_reward_text_media_image"
                        ] = before_profile_complete_reward_text_media_image;
                      }

                      if (
                        spanish_reward_text_message_type &&
                        spanish_reward_text_message_type != undefined
                      ) {
                        insertparams.Item[
                          "spanish_reward_text_message_type"
                        ] = spanish_reward_text_message_type;
                      }
                      if (
                        spanish_reward_text_media_id &&
                        spanish_reward_text_media_id != undefined
                      ) {
                        insertparams.Item[
                          "spanish_reward_text_media_id"
                        ] = spanish_reward_text_media_id;
                      }
                      if (
                        spanish_reward_text_media_image &&
                        spanish_reward_text_media_image != undefined
                      ) {
                        insertparams.Item[
                          "spanish_reward_text_media_image"
                        ] = spanish_reward_text_media_image;
                      }

                      if (
                        before_profile_complete_spanish_reward_text_message_type &&
                        before_profile_complete_spanish_reward_text_message_type !=
                        undefined
                      ) {
                        insertparams.Item[
                          "before_profile_complete_spanish_reward_text_message_type"
                        ] = before_profile_complete_spanish_reward_text_message_type;
                      }
                      if (
                        before_profile_complete_spanish_reward_text_media_id &&
                        before_profile_complete_spanish_reward_text_media_id !=
                        undefined
                      ) {
                        insertparams.Item[
                          "before_profile_complete_spanish_reward_text_media_id"
                        ] = before_profile_complete_spanish_reward_text_media_id;
                      }
                      if (
                        before_profile_complete_spanish_reward_text_media_image &&
                        before_profile_complete_spanish_reward_text_media_image !=
                        undefined
                      ) {
                        insertparams.Item[
                          "before_profile_complete_spanish_reward_text_media_image"
                        ] = before_profile_complete_spanish_reward_text_media_image;
                      }

                      if (end_date && end_date !== null) {
                        insertparams.Item["end_date"] = end_date;
                      }

                      if (sentsmscount && sentsmscount !== null) {
                        insertparams.Item["sent_count"] = sentsmscount;
                      }

                      if (reward_text && reward_text != undefined) {
                        insertparams.Item["reward_text"] = reward_text;
                      }
                      if (
                        spanish_reward_text &&
                        spanish_reward_text != undefined
                      ) {
                        insertparams.Item[
                          "spanish_reward_text"
                        ] = spanish_reward_text;
                      }
                      if (
                        before_profile_complete_reward_text &&
                        before_profile_complete_reward_text != undefined
                      ) {
                        insertparams.Item[
                          "before_profile_complete_reward_text"
                        ] = before_profile_complete_reward_text;
                      }
                      if (
                        before_profile_complete_spanish_reward_text &&
                        before_profile_complete_spanish_reward_text != undefined
                      ) {
                        insertparams.Item[
                          "before_profile_complete_spanish_reward_text"
                        ] = before_profile_complete_spanish_reward_text;
                      }

                      if (spending_period && spending_period != undefined) {
                        insertparams.Item.spending_period = spending_period;
                      }
                      if (button_color && button_color != undefined) {
                        insertparams.Item.button_color = button_color;
                      }
                      if (background_color && background_color != undefined) {
                        insertparams.Item.background_color = background_color;
                      }
                      if (coupon_image && coupon_image != undefined) {
                        insertparams.Item.coupon_image = coupon_image;
                      }
                      if (background_image && background_image != undefined) {
                        insertparams.Item.background_image = background_image;
                      }
                      if (title_color && title_color != undefined) {
                        insertparams.Item.title_color = title_color;
                      }
                      if (description_color && description_color != undefined) {
                        insertparams.Item.description_color = description_color;
                      }
                      if (body_color && body_color != undefined) {
                        insertparams.Item.body_color = body_color;
                      }
                      if (terms_color && terms_color != undefined) {
                        insertparams.Item.terms_color = terms_color;
                      }
                      if (time_zone && time_zone != undefined) {
                        insertparams.Item.time_zone = time_zone;
                      }
                      if (time && time != undefined) {
                        insertparams.Item.time = time;
                      }
                      if (owner_id && owner_id != undefined) {
                        insertparams.Item.global_owner_id = owner_id;
                      }
                      if (send_date && send_date != undefined) {
                        insertparams.Item.send_date = send_date;
                      }
                      if (zipcode && zipcode != undefined) {
                        insertparams.Item.zipcode = zipcode;
                      }
                      if (last_visited && last_visited != undefined) {
                        insertparams.Item.last_visited = last_visited;
                      }
                      if (customer_type && customer_type != undefined) {
                        insertparams.Item.customer_type = customer_type;
                      }
                      if (
                        randomly_customers_per &&
                        randomly_customers_per != undefined
                      ) {
                        insertparams.Item.randomly_customers_per = randomly_customers_per;
                      }
                      if (coupons_available && coupons_available != undefined) {
                        insertparams.Item.coupons_available = coupons_available;
                      }
                      if (
                        (unfinished_profile &&
                          unfinished_profile != undefined) ||
                        unfinished_profile === 0
                      ) {
                        insertparams.Item.unfinished_profile = unfinished_profile;
                      }
                      if (customer_name && customer_name != undefined) {
                        insertparams.Item.customer_name = customer_name;
                      }
                      if (days_optin && days_optin != undefined) {
                        insertparams.Item.days_optin = days_optin;
                      }
                      if (last_purchase && last_purchase != undefined) {
                        insertparams.Item.last_purchase = last_purchase;
                      }
                      if (amount_spent && amount_spent != undefined) {
                        insertparams.Item.amount_spent = amount_spent;
                      }
                      if (amount_spent_sign && amount_spent_sign != undefined) {
                        insertparams.Item.amount_spent_sign = amount_spent_sign;
                      }
                      if (spent_amount_end && spent_amount_end != undefined) {
                        insertparams.Item.spent_amount_end = spent_amount_end;
                      }
                      if (bd_start_date && bd_start_date != undefined) {
                        insertparams.Item.bd_start_date = bd_start_date;
                      }
                      if (bd_end_date && bd_end_date != undefined) {
                        insertparams.Item.bd_end_date = bd_end_date;
                      }
                        console.log("Call shortUrlInfo================>", shortUrlInfo);
                        insertparams.Item.coupon_short_url = shortUrlInfo.short_url;
                        insertparams.Item.offer_coupon_guid = shortUrlInfo.offer_guid;

                      model.tap_merchant_offers
                        .create(insertparams.Item)
                        .then(function (info1) {
                          var insertparams = {
                            TableName: "tap_offer_activation",
                            Item: {
                              activate_at: start_date,
                              offerid: info1.insertId
                            }
                          };
                          model.tap_offer_activation
                            .create(insertparams.Item)
                            .then(function (info2) {
                              callback(null , {info1 , info2});
                            })
                            .catch(function (err) {
                              callback(err);
                            });
                        })
                        .catch(function (err) {
                          
                          callback(err);
                        });
                    }
                  ],
                  async function (err, result) {
                    console.log("err"  , err)
                    console.log("result"  , result)
                    
                    if (err) {
                      responseMsg.ERROR.message = err;
                   
                      return res
                        .status(responseMsg.RESPONSE400.statusCode)
                        .send(responseMsg.RESPONSE400);
                    }
                    //call function to update the segment and character count 
                    var updateSegmentAndCharacterCount = await helper.updateSegmentAndCharacterCount(result.info1.id ,result.info1.Discount_Type , result.info1.MerchantId ,result.info1.reward_text , result.info1.coupon_short_url )    
                    responseMsg.OK.message = RES_MESSAGE.RECORD_SAVED;
                    return res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
                  }
                );
              }
            })
            .catch(function (err) {
              responseMsg.RESPONSE400.message = err;
              return res
                .status(responseMsg.RESPONSE400.statusCode)
                .send(responseMsg.RESPONSE400);
            });
        }
      })
      .catch(function (err) {
        responseMsg.RESPONSE400.message = err;
        return res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      });
  },
  /**
   *
   * Used for login non clover merchant from dashboard and boarding.
   * @param {*} req merchant_id,merchant_login & token
   * @param {*} res
   */
  boardingloginRDS: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    var merchant_id = req.params.merchant_id;
    var typeMode = req.body.merchant_login;
    var login_token = req.body.token;

    if (typeMode == "merchnat_login") {
      console.log("in boarding : " + merchant_id);
      console.log("in boarding : " + login_token);
      commonFunction.getmerchantDetails(merchant_id).then(
        function (resolve) {
          console.log("length : " + resolve);
          if (resolve > 0) {
            commonFunction.updateMerchantToken(merchant_id, login_token).then(
              function (affectedRows) {
                if (affectedRows === 1) {
                  responseMsg.OK.message = "Record update successfully.";
                  res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
                } else {
                  responseMsg.RESPONSE400.message = "not updated";
                  res
                    .status(responseMsg.RESPONSE400.statusCode)
                    .send(responseMsg.RESPONSE400);
                }
              },
              function (reject) {
                responseMsg.RESPONSE400.message = reject;
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              }
            );
          } else {
            responseMsg.RESPONSE400.message = "Token Already Used.";
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          }
        },
        function (reject) {
          responseMsg.RESPONSE400.message = reject;
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        }
      );
    }
    if (typeMode == "dashboardlogin") {
      console.log("in dahboard : " + merchant_id);
      console.log("in dahboard : " + login_token);
      commonFunction.getmerchantDetailslogin(merchant_id, login_token).then(
        function (mdata) {
          console.log("=====================11length : " + mdata.length);
          if (mdata.length > 0) {
            commonFunction.updateMerchantTokenafterlogin(merchant_id).then(
              function (affectedRows) {
                if (affectedRows === 1) {
                  responseMsg.OK.message = "Record update successfully.";
                  responseMsg.OK.data = mdata;
                  res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
                } else {
                  responseMsg.RESPONSE400.message = "not updated";
                  res
                    .status(responseMsg.RESPONSE400.statusCode)
                    .send(responseMsg.RESPONSE400);
                }
              },
              function (reject) {
                responseMsg.RESPONSE400.message = reject;
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              }
            );
          } else {
            responseMsg.RESPONSE400.message = "Token Already Used.";
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          }
        },
        function (reject) {
          responseMsg.RESPONSE400.message = reject;
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        }
      );
    }
  },
  /**
   *
   * Get All merchant offers records
   * @param {*} req
   * @param {*} res
   */
  MerchantOffersRDS: function (req, res) {
    var today = Math.floor(Date.now() / 1000);
    const Mid = req.params.merchant_id;
    var types = [];
    if (req.query.types) {
      types = JSON.parse(req.query.types);
    }
    var inactives = event.inactives;
    var limit = parseInt(event.limit);
    var offset = event.offset;
    if (!Mid) {
      return callback(JSON.stringify(RESPONSE.ParamMissing));
    }
  },
  /**
   * create YEXT user
   * @param {*} req
   * @param {*} res
   */
  createYextUser: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    console.log(req.body);
    var merchant_id = req.params.merchant_id;
    var user_id = req.body.user_id;
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var emailAddress = req.body.emailAddress;
    var phoneNumber = req.body.phoneNumber;
    var yextLocationId = req.body.yext_location_id;
    if (
      !merchant_id ||
      !user_id ||
      !firstName ||
      !lastName ||
      !emailAddress ||
      !yextLocationId
    ) {
      responseMsg.RESPONSE400.message = RES_MESSAGE.ERROR_PARAM_MISSING;
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      var requestData = {
        id: user_id,
        firstName: firstName,
        lastName: lastName,
        username: emailAddress,
        emailAddress: emailAddress,
        sso: false,
        acl: [
          {
            roleId: config.app.roleId,
            roleName: config.app.roleName,
            on: yextLocationId,
            accountId: config.app.yextAccountid,
            onType: config.app.onType
          }
        ]
      };
      console.log(requestData);
      try {
        request.post(
          {
            headers: {
              "content-type": "application/json"
            },
            url:
              config.app.yexUserURL +
              "?api_key=" +
              config.app.yextAPIKey +
              "&v=" +
              config.app.yextVersion,
            body: requestData,
            json: true
          },
          (error, response, body) => {
            if (error) {
              res
                .status(responseMsg.RESPONSE400.statusCode)
                .send(responseMsg.RESPONSE400);
            } else {
              console.log(body);
              if (body.meta.errors.length > 0) {
                responseMsg.RESPONSE400.errors = body.meta.errors;
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              } else if (body.response.id) {
                model.tap_merchants
                  .update(
                    {
                      yext_user_id: body.response.id,
                      yext_user_creation_process: "1"
                    },
                    {
                      where: {
                        merchant_id: merchant_id
                      }
                    }
                  )
                  .then(function (data) {
                    responseMsg.OK.message = "new yext user created.";
                    responseMsg.OK.data = body.response;
                    res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
                  })
                  .catch(function (err) {
                    console.log(err);
                    res
                      .status(responseMsg.RESPONSE400.statusCode)
                      .send(responseMsg.RESPONSE400);
                  });
              } else {
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              }
            }
          }
        );
      } catch (e) {
        console.log(e);
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    }
  },
  /**
   * Save YEXT user
   * @param {*} req
   * @param {*} res
   */
  saveYextUser: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    console.log(req.body);
    var merchant_id = req.params.merchant_id;
    var yext_user_id = req.body.yext_user_id;
    var yextLocationId = req.body.yext_location_id;
    if (!merchant_id || !yext_user_id) {
      responseMsg.RESPONSE400.message = RES_MESSAGE.ERROR_PARAM_MISSING;
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      try {
        request.get(
          {
            headers: {
              "content-type": "application/json"
            },
            url:
              config.app.yexUserURL +
              "/" +
              yext_user_id +
              "?api_key=" +
              config.app.yextAPIKey +
              "&v=" +
              config.app.yextVersion,
            json: true
          },
          (error, response, body) => {
            if (error) {
              res
                .status(responseMsg.RESPONSE400.statusCode)
                .send(responseMsg.RESPONSE400);
            } else {
              console.log(body.response.acl[0].roleId);
              if (body.meta.errors.length > 0) {
                responseMsg.RESPONSE400.errors = body.meta.errors;
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              } else if (
                body.response
                  .id /* && body.response.acl[0].roleId == "3" &&
              body.response.acl[0].roleName == "Location Manager" &&
              body.response.acl[0].onType == "LOCATION" &&
            body.response.acl[0].on == yextLocationId*/
              ) {
                model.tap_merchants
                  .update(
                    {
                      yext_user_id: body.response.id,
                      yext_user_creation_process: "1"
                    },
                    {
                      where: {
                        merchant_id: merchant_id
                      }
                    }
                  )
                  .then(function (data) {
                    responseMsg.OK.message = "user saved.";
                    responseMsg.OK.data = body.response;
                    res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
                  })
                  .catch(function (err) {
                    console.log(err);
                    res
                      .status(responseMsg.RESPONSE400.statusCode)
                      .send(responseMsg.RESPONSE400);
                  });
              } else {
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              }
            }
          }
        );
      } catch (e) {
        console.log(e);
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    }
  },
  /**
   * create SSO Link
   * @param {*} data
   */
  createSSOLink: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    console.log(req.body);
    var merchant_id = req.params.merchant_id;
    var type = req.params.type;
    var current_time_stamp = Math.floor(Date.now() / 1000);
    if (!merchant_id) {
      responseMsg.RESPONSE400.message = RES_MESSAGE.ERROR_PARAM_MISSING;
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      model.tap_merchants.belongsTo(model.tap_merchant_deep_link, {
        foreignKey: "merchant_id",
        targetKey: "merchant_id"
      });
      var reviewGeneratioWhereCondition = {};
      if (type == "review_generation") {
        reviewGeneratioWhereCondition = {
          review_generation_process_status: "1"
        };
      }
      model.tap_merchants
        .findAll({
          where: {
            active: "true",
            merchant_id: merchant_id,
            yext: "1"
          },
          include: {
            model: model.tap_merchant_deep_link,
            where: reviewGeneratioWhereCondition
          }
        })
        .then(function (data) {
          var merrow = data.map(function (data) {
            return data.toJSON();
          });
          console.log("merchant details: ", merrow);
          if (merrow.length > 0 && merrow[0].yext_user_id) {
            var yext_sign_key =
              config.app.yextAccountid +
              "|" +
              merrow[0].yext_user_id +
              "|" +
              current_time_stamp +
              "|" +
              config.app.yextSecretKey;
            console.log("yext_sign_key : ", yext_sign_key);
            var sign = crypto
              .createHash("sha1")
              .update(yext_sign_key)
              .digest("hex");
            var sso_link =
              config.app.ssoLoginUrl +
              "?accountid=" +
              config.app.yextAccountid +
              "&code=" +
              merrow[0].yext_user_id +
              "&timestamp=" +
              current_time_stamp +
              "&sign=" +
              sign;
            console.log("yext sign key : ", sign);
            console.log("yext sso link : ", sso_link);
            responseMsg.OK.message = "sso link created.";
            responseMsg.OK.data = {
              sso_link: sso_link
            };
            res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
          } else {
            responseMsg.RESPONSE400.message = "Merchant not found.";
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          }
        })
        .catch(function (err) {
          console.log(err);
          responseMsg.RESPONSE400.message = err;
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        });
    }
  },
  /**
   * Delete or update YEXT user update merchant table in  database
   * @param {*} req
   * @param {*} res
   */
  deleteYextUser: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    console.log(req.body);
    var merchant_id = req.params.merchant_id;
    var newLocations = req.body.new_locations;
    if (!merchant_id) {
      responseMsg.RESPONSE400.message = RES_MESSAGE.ERROR_PARAM_MISSING;
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      try {
        model.tap_merchants
          .findAll({
            where: {
              merchant_id: merchant_id
            }
          })
          .then(function (data) {
            var merrow = data.map(function (data) {
              return data.toJSON();
            });
            console.log("merchant details: ", merrow);
            if (
              merrow.length > 0 &&
              newLocations != merrow[0].yext_location_id
            ) {
              // module.exports.getYextUserId(newLocations).then(
              //   function(response) {
              //     model.tap_merchants
              //       .update(
              //         {
              //           yext_user_id: response.yext_user_id,
              //           yext_user_creation_process: "1"
              //         },
              //         {
              //           where: {
              //             merchant_id: merchant_id
              //           }
              //         }
              //       )
              //       .then(function(data) {
              //         responseMsg.OK.message = "YEXT user ID updated.";
              //         responseMsg.OK.data = {
              //           yext_user_id: response.yext_user_id
              //         };
              //         res
              //           .status(responseMsg.OK.statusCode)
              //           .send(responseMsg.OK);
              //       })
              //       .catch(function(err) {
              //         console.log(err);
              //         res
              //           .status(responseMsg.RESPONSE400.statusCode)
              //           .send(responseMsg.RESPONSE400);
              //       });
              //   },
              //   function(error) {
              //     model.tap_merchants
              //       .update(
              //         {
              //           yext_user_id: "",
              //           yext_user_creation_process: "0",
              //         },
              //         {
              //           where: {
              //             merchant_id: merchant_id
              //           }
              //         }
              //       )
              //       .then(function(data) {
              //         responseMsg.OK.message = "YEXT user ID deleted.";
              //         responseMsg.OK.data = { yext_user_id: "" };
              //         res
              //           .status(responseMsg.OK.statusCode)
              //           .send(responseMsg.OK);
              //       })
              //       .catch(function(err) {
              //         console.log(err);
              //         res
              //           .status(responseMsg.RESPONSE400.statusCode)
              //           .send(responseMsg.RESPONSE400);
              //       });
              //   }
              // );
              model.tap_merchants
                .update(
                  {
                    yext_user_id: "",
                    yext_user_creation_process: "0"
                  },
                  {
                    where: {
                      merchant_id: merchant_id
                    }
                  }
                )
                .then(function (data) {
                  responseMsg.OK.message = "YEXT user ID deleted.";
                  responseMsg.OK.data = { yext_user_id: "" };
                  res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
                })
                .catch(function (err) {
                  console.log(err);
                  res
                    .status(responseMsg.RESPONSE400.statusCode)
                    .send(responseMsg.RESPONSE400);
                });
            } else {
              responseMsg.RESPONSE400.message = "Merchant not found.";
              res
                .status(responseMsg.RESPONSE400.statusCode)
                .send(responseMsg.RESPONSE400);
            }
          })
          .catch(function (err) {
            console.log(err);
            responseMsg.RESPONSE400.message = err;
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          });
      } catch (e) {
        console.log(e);
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    }
  },
  /**
   * Get YEXT user id from YEXT for particular location id
   * @param {*} yext_location_id
   */
  getYextUserId: function (yext_location_id) {
    return new Promise(function (resolve, reject) {
      var allYextUser = [];
      try {
        request.get(
          {
            headers: {
              "content-type": "application/json"
            },
            url:
              config.app.yexUserURL +
              "?api_key=" +
              config.app.yextAPIKey +
              "&v=" +
              config.app.yextVersion +
              "&offset=0&limit=50",
            json: true
          },
          (error, response, body) => {
            if (error) {
              console.log(error);
            } else {
              if (body.meta.errors.length > 0) {
                console.log("error-------------- ", body.meta.errors);
                reject({});
              } else if (
                body.response.users.length > 0 &&
                body.response.count > 0
              ) {
                var count = body.response.count; // initialize a variable.
                allYextUser = body.response.users;
                var offset = 50;
                async.whilst(
                  function () {
                    console.log("count----------------- ", count);
                    console.log("offset----------------- ", offset);
                    return count > offset;
                  }, //check condition.
                  function (callback) {
                    try {
                      request.get(
                        {
                          headers: {
                            "content-type": "application/json"
                          },
                          url:
                            config.app.yexUserURL +
                            "?api_key=" +
                            config.app.yextAPIKey +
                            "&v=" +
                            config.app.yextVersion +
                            "&offset=" +
                            offset +
                            "&limit=50",
                          json: true
                        },
                        (error, response, body) => {
                          if (error) {
                            console.log(error);
                            reject({});
                          } else {
                            if (body.meta.errors.length > 0) {
                              console.log(
                                "error-------------- ",
                                body.meta.errors
                              );
                            } else if (
                              body.response.users.length > 0 &&
                              body.response.count > 0
                            ) {
                              async.forEachOf(
                                body.response.users,
                                (value, key, forEeachCallback) => {
                                  allYextUser.push(value);
                                  offset++;
                                  forEeachCallback();
                                },
                                err => {
                                  if (err) console.error(err);
                                  callback(null);
                                }
                              );
                            }
                          }
                        }
                      );
                    } catch (e) {
                      console.log(e);
                      reject({});
                    }
                  },
                  function (err) {
                    //final result
                    if (err) {
                      console.log("Some error occured");
                    } else {
                      var userIdFound = [];
                      async.forEachOf(
                        allYextUser,
                        function (value, key, forEeachCheckLocationCallback) {
                          if (value.acl.length > 0) {
                            async.forEachOf(
                              value.acl,
                              function (
                                item,
                                key,
                                forEeachAclCheckLocationCallback
                              ) {
                                if (
                                  item.roleId == "3" &&
                                  item.roleName == "Location Manager" &&
                                  item.onType == "LOCATION" &&
                                  item.on == yext_location_id
                                ) {
                                  userIdFound["yext_user_id"] = value.id;
                                  forEeachAclCheckLocationCallback(userIdFound);
                                } else {
                                  forEeachAclCheckLocationCallback(null);
                                }
                              },
                              function (found) {
                                if (found) {
                                  forEeachCheckLocationCallback(found);
                                } else {
                                  forEeachCheckLocationCallback(null);
                                }
                              }
                            );
                          } else {
                            forEeachCheckLocationCallback(null);
                          }
                        },
                        function (result) {
                          if (result) {
                            console.log("user found", result);
                            resolve(result);
                          } else {
                            console.log("user not found");
                            reject({});
                          }
                        }
                      );
                    }
                  }
                );
              }
            }
          }
        );
      } catch (e) {
        console.log(e);
        reject({});
      }
    });
  },
  /**
   * Get auto response
   * @param {*} req
   * @param {*} res
   */
  getAutoResponse: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    console.log(req.body);
    var merchant_id = req.params.merchant_id;
    if (!merchant_id) {
      responseMsg.RESPONSE400.message = RES_MESSAGE.ERROR_PARAM_MISSING;
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      model.tap_merchant_deep_link
        .findAll({
          attributes: [
            "positive_messages",
            "negative_messages",
            "positive_auto_reply_status",
            "negative_auto_reply_status",
            "rating_limit",
            "review_generation_process_status"
          ],
          where: {
            merchant_id: merchant_id
          }
        })
        .then(function (data) {
          var autoResponseData = data.map(function (data) {
            return data.toJSON();
          });
          console.log("auto Response details: ", autoResponseData);
          if (autoResponseData.length > 0) {
            responseMsg.OK.message = "auto response data.";
            responseMsg.OK.data = autoResponseData[0];
            res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
          } else {
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          }
        })
        .catch(function (err) {
          console.log(err);
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        });
    }
  },
  /**
   * Auto response modification
   * @param {*} req
   * @param {*} res
   */
  autoResponseModification: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    console.log(req.body);
    var merchant_id = req.params.merchant_id;
    var autoResponseId = req.body.auto_response_id;
    var autoResponseType = req.body.auto_response_type;
    var autoResponse = req.body.auto_response;
    var action = req.body.action;
    var positiveMessages = req.body.positiveMessages;
    var negativeMessages = req.body.negativeMessages;
    if (!merchant_id || !autoResponseId || !autoResponseType || !action) {
      responseMsg.RESPONSE400.message = RES_MESSAGE.ERROR_PARAM_MISSING;
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      var autoResponseMessage = {};
      var positive_messages = {};
      if (positiveMessages) {
        positive_messages = JSON.parse(positiveMessages);
      }
      var negative_messages = {};
      if (negativeMessages) {
        negative_messages = JSON.parse(negativeMessages);
      }
      if (autoResponseType == "positive") {
        var messageOrder = helper.objectCount(positive_messages);
        var unUsedCount = helper.unUsedResponseCount(positive_messages);
        if (action == "new_response" || action == "replace_response") {
          messageOrder = messageOrder + 1;
          unUsedCount = unUsedCount + 1;
          if (action == "new_response") {
            positive_messages["" + autoResponseId + ""] = {
              message: autoResponse,
              autoResponseUseSatus: 0,
              order: messageOrder,
              autoResponseId: autoResponseId
            };
          } else if (action == "replace_response") {
            positive_messages["" + autoResponseId + ""].message = autoResponse;
            positive_messages[
              "" + autoResponseId + ""
            ].autoResponseUseSatus = 0;
          }
        } else if (action == "delete") {
          delete positive_messages["" + autoResponseId + ""];
          var itration = 1;
          Object.keys(positive_messages).forEach(function (item) {
            if (positive_messages[item] != "-1") {
              positive_messages[item].order = itration;
              itration++;
            }
          });
          messageOrder = messageOrder - 1;
          unUsedCount = unUsedCount - 1;
          positive_messages["" + autoResponseId + ""] = -1;
        }
      } else {
        var messageOrder = helper.objectCount(negative_messages);
        var unUsedCount = helper.unUsedResponseCount(negative_messages);
        console.log("negative_messages : ", negative_messages);
        if (action == "new_response" || action == "replace_response") {
          messageOrder = messageOrder + 1;
          unUsedCount = unUsedCount + 1;
          if (action == "new_response") {
            negative_messages["" + autoResponseId + ""] = {
              message: autoResponse,
              autoResponseUseSatus: 0,
              order: messageOrder,
              autoResponseId: autoResponseId
            };
          } else if (action == "replace_response") {
            negative_messages["" + autoResponseId + ""].message = autoResponse;
            negative_messages[
              "" + autoResponseId + ""
            ].autoResponseUseSatus = 0;
          }
        } else if (action == "delete") {
          delete negative_messages["" + autoResponseId + ""];
          var itration = 1;
          Object.keys(negative_messages).forEach(function (item) {
            if (negative_messages[item] != "-1") {
              negative_messages[item].order = itration;
              itration++;
            }
          });
          messageOrder = messageOrder - 1;
          unUsedCount = unUsedCount - 1;
          negative_messages["" + autoResponseId + ""] = -1;
        }
      }
      autoResponseMessage.negative_messages = JSON.stringify(negative_messages);
      autoResponseMessage.positive_messages = JSON.stringify(positive_messages);
      var positiveUnUsedCount = helper.unUsedResponseCount(positive_messages);
      var negativeUnUsedCount = helper.unUsedResponseCount(negative_messages);
      console.log("negativeUnUsedCount------------ ", negativeUnUsedCount);
      console.log("positiveUnUsedCount------------ ", positiveUnUsedCount);
      if (negativeUnUsedCount > 3) {
        autoResponseMessage.negative_mail_notification = 0;
      }
      if (positiveUnUsedCount > 3) {
        autoResponseMessage.positive_mail_notification = 0;
      }
      responseMsg.OK.message = "Action excuted successfully.";
      responseMsg.OK.data = {
        totalResponseMessage: unUsedCount,
        autoResponseMessage: autoResponseMessage
      };
      res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
    }
  },
  /**
   * Save auto response modification
   * @param {*} req
   * @param {*} res
   */
  saveAutoResponse: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    console.log(req.body);
    var merchant_id = req.params.merchant_id;
    var positiveAutoReplyStatus = req.body.positive_auto_reply_status;
    var negativeAutoReplyStatus = req.body.negative_auto_reply_status;
    var ratingLimit = req.body.rating_limit;
    var positiveMessages = req.body.positiveMessages;
    var negativeMessages = req.body.negativeMessages;
    model.tap_merchant_deep_link
      .findAll({
        attributes: [
          "id",
          "positive_mail_notification",
          "negative_mail_notification"
        ],
        where: {
          merchant_id: merchant_id
        }
      })
      .then(function (data) {
        var autoResponseData = data.map(function (data) {
          return data.toJSON();
        });
        console.log("auto Response details: ", autoResponseData);
        if (autoResponseData.length > 0) {
          var positive_messages = {};
          if (positiveMessages) {
            positive_messages = JSON.parse(positiveMessages);
          }
          var negative_messages = {};
          if (negativeMessages) {
            negative_messages = JSON.parse(negativeMessages);
          }
          var positiveUnUsedCount = helper.unUsedResponseCount(
            positive_messages
          );
          var negativeUnUsedCount = helper.unUsedResponseCount(
            negative_messages
          );
          console.log("negativeUnUsedCount------------ ", negativeUnUsedCount);
          console.log("positiveUnUsedCount------------ ", positiveUnUsedCount);
          var positive_mail_notification =
            autoResponseData[0].positive_mail_notification;
          var negative_mail_notification =
            autoResponseData[0].negative_mail_notification;
          if (negativeUnUsedCount > 3) {
            negative_mail_notification = 0;
          }
          if (positiveUnUsedCount > 3) {
            positive_mail_notification = 0;
          }
          model.tap_merchant_deep_link
            .update(
              {
                rating_limit: ratingLimit,
                positive_auto_reply_status: positiveAutoReplyStatus,
                negative_auto_reply_status: negativeAutoReplyStatus,
                positive_messages: positiveMessages,
                negative_messages: negativeMessages,
                positive_mail_notification: positive_mail_notification,
                negative_mail_notification: negative_mail_notification
              },
              {
                where: {
                  merchant_id: merchant_id
                }
              }
            )
            .then(function (data) {
              responseMsg.OK.message = "auto response configuration saved.";
              responseMsg.OK.data = data;
              res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
            })
            .catch(function (err) {
              console.log(err);
              res
                .status(responseMsg.RESPONSE400.statusCode)
                .send(responseMsg.RESPONSE400);
            });
        }
      })
      .catch(function (err) {
        console.log(err);
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      });
  },
  /**
   * Update timezone of merchant
   * @param {*} req
   * @param {*} res
   */
  saveMerchantTimeZone: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    console.log(req.body);
    var merchant_id = req.body.merchant_id;
    var timeZone = req.body.timeZone;
    if (!merchant_id || !timeZone) {
      responseMsg.RESPONSE400.message = RES_MESSAGE.ERROR_PARAM_MISSING;
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      model.tap_merchants
        .update(
          {
            timezone: timeZone
          },
          {
            where: {
              merchant_id: merchant_id
            }
          }
        )
        .then(function (data) {
          responseMsg.OK.message = "timezone has been update.";
          responseMsg.OK.data = {};
          res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
        })
        .catch(function (err) {
          console.log(err);
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        });
    }
  },
  updateNickname: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    var merchant_id = req.body.merchant_id;
    var nick_name = req.body.nick_name;
    var secondary_phone = req.body.secondary_phone;
    var secondary_email = req.body.secondary_email;
    var timezone = req.body.timezone ? req.body.timezone : "";
    var smsNotificationCheck =
      req.body.sms_notification_check == "true" ? req.body.sms_notification_check : "false";
    var emailNotificationCheck =
      req.body.email_notification_check == "true" ? req.body.email_notification_check : "false";
    var tierBillingNotificationLanguage =
      req.body.tier_billing_notification_language;
    if (nick_name == "") {
      responseMsg.RESPONSE400.message = "Nick name is required.";
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else if (nick_name.length > 60) {
      responseMsg.RESPONSE400.message = "Nick name should be less than 60 character.";
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else if (secondary_email != "" && commonFunction.validMail(secondary_email) == false) {
      responseMsg.RESPONSE400.message = "Please provide us valid email id.";
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else if (secondary_phone != "" && (/^\d{10}|d{12}$/.test(secondary_phone) == false)) {
      responseMsg.RESPONSE400.message = "Please provide us valid phone number.";
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      commonFunction.updateNickname(nick_name, merchant_id, secondary_phone, secondary_email, timezone,
        smsNotificationCheck,
        emailNotificationCheck,
        tierBillingNotificationLanguage).then(function (details) {
          res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
        }).catch(err => {
          responseMsg.RESPONSE400.message = err;
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        });
    }
  },
  /**
   * Create Review Generation Short URL generated
   * @param {*} req
   * @param {*} res
   */
  createReviewShortURL: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    console.log(req.body);
    var merchant_id = req.params.merchant_id;
    if (!merchant_id) {
      responseMsg.RESPONSE400.message = RES_MESSAGE.ERROR_PARAM_MISSING;
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      request(
        {
          uri: "https://api.rebrandly.com/v1/links",
          method: "POST",
          body: JSON.stringify({
            destination:
              config.app.review_genertion_url + "?merchant_id=" + merchant_id,
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
          if (error) {
            console.log(error);
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          } else {
            var link = JSON.parse(body);
            console.log("shortUrl ", link.shortUrl);

            model.tap_merchant_deep_link
              .findAll({
                attributes: ["id", "generic_short_url"],
                where: {
                  merchant_id: merchant_id
                }
              })
              .then(function (data) {
                var deppLinkData = data.map(function (data) {
                  return data.toJSON();
                });
                console.log("auto Response details: ", deppLinkData);
                if (deppLinkData.length > 0) {
                  var updateData = { generic_short_url: link.shortUrl };
                  model.tap_merchant_deep_link
                    .update(updateData, {
                      where: {
                        merchant_id: merchant_id
                      }
                    })
                    .then(function (data) {
                      console.log("updated");
                      responseMsg.OK.message =
                        "Generic Review Generetion Short URL generated.";
                      var responseData = { generic_short_url: link.shortUrl };
                      responseMsg.OK.data = responseData;
                      res
                        .status(responseMsg.OK.statusCode)
                        .send(responseMsg.OK);
                    })
                    .catch(function (err) {
                      console.log(err);
                      res
                        .status(responseMsg.RESPONSE400.statusCode)
                        .send(responseMsg.RESPONSE400);
                    });
                } else {
                  var insertData = {
                    generic_short_url: link.shortUrl,
                    merchant_id: merchant_id
                  };
                  model.tap_merchant_deep_link
                    .create(insertData)
                    .then(function (info) {
                      console.log("inserted");
                      responseMsg.OK.message =
                        "Generic Review Generetion Short URL generated.";
                      var responseData = { generic_short_url: link.shortUrl };
                      responseMsg.OK.data = responseData;
                      res
                        .status(responseMsg.OK.statusCode)
                        .send(responseMsg.OK);
                    })
                    .catch(function (err) {
                      console.log(err);
                      res
                        .status(responseMsg.RESPONSE400.statusCode)
                        .send(responseMsg.RESPONSE400);
                    });
                }
              })
              .catch(function (err) {
                console.log(err);
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              });
          }
        }
      );
    }
  },
  /**
   * check review process
   * @param {*} req
   * @param {*} res
   */
  checkReviewProcess: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    console.log(req.body);
    var merchant_id = req.params.merchant_id;
    if (!merchant_id) {
      responseMsg.RESPONSE400.message = RES_MESSAGE.ERROR_PARAM_MISSING;
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      model.tap_merchant_deep_link
        .findAll({
          attributes: ["id", "review_generation_process_status"],
          where: {
            merchant_id: merchant_id
          }
        })
        .then(function (data) {
          var deppLinkData = data.map(function (data) {
            return data.toJSON();
          });
          console.log("auto Response details: ", deppLinkData);
          if (
            deppLinkData.length > 0 &&
            deppLinkData[0].review_generation_process_status == "1"
          ) {
            responseMsg.OK.message = "Process Active.";
            var responseData = {};
            responseMsg.OK.data = responseData;
            res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
          } else {
            responseMsg.RESPONSE400.message = "Process not Active.";
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          }
        })
        .catch(function (err) {
          console.log(err);
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        });
    }
  },
  /**
   * Get all merchants those are associated with email
   */
  merchantDetailsByemail: (req, res) => {
    let email = req.body.email;
    if (!email) {
      responseMsg.RESPONSE404.message = 'Email not Found';
      res
        .status(responseMsg.RESPONSE404.statusCode)
        .send(responseMsg.RESPONSE404);
    } else {
      commonFunction.selectMerchantsByEmail(email).then((merchants) => {
        responseMsg.RESPONSE200.data = merchants;
        responseMsg.RESPONSE200.message = "Merchant data found successfully.!";
        res
          .status(responseMsg.RESPONSE200.statusCode)
          .send(responseMsg.RESPONSE200);
      }, (error) => {
        responseMsg.RESPONSE400.message = error;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      });
    }
  },
  /**
   * Function to activate the merchant training mode
   * @param string merchant_id
   * @return json
   */
  activateTrainingMode: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    var merchant_id = req.body.merchant_id;
    if (merchant_id) {
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
        .then(async function (result) {
          var merchantData = result.map(function (result) {
            return result.toJSON();
          });
          console.log("merchant data--------", merchantData);
          console.log("merchantData[0].tap_schedule_subscription--------", merchantData[0].tap_schedule_subscription);
          if(merchantData.length > 0){
            if(merchantData[0].taptext_status == "true" && merchantData[0].tap_schedule_subscription){
             let trainingModeSuccess = await helper.updateMerchantIsTraining(merchant_id, '1'); // update is_training status flag 1
              responseMsg.RESPONSE200.message = "Training Mode successfully assinged.!";
              res
                .status(responseMsg.RESPONSE200.statusCode)
                .send(responseMsg.RESPONSE200);
            }else if(merchantData[0].taptext_status != "true"){
              responseMsg.RESPONSE201.message = "Tap Text not activated. Please activate Tap Text before activate training mode.!";
              res
                .status(responseMsg.RESPONSE201.statusCode)
                .send(responseMsg.RESPONSE201);
            }else if(merchantData[0].tap_schedule_subscription == null){
              responseMsg.RESPONSE201.message = "No schedule assigned. Please assigned any schedule before activate training mode.!";
              res
                .status(responseMsg.RESPONSE201.statusCode)
                .send(responseMsg.RESPONSE201);
            }else{
              console.log('Merchant id not exist');
              responseMsg.RESPONSE400.message = 'Merchant is not valid!';
              res
                .status(responseMsg.RESPONSE400.statusCode)
                .send(responseMsg.RESPONSE400);
            }
          }else{
            console.log('Merchant id not exist');
          responseMsg.RESPONSE400.message = 'Merchant is not valid!';
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
          }
        }).catch((error) => {
          console.log('Merchant id not exist');
          responseMsg.RESPONSE400.message = 'Merchant is not valid!';
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        });
    } else {
      console.log('Merchant id not exist');
      responseMsg.RESPONSE404.message = 'Merchant is not valid!';
      res
        .status(responseMsg.RESPONSE404.statusCode)
        .send(responseMsg.RESPONSE404);
    }
  },
  /**
  * Function to get sms limit and sms usage for merchant
  * @param {*} req 
  * @param {*} res 
  */
  merchantSMSConsume: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    console.log(req.body);
    var merchant_id = req.params.merchant_id;
    getmerchantdata(merchant_id).then(function (merchantdetails) {
      console.log("merchantdetails=======>", merchantdetails);
      responseMsg.OK.message = "ALL data.";
      responseMsg.OK.data = {};
      responseMsg.OK.data.consume = merchantdetails.sms_sent;
      responseMsg.OK.data.total = merchantdetails.sms_limit;
      if (merchantdetails.sms_unlimited == 1 && merchantdetails.sms_limit == 0) {
        responseMsg.OK.data.total_left = 'Unlimited';
      } else if (merchantdetails.sms_limit == 0) {
        responseMsg.OK.data.total_left = 0;
      } else {
        responseMsg.OK.data.total_left = (merchantdetails.sms_limit - merchantdetails.sms_sent);
      }
      res
        .status(responseMsg.OK.statusCode)
        .send(responseMsg.OK);
    }, function (error) {
      console.log(error);
      console.log('Merchant id not exist');
      responseMsg.RESPONSE404.message = 'Merchant is not valid!';
      res
        .status(responseMsg.RESPONSE404.statusCode)
        .send(responseMsg.RESPONSE404);
    });
  }
};
/**
 * Function to get sms limit and sms usage for merchant
 * @param {*} merchant_id 
 */
function getmerchantdata(merchant_id) {
  return new Promise(function (resolve, reject) {
    model.tap_merchants
      .findAll({
        attributes: ["sms_sent", "sms_limit", "sms_unlimited"],
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
          resolve(merchantCount[0]);
        } else {
          reject("Some Error Occured");
        }
      }).catch(function (err) {
        reject("Some Error Occured");
      });
  });
}
/**
 * get number of redeems for physical web campaign
 * @param {*} merchantId
 * @param {*} fromDate
 * @param {*} toDate
 */
function getRedeemsCount(merchantId, fromDate = null, toDate = null) {
  return new Promise(function (resolve, reject) {
    var sql =
      "SELECT count(orders.id) as redeems from tap_customer_orders orders INNER JOIN tap_gotu_campaigns campaign on orders.coupon_id = campaign.campaign_id and campaign.type = 'push' WHERE orders.merchant_id = :merchant_id";
    var sqlParam = {
      merchant_id: merchantId
    };
    if (fromDate != "" || toDate != "") {
      fromDate += " 00:00:00";
      toDate += " 23:59:59";
      sql +=
        " AND orders.created_at  BETWEEN UNIX_TIMESTAMP(STR_TO_DATE(:fromDate, '%Y-%m-%d %H:%i:%s')) AND UNIX_TIMESTAMP(STR_TO_DATE(:toDate, '%Y-%m-%d %H:%i:%s'))";
      sqlParam.fromDate = fromDate;
      sqlParam.toDate = toDate;
    }
    console.log(sql);
    model.sequelize
      .query(sql, {
        replacements: sqlParam,
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function (data) {
        if (data.length > 0) {
          console.log(data);
          resolve(data[0].redeems);
        } else {
          resolve(0);
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * This function use for get merchant offer by offer id
 * @param {*} merchant_id
 * @param {*} offer_id
 * @param {*} discount_type
 */
function getMerchantOffers(merchant_id, offer_id, discount_type) {
  return new Promise(function (resolve, reject) {
    var query;
    var queryParam = {};
    if (discount_type) {
      query =
        "SELECT * FROM tap_merchant_offers WHERE MerchantId=:MerchantId AND Discount_Type IN(" +
        escape(offer_id) +
        ") AND active='true'";
      queryParam = {
        MerchantId: merchant_id
      };
    } else {
      query =
        "SELECT * FROM tap_merchant_offers WHERE MerchantId=:MerchantId AND id=:offer_id";
      queryParam = {
        MerchantId: merchant_id,
        offer_id: offer_id
      };
    }
    console.log(query);
    model.sequelize
      .query(query, {
        replacements: queryParam,
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function (rows) {
        if (rows.length > 0) {
          resolve(rows);
        } else {
          reject("Offer Not found!.");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}

/**
 * Get merchant id
 * @param {*} campaign_code
 */
function getMerchantId(campaign_code) {
  console.log("campaign_code: ", campaign_code);
  return new Promise(function (resolve, reject) {
    model.tap_gotu_campaigns
      .findAll({
        where: {
          campaign_code: campaign_code,
          type: "gotu"
        }
      })
      .then(function (data) {
        var rows = data.map(function (data) {
          return data.toJSON();
        });
        console.log("rows: ", rows);
        if (rows.length > 0) {
          resolve(rows);
        } else {
          reject("no records found");
        }
      })
      .catch(function (err) {
        reject("no records found");
      });
  });
}
Date.prototype.getUnixTime = function () {
  return (this.getTime() / 1000) | 0;
};
/**
 * Check deactivated offer coupon today
 * @param {*} merchant_id
 * @param {*} start
 * @param {*} end
 * @param {*} type
 */
function checkDeactivatedToday(merchant_id, start, end, type) {
  return new Promise(function (resolve, reject) {
    model.tap_merchant_offers
      .findAll({
        where: {
          MerchantId: merchant_id,
          Discount_Type: type,
          deactivated_at: {
            $between: [start, end]
          }
        }
      })
      .then(function (rows) {
        var data = rows.map(function (rows) {
          return rows.toJSON();
        });
        if (data.length) resolve(data);
        else reject(data);
      })
      .catch(function (err) {
        reject("no records found");
      });
  });
}

/**
 * get training sechdule data
 */
function getTrainingTierData() {
  return new Promise(function (resolve, reject) {
    var sql = "SELECT bs.id as bs_id, bs.schedule_name, bs.tier_count, sti.* FROM tap_billingschedule bs LEFT JOIN tap_schedule_tier_information sti ON bs.id = sti.schedule_id WHERE bs.schedule_name = 'Training' AND bs.isschedule_active = 1";
    model.sequelize
      .query(sql, {
        type: model.sequelize.QueryTypes.SELECT
      }).then(function (data) {
        if (data.length > 0) {
          resolve(data[0]);
        } else {
          reject();
        }
      }).catch(function (err) {
        reject(err);
      });
  });
}

/**
 * get merchant current schedule subscription by merchant_id
 * @param str merchant_id
 */
function getMerchantCurrentSubscription(merchant_id) {
  return new Promise(function (resolve, reject) {
    var sql = "SELECT * FROM tap_schedule_subscription where merchant_id = :merchant_id";
    var queryParam = {
      merchant_id: merchant_id
    };
    model.sequelize
      .query(sql, {
        replacements: queryParam,
        type: model.sequelize.QueryTypes.SELECT
      }).then(function (data) {
        if (data.length > 0) {
          console.log(data);
          resolve(data[0]);
        } else {
          resolve(null);
        }
      }).catch(function (err) {
        reject(err);
      });
  });
}
