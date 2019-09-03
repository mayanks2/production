"use strict";
var model = require("../model");
var config = require("../config/config");
var timestamp = require("unix-timestamp");
var textmessage = require("../language/textMessage");
var helpher = require("../controller/common/helper");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));
// var tapGenerateCoupon = require("../controller/tapGenerateCouponController");
const tapGenerateCoupon = require("../controller/generateCouponController");

module.exports = {
  customerTypeTrigger: function (req, callback) {
    var customer_id = req.customer_id;
    var customer_phone = req.customer_phone;
    var merchant_id = req.merchant_id;
    var customer_type = req.customer_type;
    responseMsg.RESPONSE200.message =
      "Customer type Trigger Executed successfully.";
    responseMsg.RESPONSE400.message = "Something went wrong. Please try again.";
    getCustomerTypeOffer(merchant_id, customer_type).then(
      function (offers_data) {
        var check_offer = function (offer_index) {
          if (offer_index == offers_data.length) {
            callback(null, responseMsg.RESPONSE200);
          } else {
            var offer_detail = offers_data[offer_index];

            if (offer_detail.spending_period !== null) {
              getMerchantCustomerOrder(
                merchant_id,
                customer_id,
                offer_detail.spending_period,
                offer_detail.start_date,
                offer_detail.Discount_Type,
                offer_detail.id
              ).then(
                function (sales_data) {
                  if (
                    sales_data.total_sales > 0 &&
                    offer_detail.min_to_earn <= sales_data.total_sales
                  ) {
                    var message_content = textmessage.customerTypeOfferWithShortUrl.english;
                    var phonenumber = customer_phone.toString();
                    var PuertoRico = helpher.PuertoRico(phonenumber);
                    if (PuertoRico) {
                      message_content = textmessage.customerTypeOfferWithShortUrl.spanish;
                    }
                    console.log(message_content);
                    var prev_customer_type = customer_type;
                    update_customer_type(
                      customer_id,
                      merchant_id,
                      offer_detail.Discount_Type,
                      prev_customer_type
                    ).then(
                      function (resolve) {
                        console.log("Customer type Updated successfully.");
                      },
                      function (reject) {
                        console.log("customer type change error");
                        console.log(reject);
                      }
                    );
                    var offer_detail_json = {
                      offer_type: offer_detail.Discount_Type,
                      merchant_id: merchant_id,
                      customer_id: customer_id,
                      message: message_content,
                      mediaUrl: offer_detail.reward_text_media_image,
                      msgType: offer_detail.reward_text_message_type,
                      spanishmediaUrl: offer_detail.spanish_reward_text_media_image,
                      spanishmsgType: offer_detail.spanish_reward_text_message_type
                    };
                    if (offer_detail.Discount_Type == 9) {
                      giveOffer(offer_detail_json).then(function (data) {
                        console.log("offer_detail.Discount_Type==9");
                        callback(null, responseMsg.RESPONSE200);
                      });
                    } else if (offer_detail.Discount_Type == 8) {
                      giveOffer(offer_detail_json).then(function (data) {
                        console.log("offer_detail.Discount_Type==8");
                        callback(null, responseMsg.RESPONSE200);
                      });
                    } else if (offer_detail.Discount_Type == 7) {
                      console.log("offer_detail.Discount_Type==7");
                      giveOffer(offer_detail_json).then(function (data) {
                        callback(null, responseMsg.RESPONSE200);
                      });
                    }
                  } else {
                    check_offer(++offer_index);
                  }
                },
                function (reject) {
                  console.log(reject);
                  check_offer(++offer_index);
                }
              );
            } else {
              check_offer(++offer_index);
            }
          }
        };
        check_offer(0);
      },
      function (err) {
        responseMsg.RESPONSE400.message = err;
        callback(null, responseMsg.RESPONSE400);
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
 * @param {*} discount_type
 * @param {*} offer_id
 */
function getMerchantCustomerOrder(
  merchant_id,
  customer_id,
  filter_by,
  start_date,
  discount_type,
  offer_id
) {
  return new Promise(function (resolve, reject) {
    var tableName = "tap_customer_orders";
    var end = Math.floor((new Date().getTime() + 10 * 60000) / 1000);
    var sql;
    var sqlParam = {};
    var already_have_coupon_sql;
    var already_have_coupon_sqlParam = {};
    switch (filter_by) {
      case "day":
        var today = new Date().getUnixTime();
        var offer_start_date = new Date(start_date * 1000).getUnixTime();
        var day = monthsDiffernce(today, offer_start_date, 1);
        if (day < 0) {
          var start = new Date(start_date * 1000);
          var end = new Date();
          end.setHours(23, 59, 59, 999);
        } else {
          var start = new Date();
          start.setHours(0, 0, 0, 0);
        }

        sql =
          "SELECT SUM(saleAmount) AS total_sales FROM " +
          tableName +
          " WHERE merchant_id=:merchant_id AND customer_id=:customer_id AND created_at >= :start AND created_at <= :end GROUP BY merchant_id";
        sqlParam = {
          merchant_id: merchant_id,
          customer_id: customer_id,
          start: timestamp.fromDate(start.toUTCString()),
          end: end
        };
        already_have_coupon_sql =
          "SELECT count(id) FROM tap_coupons WHERE merchant_id=:merchant_id AND customer_id=:customer_id and offer_type=:offer_type and offerid=:offerid AND created_at >= :start AND created_at <= :end GROUP BY customer_id";
        already_have_coupon_sqlParam = {
          merchant_id: merchant_id,
          customer_id: customer_id,
          offer_type: discount_type,
          offerid: offer_id,
          start: timestamp.fromDate(start.toUTCString()),
          end: end
        };
        break;
      case "week":
        var today = new Date().getUnixTime();
        var offer_start_date = new Date(start_date * 1000).getUnixTime();
        var weeks = monthsDiffernce(today, offer_start_date, 7);
        console.log("weeks", weeks);
        if (weeks < 1) {
          console.log("in weeks", weeks);
          var firstday = new Date(start_date * 1000);
          var lastday = new Date();
          lastday.setHours(23, 59, 59, 999);
        } else {
          var days = weeks * 7;
          var offer_start_date = new Date(start_date * 1000);
          var curr = offer_start_date.addDays(days); // get current date
          var y = curr.getFullYear();
          var m = curr.getMonth();
          var d = curr.getDate();
          var firstday = new Date(y, m, d);
          var lastday = new Date();
          firstday.setHours(0, 0, 0, 0);
          lastday.setHours(23, 59, 59, 999);
        }
        sql =
          "SELECT SUM(saleAmount) AS total_sales FROM " +
          tableName +
          " WHERE merchant_id=:merchant_id AND customer_id=:customer_id AND created_at >= :start AND created_at <= :end GROUP BY merchant_id";
        already_have_coupon_sql =
          "SELECT count(id) FROM tap_coupons WHERE merchant_id=:merchant_id AND customer_id=:customer_id and offer_type=:offer_type and offerid=:offerid AND created_at >= :start AND created_at <= :end GROUP BY customer_id";
        console.log("week_sql=" + sql);
        sqlParam = {
          merchant_id: merchant_id,
          customer_id: customer_id,
          start: timestamp.fromDate(firstday.toUTCString()),
          end: end
        };
        already_have_coupon_sqlParam = {
          merchant_id: merchant_id,
          customer_id: customer_id,
          offer_type: discount_type,
          offerid: offer_id,
          start: timestamp.fromDate(firstday.toUTCString()),
          end: end
        };
        break;
      case "month":
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
          " WHERE merchant_id=:merchant_id AND customer_id=:customer_id AND created_at >= :start AND created_at <= :end GROUP BY merchant_id";
        already_have_coupon_sql =
          "SELECT count(id) FROM tap_coupons WHERE merchant_id=:merchant_id AND customer_id=:customer_id and offer_type=:offer_type and offerid=:offerid AND created_at >= :start AND created_at <= :end GROUP BY customer_id";
        sqlParam = {
          merchant_id: merchant_id,
          customer_id: customer_id,
          start: timestamp.fromDate(firstDay.toUTCString()),
          end: end
        };
        already_have_coupon_sqlParam = {
          merchant_id: merchant_id,
          customer_id: customer_id,
          offer_type: discount_type,
          offerid: offer_id,
          start: timestamp.fromDate(firstDay.toUTCString()),
          end: end
        };
        break;
      case "year":
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
          " WHERE merchant_id=:merchant_id AND customer_id=:customer_id AND created_at >= :start AND created_at <= :end GROUP BY merchant_id";
        already_have_coupon_sql =
          "SELECT count(id) FROM tap_coupons WHERE merchant_id=:merchant_id AND customer_id=:customer_id and offer_type=:offer_type and offerid=:offerid AND created_at >= :start AND created_at <= :end GROUP BY customer_id";
        sqlParam = {
          merchant_id: merchant_id,
          customer_id: customer_id,
          start: timestamp.fromDate(firstday.toUTCString()),
          end: end
        };
        already_have_coupon_sqlParam = {
          merchant_id: merchant_id,
          customer_id: customer_id,
          offer_type: discount_type,
          offerid: offer_id,
          start: timestamp.fromDate(firstday.toUTCString()),
          end: end
        };
        break;
      default:
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
        }
        sql =
          "SELECT SUM(saleAmount) AS total_sales FROM " +
          tableName +
          " WHERE merchant_id=:merchant_id AND customer_id=:customer_id AND created_at >= :start AND created_at <= :end GROUP BY merchant_id";
        already_have_coupon_sql =
          "SELECT count(id) FROM tap_coupons WHERE merchant_id=:merchant_id AND customer_id=:customer_id and offer_type=:offer_type and offerid=:offerid AND created_at >= :start AND created_at <= :end GROUP BY customer_id";
        sqlParam = {
          merchant_id: merchant_id,
          customer_id: customer_id,
          start: timestamp.fromDate(start.toUTCString()),
          end: timestamp.fromDate(end.toUTCString())
        };
        already_have_coupon_sqlParam = {
          merchant_id: merchant_id,
          customer_id: customer_id,
          offer_type: discount_type,
          offerid: offer_id,
          start: timestamp.fromDate(start.toUTCString()),
          end: timestamp.fromDate(end.toUTCString())
        };
        break;
    }
    console.log("Get order sum query:" + filter_by + "==sql==" + sql);
    console.log("already_have_coupon_sql=" + already_have_coupon_sql);
    model.sequelize
      .query(already_have_coupon_sql, {
        replacements: already_have_coupon_sqlParam,
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function (rowss) {
        if (rowss.length > 0) {
          console.log("USER Already got this coupon in this duration...");
          var obj = {
            total_sales: 0
          };
          resolve(obj);
        } else {
          console.log("USER may be get this coupon for given duration...");
          model.sequelize
            .query(sql, {
              replacements: sqlParam,
              type: model.sequelize.QueryTypes.SELECT
            })
            .then(function (rows) {
              console.log("rows result", rows);
              if (rows.length > 0) {
                resolve(rows[0]);
              } else {
                var obj = {
                  total_sales: 0
                };
                resolve(obj);
              }
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
}
/**
 * get customer type offer
 * @param {*} mid
 * @param {*} customer_type
 */
function getCustomerTypeOffer(mid, customer_type) {
  var today = Math.floor(Date.now() / 1000);
  var fetch_offers_from;
  if (customer_type == "normal") {
    fetch_offers_from = 7;
  } else if (customer_type == "casual") {
    fetch_offers_from = 7;
  } else if (customer_type == "regular") {
    fetch_offers_from = 8;
  } else if (customer_type == "vip") {
    fetch_offers_from = 9;
  }
  return new Promise(function (resolve, reject) {
    var query =
      "SELECT * FROM tap_merchant_offers WHERE MerchantId=:MerchantId AND Discount_Type >=:Discount_Type AND Discount_Type <= 9 AND active = 'true'  AND start_date<=:start_date Order By Discount_Type DESC";
    console.log("offer_query=", query);
    var queryParam = {
      MerchantId: mid,
      Discount_Type: fetch_offers_from,
      start_date: today
    };
    model.sequelize
      .query(query, {
        replacements: queryParam,
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function (data) {
        if (data.length === 0) {
          reject("No Active Punch offer found");
        } else {
          resolve(data);
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * send customer offer
 * @param {*} offer_detail
 */
function giveOffer(offer_detail) {
  return new Promise(function (resolve, reject) {
    tapGenerateCoupon.GenerateCoupon(offer_detail, function (err, response) {
      if (err) {
        console.log(error);
        resolve("offer not sent succesfully");
      } else {
        if (response.statusCode == 200) {
          console.log("Offer sent.");
          resolve("offer sent succesfully");
        } else {
          console.log(error);
          resolve("offer not sent succesfully");
        }
      }
    });
  });
}
/**
 * update customer type
 * @param {*} customer_id
 * @param {*} merchant_id
 * @param {*} offer_type
 * @param {*} prev_customer_type
 */
function update_customer_type(
  customer_id,
  merchant_id,
  offer_type,
  prev_customer_type
) {
  var today = Math.floor(Date.now() / 1000);
  return new Promise(function (resolve, reject) {
    var type = "normal";
    if (offer_type == 7) {
      type = "casual";
    } else if (offer_type == 8) {
      type = "regular";
    } else if (offer_type == 9) {
      type = "vip";
    }
    model.tap_customers_merchant
      .update({
        type: type,
        type_update_date: today
      }, {
        where: {
          merchant_id: merchant_id,
          customer_id: customer_id
        }
      })
      .then(function (data) {
        model.tap_customers_typeslog
          .create({
            customer_id: customer_id,
            merchant_id: merchant_id,
            customer_type: type,
            created_at: Math.floor(Date.now() / 1000)
          })
          .then(function (data) {
            resolve("Customer type updated successfully");
          })
          .catch(function (err) {
            resolve("Customer type updated successfully");
          });
      })
      .catch(function (err) {
        console.log("in customertype update query error");
        reject(err);
      });
  });
}

Date.prototype.getUnixTime = function () {
  return (this.getTime() / 1000) | 0;
};
/**
 * get months differnce
 * @param {*} timestamp1
 * @param {*} timestamp2
 * @param {*} days
 */
function monthsDiffernce(timestamp1, timestamp2, days) {
  var oneDay = 24 * 60 * 60 * 1000; // hours * minutes * seconds * milliseconds
  var firstDate = new Date(timestamp1 * 1000);
  var secondDate = new Date(timestamp2 * 1000);
  var diffDays = Math.round(
    Math.abs((firstDate.getTime() - secondDate.getTime()) / oneDay)
  );
  return Math.floor(diffDays / days);
}

Date.prototype.addDays = function (days) {
  var dat = new Date(this.valueOf());
  dat.setDate(dat.getDate() + days);
  return dat;
};