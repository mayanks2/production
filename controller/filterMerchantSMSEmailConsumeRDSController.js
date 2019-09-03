"use strict";
var model = require("../model");
var config = require("../config/config");
var unixtimestamp = require("unix-timestamp");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));

module.exports = {
  filterMerchantSMSEmail: function(req, callback) {
    var month = parseInt(req.month);
    var year = parseInt(req.year);
    var merchant_id = req.merchant_id;
    if ((!month && month !== 0) || !year || !merchant_id) {
      responseMsg.RESPONSE400.message = "Missing mandatory fields.";
      callback(null, responseMsg.RESPONSE400);
    }

    month--;
    if (month < 10) {
      month = "0" + month;
    }

    var filterDate = year + month;
    var filter_by = "monthly";
    unixtimestamp.round = true;
    var stats = {};
    var filter_start_date = new Date(year, month, 1, 0, 0, 0, 0);
    var filter_end_date = new Date(
      year,
      parseInt(month) + 1,
      0,
      23,
      59,
      59,
      999
    );
    console.log(filter_start_date);
    console.log(filter_end_date);
    getMerchantsReports(
      merchant_id,
      filterDate,
      filter_start_date,
      filter_end_date
    ).then(
      function(response) {
        stats.total_sms_consume =
          response.total_sms_consume !== undefined
            ? parseInt(response.total_sms_consume)
            : 0;
        stats.total_email_consume =
          response.total_email_consume !== undefined
            ? parseInt(response.total_email_consume)
            : 0;
        responseMsg.RESPONSE200.data = {};
        responseMsg.RESPONSE200.data = stats;
        callback(null, responseMsg.RESPONSE200);
      },
      function(err) {
        stats.total_sms_consume = 0;
        stats.total_email_consume = 0;
        responseMsg.RESPONSE200.data = {};
        responseMsg.RESPONSE200.data = stats;
        callback(null, responseMsg.RESPONSE200);
      }
    );
  }
};
/**
 * get merchant reports
 * @param {*} merchant_id
 * @param {*} filter_date
 * @param {*} filter_start_date
 * @param {*} filter_end_date
 */
function getMerchantsReports(
  merchant_id,
  filter_date,
  filter_start_date,
  filter_end_date
) {
  return new Promise(function(resolve, reject) {
    var firstday_timestamp = unixtimestamp.fromDate(filter_start_date);
    var lastday_timestamp = unixtimestamp.fromDate(filter_end_date);
    var query =
      "SELECT (SELECT SUM(sms_segment) FROM tap_sent_sms WHERE `timestamp` >= :firstday_timestamp AND `timestamp` <= :lastday_timestamp AND merchant_id=m.merchant_id GROUP BY merchant_id) AS total_sms_consume, (SELECT SUM(sms_segment) FROM tap_sent_emails WHERE `timestamp` >= :firstday_timestamp AND `timestamp` <= :lastday_timestamp AND merchant_id=m.merchant_id GROUP BY merchant_id) AS total_email_consume, DATE_FORMAT(:filter_start_date, '%Y%m') AS filter_date FROM tap_merchants m WHERE m.merchant_id=:merchant_id";
    console.log(query);
    model.sequelize
      .query(query, {
        replacements: {
          firstday_timestamp: firstday_timestamp,
          lastday_timestamp: lastday_timestamp,
          filter_start_date: filter_start_date,
          merchant_id: merchant_id
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function(result) {
        if (result.length > 0) {
          resolve(result[0]);
        } else {
          resolve(0);
        }
      })
      .catch(function(err) {
        reject(err);
      });
  });
}
