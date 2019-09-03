"use strict";
var model = require("../model");
var config = require("../config/config");
var timestamp = require("unix-timestamp");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));

module.exports = {
  getRegularCustomerofferUsedbyUser: function(req, callback) {
    responseMsg.RESPONSE200.invokeData = {};
    var customer_id = req.customer_id;
    var customer_phone = req.customer_phone;
    var merchant_id = req.merchant_id;
    var created_at = Math.floor(Date.now() / 1000);
    getCustomerTypeOffer(merchant_id).then(
      function(offers_data) {
        console.log("length=" + offers_data.length);
        if (offers_data.length < 1) {
          callback(null, responseMsg.offer_not_found);
        } else {
          var offer_detail = offers_data[0];
          if (offer_detail.spending_period !== null) {
            getMerchantCustomerOrder(
              merchant_id,
              customer_id,
              offer_detail.spending_period,
              offer_detail.start_date,
              offer_detail.Min_Purchase
            ).then(
              function(sales_data) {
                if (
                  sales_data.total_sales > 0 &&
                  offer_detail.min_to_earn < sales_data.total_sales
                ) {
                  console.log("already used the coupon");
                  callback(null, responseMsg.coupon_used);
                } else {
                  console.log("coupon not used");
                  callback(null, responseMsg.coupon_not_used);
                }
              },
              function(reject) {
                console.log(reject);
                callback(null, responseMsg.offer_not_found);
              }
            );
          } else {
            callback(null, responseMsg.offer_not_found);
          }
        }
      },
      function(err) {
        console.log("cks");
        responseMsg.RESPONSE400.message = err;
        callback(null, responseMsg.offer_not_found);
      }
    );
  }
};
/**
 * Get customer order
 * @param {*} merchant_id
 * @param {*} customer_id
 * @param {*} filter_by
 * @param {*} start_date
 * @param {*} min_purchage
 */
function getMerchantCustomerOrder(
  merchant_id,
  customer_id,
  filter_by,
  start_date,
  min_purchage
) {
  return new Promise(function(resolve, reject) {
    var tableName = "tap_customer_orders";
    var sql;
    var sqlParams = {};
    switch (filter_by) {
      case "day":
        console.log("day query min" + min_purchage);
        var today = new Date().getUnixTime();
        console.log("today_date_timestamp:" + today);
        console.log("today_date_timestamp_start_date:" + start_date);
        var offer_start_date = new Date(start_date * 1000).getUnixTime();
        var day = monthsDiffernce(today, offer_start_date, 1);
        console.log("count day=" + day);
        if (day < 0) {
          var start = new Date(start_date * 1000);
          var end = new Date();
          end.setHours(23, 59, 59, 999);
        } else {
          console.log("day 0 in result");
          var days = day * 1;
          var offer_start_date = new Date(start_date * 1000);
          var start = offer_start_date.addDays(days);
          console.log("add start date=" + start);
          start.setHours(0, 0, 0, 0);
          var end = new Date(today * 1000);
          end.setHours(23, 59, 59, 999);
          console.log("end date=" + end);
        }
        sql =
          "SELECT SUM(saleAmount) AS total_sales FROM " +
          tableName +
          " WHERE merchant_id=:merchant_id AND customer_id=:customer_id AND created_at >= :created_at_start GROUP BY merchant_id";
        console.log("day query used=>" + sql);
        sqlParams.merchant_id = merchant_id;
        sqlParams.customer_id = customer_id;
        sqlParams.created_at_start = timestamp.fromDate(end.toUTCString());
        break;
      case "week":
        console.log("week");
        var today = new Date().getUnixTime();
        var offer_start_date = new Date(start_date * 1000).getUnixTime();
        var weeks = monthsDiffernce(today, offer_start_date, 7);
        console.log("week day=" + today);
        if (weeks < 1) {
          console.log("week day 0" + weeks);
          var firstday = new Date(start_date * 1000);
          var lastday = new Date();
          lastday.setHours(23, 59, 59, 999);
        } else {
          console.log("week day" + weeks);
          var days = weeks * 7;
          var offer_start_date = new Date(start_date * 1000);
          var curr = offer_start_date.addDays(days); // get current date
          var y = curr.getFullYear();
          var m = curr.getMonth();
          var d = curr.getDate();
          var firstDay = new Date(y, m, d);
          var lastDay = new Date();
          firstday.setHours(0, 0, 0, 0);
          lastday.setHours(23, 59, 59, 999);
        }
        sql =
          "SELECT SUM(saleAmount) AS total_sales FROM " +
          tableName +
          " WHERE merchant_id=:merchant_id AND customer_id=:customer_id AND created_at >= :created_at_start AND created_at <= :created_at_end GROUP BY merchant_id";
        sqlParams.merchant_id = merchant_id;
        sqlParams.customer_id = customer_id;
        sqlParams.created_at_start = timestamp.fromDate(firstday.toUTCString());
        sqlParams.created_at_end = timestamp.fromDate(lastday.toUTCString());
        break;
      case "month":
        console.log("month");
        var today = new Date().getUnixTime();
        var offer_start_date = new Date(start_date * 1000).getUnixTime();
        var months = monthsDiffernce(today, offer_start_date, 30);
        if (months < 1) {
          var firstDay = new Date(start_date * 1000);
          var lastDay = new Date();
          lastDay.setHours(23, 59, 59, 999);
        } else {
          var days = months * 30;
          var offer_start_date = new Date(start_date * 1000);
          var tmpDate = offer_start_date.addDays(days);
          var y = tmpDate.getFullYear();
          var m = tmpDate.getMonth();
          var d = tmpDate.getDate();
          var firstDay = new Date(y, m, d);
          var lastDay = new Date();
          lastDay.setHours(23, 59, 59, 999);
          firstDay.setHours(0, 0, 0, 0);
          console.log("lastDay: " + lastDay);
          console.log("firstDay: " + firstDay);
        }
        sql =
          "SELECT SUM(saleAmount) AS total_sales FROM " +
          tableName +
          " WHERE merchant_id=:merchant_id AND customer_id=:customer_id AND created_at >= :created_at_start AND created_at <= :created_at_end GROUP BY merchant_id";
        sqlParams.merchant_id = merchant_id;
        sqlParams.customer_id = customer_id;
        sqlParams.created_at_start = timestamp.fromDate(firstDay.toUTCString());
        sqlParams.created_at_end = timestamp.fromDate(lastDay.toUTCString());
        break;
      case "year":
        console.log("year");
        var today = new Date().getUnixTime();
        var offer_start_date = new Date(start_date * 1000).getUnixTime();
        var years = monthsDiffernce(today, offer_start_date, 365);
        if (years < 0) {
          var firstday = new Date(start_date * 1000);
          var lastday = new Date();
          lastday.setHours(23, 59, 59, 999);
        } else {
          var days = years * 365;
          var offer_start_date = new Date(start_date * 1000);
          var tmpDate = offer_start_date.addDays(days);
          var y = tmpDate.getFullYear();
          var m = tmpDate.getMonth();
          var d = tmpDate.getDate();
          var firstday = new Date(y, m, d);
          var lastday = new Date();
          firstday.setHours(0, 0, 0, 0);
          lastday.setHours(23, 59, 59, 999);
        }
        sql =
          "SELECT SUM(saleAmount) AS total_sales FROM " +
          tableName +
          " WHERE merchant_id=:merchant_id AND customer_id=:customer_id AND created_at >= :created_at_start AND created_at <= :created_at_end GROUP BY merchant_id";
        sqlParams.merchant_id = merchant_id;
        sqlParams.customer_id = customer_id;
        sqlParams.created_at_start = timestamp.fromDate(firstDay.toUTCString());
        sqlParams.created_at_end = timestamp.fromDate(lastDay.toUTCString());
        break;
      default:
        console.log("default");
        var today = new Date().getUnixTime();
        var offer_start_date = new Date(start_date * 1000).getUnixTime();
        var day = monthsDiffernce(today, offer_start_date, 1);
        if (day < 0) {
          var start = new Date();
          start.setHours(0, 0, 0, 0);
          var end = new Date();
          end.setHours(23, 59, 59, 999);
        } else {
          var days = day * 1;
          var offer_start_date = new Date(start_date * 1000);
          var start = offer_start_date.addDays(days);
          start.setHours(0, 0, 0, 0);
          var end = new Date();
          end.setHours(23, 59, 59, 999);
        }
        sql =
          "SELECT SUM(saleAmount) AS total_sales FROM " +
          tableName +
          " WHERE merchant_id=:merchant_id AND customer_id=:customer_id AND created_at >= :created_at_start AND created_at <= :created_at_end GROUP BY merchant_id";
        sqlParams.merchant_id = merchant_id;
        sqlParams.customer_id = customer_id;
        sqlParams.created_at_start = timestamp.fromDate(start.toUTCString());
        sqlParams.created_at_end = timestamp.fromDate(end.toUTCString());
        break;
    }
    model.sequelize
      .query(sql, {
        replacements: sqlParams,
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function(rows) {
        if (rows.length > 0) {
          resolve(rows[0]);
        } else {
          var obj = {
            total_sales: 0
          };
          resolve(obj);
        }
      })
      .catch(function(err) {
        reject(err);
      });
  });
}
/**
 * Get customers type offer
 * @param {*} mid
 */
function getCustomerTypeOffer(mid) {
  var today = Math.floor(Date.now() / 1000);
  return new Promise(function(resolve, reject) {
    var query =
      "SELECT * FROM tap_merchant_offers WHERE MerchantId=:merchant_id AND Discount_Type IN('8') AND active = 'true'  AND start_date<=:today Order By min_to_earn desc";
    console.log("offer_select=>" + query);
    model.sequelize
      .query(query, {
        replacements: {
          merchant_id: mid,
          today: today
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function(data) {
        if (data.length === 0) {
          reject("No Active Punch offer found");
        } else {
          resolve(data);
        }
      })
      .catch(function(err) {
        reject(err);
      });
  });
}

Date.prototype.getUnixTime = function() {
  return (this.getTime() / 1000) | 0;
};
/**
 * Get months difference
 * @param {*} timestamp1
 * @param {*} timestamp2
 * @param {*} days
 */
function monthsDiffernce(timestamp1, timestamp2, days) {
  var difference = timestamp1 - timestamp2;
  var Difference = Math.floor(
    difference / 1000 / 60 / 60 / 24 / parseInt(days)
  );
  return Difference;
}

Date.prototype.addDays = function(days) {
  var dat = new Date(this.valueOf());
  dat.setDate(dat.getDate() + days);
  return dat;
};
