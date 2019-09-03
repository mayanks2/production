"use strict";
var async = require("async");
var Sequelize = require("sequelize");
var model = require("../../model");
const moment_time = require("moment-timezone");
var moment = require("moment");
var textmessage = require("../../language/textMessage");
var unixtimestamp = require("unix-timestamp");
var timestamp = unixtimestamp;
const uuidv4 = require("uuid/v4");
const https = require("https");
const _ = require("underscore");
var splitter = require("split-sms");
// var tapGenerateCoupon = require("../tapGenerateCouponController");
var tapGenerateCoupon = require("../generateCouponController");
const responseMsg = require("../../language/resMessage");
var emailContent = require("../../language/emailContent");
var tap_twilioSMSController = require("../../controller/tap_twilioSMSController");
var tap_sendEmailController = require("../../controller/tap_sendEmailController");
// var tap_GenerateCoupon = require("../../controller/tapGenerateCouponController");
var tap_GenerateCoupon = require("../../controller/generateCouponController");
var helper = require('../common/helper')

const {
  gt,
  lte,
  or,
  ne,
  in: opIn
} = Sequelize.Op;

module.exports = {
  // merchant activity details
  merchant_activity_detail: function (activityDay) {
    var merchantActivity = activityDay;
    var today = Math.floor(Date.now() / 1000);
    var predate = moment()
      .subtract(merchantActivity, "days")
      .unix();
    var query = `SELECT * FROM (SELECT  mr.updated_at as login,mo.created_at as offer,co.created_at as optin,mr.merchant_id,CONCAT(mr.dba,' ','(',mr.merchant_id,')') as merchnat_name,CONCAT(IFNULL(mr.first_name,''),' ', IFNULL(mr.last_name,''),'(',mr.merchant_id,')') as merchnat_names,
            FROM_UNIXTIME(mr.updated_at, '%m/%d/%Y') as lastlogin , FROM_UNIXTIME(mo.created_at, '%m/%d/%Y') as lastCouponCreation ,FROM_UNIXTIME(co.created_at, '%m/%d/%Y') as lastOptIn
            FROM tap_merchants as mr
            LEFT JOIN tap_merchant_offers mo ON mo.MerchantId = mr.merchant_id
            LEFT JOIN tap_customers_merchant cm ON cm.merchant_id = mr.merchant_id
            LEFT JOIN tap_customer_orders co ON co.customer_id = cm.customer_id AND co.merchant_id = cm.merchant_id
            WHERE mr.active='true' AND mo.active='true' AND mr.merchant_id NOT IN (SELECT merchant_id from tap_merchants where updated_at BETWEEN :predate and :today)
            ORDER BY mr.updated_at desc,mo.created_at DESC,co.created_at DESC) as T GROUP BY merchant_id`;
    return new Promise(function (resolve, reject) {
      model.sequelize
        .query(query, {
          replacements: {
            predate: predate,
            today: today
          },
          type: model.sequelize.QueryTypes.SELECT
        })
        .then(function (result) {
          resolve(result);
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },
  merchant_coupon_detail: function (couponDay) {
    var couponDay = couponDay;
    var today = Math.floor(Date.now() / 1000);
    var predate = moment()
      .subtract(couponDay, "days")
      .unix();
    var query =
      "SELECT * FROM (SELECT mr.updated_at as login,mo.created_at as offer,co.created_at as optin,  mr.merchant_id,CONCAT(mr.dba,' ','(',mr.merchant_id,')') as merchnat_name,CONCAT(IFNULL(mr.first_name,''),' ', IFNULL(mr.last_name,''),'(',mr.merchant_id,')') as merchnat_names," +
      " FROM_UNIXTIME(mr.updated_at, '%m/%d/%Y') as lastlogin , FROM_UNIXTIME(mo.created_at, '%m/%d/%Y') as lastCouponCreation ,FROM_UNIXTIME(co.created_at, '%m/%d/%Y') as lastOptIn" +
      " FROM tap_merchants as mr " +
      " LEFT JOIN tap_merchant_offers mo ON mo.MerchantId = mr.merchant_id " +
      " LEFT JOIN tap_customers_merchant cm ON cm.merchant_id = mr.merchant_id " +
      " LEFT JOIN tap_customer_orders co ON co.customer_id = cm.customer_id AND co.merchant_id = cm.merchant_id " +
      " Where  mr.active='true' AND mo.active='true' AND mo.MerchantId NOT IN (select MerchantId from tap_merchant_offers where created_at  BETWEEN :predate AND :today)" +
      " ORDER BY mr.updated_at desc,mo.created_at DESC,co.created_at DESC) as B group by merchant_id";

    return new Promise(function (resolve, reject) {
      model.sequelize
        .query(query, {
          replacements: {
            predate: predate,
            today: today
          },
          type: model.sequelize.QueryTypes.SELECT
        })
        .then(function (result) {
          resolve(result);
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },
  merchant_customers_detail: function (customeryDay) {
    var customeryDay = customeryDay;
    var predate = moment()
      .subtract(customeryDay, "days")
      .unix();
    var today = Math.floor(Date.now() / 1000);
    var query =
      "SELECT * FROM (SELECT  mr.updated_at as login,mo.created_at as offer,co.created_at as optin, mr.merchant_id,CONCAT(mr.dba,' ','(',mr.merchant_id,')') as merchnat_name,CONCAT(IFNULL(mr.first_name,''),' ', IFNULL(mr.last_name,''),'(',mr.merchant_id,')') as merchnat_names," +
      " FROM_UNIXTIME(mr.updated_at, '%m/%d/%Y') as lastlogin , FROM_UNIXTIME(mo.created_at, '%m/%d/%Y') as lastCouponCreation ,FROM_UNIXTIME(co.created_at, '%m/%d/%Y') as lastOptIn" +
      " FROM tap_merchants as mr " +
      " LEFT JOIN tap_merchant_offers mo ON mo.MerchantId = mr.merchant_id " +
      " LEFT JOIN tap_customers_merchant cm ON cm.merchant_id = mr.merchant_id " +
      " LEFT JOIN tap_customer_orders co ON co.customer_id = cm.customer_id AND co.merchant_id = cm.merchant_id " +
      " Where  cm.clover_id !='' AND mo.active='true' AND mr.active='true' AND co.merchant_id NOT IN (select merchant_id from tap_customer_orders where created_at  BETWEEN :predate AND :today)" +
      " ORDER BY mr.updated_at desc,mo.created_at DESC,co.created_at DESC) as k group by merchant_id";

    return new Promise(function (resolve, reject) {
      model.sequelize
        .query(query, {
          replacements: {
            predate: predate,
            today: today
          },
          type: model.sequelize.QueryTypes.SELECT
        })
        .then(function (result) {
          console.log(result);
          resolve(result);
        })
        .catch(function (err) {
          console.log(err);
          reject(err);
        });
    });
  },
  couponDetailspromise: function (parseactivitydata, perseCoupon) {
    return new Promise(function (resolve, reject) {
      for (var i = 0; i < perseCoupon.length; i++) {
        var filtered = _.where(parseactivitydata, {
          merchant_id: perseCoupon[i].merchant_id
        });
        var index = _.indexOf(
          _.pluck(parseactivitydata, "merchant_id"),
          perseCoupon[i].merchant_id
        );

        if (!filtered.length) {
          parseactivitydata.push(perseCoupon[i]);
        } else {
          parseactivitydata[index].lastCouponCreation =
            perseCoupon[i].lastCouponCreation;
        }
      }
      resolve(parseactivitydata);
    });
  },
  customersdetailspromise: function (parseactivitydata, persecustomers_details) {
    return new Promise(function (resolve, reject) {
      for (var j = 0; j < persecustomers_details.length; j++) {
        var filtered = _.where(parseactivitydata, {
          merchant_id: persecustomers_details[j].merchant_id
        });
        var index = _.indexOf(
          _.pluck(parseactivitydata, "merchant_id"),
          persecustomers_details[j].merchant_id
        );

        if (!filtered.length) {
          parseactivitydata.push(persecustomers_details[j]);
        } else {
          parseactivitydata[index].lastOptIn =
            persecustomers_details[j].lastOptIn;
        }
      }
      resolve(parseactivitydata);
    });
  },
  // get merchant_id and customer  id and feth the data...
  getMerchantWithCustomer: function (customer_id, merchant_id) {
    return new Promise(function (resolve, reject) {
      var query = `SELECT customer_id , merchant_id FROM tap_customers_merchant WHERE customer_id = :customer_id AND merchant_id = :merchant_id`;
      model.sequelize
        .query(query, {
          replacements: {
            customer_id: customer_id,
            merchant_id: merchant_id
          },
          type: model.sequelize.QueryTypes.SELECT
        })
        .then(function (result) {
          resolve(result);
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },

  // get merchant_id comeback offers
  getComeBackOffers: function (type_id, stdate, endate) {
    return new Promise(function (resolve, reject) {
      var today = Math.floor(Date.now() / 1000);
      var query = `SELECT mo.reward_text_media_image, mo.reward_text_message_type, mo.spanish_reward_text_message_type, mo.spanish_reward_text_media_image,
                    mo.start_date, mo.id as offer_id,mo.Discount_Type,mo.time,mo.time_zone,mer.merchant_id,cm.customer_id,cm.customer_phone,cm.last_visit_at,cm.created_at
                    FROM tap_merchant_offers as mo Inner Join tap_merchants as mer on mo.MerchantId=mer.merchant_id Inner Join tap_customers_merchant as cm on mo.MerchantId=cm.merchant_id
                    WHERE Discount_Type = :Discount_Type AND mo.active = 'true' AND mo.start_date <= :start_date
                    AND mer.active = 'true' and cm.optin ='1' AND cm.last_visit_at >= :stdate AND cm.last_visit_at <= :enddate`;
      model.sequelize
        .query(query, {
          replacements: {
            Discount_Type: type_id,
            start_date: today,
            stdate: stdate,
            enddate: endate
          },
          type: model.sequelize.QueryTypes.SELECT
        })
        .then(function (result) {
          if (result.length > 0) {
            resolve(result);
          } else {
            // reject('no offer active');
            resolve(result)
          }
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },
  //comeback offer timezone set
  comebackofferTimezoneset: function (start_date, time, timezones) {
    var zone = helper.timezone(timezones);
    console.log(
      "start_date :" +
      start_date +
      " and time :" +
      time +
      " and time zone :" +
      timezones
    );

    var currentTimeInUTC = moment().unix();
    var givendate = moment.unix(start_date).format("YYYY-MM-DD");
    var selTime = moment(givendate + " " + time + ":00").unix();
    //below current time on selected time zone
    var couponTime = moment.tz(zone).format("YYYY-MM-DD " + time + ":00");
    var currTime = moment.tz(zone).format("YYYY-MM-DD HH:mm:ss");
    // below mainCurrTime time in selected time zone with unix format
    var mainCurrTime = moment(currTime).unix();
    var mainCouponTime = moment(couponTime).unix();
    console.log(zone + "---" + currTime);

    // 3mints back time with time zone and send it to between range when cron like if mst 8am then check offer betwwen 7:57 am or 7:58am to 8 :00 or 8:01 am

    var timezoneAdd = moment(couponTime)
      .add(3, "minutes")
      .unix();
    console.log(
      mainCurrTime +
      " > " +
      selTime +
      " && " +
      mainCurrTime +
      " >= " +
      mainCouponTime +
      " && " +
      mainCurrTime +
      "<=" +
      timezoneAdd
    );
    if (
      mainCurrTime >= selTime &&
      mainCurrTime >= mainCouponTime &&
      mainCurrTime <= timezoneAdd
    ) {
      return true;
    } else {
      return false;
    }
  },
  //give offers to customers
  giveOfferToCustomer: function (offer) {
    return new Promise(function (resolve, reject) {
      var phonenumber = offer.customer_phone.toString();
      var PuertoRico = helper.PuertoRico(phonenumber);
      var sms_content = textmessage.comeBackOfferWithShortUrl.english;
      if (PuertoRico) {
        sms_content = textmessage.comeBackOfferWithShortUrl.spanish;
      }
      console.log("in generate coupon")
      tapGenerateCoupon.GenerateCoupon({
        offer_type: offer.Discount_Type,
        merchant_id: offer.merchant_id,
        customer_id: offer.customer_id,
        message: sms_content,
        mediaUrl: offer.reward_text_media_image,
        msgType: offer.reward_text_message_type,
        spanishmediaUrl: offer.spanish_reward_text_media_image,
        spanishmsgType: offer.spanish_reward_text_message_type,
      },
        function (err, response) {
          console.log("response from genrate coupon" , err , response)
          if (err) {
            reject(err);
          } else {
            resolve(response);
          }
        }
      );
    });
  },
  getTimestampDayss: function (date1_ms, date2_ms) {
    var stdate = moment.unix(date1_ms).format("YYYY-MM-DD");
    var enddate = moment.unix(date2_ms).format("YYYY-MM-DD");
    var now = moment(stdate); //todays date
    var end = moment(enddate); // another date
    var duration = moment.duration(now.diff(end));
    var days = duration.asDays();
    console.log("days", days);
    return days;
  },
  removeUnusedToken: function (merchant_id, device_uuid) {
    return new Promise(function (resolve, reject) {
      model.tap_merchantdevice_pin
        .update({
          pin: "",
          created_date: "",
          expire_on: "",
          expired: 1
        }, {
            where: {
              pin_released: 0,
              merchant_id: merchant_id,
              device_uuid: device_uuid,
              expire_on: {
                [lte]: moment().unix()
              }
            }
          })
        .then(function (result) {
          console.log("removeUnusedToken result : ", result);
          resolve(true);
        })
        .catch(function (err) {
          console.log("update Error Message: ", err);
          resolve(true);
        });
    });
  },
  getmessageDetails: function () {
    return new Promise(function (resolve, reject) {
      model.tap_merchant_optin_batch_sms
        .findAll({
          attributes: [
            "id",
            "merchant_id",
            "customer_id",
            "customer_phone",
            "message",
            "optin_at"
          ],
          where: {
            sms_status: 0,
            sms_type: 2
          }
        })
        .then(function (result) {
          resolve(result);
        })
        .catch(function (err) {
          console.log("Error Message: ", err);
          reject(err);
        });
    });
  },
  selectfilterwise: function (merchant_id, type) {
    var firstday_timestamp = "";
    var lastday_timestamp = "";
    var sql_revenue = "";
    var sql_optin = "";
    var sql_push_revenue = "";
    var sql_gotu_revenue = "";
    var sql_total_revenue = "";
    var sql_gotu_counter = "";
    var sql_optout = "";
    var sql_ads = "";
    switch (type) {
      case "day":
        // console.log("day===");
        var start = new Date();
        start.setHours(0, 0, 0, 0);
        var end = new Date();
        end.setHours(23, 59, 59, 999);
        firstday_timestamp = unixtimestamp.fromDate(start);
        lastday_timestamp = unixtimestamp.fromDate(end);
        sql_optin =
          "SELECT COUNT(c.id) as total_optins FROM tap_customers c INNER JOIN tap_customers_merchant cm ON c.id=cm.customer_id WHERE  merchant_id=:merchant_id AND cm.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp";
        sql_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_push_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'push' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_gotu_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_total_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_gotu_counter =
          "SELECT count(id) as gotu_counter FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_ads =
          "SELECT SUM(click_count) as total_click FROM tap_adscount WHERE ads_name = (select push_url FROM tap_merchants where merchant_id = :merchant_id" +
          " )  AND UNIX_TIMESTAMP(update_date) BETWEEN :firstday_timestamp AND :lastday_timestamp";
        // console.log("day sql_gotu_revenue=" + sql_gotu_revenue);
        break;
      case "week":
        var curr = new Date(); // get current date
        var first = curr.getDate() - curr.getDay(); // First day is the day of the month - the day of the week
        var firstday = new Date(curr.setDate(first));
        var last = firstday.getDate() + 6; // last day is the first day + 7
        var lastday = new Date(curr.setDate(last));
        firstday.setHours(0, 0, 0, 0);
        lastday.setHours(23, 59, 59, 999);
        firstday_timestamp = unixtimestamp.fromDate(firstday);
        lastday_timestamp = unixtimestamp.fromDate(lastday);
        sql_optin =
          "SELECT COUNT(c.id) as total_optins FROM tap_customers c INNER JOIN tap_customers_merchant cm ON c.id=cm.customer_id WHERE  merchant_id=:merchant_id" +
          " AND cm.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp";
        sql_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_push_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'push' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_gotu_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_gotu_counter =
          "SELECT count(id) as gotu_counter FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_total_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_optout =
          "SELECT COUNT(c.id) as total_optout FROM tap_customers c INNER JOIN tap_customers_merchant cm ON c.id=cm.customer_id WHERE optin='0' AND merchant_id=:merchant_id";
        sql_ads =
          "SELECT SUM(click_count) as total_click FROM tap_adscount WHERE ads_name = (select push_url FROM tap_merchants where merchant_id = :merchant_id" +
          " )  AND UNIX_TIMESTAMP(update_date) BETWEEN :firstday_timestamp AND :lastday_timestamp";
        break;
      case "month":
        var tmpDate = new Date();
        var y = tmpDate.getFullYear();
        var m = tmpDate.getMonth();
        var firstDay = new Date(y, m, 1);
        var lastDay = new Date(y, m + 1, 0);
        lastDay.setHours(23, 59, 59, 999);
        firstDay.setHours(0, 0, 0, 0);
        firstday_timestamp = unixtimestamp.fromDate(firstDay);
        lastday_timestamp = unixtimestamp.fromDate(lastDay);
        sql_optin =
          "SELECT COUNT(c.id) as total_optins FROM tap_customers c INNER JOIN tap_customers_merchant cm ON c.id=cm.customer_id WHERE  merchant_id=:merchant_id" +
          " AND cm.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp";
        sql_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_gotu_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_push_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'push' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_gotu_counter =
          "SELECT count(id) as gotu_counter FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_total_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_ads =
          "SELECT SUM(click_count) as total_click FROM tap_adscount WHERE ads_name = (select push_url FROM tap_merchants where merchant_id = :merchant_id" +
          " )  AND UNIX_TIMESTAMP(update_date) BETWEEN :firstday_timestamp AND :lastday_timestamp";
        break;
      case "year":
        var d = new Date();
        firstday = new Date(d.getFullYear(), 0, 1);
        lastday = new Date(d.getFullYear(), 11, 31);
        firstday.setHours(0, 0, 0, 0);
        lastday.setHours(23, 59, 59, 999);
        firstday_timestamp = unixtimestamp.fromDate(firstday);
        lastday_timestamp = unixtimestamp.fromDate(lastday);
        sql_optin =
          "SELECT COUNT(c.id) as total_optins FROM tap_customers c INNER JOIN tap_customers_merchant cm ON c.id=cm.customer_id WHERE  merchant_id=:merchant_id" +
          " AND cm.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp";
        sql_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_gotu_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_push_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'push' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_gotu_counter =
          "SELECT count(id) as gotu_counter FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_total_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_ads =
          "SELECT SUM(click_count) as total_click FROM tap_adscount WHERE ads_name = (select push_url FROM tap_merchants where merchant_id = :merchant_id" +
          " )  AND UNIX_TIMESTAMP(update_date) BETWEEN :firstday_timestamp AND :lastday_timestamp";
        break;
      case "date":
        var month = parseInt(filter_value.substring(0, 2)) - 1,
          day = filter_value.substring(2, 4),
          year = filter_value.substring(
            filter_value.length - 4,
            filter_value.length
          );
        var dates = filter_value.split("_");
        start = new Date(dates[1]);
        start.setHours(0, 0, 0, 0);
        end = new Date(dates[0]);
        end.setHours(23, 59, 59, 999);
        firstday_timestamp = unixtimestamp.fromDate(start);
        lastday_timestamp = unixtimestamp.fromDate(end);
        sql_optin =
          "SELECT COUNT(c.id) as total_optins FROM tap_customers c INNER JOIN tap_customers_merchant cm ON c.id=cm.customer_id WHERE  merchant_id= :merchant_id AND cm.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp";
        sql_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id= :merchant_id";
        sql_push_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'push' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id= :merchant_id";
        sql_gotu_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_gotu_counter =
          "SELECT count(id) as gotu_counter FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_total_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        sql_ads =
          "SELECT SUM(click_count) as total_click FROM tap_adscount WHERE ads_name = (select push_url FROM tap_merchants where merchant_id = :merchant_id" +
          " )  AND UNIX_TIMESTAMP(update_date) BETWEEN :firstday_timestamp AND :lastday_timestamp";
        break;
      case "all":
        sql_optin =
          "SELECT COUNT(c.id) as total_optins FROM tap_customers c INNER JOIN tap_customers_merchant cm ON c.id=cm.customer_id WHERE  merchant_id= :merchant_id";
        sql_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.merchant_id=:merchant_id";
        sql_push_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'push' and  co.merchant_id= :merchant_id";
        sql_gotu_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.merchant_id= :merchant_id";
        sql_gotu_counter =
          "SELECT count(id) as gotu_counter FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.merchant_id= :merchant_id";
        sql_total_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where co.gotu = 1 and gc.active=true AND co.merchant_id= :merchant_id";
        sql_ads =
          "SELECT SUM(click_count) as total_click FROM tap_adscount WHERE ads_name = (select push_url FROM tap_merchants where merchant_id = :merchant_id  )";

        break;
      default:
        start = new Date();
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        firstday_timestamp = unixtimestamp.fromDate(start);
        lastday_timestamp = unixtimestamp.fromDate(end);

        sql_optin =
          "SELECT COUNT(c.id) as total_optins FROM tap_customers c INNER JOIN tap_customers_merchant cm ON c.id=cm.customer_id WHERE  merchant_id=:merchant_id AND cm.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp";
        sql_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id= :merchant_id";
        sql_ads =
          "SELECT SUM(click_count) as total_click FROM tap_adscount WHERE ads_name = (select push_url FROM tap_merchants where merchant_id = :merchant_id)  AND UNIX_TIMESTAMP(update_date) BETWEEN :firstday_timestamp AND :lastday_timestamp";
        sql_total_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp  AND co.merchant_id= :merchant_id";
        sql_push_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'push' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id= :merchant_id";
        sql_gotu_revenue =
          "SELECT IFNULL(SUM(co.saleAmount),0) as total_revenue FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp  AND :lastday_timestamp AND co.merchant_id= :merchant_id";
        sql_gotu_counter =
          "SELECT count(id) as gotu_counter FROM tap_customer_orders co Inner Join tap_gotu_campaigns as gc ON gc.merchant_id=co.merchant_id and gc.campaign_id = co.coupon_id where type = 'gotu' and co.gotu = 1 and gc.active=true AND co.created_at BETWEEN :firstday_timestamp AND :lastday_timestamp AND co.merchant_id=:merchant_id";
        break;
    }
    return new Promise(function (resolve, reject) {
      async.parallel({
        total_optins: function (callback) {
          model.sequelize
            .query(sql_optin, {
              replacements: {
                merchant_id: merchant_id,
                firstday_timestamp: firstday_timestamp,
                lastday_timestamp: lastday_timestamp
              },
              type: model.sequelize.QueryTypes.SELECT
            })
            .then(function (result) {
              if (result.length > 0) {
                callback(null, result[0]);
              } else {
                callback(null, {});
              }
            })
            .catch(function (err) {
              callback(err);
            });
        },
        total_revenue: function (callback) {
          model.sequelize
            .query(sql_revenue, {
              replacements: {
                merchant_id: merchant_id,
                firstday_timestamp: firstday_timestamp,
                lastday_timestamp: lastday_timestamp
              },
              type: model.sequelize.QueryTypes.SELECT
            })
            .then(function (result) {
              if (result.length > 0) {
                callback(null, result[0]);
              } else {
                callback(null, {});
              }
            })
            .catch(function (err) {
              callback(err);
            });
        },
        total_click: function (callback) {
          model.sequelize
            .query(sql_ads, {
              replacements: {
                merchant_id: merchant_id,
                firstday_timestamp: firstday_timestamp,
                lastday_timestamp: lastday_timestamp
              },
              type: model.sequelize.QueryTypes.SELECT
            })
            .then(function (result) {
              if (result.length > 0) {
                callback(null, result[0]);
              } else {
                callback(null, {});
              }
            })
            .catch(function (err) {
              callback(err);
            });
        },
        sql_total_revenue: function (callback) {
          model.sequelize
            .query(sql_total_revenue, {
              replacements: {
                merchant_id: merchant_id,
                firstday_timestamp: firstday_timestamp,
                lastday_timestamp: lastday_timestamp
              },
              type: model.sequelize.QueryTypes.SELECT
            })
            .then(function (result) {
              if (result.length > 0) {
                callback(null, result[0]);
              } else {
                callback(null, {});
              }
            })
            .catch(function (err) {
              callback(err);
            });
        },
        sql_push_revenue: function (callback) {
          model.sequelize
            .query(sql_push_revenue, {
              replacements: {
                merchant_id: merchant_id,
                firstday_timestamp: firstday_timestamp,
                lastday_timestamp: lastday_timestamp
              },
              type: model.sequelize.QueryTypes.SELECT
            })
            .then(function (result) {
              if (result.length > 0) {
                callback(null, result[0]);
              } else {
                callback(null, {});
              }
            })
            .catch(function (err) {
              callback(err);
            });
        },
        sql_gotu_revenue: function (callback) {
          model.sequelize
            .query(sql_gotu_revenue, {
              replacements: {
                merchant_id: merchant_id,
                firstday_timestamp: firstday_timestamp,
                lastday_timestamp: lastday_timestamp
              },
              type: model.sequelize.QueryTypes.SELECT
            })
            .then(function (result) {
              if (result.length > 0) {
                callback(null, result[0]);
              } else {
                callback(null, {});
              }
            })
            .catch(function (err) {
              callback(err);
            });
        },
        sql_gotu_counter: function (callback) {
          model.sequelize
            .query(sql_gotu_counter, {
              replacements: {
                merchant_id: merchant_id,
                firstday_timestamp: firstday_timestamp,
                lastday_timestamp: lastday_timestamp
              },
              type: model.sequelize.QueryTypes.SELECT
            })
            .then(function (result) {
              if (result.length > 0) {
                callback(null, result[0]);
              } else {
                callback(null, {});
              }
            })
            .catch(function (err) {
              callback(err);
            });
        }
      },
        function (err, results) {
          if (!err) {
            console.log(results);
            resolve(results);
          } else {
            reject(err);
          }
        }
      );
    });
  },
  /*
    Function:used for check merchant alredy have PIN for this device.
    Params1:@merchan_id,Type:String
    Params2:@device_id:Type:String
    */
  checkDeviceAlredyHavePin: function (merchant_id, device_uuid) {
    return new Promise(function (resolve, reject) {
      model.tap_merchantdevice_pin
        .findAll({
          attributes: ["merchant_id", "device_uuid", "pin", "created_date", "expire_on"],
          where: {
            merchant_id: merchant_id,
            device_uuid: device_uuid
          }
        })
        .then(function (result) {
          if (result.length > 0) {
            resolve(result[0]);
          } else {
            resolve("create_new");
          }
        })
        .catch(function (err) {
          console.log("Error Message: ", err);
          reject(err);
        });
    });
  },

  /*
    Function:used for check merchant alredy have PIN for this device.
    Params1:@merchan_id,Type:String
    Params2:@device_id:Type:String
    */
  createNewPin_and_check: function (pin, res) {
    console.log("IN createNewPin_and_check..." + pin + "...", res);
    return new Promise(function (resolve, reject) {
      pinAlredyTaken(pin).then(
        function (PinAlredyTekenorNot) {
          console.log("PinAlredyTekenorNot====" + PinAlredyTekenorNot);
          if (PinAlredyTekenorNot === false) {
            //return this PIN is not assigned to any one.
            console.log("pin===return" + pin);
            if (res === 0) {
              resolve(pin);
            } else {
              res(pin);
            }
          } else if (PinAlredyTekenorNot === true) {
            //trying to create new PIN.
            createNewPin_and_check(randomString(4, "0123456789"), resolve);
          }
        },
        function (error) {
          console.log("Error Message: ", error);
          reject(error);
        }
      );
    });
  },

  /*
        Function:used for INSERT CREATE PIN FOR DEVICE....
        Params1:@PIN,Type:String
    */
  create_pin: function (merchant_id, device_uuid, merchant_pin, clientIp) {
    console.log("In create_pin IP::==" + clientIp);
    var end = Math.floor((new Date().getTime() + 30 * 60000) / 1000);
    var today = Math.floor(Date.now() / 1000);
    return new Promise(function (resolve, reject) {
      model.tap_merchantdevice_pin
        .create({
          merchant_id: merchant_id,
          device_uuid: device_uuid,
          pin: merchant_pin,
          unique_id: uuidv4(),
          created_date: today,
          expire_on: end,
          client_ip: clientIp
        })
        .then(function (result) {
          // you can now access the newly created task via the variable task
          resolve({
            merchant_id: merchant_id,
            device_uuid: device_uuid,
            pin: merchant_pin,
            created_date: today,
            expire_on: end
          });
        })
        .catch(function (err) {
          console.log("Error Message: ", err);
          reject(err);
        });
    });
  },
  /*
        Function:used for Update the PIN and unique ID....
        Params1:@PIN,Type:String
    */
  overwrite_pin: function (merchant_id, device_uuid, merchant_pin, clientIp) {
    console.log("In create_pin IP::==" + clientIp);
    var end = Math.floor((new Date().getTime() + 30 * 60000) / 1000);
    var today = Math.floor(Date.now() / 1000);
    return new Promise(function (resolve, reject) {
      model.tap_merchantdevice_pin
        .update({
          pin: merchant_pin,
          created_date: today,
          expire_on: end,
          client_ip: clientIp,
          pin_released: 0,
          expired: 0
        }, {
            where: {
              merchant_id: merchant_id,
              device_uuid: device_uuid
            }
          })
        .then(function (result) {
          // you can now access the newly created task via the variable task
          resolve({
            merchant_id: merchant_id,
            device_uuid: device_uuid,
            pin: merchant_pin,
            created_date: today,
            expire_on: end
          });
        })
        .catch(function (err) {
          console.log("Error Message: ", err);
          reject(err);
        });
    });
  },

  /**
   *
   *
   * @param {*} length
   * @param {*} input
   * @returns 4 digit Integer PIN
   * @random unique PIN.
   */
  randomString: function (length, input) {
    var result = "";
    var chars = typeof input !== "undefined" ? input : "0123456789";
    for (var i = length; i > 0; --i)
      result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  },
  /**
   *
   *
   * @param {*} unique_id
   */
  getePinexpireStatus: function (unique_id) {
    return new Promise(function (resolve, reject) {
      model.tap_merchantdevice_pin
        .findAll({
          attributes: ["id"],
          where: {
            expired: 1,
            unique_id: unique_id
          }
        })
        .then(function (result) {
          if (result.length > 0) {
            resolve({
              pin_expired: true
            });
          } else {
            resolve({
              pin_expired: false
            });
          }
        })
        .catch(function (err) {
          console.log("Error Message: ", err);
          reject(err);
        });
    });
  },

  /**
   *
   * Function is used for fetch the data from our database for PIN and unique id
   * @param {*} pin
   * @returns
   */
  varifyPin: function (pin) {
    var finaldata = {
      status: false
    };

    return new Promise(function (resolve, reject) {
      if (pin == " " || pin == "") {
        resolve(finaldata);
      } else {
        model.tap_merchantdevice_pin
          .findAll({
            attributes: [
              "merchant_id",
              "client_ip",
              "unique_id",
              "is_used",
              "pin"
            ],
            where: {
              $or: [{
                pin: pin
              },
              {
                unique_id: pin
              }
              ]
            }
          })
          .then(function (result) {
            if (result.length > 0) {
              result[0].dataValues.status = true;
              resolve(result[0]);
            } else {
              resolve(finaldata);
            }
          })
          .catch(function (err) {
            console.log("Error Message: ", err);
            reject(err);
          });
      }
    });
  },

  /**
   *
   * Updating the flag pin_released=1,from now PIN have been released.
   * @param {*} pin
   * @param {*} unique_id
   * @returns
   */
  rleasePin: function (pin, unique_id) {
    return new Promise(function (resolve, reject) {
      model.tap_merchantdevice_pin
        .update({
          pin_released: 1,
          pin: "",
          client_ip: ""
        }, {
            where: {
              pin: pin,
              unique_id: unique_id
            }
          })
        .then(function (result) {
          // you can now access the newly created task via the variable task
          console.log("release PIN===", result);
          resolve(result);
        })
        .catch(function (err) {
          console.log("Error Message: ", err);
          reject(err);
        });
    });
  },

  /**
   *
   * Unpairing the device and removing all information from our database.
   * @param {*} unique_id
   * @returns
   */
  unPairedDevice: function (unique_id) {
    return new Promise(function (resolve, reject) {
      model.tap_merchantdevice_pin
        .destroy({
          where: {
            unique_id: unique_id
          }
        })
        .then(function (result) {
          // you can now access the newly created task via the variable task
          console.log("release PIN===", result);
          resolve(true);
        })
        .catch(function (err) {
          console.log("Error Message: ", err);
          reject(err);
        });
    });
  },
  // made for physical web click
  physicalWebClick: function (merchant_id) {
    return new Promise(function (resolve, reject) {
      model.tap_merchants
        .findAll({
          where: {
            merchant_id: merchant_id,
            active: "true"
          }
        })
        .then(function (result) {
          getLinkAnalytics(result[0].dataValues.push_url)
            .then(retData => {
              resolve(retData);
            })
            .catch(err => {
              console.log(err);
              reject(err);
            });
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },

  /**
   *
   *
   * @param {*} customer_id
   * @param {*} merchant_id
   * @param {*} phone
   * @returns
   */
  getCustomerMerchantDetailsInnerJoin: function (
    customer_id,
    merchant_id,
    phone
  ) {
    console.log(
      "getCustomerMerchantDetailsInnerJoin",
      customer_id,
      merchant_id,
      phone
    );
    return new Promise(function (resolve, reject) {
      if (customer_id) {
        console.log("havecustomer_id...");
        var query =
          "SELECT c.id, c.phoneNumber, c.short_code, c.created_at, cm.last_visit_at, cm.prefContactMethod, cm.type, c.couponsHold, c.total_discount, c.total_orders, c.total_purchase, c.updated_at, cm.full_dob, cm.lastName, cm.birthDay, cm.birthMonth, cm.birthYear, cm.emails, cm.firstName, c.social_ids, cm.zip, c.refferedByID, c.initialReferral, c.cognito_id, cm.gender, cm.profile_completed FROM tap_customers c INNER JOIN tap_customers_merchant cm ON c.id=cm.customer_id WHERE cm.customer_id=:customer_id AND cm.merchant_id=:merchant_id";
        model.sequelize
          .query(query, {
            replacements: {
              merchant_id: merchant_id,
              customer_id: customer_id
            },
            type: model.sequelize.QueryTypes.SELECT
          })
          .then(function (data) {
            console.log("=============================data[0]", data[0]);
            if (data.length > 0) {
              new GetCustomerSpending(customer_id, phone, merchant_id).then(
                function (total_spending) {
                  data[0].total_spending = total_spending;
                  if (merchant_id && merchant_id !== "") {
                    console.log(" new GetCustomerSpending");
                    new tap_getOptinCustomerRDS(
                      data[0].phoneNumber,
                      merchant_id
                    ).then(
                      function (response) {
                        data[0].optin =
                          response.optin !== undefined ? response.optin : 0;
                        data[0].optin_at =
                          response.optin_at !== undefined ?
                            response.optin_at :
                            0;
                        resolve(data[0]);
                      },
                      function (error) {
                        data[0].optin = 0;
                        data[0].optin_at = 0;
                        resolve(data[0]);
                      }
                    );
                  } else {
                    resolve(data[0]);
                  }
                },
                function (err) {
                  reject("Records Not Found.");
                }
              );
            } else {
              reject("Records Not Found.");
            }
          })
          .catch(function (err) {
            reject(err);
          });
      } else if (phone) {
        console.log("have phone number...");
        var sql =
          "SELECT c.id, c.phoneNumber, c.short_code, c.created_at, cm.last_visit_at, cm.prefContactMethod, cm.type, c.couponsHold, c.total_discount, c.total_orders, c.total_purchase, c.updated_at, cm.full_dob, cm.lastName, cm.birthDay, cm.birthMonth, cm.birthYear, cm.emails, cm.firstName, c.social_ids, cm.zip, c.refferedByID, c.initialReferral, c.cognito_id, cm.gender, cm.profile_completed FROM tap_customers c INNER JOIN tap_customers_merchant cm ON c.id=cm.customer_id WHERE cm.customer_phone=:phone";
        if (merchant_id !== "") {
          sql += " AND cm.merchant_id=:merchant_id";
        }
        model.sequelize
          .query(sql, {
            replacements: {
              merchant_id: merchant_id,
              phone: phone
            },
            type: model.sequelize.QueryTypes.SELECT
          })
          .then(function (data) {
            if (data.length > 0) {
              new GetCustomerSpending(customer_id, phone, merchant_id).then(
                function (total_spending) {
                  if (merchant_id && merchant_id !== "") {
                    console.log(" new GetCustomerSpending phone");
                    new tap_getOptinCustomerRDS(
                      data[0].phoneNumber,
                      merchant_id
                    ).then(
                      function (response) {
                        data[0].optin =
                          response.optin !== undefined ? response.optin : 0;
                        data[0].optin_at =
                          response.optin_at !== undefined ?
                            response.optin_at :
                            0;
                        resolve(data[0]);
                      },
                      function (error) {
                        data[0].optin = 0;
                        data[0].optin_at = 0;
                        resolve(data[0]);
                      }
                    );
                  } else {
                    resolve(data[0]);
                  }
                },
                function (err) {
                  reject("Records Not Found.");
                }
              );
            } else {
              reject("Records Not Found.");
            }
          })
          .catch(function (err) {
            reject(err);
          });
      }
    });
  },
  SmsSendLater: function (req, res) {
    model.tap_sentsms_nooffer
      .findAll({
        where: {
          sent_status: "0",
          date_time_with_timezone: {
            [lte]: moment().unix()
          }
        }
      })
      .then(function (details) {
        async.forEachOf(
          details,
          function (details, key, Maincallback) {
            var textmessage = details["message"];
            var row_id = details["id"];

            //     //GET NUBMER BY INVOKE
            var merchant_id = details["merchant_id"] ?
              details["merchant_id"] :
              "";
            var customerName = details["customer_name"] ?
              details["customer_name"] :
              "";
            var lastVisited = details["customer_view_lastDay"] ?
              details["customer_view_lastDay"] :
              "";
            var customerType = details["customer_profile_type"] ?
              details["customer_profile_type"] :
              "";
            var randomlyCustomer = details["random_customers"] ?
              details["random_customers"] :
              "";
            var daysOptIn = details["since_opte_in_date"] ?
              details["since_opte_in_date"] :
              "";
            var bdStartDate = details["last_purchase_start_date"] ?
              details["last_purchase_start_date"] :
              "";
            var bdEndtDate = details["last_purchase_end_date"] ?
              details["customer_profile_type"] :
              "";
            var amountSpent = details["ammount_spent"] ?
              details["ammount_spent"] :
              "";
            var amountSpentSign = details["operator"] ?
              details["operator"] :
              "";
            var couponsAvailable = details["coupen_available"] ?
              details["coupen_available"] :
              "";
            var unfinished_profile = details["not_finished_profile"] ?
              details["not_finished_profile"] :
              "";
            var zip = details["zipcode"] ? details["zipcode"] : "";
            var dataset = {
              merchant_id: merchant_id,
              customerName: customerName,
              lastVisited: lastVisited,
              customerType: customerType,
              randomlyCustomer: randomlyCustomer,
              daysOptIn: daysOptIn,
              bdStartDate: bdStartDate,
              bdEndtDate: bdEndtDate,
              amountSpent: amountSpent,
              amountSpentSign: amountSpentSign,
              couponsAvailable: couponsAvailable,
              unfinished_profile: unfinished_profile,
              zip: zip
            };
            module.exports.filterCustomerNumber(req, res, dataset).then(
              function (response) {
                var mobilenumbers = [];
                var cusDetail = response;
                cusDetail.forEach(function (data) {
                  mobilenumbers.push(data.phoneNumber);
                });
                var commaSeperatedMob = mobilenumbers.join(",");
                async.forEachOf(
                  mobilenumbers,
                  function (mobilenumbers, innerKey, innercallback) {
                    module.exports
                      .getcustomersIdbyMobileNumber(mobilenumbers, merchant_id)
                      .then(
                        function (customersdetails) {
                          console.log(
                            "customer pgone",
                            customersdetails.customer_phone
                          );
                          if (customersdetails.customer_phone) {
                            console.log(inserted);
                            module.exports
                              .SmsSendWithLimit(
                                merchant_id,
                                customersdetails.customer_id,
                                textmessage
                              )
                              .then(
                                function (datsent) {
                                  console.log(datsent);
                                  innercallback();
                                },
                                function (error) {
                                  console.log(error);
                                  innercallback();
                                }
                              );
                          }
                        },
                        function (error) {
                          console.log(error);
                          innercallback();
                        }
                      );
                  },
                  function (error) {
                    if (!error) {
                      model.tap_sentsms_nooffer
                        .update({
                          sent_status: "1",
                          customer_phone: commaSeperatedMob
                        }, {
                            where: {
                              id: row_id
                            }
                          })
                        .then(function (result) {
                          console.log("update row details : ", result);
                        })
                        .catch(function (err) {
                          console.log("Error update row details: ", err);
                        });
                      Maincallback();
                    }
                  }
                );
              },
              function (error) {
                console.log("Task Error 34", error);
                model.tap_sentsms_nooffer
                  .update({
                    sent_status: "1"
                  }, {
                      where: {
                        id: row_id
                      }
                    })
                  .then(function (result) {
                    console.log("update row details : ", result);
                  })
                  .catch(function (err) {
                    console.log("Error update row details: ", err);
                  });
              }
            );
          },
          function (error) {
            if (!error) {
              console.log(
                "success data=============================================================================================================="
              );
            } else {
              console.log("Errror data", error);
            }
          }
        );
      })
      .catch(function (err) {
        console.log("Errror :->>>", err);
      });
  },
  SmsSendWithLimit: function (merchant_id, customer_id, message) {
    message = "Hi ";
    merchant_id = "RCTST0000008099";
    customer_id = 1162;
    model.tap_merchants
      .findAll({
        attributes: ["taptext_status", "country"],
        where: {
          active: "true",
          taptext_status: "true",
          merchant_id: merchant_id
        }
      })
      .then(function (result) {
        if (result.length === 1) {
          let resultData = result[0].dataValues;

          console.log(resultData);
          var query =
            "Select cm.emails,cm.merchant_id,me.active as merchant_active,me.email_limit,me.email_limit_perUser,me.sms_limit,me.sms_limit_perUser,me.sms_sent,me.email_sent,cm.optin,cm.optin_at,cm.type,cm.customer_phone,cm.customer_phone as phoneNumber, cm.customer_id as id, cm.created_at,cm.last_visit_at,cm.prefContactMethod, me.dba  from tap_customers_merchant cm  LEFT JOIN tap_merchants me ON cm.merchant_id = me.merchant_id where cm.optin = '1' and cm.customer_id = :customer_id AND cm.merchant_id = :merchant_id";
          model.sequelize
            .query(query, {
              replacements: {
                customer_id: customer_id,
                merchant_id: merchant_id
              },
              type: model.sequelize.QueryTypes.SELECT
            })
            .then(function (customerdetails) {
              let customerdata = customerdetails[0];
              if (customerdetails.length === 1) {
                if (customerdata.optin == "1") {
                  if (customerdata.prefContactMethod === 0) {
                    module.exports
                      .sendEmailSMS(
                        customerdata,
                        "sms",
                        message,
                        resultData.country
                      )
                      .then(function (msgsent) {
                        console.log(msgsent);
                      });
                  } else if (customerdata.prefContactMethod === 1) {
                    module.exports
                      .sendEmailSMS(
                        customerdata,
                        "email",
                        message,
                        resultData.country
                      )
                      .then(function (msgsent) {
                        console.log(msgsent);
                      });
                  } else if (customerdata.prefContactMethod === 2) {
                    Promise.all([
                      module.exports.sendEmailSMS(
                        merchant_customer_info,
                        "sms",
                        message,
                        resultData.country
                      ),
                      module.exports.sendEmailSMS(
                        merchant_customer_info,
                        "email",
                        message,
                        merdata.country
                      )
                    ]).then(function (resolve) {
                      console.log("in all ");
                    });
                  }
                } else {
                  console.log("not opyin");
                }
              } else {
                console.log("Sorry no Record found against given information.");
              }
            })
            .catch(function (err) {
              reject(err);
            });
        } else {
          console.log("Merchant not active for text to customers");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  },
  getcustomersIdbyMobileNumber: function (mobileNumber, merchant_id) {
    return new Promise(function (resolve, reject) {
      model.tap_merchants
        .findAll({
          attributes: ["taptext_status"],
          where: {
            taptext_status: "true",
            merchant_id: merchant_id
          }
        })
        .then(function (result) {
          if (result.length > 0) {
            model.tap_customers_merchant
              .findAll({
                attributes: ["customer_phone", "merchant_id", "customer_id"],
                where: {
                  customer_phone: mobileNumber,
                  merchant_id: merchant_id
                }
              })
              .then(function (customerresult) {
                if (customerresult.length > 0) {
                  resolve(customerresult[0].dataValues);
                } else {
                  reject("No customer Found");
                }
              })
              .catch(function (err) {
                reject(err);
              });
          } else {
            reject("Merchant tap text is not active");
          }
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },
  filterCustomerNumber: function (req, res, dataset) {
    return new Promise(function (resolve, reject) {
      console.log('999999999999999999999999999999999999999999999999')
      var searchQuery = {};
      if (Object.keys(dataset).length > 0) {
        searchQuery = {
          merchant_id: dataset.merchant_id,
          customerName: dataset.customerName ?
            decodeURI(dataset.customerName) : "",
          lastVisited: dataset.lastVisited ? dataset.lastVisited : "",
          customerType: dataset.customerType ? dataset.customerType : "",
          randomlyCustomer: dataset.randomlyCustomer ?
            dataset.randomlyCustomer : "",
          daysOptIn: dataset.daysOptIn ? dataset.daysOptIn : "",
          bdStartDate: dataset.bdStartDate ? dataset.bdStartDate : "",
          bdEndtDate: dataset.bdEndtDate ? dataset.bdEndtDate : "",
          amountSpent: dataset.amountSpent ? dataset.amountSpent : "",
          amountSpentSign: dataset.amountSpentSign ?
            dataset.amountSpentSign : "",
          couponsAvailable: dataset.couponsAvailable ?
            dataset.couponsAvailable : "",
          unfinished_profile: dataset.unfinished_profile === "on" ? 0 : "",
          zip: dataset.zip !== null && dataset.zip !== "" ? dataset.zip : "",
          searchData: dataset.searchData ? dataset.searchData : "",
          searchall: dataset.searchall ? dataset.searchall : ""
        };
      } else {
        searchQuery = {
          merchant_id: req.params.merchant_id,
          customerName: req.query.customerName ?
            decodeURI(req.query.customerName) : "",
          lastVisited: req.query.lastVisited ? req.query.lastVisited : "",
          customerType: req.query.customerType ? req.query.customerType : "",
          randomlyCustomer: req.query.randomlyCustomer ?
            req.query.randomlyCustomer : "",
          daysOptIn: req.query.daysOptIn ? req.query.daysOptIn : "",
          bdStartDate: req.query.bdStartDate ? req.query.bdStartDate : "",
          bdEndtDate: req.query.bdEndtDate ? req.query.bdEndtDate : "",
          amountSpent: req.query.amountSpent ? req.query.amountSpent : "",
          amountSpentSign: req.query.amountSpentSign ?
            req.query.amountSpentSign : "",
          couponsAvailable: req.query.couponsAvailable ?
            req.query.couponsAvailable : "",
          unfinished_profile: req.query.unfinished_profile === "on" ? 0 : "",
          zip: req.query.zip !== null && req.query.zip !== "" ? req.query.zip : "",
          searchData: req.query.searchData ? req.query.searchData : "",
          searchall: req.query.searchall ? req.query.searchall : ""
        };
      }
      module.exports.send_coupon_to_customers(searchQuery).then(
        function (datafromquery) {
          resolve(datafromquery);
        },
        function (error) {
          reject(error);
        }
      );
    });
  },
  send_coupon_to_customers: function (searchQuery) {
    return new Promise(function (resolve, reject) {
      var sql = "";
      var sql_count = "";
      if (searchQuery.searchall == 1) {
        sql =
          "Select cm.customer_id,cm.customer_phone as phoneNumber,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.merchant_id= :merchant_id";
      } else if (
        searchQuery.customerName !== null &&
        searchQuery.customerName !== ""
      ) {
        sql = `Select cm.customer_id,cm.customer_phone as phoneNumber,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.merchant_id= :merchant_id AND CONCAT(cm.firstName, ' ', cm.lastName) LIKE  :customerName `;
      } else if (
        searchQuery.lastVisited !== null &&
        searchQuery.lastVisited != 0 &&
        searchQuery.lastVisited !== ""
      ) {
        sql =
          "Select customer_id,customer_phone as phoneNumber,merchant_id from tap_customers_merchant Where optin='1' AND merchant_id= :merchant_id AND last_visit_at >= :lastVisited";
      } else if (
        searchQuery.customerType !== null &&
        searchQuery.customerType !== "normal" &&
        searchQuery.customerType !== ""
      ) {
        sql =
          "Select customer_id,customer_phone as phoneNumber,merchant_id from tap_customers_merchant Where optin='1' AND merchant_id=:merchant_id  AND type= :customerType";
      } else if (
        searchQuery.randomlyCustomer !== null &&
        searchQuery.randomlyCustomer !== "" &&
        searchQuery.randomlyCustomer != 0
      ) {
        sql_count =
          "Select count(*) as total from tap_customers_merchant Where optin='1' AND merchant_id= :merchant_id";
        //limit=parseInt(ceil(((count/100)*searchQuery.randomlyCustomer)))
        sql =
          "Select customer_id, customer_phone as phoneNumber, merchant_id from tap_customers_merchant  Where optin='1' AND merchant_id= :merchant_id Order By RAND() Limit 10";
      } else if (
        searchQuery.zip !== null &&
        searchQuery.zip !== undefined &&
        searchQuery.zip !== ""
      ) {
        var zipdata = searchQuery.zip.split(",");
        var completezipdata = zipdata.join("','");
        sql =
          "Select cm.customer_id,cm.customer_phone as phoneNumber,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.merchant_id= :merchant_id AND cm.zip IN ('" +
          completezipdata +
          "')";
      } else if (
        searchQuery.daysOptIn !== null &&
        searchQuery.daysOptIn !== "" &&
        searchQuery.daysOptIn != 0
      ) {
        sql =
          "Select customer_id,customer_phone as phoneNumber,merchant_id from tap_customers_merchant Where optin='1' AND merchant_id= :merchant_id AND optin_at>=:daysOptIn";
      } else if (
        searchQuery.couponsAvailable !== null &&
        searchQuery.couponsAvailable !== "" &&
        searchQuery.couponsAvailable != 0
      ) {
        sql =
          "Select cm.customer_id,cm.merchant_id,cm.customer_phone as phoneNumber,Count(cm.id) as total_coupon  from tap_customers_merchant as cm Inner Join  tap_coupons as c ON (cm.customer_id=c.customer_id AND cm.merchant_id=c.merchant_id)   LEFT JOIN tap_coupons_used as cu ON c.id=cu.coupon_id Where cu.coupon_id IS  NULL AND cm.merchant_id= :merchant_id AND cm.optin='1'  Group BY cm.customer_id,cm.merchant_id";
        if (searchQuery.couponsAvailable == "1") {
          sql += "  Having Count(cm.id)>=1 and Count(cm.id)<=5";
        } else if (searchQuery.couponsAvailable == "2") {
          sql += "  Having Count(cm.id)>=6 and Count(cm.id)<=10";
        } else if (searchQuery.couponsAvailable == "3") {
          sql += "  Having Count(cm.id)>10";
        }
      } else if (
        searchQuery.amountSpent !== null &&
        searchQuery.amountSpent !== "" &&
        searchQuery.amountSpent != 0 &&
        searchQuery.amountSpentSign !== null &&
        searchQuery.amountSpentSign !== ""
      ) {
        sql =
          "Select cm.customer_id,cm.customer_phone as phoneNumber,cm.merchant_id,sum(co.saleAmount) as total_spent from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where cm.merchant_id= :merchant_id group by customer_id,merchant_id";
        if (searchQuery.amountSpentSign == "less") {
          sql += "  Having sum(co.saleAmount)<:amountSpent";
        } else if (searchQuery.amountSpentSign == "greater") {
          sql += "  Having sum(co.saleAmount)> :amountSpent";
        } else if (searchQuery.amountSpentSign == "equal") {
          sql += "  Having sum(co.saleAmount)= :operator";
        }
      } else if (
        searchQuery.bdStartDate !== null &&
        searchQuery.bdStartDate !== "" &&
        searchQuery.bdStartDate != 0 &&
        searchQuery.bdEndtDate !== null &&
        searchQuery.bdEndtDate !== "" &&
        searchQuery.bdEndtDate != 0
      ) {
        sql =
          "Select cm.customer_id,cm.merchant_id,cm.customer_phone as phoneNumber from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where co.created_at>= :bdStartDate AND co.created_at<= :bdEndtDate AND cm.merchant_id= :merchant_id AND cm.optin='1' group by co.customer_id,co.merchant_id";
      } else if (
        searchQuery.unfinished_profile !== null &&
        searchQuery.unfinished_profile == 0
      ) {
        sql =
          "Select cm.customer_id,cm.customer_phone as phoneNumber,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.merchant_id= :merchant_id AND cm.profile_completed='0' group by cm.customer_id,cm.merchant_id";
      }

      const dateFrom = moment()
        .subtract(searchQuery.lastVisited, "d")
        .format("YYYY-MM-DD");
      const fromdt = moment(dateFrom).unix();
      const replacementsparams = {
        merchant_id: searchQuery.merchant_id,
        bdStartDate: searchQuery.bdStartDate,
        bdEndtDate: searchQuery.bdEndtDate,
        operator: parseFloat(parseFloat(searchQuery.amountSpent).toFixed(2)),
        amountSpent: searchQuery.amountSpent,
        daysOptIn: searchQuery.daysOptIn,
        customerName: "%" + searchQuery.customerName + "%",
        lastVisited: fromdt,
        customerType: searchQuery.customerType
      };
      if (sql_count !== "") {
        model.sequelize
          .query(sql_count, {
            replacements: replacementsparams,
            type: model.sequelize.QueryTypes.SELECT
          })
          .then(function (data) {
            if (data.length > 0) {
              var total = data[0].total;
              var limit = Math.floor(
                (total / 100) * searchQuery.randomlyCustomer
              );
              sql =
                "Select customer_id, customer_phone as phoneNumber, merchant_id from tap_customers_merchant Where optin='1' AND merchant_id = :merchant_id  Order By RAND() Limit " +
                limit;
              model.sequelize
                .query(sql, {
                  replacements: replacementsparams,
                  type: model.sequelize.QueryTypes.SELECT
                })
                .then(function (customers) {
                  if (customers.length > 0) {
                    resolve(customers);
                  } else {
                    reject("Customer not found");
                  }
                })
                .catch(function (err) {
                  reject(err);
                });
            } else {
              reject("No customer found against merchant");
            }
          })
          .catch(function (err) {
            reject(err);
          });
      } else {
        model.sequelize
          .query(sql, {
            replacements: replacementsparams,
            type: model.sequelize.QueryTypes.SELECT
          })
          .then(function (customers) {
            if (customers.length > 0) {
              resolve(customers);
            } else {
              reject("Customer not found");
            }
          })
          .catch(function (err) {
            reject(err);
          });
      }
    });
  },
  /**
   *
   * Used for create new count detail if ads-url not in our table.
   * @param {*} ads_name
   */
  createNewAdsRecord: function (ads_name) {
    return new Promise(function (resolve, reject) {
      model.tap_adscount
        .create({
          ads_name: ads_name,
          click_count: "1"
        })
        .then(function (result) {
          resolve(true);
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },
  /**
   *
   *
   * @param {*} priviousclicks
   * @param {*} id
   * @param {*} ads_name
   */
  updateAdsCount: function (priviousclicks, id, ads_name) {
    var clicks = parseInt(priviousclicks) + 1;
    console.log("in updateAdsCount");
    return new Promise(function (resolve, reject) {
      model.tap_adscount
        .update({
          click_count: Sequelize.literal("click_count + 1")
        }, {
            where: {
              ads_name: ads_name,
              id: id
            }
          })
        .then(function (result) {
          if (result[0] > 0) {
            resolve(true);
          } else {
            reject("Please provide us valid merchant id");
          }
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },
  /**
   *
   * USED FOR FETCH ALL COUPONS OF MERCHANT BASIS OF MERCHANT ID
   * @param {*} Mid
   */
  getAllMerchantAvailableOffers: function (Mid) {
    const today = Math.floor(Date.now() / 1000);
    const system_offers = [
      "30 days return offer",
      "60 days return offer",
      "90 days return offer",
      "Custom",
      "Signup offer",
      "Complete Your Profile",
      "Top Spender",
      "Casual customer offer",
      "Regular customer offer",
      "Vip customers offer",
      "5 punches loyalty offers",
      "10 punches loyalty offers",
      "15 punches loyalty offers",
      "Referral offers",
      "Birthday offers"
    ];
    return new Promise(function (resolve, reject) {
      model.tap_merchant_offers
        .findAll({
          where: {
            MerchantId: Mid,
            deactivated_at: {
              $eq: null
            },
            $or: {
              Discount_Type: {
                $ne: "3"
              },
              $and: {
                active: "false",
                Discount_Type: {
                  $eq: "3"
                }
              }
            }
          }
        })
        .then(function (rows) {
          var available_offer = [];
          var index = 0;
          var total_offers = system_offers.length;
          var recurseSystemOffer = function (index) {
            if (index == total_offers) {
              resolve(available_offer);
            } else {
              var systemOffer = system_offers[index];
              var avail_offer = {};
              var offer = findElement(rows, "Discount_Type", index);
              if (
                (offer !== undefined &&
                  offer["id"] !== undefined &&
                  offer["id"] !== null &&
                  offer["active"] !== null &&
                  offer["active"] == "false") ||
                offer === undefined
              ) {
                if (offer !== undefined) {
                  avail_offer.id = offer.id;
                  avail_offer.Discount_Type = offer.Discount_Type;
                  avail_offer.discount_name = systemOffer;
                  avail_offer.active = offer["active"];
                  available_offer = available_offer.concat(avail_offer);
                  recurseSystemOffer(++index);
                } else {
                  avail_offer.id = index;
                  avail_offer.offer_id = index;
                  avail_offer.Discount_Type = index;
                  avail_offer.discount_name = systemOffer;
                  available_offer = available_offer.concat(avail_offer);
                  recurseSystemOffer(++index);
                }
              } else {
                recurseSystemOffer(++index);
              }
            }
          };
          recurseSystemOffer(index);
        })
        .catch(function (err) {
          console.log("Error Message: ", err);
          reject(err);
        });
    });
  },
  /**
   *
   * USED FOR UPDATE THE MERCHANT INFORMATION.
   * @param {*} req
   * @param {*} res
   */
  updateMerchantInfo: function (req, res) {
    console.log("res.body====>", req.body);
    const owner_id = req.body.owner_id;
    const owner_email = req.body.owner_email;
    const merchantId = req.body.merchantId;
    const dba = req.body.dba;
    const email = req.body.email;
    const goal = parseInt(req.body.signupgoal);
    var active = req.body.active;
    const frequency = req.body.frequency;
    const token = req.body.token;
    const package_name = (req.body.package) ? req.body.package : "";
    const clover_mid = (req.body.clover_mid) ? req.body.clover_mid : "";
    const pushy = (req.body.pushy !== undefined) ? req.body.pushy : "";
    var created_at = Math.floor(Date.now() / 1000);
    var gotu_id = (req.body.gotu_id !== undefined) ? req.body.gotu_id : "";
    var address1 = (req.body.address1 !== undefined) ? req.body.address1 : "";
    var address2 = (req.body.address2 !== undefined) ? req.body.address2 : "";
    var address3 = (req.body.address3 !== undefined) ? req.body.address3 : "";
    var city = (req.body.city !== undefined) ? req.body.city : "";
    var country = (req.body.country !== undefined) ? req.body.country : "";
    var state = (req.body.state !== undefined) ? req.body.state : "";
    var phoneNumber = (req.body.phoneNumber !== undefined) ? req.body.phoneNumber : "";
    var zip = (req.body.zip !== undefined) ? req.body.zip : "";
    var first_name = (req.body.first_name !== undefined) ? req.body.first_name : "";
    var last_name = (req.body.last_name !== undefined) ? req.body.last_name : "";
    var timeZone = req.body.timeZone ? req.body.timeZone : "";
    var language = req.body.language ? req.body.language : "";
    console.log("dba===" + dba + "==email==" + email + "==merchantId==" + merchantId + "==goal==" + goal + "===active===" + active + "==frequency==" + frequency + "===token===" + token + "===owner_id====" + owner_id + "===owner_email===" + owner_email);
    return new Promise(function (resolve, reject) {
      if (!dba || dba == "" || !email || email == "" || !merchantId || (!goal && goal != 0) || active == "" || active.length <= 0 || !frequency || !token || token == "" || !owner_id || owner_id == "" || !owner_email || owner_email == "") {
        reject("Missing mandatory fields.");
      }
      if (active == "true") {
        active = true;
      } else {
        active = false;
      }
      console.log("owner_id==============>");
      module.exports.createGlobalMerchant(owner_id, owner_email).then(
        function (resolve_details) {
          //Check Merchant is Exists..
          model.tap_merchants
            .findAll({
              where: {
                merchant_id: merchantId
              }
            })
            .then(function (rows) {
              console.log("rows.length===============11", rows.length);
              if (rows.length > 0) {
                // Update Record  into the database
                console.log("rows.length===============true", rows.length);
                model.tap_merchants
                  .update({
                    pushy: pushy,
                    package_name: package_name
                  }, {
                      where: {
                        merchant_id: merchantId
                      }
                    })
                  .then(function (result) {
                    resolve(true);
                  })
                  .catch(function (err) {
                    console.log("error...2sdf", err);
                    reject(err);
                  });
              } else {
                var insertparams = {
                  Item: {
                    dba: dba,
                    email: email,
                    merchant_id: merchantId,
                    owner_id: resolve_details,
                    keyword: merchantId,
                    goal: goal,
                    index: 0,
                    active: active,
                    frequency: frequency,
                    created_at: created_at,
                    pushy: pushy,
                    nick_name: dba,
                    clover_mid: clover_mid
                  }
                };
                if (token) {
                  insertparams.Item["token"] = token;
                }
                if (gotu_id !== "") {
                  insertparams.Item["gotu_id"] = gotu_id;
                }
                if (package_name) {
                  insertparams.Item["package_name"] = package_name;
                }
                if (
                  address1 !== undefined &&
                  address1 !== null &&
                  address1 !== ""
                ) {
                  insertparams.Item["address1"] = address1;
                }
                if (
                  address2 !== undefined &&
                  address2 !== null &&
                  address2 !== ""
                ) {
                  insertparams.Item["address2"] = address2;
                }
                if (
                  address3 !== undefined &&
                  address3 !== null &&
                  address3 !== ""
                ) {
                  insertparams.Item["address3"] = address3;
                }
                if (city !== undefined && city !== null && city !== "") {
                  insertparams.Item["city"] = city;
                }
                if (
                  country !== undefined &&
                  country !== null &&
                  country !== ""
                ) {
                  insertparams.Item["country"] = country;
                }
                if (state !== undefined && state !== null && state !== "") {
                  insertparams.Item["state"] = state;
                }
                if (
                  phoneNumber !== undefined &&
                  phoneNumber !== null &&
                  phoneNumber !== ""
                ) {
                  insertparams.Item["phoneNumber"] = phoneNumber;
                }
                if (zip !== undefined && zip !== null && zip !== "") {
                  insertparams.Item["zip"] = zip;
                }
                if (
                  first_name !== undefined &&
                  first_name !== null &&
                  first_name !== ""
                ) {
                  insertparams.Item["first_name"] = first_name;
                }
                if (
                  last_name !== undefined &&
                  last_name !== null &&
                  last_name !== ""
                ) {
                  insertparams.Item["last_name"] = last_name;
                }
                if (timeZone !== undefined && timeZone !== null && timeZone !== "") {
                  insertparams.Item['timezone'] = timeZone;
                }
                if (language !== undefined && language !== null && language !== "") {
                  insertparams.Item['tier_billing_notification_language'] = language;
                }
                create_yext_id(req.body).then(
                  function (yext_location_id) {
                    console.log("inside of create yext call....");
                    model.tap_merchants
                      .create(insertparams.Item)
                      .then(function (result) {
                        var today = Math.floor(Date.now() / 1000);
                        var sub =
                          emailContent.NEW_MERCHANTS_REGISTRATION.subject;
                        var mainSubject = sub.replace(
                          "%DBA%",
                          insertparams.Item.dba
                        );
                        var body = emailContent.NEW_MERCHANTS_REGISTRATION.body;
                        body = body.replace("%MERCHANT_ID%", merchantId);
                        body = body.replace("%DBA%", insertparams.Item.dba);
                        body = body.replace(
                          "%FIRST_NAME%",
                          insertparams.Item.first_name ?
                            insertparams.Item.first_name :
                            ""
                        );
                        body = body.replace(
                          "%LAST_NAME%",
                          insertparams.Item.last_name ?
                            insertparams.Item.last_name :
                            ""
                        );
                        body = body.replace(
                          "%PHONE_NUMBER%",
                          insertparams.Item.phoneNumber ?
                            insertparams.Item.phoneNumber :
                            ""
                        );
                        body = body.replace(
                          "%EMAIL_ADDRESS%",
                          email ? email : ""
                        );
                        body = body.replace("%ADDRESS_1%", address1);
                        var to = emailContent.NEW_MERCHANTS_REGISTRATION.to;
                        var html = emailContent.NEW_MERCHANTS_REGISTRATION.html;
                        var htmlContent = html.replace("%BODY%", body);
                        htmlContent = htmlContent.replace(
                          "%SUBJECT%",
                          mainSubject
                        );

                        helper
                          .sendEmailFromSales(
                            to,
                            mainSubject,
                            htmlContent,
                            "",
                            ""
                          )
                          .then(
                            function () {
                              console.log("mail send successfully");
                            },
                            function (reject) {
                              console.log(
                                "Somthing went wrong Email not send.",
                                reject
                              );
                            }
                          );
                        resolve(true);
                      })
                      .catch(function (err) {
                        console.log("in error.....");
                        console.log("in error.....", err);
                        reject(err);
                      });
                  },
                  function (reject) {
                    console.log("reject......................1222");
                    reject(reject);
                  }
                );
              }
            })
            .catch(function (err) {
              reject(err);
            });
        },
        function (err) {
          reject(err);
        }
      );
    });
  },
  sendEmailSMS: function (
    merchant_customer_info,
    type,
    message,
    offer_detail,
    merchant_region
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
          helper.getMerchantSMSCount(
            merchant_customer_info.merchant_id,
            "monthly",
            type
          ).then(function (sms_sent) {
            if (merchant_customer_info.sms_limit <= sms_sent && merchant_customer_info.sms_unlimited != '1') {
              let upgradeTierData = {
                segmentNeedToAdd: (sms_sent + splitter.split(
                  message
                ).parts.length), 
                trigger : message
              };
              tierBillingScheduleInfo
                .updgardeTierWithOveragePrice(merchant_customer_info.merchant_id, upgradeTierData)
                .then(
                  function (res) {
                    console.log("Sms sent Limit already reached and Tier Upgraded.");
                    getMerchantCustomerSMSCount(
                      merchant_customer_info.merchant_id,
                      merchant_customer_info.phoneNumber,
                      "monthly",
                      type
                    ).then(
                      function (consumed_count) {
                        if (
                          consumed_count.consume >=
                          merchant_customer_info.sms_limit_PerUser
                        ) {
                          reject(
                            "Sms sent limit against this customer already reached."
                          );
                        } else {
                          tap_twilioSMSController.twilioSMS({
                            phone: merchant_customer_info.phoneNumber,
                            message: message,
                            merchant_region: merchant_region
                          },
                            function (err, sendsms) {
                              if (err) {
                                console.log("sms sent failed", err);
                                reject(err);
                              } else {
                                if (sendsms.statusCode == 200) {
                                  console.log("Response from twilio ", sendsms);
                                  message = sendsms.sent_sms;
                                  var log_data = {
                                    timestamp: parseInt(today),
                                    merchant_id: merchant_customer_info.merchant_id,
                                    customer_phone: merchant_customer_info.phoneNumber,
                                    subject: offer_detail.Data,
                                    message: message
                                  };
                                  Promise.all([
                                    insertLogsSMS_Email(type, log_data),
                                    updateMerchants({
                                      message: message,
                                      sms_sent: 1,
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
                            }
                          );
                        }
                      },
                      function (err) {
                        reject(err);
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
              getMerchantCustomerSMSCount(
                merchant_customer_info.merchant_id,
                merchant_customer_info.phoneNumber,
                "monthly",
                type
              ).then(
                function (consumed_count) {
                  if (
                    consumed_count.consume >=
                    merchant_customer_info.sms_limit_PerUser
                  ) {
                    reject(
                      "Sms sent limit against this customer already reached."
                    );
                  } else {
                    tap_twilioSMSController.twilioSMS({
                      phone: merchant_customer_info.phoneNumber,
                      message: message,
                      merchant_region: merchant_region
                    },
                      function (err, sendsms) {
                        if (err) {
                          console.log("sms sent failed", err);
                          reject(err);
                        } else {
                          if (sendsms.statusCode == 200) {
                            console.log("Response from twilio ", sendsms);
                            message = sendsms.sent_sms;
                            var log_data = {
                              timestamp: parseInt(today),
                              merchant_id: merchant_customer_info.merchant_id,
                              customer_phone: merchant_customer_info.phoneNumber,
                              subject: offer_detail.Data,
                              message: message
                            };
                            Promise.all([
                              insertLogsSMS_Email(type, log_data),
                              updateMerchants({
                                message: message,
                                sms_sent: 1,
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
                      }
                    );
                  }
                },
                function (err) {
                  reject(err);
                }
              );
            }
          });
        }
      } else {
        if (
          merchant_customer_info.email_limit === 0 ||
          merchant_customer_info.email_limit_perUser === 0
        ) {
          reject("Email sent Limit already reached.");
        } else {
          helper.getMerchantSMSCount(
            merchant_customer_info.merchant_id,
            "monthly",
            type
          ).then(function (emails_sent) {
            if (merchant_customer_info.email_limit <= emails_sent) {
              reject("Sms sent Limit already reached.");
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
                    reject(
                      "Email sent limit against this customer already reached."
                    );
                  } else {
                    tap_sendEmailController.sendEmail({
                      emails: merchant_customer_info.emails,
                      message: message,
                      timestamp: today,
                      subject: offer_detail.Data
                    },
                      function (sendsms) {
                        if (err) {
                          console.log("email sent failed");
                          reject(err);
                        } else {
                          if (sendsms.statusCode == 200) {
                            var log_data = {
                              timestamp: parseInt(today),
                              merchant_id: merchant_customer_info.merchant_id,
                              customer_phone: merchant_customer_info.phoneNumber,
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
          });
        }
      }
    });
  },
  /**
   *
   *
   * @param {*} owner_id
   * @param {*} owner_email
   * @returns
   */
  createGlobalMerchant: function (owner_id, owner_email) {
    console.log("inside global merchant.121 ");
    return new Promise(function (resolve, reject) {
      model.tap_global_merchants
        .findAll({
          where: {
            merchant_id: owner_id
          }
        })
        .then(function (result) {
          if (result.length > 0) {
            resolve(owner_id);
          } else {
            model.tap_global_merchants
              .create({
                merchant_id: owner_id,
                email: owner_email
              })
              .then(function (result) {
                resolve(owner_id);
              })
              .catch(function (err) {
                reject(err);
              });
          }
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },

  /**
   *
   *
   * @param {*} id
   * @param {*} text_active
   * @param {*} dba
   * @param {*} email
   * @param {*} owner_id
   * @param {*} owner_email
   * @param {*} goal
   * @param {*} active
   * @param {*} frequency
   * @param {*} token
   * @param {*} sms_limit
   * @param {*} email_limit
   * @param {*} email_limit_perUser
   * @param {*} sms_limit_perUser
   * @param {*} yext
   * @param {*} clover_mid
   * @param {*} estimote
   * @param {*} keyword
   * @param {*} gotu_id
   * @param {*} address1
   * @param {*} address2
   * @param {*} address3
   * @param {*} city
   * @param {*} country
   * @param {*} state
   * @param {*} phoneNumber
   * @param {*} zip
   * @param {*} first_name
   * @param {*} last_name
   * @param {*} push_active
   * @param {*} push_url
   * @param {*} beacons
   * @param {*} timeZone
   * @param {*} smsSent
   * @returns
   */
  update_merchant: function (
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
  ) {
    console.log("in side update_merchant");
    return new Promise(function (resolve, reject) {
      model.tap_merchants.belongsTo(model.tap_schedule_subscription, {
        foreignKey: "merchant_id",
        targetKey: "merchant_id"
      });
      model.tap_merchants
        .findAll({
          where: {
            merchant_id: id
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
          var data = result.map(function (result) {
            return result.toJSON();
          });
          if (data.length > 0) {
            var update_at = Math.floor(Date.now() / 1000);
            var updateparams = {
              TableName: "tap_merchants",
              Key: {
                merchant_id: id
              },
              Item: {
                updated_at: parseInt(update_at)
              }
            };

            if (dba !== undefined && dba !== null && dba !== "") {
              updateparams.Item.dba = dba;
            }
            if (gotu_id !== undefined && gotu_id !== null && gotu_id !== "") {
              updateparams.Item.gotu_id = gotu_id;
            }
            if (email !== undefined && email !== null && email !== "") {
              updateparams.Item.email = email.toLowerCase();
            }
            if (
              owner_id !== undefined &&
              owner_id !== null &&
              owner_id !== ""
            ) {
              updateparams.Item.owner_id = owner_id;
            }
            if (goal !== undefined && goal !== null && goal !== "") {
              updateparams.Item.goal = parseInt(goal);
            }
            if (
              text_active !== undefined &&
              text_active !== null &&
              text_active !== ""
            ) {
              if (text_active == "true") {
                console.log("data---------",data);
                if(data[0].tap_schedule_subscription){
                  console.log("schedule assigned.");
                  updateparams.Item.taptext_status = text_active;
                }else{
                  console.log("No schedule assigned.");
                  reject("Taplocal Text cannot be active unless you assign a Pricing Schedule / Training Mode.");
                  return false;
                }
              } else {
                updateparams.Item.taptext_status = text_active;
              }
            }
            if (yext !== undefined && yext !== null && yext !== "") {
              updateparams.Item.yext = parseInt(yext);
            }
            if (
              estimote !== undefined &&
              estimote !== null &&
              estimote !== ""
            ) {
              updateparams.Item.estimote = parseInt(estimote);
            }
            if (
              frequency !== undefined &&
              frequency !== null &&
              frequency !== ""
            ) {
              updateparams.Item.frequency = frequency;
            }
            if (
              email_limit !== undefined &&
              email_limit !== null &&
              email_limit !== ""
            ) {
              updateparams.Item.email_limit = parseInt(email_limit);
            }
            if (
              sms_limit !== undefined &&
              sms_limit !== null &&
              sms_limit !== ""
            ) {
              updateparams.Item.sms_limit = parseInt(sms_limit);
            }
            if (keyword !== undefined && keyword !== null && keyword !== "") {
              updateparams.Item.keyword = keyword;
            }
            if (
              clover_mid !== undefined &&
              clover_mid !== null &&
              clover_mid !== ""
            ) {
              updateparams.Item.clover_mid = clover_mid;
            }
            if (
              address1 !== undefined &&
              address1 !== null &&
              address1 !== ""
            ) {
              updateparams.Item.address1 = address1;
            }
            if (
              address2 !== undefined &&
              address2 !== null &&
              address2 !== ""
            ) {
              updateparams.Item.address2 = address2;
            }
            if (
              address3 !== undefined &&
              address3 !== null &&
              address3 !== ""
            ) {
              updateparams.Item.address3 = address3;
            }
            if (city !== undefined && city !== null && city !== "") {
              updateparams.Item.city = city;
            }
            if (country !== undefined && country !== null && country !== "") {
              updateparams.Item.country = country;
            }
            if (state !== undefined && state !== null && state !== "") {
              updateparams.Item.state = state;
            }
            if (
              phoneNumber !== undefined &&
              phoneNumber !== null &&
              phoneNumber !== ""
            ) {
              updateparams.Item.phoneNumber = phoneNumber;
            }
            if (zip !== undefined && zip !== null && zip !== "") {
              updateparams.Item.zip = zip;
            }
            if (
              first_name !== undefined &&
              first_name !== null &&
              first_name !== ""
            ) {
              updateparams.Item.first_name = first_name;
            }
            if (
              last_name !== undefined &&
              last_name !== null &&
              last_name !== ""
            ) {
              updateparams.Item.last_name = last_name;
            }
            if (
              push_active !== undefined &&
              push_active !== null &&
              push_active !== ""
            ) {
              console.log("push_active", push_active);
              if (push_active == "true" || push_active == true) {
                updateparams.Item.push_active = true;
              } else {
                updateparams.Item.push_active = false;
              }
              updateparams.Item.push_url = push_url;
            }
            if (
              email_limit_perUser !== undefined &&
              email_limit_perUser !== null &&
              email_limit_perUser !== ""
            ) {
              if (
                email_limit !== undefined &&
                email_limit !== null &&
                email_limit !== ""
              ) {
                if (email_limit < email_limit_perUser) {
                  reject("Email per user limit exceed from total limit");
                  return;
                }
              } else if (
                data[0].email_limit !== undefined &&
                data[0].email_limit !== null
              ) {
                if (parseInt(data[0].email_limit) < email_limit_perUser) {
                  reject("Email per user limit exceed from total limit");
                  return;
                }
              }
              updateparams.Item.email_limit_perUser = parseInt(
                email_limit_perUser
              );
            }
            if (sms_limit_perUser !== undefined && sms_limit_perUser !== null && sms_limit_perUser !== "") {
              // if (sms_limit !== undefined && sms_limit !== null && sms_limit !== "") {
              //     if (sms_limit < sms_limit_perUser && data[0].sms_unlimited != 1) {
              //         reject("SMS per user limit exceed from total limit");
              //         return;
              //     }
              // } else if (data[0].sms_limit !== undefined && data[0].sms_limit !== null) {
              //     if (parseInt(data[0].sms_limit) < sms_limit_perUser && data[0].sms_unlimited != 1) {
              //         reject("SMS per user limit exceed from total limit");
              //         return;
              //     }
              // }
              updateparams.Item.sms_limit_perUser = parseInt(sms_limit_perUser);
            }
            if (token !== undefined && token !== null && token !== "") {
              updateparams.Item.token = token;
            }
            // Update merchant time-zone
            if (timeZone !== undefined && timeZone !== null && timeZone !== "") {
              updateparams.Item.timezone = timeZone;
            }
            //// Update merchant sms usage count
            if (smsSent !== undefined && smsSent !== null && smsSent !== "") {
              if (
                data[0].sms_limit !== undefined &&
                data[0].sms_limit !== null
              ) {
                if (parseInt(data[0].sms_limit) < smsSent && data[0].sms_unlimited != 1) {
                  reject("Segment usage exceed from total segment limit");
                  return;
                }
              }
              updateparams.Item.sms_sent = smsSent;
            }
            model.tap_merchants
              .update(updateparams.Item, {
                where: {
                  merchant_id: id
                }
              })
              .then(function (result) {
                console.log(push_active);
                if (
                  push_active !== undefined &&
                  push_active !== null &&
                  push_active !== ""
                ) {
                  console.log(
                    "push_active !== undefined && push_active !== null && push_active !== "
                  );
                  Promise.all([
                    module.exports.updateBeacons(id, beacons),
                    module.exports.updatePushCampaign(id, push_url, push_active)
                  ]).then(
                    function (data) {
                      console.log("Promises all response:23 ", data);
                      resolve(_event);
                    },
                    function (reject_msg) {
                      console.log("Promises all response: 12", reject_msg);
                      reject("Something went wrong. Please try again.");
                    }
                  );
                } else {
                  console.log("inside else....");
                  resolve(_event);
                }
              })
              .catch(function (err) {
                reject(err);
              });
          } else {
            reject("No Record Found.");
          }
        })
        .catch(function (err) {
          console.log("Error Message: ", err);
          reject(err);
        });
    });
  },
  /**
   *
   *
   * @param {*} connection
   * @param {*} id
   * @param {*} push_url
   * @param {*} push_active
   * @returns
   */
  updatePushCampaign: function (id, push_url, push_active) {
    console.log("push_active1", typeof push_active);
    return new Promise(function (resolve, reject) {
      push_active =
        push_active == "true" || push_active == true ? "true" : "false";
      console.log("push_active2", push_active);
      model.tap_gotu_campaigns
        .update({
          payload: push_url,
          active: push_active
        }, {
            where: {
              type: "push",
              merchant_id: id
            }
          })
        .then(function (data) {
          if (data.length > 0) resolve(true);
          else {
            var today = Math.floor(Date.now() / 1000);
            // no existing record.. create new
            model.tap_gotu_campaigns
              .create({
                active: "false",
                merchant_id: id,
                expires: 0,
                Min_Purchase: 0,
                payload: push_url,
                created_at: today,
                type: "push"
              })
              .then(function (result) {
                resolve(true);
              })
              .catch(function (err) {
                reject(err);
              });
          }
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },
  /**
   *
   *
   * @param {*} connection
   * @param {*} id
   * @param {*} beacons
   * @returns
   */
  updateBeacons: function (id, beacons) {
    console.log("beacons===================>", beacons);
    return new Promise(function (resolve, reject) {
      // delete existing beacons
      model.tap_merchant_beacon
        .destroy({
          where: {
            merchant_id: id
          }
        })
        .then(
          function (rowDeleted) {
            if (beacons.length) {
              var insertValues = [];
              beacons.forEach(function (beacon) {
                beacon = beacon.replace(/(\r\n|\n|\r)/gm, "");
                var beconsdetails = {
                  merchant_id: id,
                  beacon: beacon
                };
                insertValues.push(beconsdetails);
              });
              // insertQuery += insertValues.join(", ");
              // console.log("Beacon Insert Query: ", insertQuery);
              model.tap_merchant_beacon
                .bulkCreate(insertValues)
                .then(function (result) {
                  resolve(true);
                })
                .catch(function (err) {
                  reject(err);
                });
            } else {
              resolve(true);
            }
          },
          function (err) {
            reject(err);
          }
        );
    });
  },

  /**
   *
   *
   * @param {*} mid
   * @param {*} keyword
   * @param {*} connection
   * @returns
   */
  checkKeyword: function (mid, keyword) {
    return new Promise(function (resolve, reject) {
      model.tap_merchants
        .findAll({
          where: {
            keyword: keyword,
            merchant_id: { $ne: mid }
          }
        })
        .then(function (data) {
          console.log("inside checkKeyword", data.length);
          if (data.length > 0) {
            reject("Keyword already taken.");
          } else {
            resolve(data);
          }
        })
        .catch(function (err) {
          console.log("Error Message121: ", err);
          reject(err);
        });
    });
  },
  /**
   *
   * USED for send the custome offer
   *
   */
  callCustomOffers: function () {
    return new Promise(function (resolve, reject) {
      module.exports.getAllActiveCustomOffers().then(
        function (offers) {
          var totalOffer = offers.length - 1;
          var loop = 0;
          var compltloop = 0;
          offers.forEach(function (offer, index) {
            console.log("offers.forEach====>", offer);
            var generate_coupon = false;
            if (
              offer["time"] !== undefined &&
              offer["time_zone"] !== undefined
            ) {
              generate_coupon = module.exports.check_coupon_time(
                offer["start_date"],
                offer["time"],
                offer["time_zone"],
                offer["offer_id"]
              );
            } else {
              var curnttime = moment().unix();
              generate_coupon = module.exports.check_coupon_time(
                curnttime,
                "12:00",
                "UTC",
                offer["offer_id"]
              );
            }
            console.log("Generate Coupon value is >> " + generate_coupon);
            console.log(index);
            loop++;
            if (generate_coupon) {
              module.exports.send_custome_coupon_to_customers(offer).then(
                function (resolve_data) {
                  console.log("in side send_custome_coupon_to_customers");
                  console.log("Offfer Id  print " + offer["offer_id"]);
                  module.exports
                    .updateOfferStatus(offer["offer_id"])
                    .then(function (updateResponse) {
                      console.log("Offer send successfully");
                      if (totalOffer == index) {
                        console.log(
                          "Offers details1 : " + totalOffer + "  == " + index
                        );
                        resolve(offers);
                      }
                    });

                  console.log(resolve_data);
                },
                function (reject) {
                  console.log(reject);
                }
              );
            } else {
              compltloop++;
              if (totalOffer == index) {
                console.log(
                  "Offers details2 : " + totalOffer + "  == " + index
                );
                resolve(offers);
              }
            }
          });
        },
        function (error) {
          console.log("getAllActiveCustomOffers");
          reject(error);
        }
      );
    });
  },
  /**
   *
   * USED FOR GET ALL CUSTOM OFFER OF MERCHANT
   * @param {*} NA
   * @returns
   */
  getAllActiveCustomOffers: function () {
    var today = Math.floor(Date.now() / 1000);
    return new Promise(function (resolve, reject) {
      var queryComeBackOffers = `SELECT mo.reward_text_media_image, mo.reward_text_message_type, mo.spanish_reward_text_message_type, mo.spanish_reward_text_media_image,
          mer.taptext_status, mo.id as offer_id,mo.Discount_Type,mo.time,mo.time_zone,mer.merchant_id,mo.bd_start_date,mo.bd_end_date,mo.amount_spent,mo.amount_spent_sign,mo.days_optin,mo.customer_name,mo.unfinished_profile,mo.randomly_customers_per,mo.customer_type,mo.zipcode,mo.start_date,mo.last_visited,mo.coupons_available FROM tap_merchant_offers as mo Inner Join tap_merchants as mer on mo.MerchantId=mer.merchant_id WHERE Discount_Type = '3' AND (mo.active = 'true') AND mer.active = 'true' AND mer.taptext_status='true' AND  mo.start_date<=:start_date AND mo.is_sent = 0 AND mo.min_to_earn = '0' `;
      model.sequelize
        .query(queryComeBackOffers, {
          replacements: {
            start_date: today
          },
          type: model.sequelize.QueryTypes.SELECT
        })
        .then(function (rows) {
          console.log("rowssss123===>", rows);
          if (rows.length > 0) {
            resolve(rows);
          } else {
            reject("no Record");
          }
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },

  /**
   *
   * USED FOR SEND THE COUPON TO CUSTOMERS.
   * @param {*} offer
   * @returns
   */
  send_custome_coupon_to_customers: function (offer) {
    console.log("offer=====>", offer);
    var sql,
      sql_count = "";
    return new Promise(function (resolve, reject) {
      if (offer["customer_name"] !== null && offer["customer_name"] !== "") {
        sql =
          "Select cm.customer_id,cm.customer_phone,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.merchant_id=:merchant_id AND CONCAT(cm.firstName, ' ', cm.lastName) LIKE :customer_name_like"; //'%' + offer['customer_name'] + '%'
      } else if (
        offer["last_visited"] !== null &&
        offer["last_visited"] != 0 &&
        offer["last_visited"] !== ""
      ) {
        sql =
          "Select customer_id,customer_phone,merchant_id from tap_customers_merchant Where optin='1' AND merchant_id=:merchant_id AND last_visit_at >=:timestamp_last_visit"; //gettimestampForDays(offer['last_visited']
      } else if (
        offer["customer_type"] !== null &&
        offer["customer_type"] !== "normal" &&
        offer["customer_type"] !== ""
      ) {
        sql =
          "Select customer_id,customer_phone,merchant_id from tap_customers_merchant Where optin='1' AND merchant_id=:merchant_id AND type=:customer_type"; //offer['customer_type']
      } else if (
        offer["randomly_customers_per"] !== null &&
        offer["randomly_customers_per"] !== "" &&
        offer["randomly_customers_per"] != 0
      ) {
        sql_count =
          "Select count(*) as total from tap_customers_merchant Where optin='1' AND merchant_id=:merchant_id";
        sql =
          "Select cm.customer_id,cm.customer_phone,cm.merchant_id from tap_customers_merchant as cm Where cm.optin='1' AND cm.merchant_id=:merchant_id Order By RAND() Limit 10";
      } else if (offer["zipcode"] !== null && offer["zipcode"] !== "") {
        sql =
          "Select cm.customer_id,cm.customer_phone,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.merchant_id=:merchant_id AND cm.zip IN (:zip)"; //('" + JSON.parse(offer['zipcode']).join("','") + "')";
      } else if (
        offer["days_optin"] !== null &&
        offer["days_optin"] !== "" &&
        offer["days_optin"] != 0
      ) {
        sql =
          "Select customer_id,customer_phone,merchant_id from tap_customers_merchant Where optin='1' AND merchant_id=:merchant_id AND optin_at>=:days_optin";
      } else if (
        offer["coupons_available"] !== null &&
        offer["coupons_available"] !== "" &&
        offer["coupons_available"] != 0
      ) {
        sql =
          "Select cm.customer_id,cm.merchant_id,cm.customer_phone,Count(cm.id) as total_coupon  from tap_customers_merchant as cm Inner Join  tap_coupons as c ON (cm.customer_id=c.customer_id AND cm.merchant_id=c.merchant_id)   LEFT JOIN tap_coupons_used as cu ON c.id=cu.coupon_id Where cu.coupon_id IS  NULL AND cm.merchant_id=:merchant_id AND cm.optin='1'  Group BY cm.customer_id,cm.merchant_id";
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
          "Select cm.customer_id,cm.customer_phone,cm.merchant_id,sum(co.saleAmount) as total_spent from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where cm.merchant_id=:merchant_id group by customer_id,merchant_id";
        if (offer["amount_spent_sign"] == "less") {
          sql += "  Having sum(co.saleAmount)<:amount_spent";
        } else if (offer["amount_spent_sign"] == "greater") {
          sql += "  Having sum(co.saleAmount)>:amount_spent";
        } else if (offer["amount_spent_sign"] == "equal") {
          sql += "  Having sum(co.saleAmount)=:amount_spent";
        }
      } else if (
        offer["bd_start_date"] !== null &&
        offer["bd_start_date"] !== "" &&
        offer["bd_start_date"] != 0 &&
        offer["bd_end_date"] !== null &&
        offer["bd_end_date"] !== "" &&
        offer["bd_end_date"] != 0
      ) {

        sql =
          "Select cm.customer_id,cm.merchant_id,cm.customer_phone from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where co.created_at>=:bd_start_date AND co.created_at<=:bd_end_date AND cm.merchant_id=:merchant_id AND cm.optin='1' group by co.customer_id,co.merchant_id";

      } else if (
        offer["unfinished_profile"] !== null &&
        offer["unfinished_profile"] == 1
      ) {
        sql =
          "Select cm.customer_id,cm.customer_phone,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.merchant_id=:merchant_id AND cm.profile_completed='0' group by cm.customer_id,cm.merchant_id";
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
              console.log("//for remaining filters.....1", offer["zipcode"]);
              var total = rows[0].total;
              var limit = Math.floor(
                (total / 100) * offer["randomly_customers_per"]
              );
              sql =
                "Select cm.customer_id,cm.customer_phone,cm.merchant_id from tap_customers_merchant as cm Where cm.optin='1' AND cm.merchant_id=:merchant_id Order By RAND() Limit " +
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
                .then(function (customers) {
                  module.exports.sendCouponstoCustomers(
                    customers,
                    offer
                  );
                  resolve(
                    "Coupons Gnerated for merchant " +
                    offer.merchant_id +
                    " offers id " +
                    offer.offer_id +
                    " QUERY : " +
                    sql
                  );
                })
                .catch(function (err) {
                  console.log("have query error......");
                  reject(err);
                });
            } else {
              resolve("No customer found against merchant");
            }
          })
          .catch(function (err) {
            reject(err);
          });
      } else {
        //for remaining filters
        console.log("//for remaining filters.....2", offer["zipcode"]);
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
            module.exports.sendCouponstoCustomers(customers, offer);
            resolve(
              "Coupons Gnerated for merchant " +
              offer.merchant_id +
              " offers id " +
              offer.offer_id
            );
          })
          .catch(function (err) {
            console.log("have query error......");
            reject(err);
          });
      }
    });
  },

  /**
   *
   * CHEK COUPON TIME HAS ARRIVED OR NOT.
   * @param {*} start_date
   * @param {*} time
   * @param {*} timezones
   * @param {*} offer_id
   * @returns
   */
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

    var currentTimeInUTC = moment().unix();

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

  /**
   *
   * CHEK COUPON TIME HAS ARRIVED OR NOT.
   * @param {*} time
   * @param {*} timezone
   * @param {*} offer_id
   * @returns
   */
  check_coupon_times: function (time, timezone, offer_id) {
    var today = new Date();
    timezone = timezone.toUpperCase();
    var times = time.split(":");

    var cron_hours = typeof times[0] != "undefined" ? times[0] : "12";
    var cron_minutes = typeof times[1] != "undefined" ? times[1] : "00";

    var cron = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      cron_hours,
      cron_minutes,
      "0"
    );

    var current_timestamp = Math.floor(today.getTime() / 1000);
    var timestamp_offset = current_timestamp - 30 * 60;
    var offer_time = Math.floor(cron.getTime() / 1000);

    var hours_difference = 0;
    switch (timezone) {
      case "AST":
      case "EST":
        hours_difference = 5 * 60 * 60;
        break;
      case "MST":
        hours_difference = 7 * 60 * 60;
        break;
      case "PST":
        hours_difference = 8 * 60 * 60;
        break;
      case "CST":
        hours_difference = 6 * 60 * 60;
        break;
      default:
        hours_difference =
          0 -
          moment()
            .tz(timezone)
            .utcOffset() *
          60; //moment().tz(timezone).utcOffset() will return the provided timezone difference from utc in minutes so if time zone is EST than as EST is 4 hour behind UTC it will return -240
        break;
    }
    console.log(
      "condition : " +
      (offer_time + hours_difference) +
      " <= " +
      current_timestamp
    );
    //if (timestamp_offset < (offer_time + hours_difference) && (offer_time + hours_difference) <= current_timestamp) {

    if (offer_time + hours_difference <= current_timestamp) {
      console.log("Offers to be sent is >> " + offer_id);
      return true;
    } else {
      console.log("Offers not sent  >> " + offer_id);
    }

    return false;
  },

  /**
   *
   *
   * @param {*} days
   * @returns
   */
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

  /**
   *
   *
   *
   * @param {*} customers
   * @param {*} offer_id
   * @returns
   */
  sendCouponstoCustomers: function (customers, offer) {
    console.log("Customer details are >>>> " + JSON.stringify(customers));
    customers.forEach(function (customer, index) {
      var phonenumber = customer.customer_phone.toString();
      var PuertoRico = helper.PuertoRico(phonenumber);

      var sms_content = textmessage.giveCoupon.english;
      if (PuertoRico) {
        sms_content = textmessage.giveCoupon.spanish;
      }
      console.log({
        tap_GenerateCoupon: "tap_GenerateCoupon",
        offer_type: "3",
        merchant_id: customer.merchant_id,
        offer_id: offer.offer_id,
        customer_id: customer.customer_id,
        message: sms_content,
        mediaUrl: offer['reward_text_media_image'],
        msgType: offer['reward_text_message_type'],
        spanishmediaUrl: offer['spanish_reward_text_media_image'],
        spanishmsgType: offer['spanish_reward_text_message_type'],
      });
      tap_GenerateCoupon.GenerateCoupon({
        offer_type: "3",
        offer_id: offer.offer_id,
        merchant_id: customer.merchant_id,
        customer_id: customer.customer_id,
        message: sms_content,
        mediaUrl: offer['reward_text_media_image'],
        msgType: offer['reward_text_message_type'],
        spanishmediaUrl: offer['spanish_reward_text_media_image'],
        spanishmsgType: offer['spanish_reward_text_message_type'],
      },
        function (error, response) {
          if (error) {
            console.log("Fail to send offer: " + JSON.stringify(error));
          } else {
            if (response.statusCode == 200) {
              console.log(
                "Offer send successfully: " + JSON.stringify(response)
              );
            } else {
              console.log("Fail to send offer: " + JSON.stringify(response));
            }
          }
        }
      );
    });

    return true;
  },

  /**
   *
   *
   *
   * @param {*} offer_id
   * @returns
   */
  updateOfferStatus: function (offer_id) {
    return new Promise(function (resolve, reject) {
      model.tap_merchant_offers
        .update({
          is_sent: 1
        }, {
            where: {
              id: offer_id
            }
          })
        .then(function (rows) {
          if (rows.length > 0) {
            resolve(rows);
          } else {
            reject("no Record");
          }
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },
  /**
   *
   * GET ALL MERCHANT FROM MERCHANT TABLE.
   * @param {*} req
   * @param {*} res
   */
  getMerchantList: function (req, res) {
    const RESPONSE = {
      OK: {
        statusCode: 200,
        message: "Success",
        data: []
      },
      ERROR: {
        statusCode: 400,
        message: "Something went wrong. Please try again."
      },
      NotFound: {
        statusCode: 404,
        message: "Record Not Found."
      },
      ParamMissing: {
        statusCode: 400,
        message: "Missing mandatory fields."
      }
    };
    var dba = req.query.dba;
    var active = req.query.active;
    var company = req.query.company;
    var filter = req.query.filter;
    var yext = req.query.yext;
    var params = {};
    var limit = parseInt(req.query.limit);
    var offset = parseInt(req.query.offset);
    console.log("dba====>", req.query);
    params.ExpressionAttributeValues = {};
    var where = "";
    var limitQuery = "";
    if (active == "true") {
      where += " AND active='true'";
    } else if (active == "false") {
      where += " AND active='false'";
    }

    var companyCode;
    if (company && company.length > 0) {
      switch (company) {
        case "tap":
          companyCode = "528000";
          break;
        case "banktech":
          companyCode = "513323";
          break;
        case "usvi":
          companyCode = "536353";
          break;
        default:
          companyCode = "global";
          break;
      }
    }

    if (companyCode !== undefined) {
      if (companyCode == "global") {
        params.ExpressionAttributeValues["id1"] = "528000";
        params.ExpressionAttributeValues["id2"] = "513323";
        params.ExpressionAttributeValues["id3"] = "536353";
        where +=
          " And  ( merchant_id Not LIKE :params_ExpressionAttributeValues_id1 and merchant_id Not LIKE :params.ExpressionAttributeValues_id2 and merchant_id Not LIKE :params_ExpressionAttributeValues_id3) and (merchant_type !=:params_ExpressionAttributeValues_id1 and merchant_type !=params_ExpressionAttributeValues_id2 and merchant_type !=:params_ExpressionAttributeValues_id3)";
      } else {
        params.ExpressionAttributeValues["idstart"] = companyCode.toString();
        where +=
          " And (merchant_id LIKE :ExpressionAttributeValues_idstart or merchant_type =:ExpressionAttributeValues_idstart)";
      }
    }
    if (yext) {
      where += " AND (data_new IS NOT NULL AND data_new !='' AND yext=1)";
    }
    if (filter && filter.length > 0) {
      filter = decodeURIComponent(filter);

      if (filter.indexOf("@") > -1) {
        where += " And email LIKE :filter_like";
      } else {
        filter = filter.toLowerCase();
        where +=
          " And (dba LIKE :filter_like OR merchant_id LIKE :filter_like OR nick_name LIKE :filter_like OR phoneNumber LIKE :filter_like )";
      }
    } else {
      if (dba && dba.length > 0) {
        params.ExpressionAttributeValues["dba"] = dba.toString();
        where +=
          " and (dba='" +
          params.ExpressionAttributeValues.dba.toString() +
          "') ";
      }
    }
    if (limit && offset) {
      limitQuery = " Limit " + offset + "," + limit;
    } else if (limit) {
      limitQuery = " Limit " + limit;
    }
    var items = [];
    return new Promise(function (resolve, reject) {
      var sql = "SELECT * FROM tap_merchants WHERE 1=1 " + where + limitQuery;
      model.sequelize
        .query(sql, {
          replacements: {
            params_ExpressionAttributeValues_id1: "%" + params.ExpressionAttributeValues["id1"] + "%",
            params_ExpressionAttributeValues_id2: "%" + params.ExpressionAttributeValues["id2"] + "%",
            params_ExpressionAttributeValues_id3: "%" + params.ExpressionAttributeValues["id3"] + "%",
            ExpressionAttributeValues_idstart: "%" + params.ExpressionAttributeValues["idstart"] + "%",
            filter_like: filter
          },
          type: model.sequelize.QueryTypes.SELECT
        })
        .then(function (rows) {
          console.log("inside first query....");
          if (rows.length > 0) {
            var data = rows;
            items = items.concat(rows);
            var total_items = items.length;
            var response = {};
            if (items.length) {
              var clean_items = [];
              items.forEach(function (merchant) {
                switch (true) {
                  case merchant.merchant_id.startsWith("528000"):
                    merchant.company = "Tap";
                    break;
                  case merchant.merchant_id.startsWith("513323"):
                    merchant.company = "BankTech";
                    break;
                  case merchant.merchant_id.startsWith("536353"):
                    merchant.company = "USVI";
                    break;
                  default:
                    merchant.company = "Global";
                    break;
                }

                //Filter for nonClovers
                if (merchant.merchant_type != "") {
                  switch (true) {
                    case merchant.merchant_type == "528000":
                      merchant.company = "Tap";
                      break;
                    case merchant.merchant_type == "513323":
                      merchant.company = "BankTech";
                      break;
                    case merchant.merchant_type == "536353":
                      merchant.company = "USVI";
                      break;
                    default:
                      merchant.company = "Global";
                      break;
                  }
                }

                if (merchant.merchant_type != "" && companyCode !== undefined) {
                  if (companyCode == merchant.merchant_type) {
                    clean_items = clean_items.concat(merchant);
                  }
                } else {
                  clean_items = clean_items.concat(merchant);
                }
              });
              RESPONSE.OK.offset = offset ? offset : 0;
              RESPONSE.OK.offset += clean_items.length;
              RESPONSE.OK.data = clean_items;
              var count_sql =
                "select count(*) as total from tap_merchants  WHERE 1=1 " +
                where;
              model.sequelize
                .query(count_sql, {
                  replacements: {
                    params_ExpressionAttributeValues_id1: "%" + params.ExpressionAttributeValues["id1"] + "%",
                    params_ExpressionAttributeValues_id2: "%" + params.ExpressionAttributeValues["id2"] + "%",
                    params_ExpressionAttributeValues_id3: "%" + params.ExpressionAttributeValues["id3"] + "%",
                    ExpressionAttributeValues_idstart: "%" + params.ExpressionAttributeValues["idstart"] + "%",
                    filter_like: filter
                  },
                  type: model.sequelize.QueryTypes.SELECT
                })
                .then(function (rows) {
                  if (rows[0].total <= RESPONSE.OK.offset)
                    RESPONSE.OK.offset = null;
                  resolve(RESPONSE.OK);
                })
                .catch(function (err) {
                  console.log("have query error......");
                  reject(err);
                });
            } else {
              console.log("NotFound 1");
              reject(RESPONSE.NotFound);
            }
          } else {
            console.log("NotFound 2");
            reject(RESPONSE.NotFound);
          }
        })
        .catch(function (err) {
          console.log("have query error445dfsd......", err);
          reject(err);
        });
    });
  },
  /**
   *
   * used for get the consumed SMS and Email Information.
   * @param {*} merchant_id
   * @returns
   */
  getmerchantConsumedata: function (merchant_id) {
    var firstDay = moment()
      .startOf("month")
      .format();
    var lastDay = moment()
      .endOf("month")
      .format();

    var montFirst = moment(firstDay) / 1000;
    var montlast = moment(lastDay) / 1000;

    return new Promise(function (resolve, reject) {
      model.tap_sent_sms
        .findAll({
          attributes: ["id"],
          where: {
            merchant_id: merchant_id
            // $gt: {
            //   timestamp: montFirst
            // },
            // $lt: {
            //   timestamp: montlast
            // }
          }
        })
        .then(function (rows) {
          if (rows.length > 0) {
            resolve(rows.length);
          } else {
            resolve(0);
          }
        })
        .catch(function (err) {
          console.log("Error Message: ", err);
          reject(err);
        });
    });
  },
  /**
   *
   *
   * @param {*} merchant_id
   * @returns
   */
  getMerchantZip_promise: function (merchant_id) {
    const RESPONSE = {
      OK: {
        message: "Success",
        statusCode: 200,
        data: []
      },
      ERROR: {
        statusCode: 400,
        message: "Something went wrong. Please try again."
      }
    };
    return new Promise(function (resolve, reject) {
      var sql =
        "Select DISTINCT cm.zip from tap_customers_merchant cm  Where cm.zip IS NOT NULL AND cm.zip!='' AND cm.merchant_id=:merchant_id";
      model.sequelize
        .query(sql, {
          replacements: {
            merchant_id: merchant_id
          },
          type: model.sequelize.QueryTypes.SELECT
        })
        .then(function (data) {
          if (data.length > 0) {
            RESPONSE.OK.data = data.map(function (a) {
              return a.zip;
            });
          } else {
            RESPONSE.OK.data = [];
          }

          resolve(RESPONSE.OK);
        })
        .catch(function (err) {
          reject("Something went wrong. Please try again.");
        });
    });
  },
  /**
   *
   * Used for non clover merchant dashboard and boarding login.
   * @param {*} merchant_id
   * @param {*} login_token
   * @returns
   */
  updateMerchantToken: function (merchant_id, login_token) {
    return new Promise(function (resolve, reject) {
      model.tap_merchants.update({
        login_token: login_token
      }, {
          where: {
            merchant_id: merchant_id
          }
        }).then(function (affectedRows) {
          console.log("updateMerchantToken spread================>", affectedRows);
          resolve(affectedRows.length);
        }).catch(function (err) {
          reject(err);
        });
    });

  },
  /**
   *
   *Used for non clover merchant dashboard and boarding login.
   * @param {*} merchant_id
   *
   * @returns
   */
  updateMerchantTokenafterlogin: function (merchant_id) {
    return new Promise(function (resolve, reject) {
      model.tap_merchants.update({
        login_token: ''
      }, {
          where: {
            merchant_id: merchant_id
          }
        }).then(function (affectedRows) {
          console.log("affectedRows====================================>", affectedRows);
          resolve(affectedRows.length);
        }).catch(function (err) {
          reject(err);
        });
    });
  },

  /**
   *
   *Used for non clover merchant dashboard and boarding login.
   * @param {*} merchant_id
   *
   * @returns
   */
  getmerchantDetails: function (merchant_id) {
    return new Promise(function (resolve, reject) {
      model.tap_merchants
        .findAll({
          where: {
            merchant_id: merchant_id
          }
        })
        .then(function (rows) {
          resolve(rows.length);
        })
        .catch(function (err) {
          console.log("Error Message: ", err);
          reject(err);
        });
    });

  },
  /**
   *
   *Used for non clover merchant dashboard and boarding login.
   * @param {*} merchant_id
   * @param {*} login_token
   *
   * @returns
   */
  getmerchantDetailslogin: function (merchant_id, login_token) {
    return new Promise(function (resolve, reject) {
      model.tap_merchants
        .findAll({
          where: {
            merchant_id: merchant_id,
            login_token: login_token
          }
        })
        .then(function (rows) {
          resolve(rows);
        })
        .catch(function (err) {
          console.log("Error Message: ", err);
          reject(err);
        });
    });

  },
  /*
    Update Nickname and secondary email & secondary phone...
    */
  updateNickname: function (nick_name, merchant_id, secondary_phone, secondary_email, timezone,
    smsNotificationCheck,
    emailNotificationCheck,
    tierBillingNotificationLanguage) {
    return new Promise(function (resolve, reject) {
      model.tap_merchants
        .update({
          nick_name: nick_name,
          secondary_phone: secondary_phone,
          secondary_email: secondary_email,
          timezone: timezone,
          sms_notification_check: smsNotificationCheck,
          email_notification_check: emailNotificationCheck,
          tier_billing_notification_language: tierBillingNotificationLanguage
        }, {
            where: {
              merchant_id: merchant_id
            }
          })
        .then(function (result) {
          resolve(true);
        })
        .catch(function (err) {
          console.log("Error Message: ", err);
          reject(err);
        });

    });
  },
  /**
   * Select all merchants with single email
   */
  selectMerchantsByEmail: (email) => {
    return new Promise(function (resolve, reject) {
      model.tap_merchants
        .findAll({
          where: {
            email: email
          }
        })
        .then(function (rows) {
          resolve(rows);
        })
        .catch(function (err) {
          console.log("Error Message: ", err);
          reject(err);
        });

    });
  },
  /**
   *
   * Check provided value is valid email or not.
   * @param {*} mail
   * @returns
   */
  validMail: function (mail) {
    return /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()\.,;\s@\"]+\.{0,1})+([^<>()\.,;:\s@\"]{2,}|[\d\.]+))$/.test(mail);
  }
};
// update merchant details
function updateMerchants(params) {
  return new Promise(function (resolve, reject) {
    var today = Math.floor(Date.now() / 1000);
    var update_expression = `updated_at= ${today}`;
    shorturl(params.message).then(
      function (mesgseg) {
        var addmessage = mesgseg.segment;
        if (params.sms_sent !== undefined) {
          update_expression += `,sms_sent = sms_sent + ${addmessage}`;
        }
        if (params.email_sent !== undefined) {
          update_expression += `,email_sent = email_sent + 1 `;
        }
        var sql = `UPDATE tap_merchants SET ${update_expression} WHERE merchant_id=:merchant_id`;
        console.log("update merchant sql", sql);
        model.sequelize
          .query(sql, {
            replacements: {
              update_expression: update_expression,
              merchant_id: params.merchant_id
            },
            type: model.sequelize.QueryTypes.UPDATE
          })
          .then(info => {
            resolve(info);
          })
          .catch(function (err) {
            console.log(err);
            reject(err);
          });
      },
      function (error) {
        console.log("email sent failed");
        reject(error);
      }
    );
  });
}
// update log SMS detals
function insertLogsSMS_Email(type, log_data) {
  var message = log_data.message;
  return new Promise(function (resolve, reject) {
    shorturl(message).then(function (mesgseg) {
      var table = "tap_sent_emails";
      log_data.message = mesgseg.message;
      if (type == "sms") {
        table = "tap_sent_sms";

        log_data.sms_segment = mesgseg.segment;
        model.tap_sent_sms.create(log_data).then(
          result => {
            resolve(result);
          },
          function (err) {
            reject(err);
          }
        );
        console.log("insertLogsSMS_Email");
      } else {
        console.log("insertLogsSMS_Email");
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
  });
}
// make merchant customer details

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
          " WHERE merchant_id = $merchant_id AND customer_phone = $customer_phone AND timestamp >= $timestampStart AND timestamp <= $timestampEnd GROUP BY merchant_id";
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
          " WHERE merchant_id = $merchant_id AND customer_phone = $customer_phone AND timestamp >= $timestampStart AND timestamp <= $timestampEnd GROUP BY merchant_id";
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
          " WHERE merchant_id = $merchant_id AND customer_phone = $customer_phone AND timestamp >= $timestampStart AND timestamp <= $timestampEnd GROUP BY merchant_id";
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
          " WHERE merchant_id = $merchant_id AND customer_phone = $customer_phone AND timestamp >= $timestampStart AND timestamp <= $timestampEnd GROUP BY merchant_id";
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
          " WHERE merchant_id = $merchant_id AND customer_phone = $customer_phone AND timestamp >= $timestampStart AND timestamp <= $timestampEnd GROUP BY merchant_id";
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
          " WHERE merchant_id = $merchant_id AND customer_phone = $customer_phone AND timestamp >= $timestampStart AND timestamp <= $timestampEnd GROUP BY merchant_id";
        break;
    }
    model.sequelize
      .query(sql, {
        bind: {
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
 *
 *Function:used for check PIN is IN use or not.
 * @param {*} @PIN,Type:String
 * @returns Success status with updated info.
 */
function pinAlredyTaken(pin) {
  console.log("IN pinAlredyTaken pin=========", pin);

  return new Promise(function (resolve, reject) {
    model.tap_merchantdevice_pin
      .findAll({
        attributes: ["id"],
        where: {
          pin: pin
        }
      })
      .then(function (result) {
        if (result.length > 0) {
          console.log("SORRY PIN IN USED.");
          resolve(true); //alredy this PIN have been teken.
        } else {
          console.log("THIS PIN IS NOT ASSIGNED TO ANY ONE.");
          resolve(false); //This is new PIN you can use this.
        }
      })
      .catch(function (err) {
        console.log("Error Message: ", err);
        reject(err);
      });
  });
}

function getLinkAnalytics(shortUrl) {
  const CONFIG = {
    GOOGLE: {
      SHORT_URL_SERVICE: {
        HOST: "www.googleapis.com",
        PATH: "/urlshortener/v1/url",
        KEY: "AIzaSyCas5hf4TQw_R_evU1O7PtskHFA3o3E2Wk" //ali.uzair... this key is also being used on boarding in signup_exe.php
      }
    }
  };
  return new Promise(function (resolve, reject) {
    var options = {
      host: CONFIG.GOOGLE.SHORT_URL_SERVICE.HOST,
      path: CONFIG.GOOGLE.SHORT_URL_SERVICE.PATH +
        "?key=" +
        CONFIG.GOOGLE.SHORT_URL_SERVICE.KEY +
        "&shortUrl=" +
        shortUrl +
        "&projection=FULL",
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    };
    console.log("anayltics request", options);

    var req = https.request(options, function (res) {
      // Collect response data as it comes back.
      var responseString = "";

      res.on("data", function (data) {
        responseString += data;
      });

      res.on("end", function () {
        var analyticsData = "";
        try {
          analyticsData = JSON.parse(responseString);
        } catch (e) {
          reject(e);
        }
        if ("error" in analyticsData) {
          reject("Error on getting clicks counting.");
        }
        resolve(analyticsData);
      });
    });

    req.on("error", function (e) {
      console.log("Error: ", e.message);
      reject(JSON.stringify(e));
    });

    req.end();
  });
}

/**
 * ADARSH
 * Used for get customer spending by id
 * @param {*} customer_id
 * @param {*} phone
 * @param {*} merchant_id
 * @returns total_spending of customer.
 */
function GetCustomerSpending(customer_id, phone, merchant_id) {
  return new Promise(function (resolve, reject) {
    var sql;
    var replacement_details;
    if (customer_id) {
      sql =
        "SELECT SUM(saleAmount) AS total_spending FROM tap_customer_orders co WHERE customer_id=:customer_id";
      replacement_details = {
        customer_id: customer_id
      };
    } else if (phone) {
      sql =
        "SELECT SUM(saleAmount) AS total_spending FROM tap_customer_orders co JOIN tap_customers c ON c.id=co.customer_id WHERE c.phoneNumber=:phone";
      replacement_details = {
        phone: phone
      };
    }
    if (merchant_id !== "") {
      sql += " AND merchant_id=:merchant_id";
      replacement_details.merchant_id = merchant_id;
    }
    sql += " GROUP BY co.customer_id";
    console.log(sql);
    model.sequelize
      .query(sql, {
        replacements: replacement_details,
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function (result) {
        if (result.length) {
          resolve(result[0].total_spending);
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
 *
 * This is used as invoked lambda function and returning the customer and merchant info
 * @param {*} customer_phone
 * @param {*} merchant_id
 */
function tap_getOptinCustomerRDS(customer_phone, merchant_id) {
  return new Promise(function (resolve, reject) {
    model.tap_customers_merchant
      .findAll({
        where: {
          merchant_id: merchant_id,
          customer_phone: customer_phone
        }
      })
      .then(function (result) {
        //console.log("result===========11==", result[0].dataValues);
        resolve(result[0].dataValues);
      })
      .catch(function (err) {
        console.log("Error Message tap_getOptinCustomerRDS: ", err);
        reject(err);
      });
  });
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
 *
 *
 * @param {*} arr
 * @param {*} propName
 * @param {*} propValue
 * @returns
 */
function findElement(arr, propName, propValue) {
  for (var i = 0; i < arr.length; i++)
    if (arr[i][propName] == propValue)
      //&& !arr[i].active
      return arr[i];

  // will return undefined if not found; you could return a default instead
}

function create_yext_id(parsed_data) {
  var yext_location = {
    locationName: parsed_data.dba,
    address: parsed_data.address1,
    address2: parsed_data.address2 !== undefined ? parsed_data.address2 : "",
    city: parsed_data.city,
    state: parsed_data.state,
    zip: parsed_data.zip,
    countryCode: parsed_data.country,
    phone: parsed_data.phoneNumber,
    categoryIds: ["1168"],
    featuredMessage: "Tap Clover Location"
  };
  return new Promise(function (resolve, reject) {
    console.log("function create_yext_id resolve", yext_location);
    resolve(yext_location);
  });
}