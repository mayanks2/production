"use strict";
var model = require("../model");
var config = require("../config/config");
var textmessage = require("../language/textMessage");
var helpher = require("../controller/common/helper");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));

module.exports = {
  trackGotuRedeemedsaleAmount: function (req, callback) {
    var campaign_id = req.campaign_id;
    var sale_amount = req.saleAmount;
    checkAdsalreadyExist(campaign_id).then(
      function (isAlreadyExist) {
        var campaign_code = isAlreadyExist.campaign_code;
        var campaign_type = isAlreadyExist.type;
        var merchant_id = isAlreadyExist.merchant_id;
        console.log("insert here with 1 count...");
        createGotuTrack(
          merchant_id,
          campaign_code,
          campaign_type,
          sale_amount
        ).then(
          function (insertNewAdsRecord) {
            responseMsg.loginSuccess.data = insertNewAdsRecord;
            callback(null, responseMsg.loginSuccess);
          },
          function (error) {
            responseMsg.RESPONSE400.message = error;
            callback(null, responseMsg.RESPONSE400);
          }
        );
      },
      function (error) {
        responseMsg.RESPONSE400.message = error;
        callback(null, responseMsg.RESPONSE400);
      }
    );
  }
};
/**
 * Check Ads already exist
 * @param {*} campaign_id
 */
function checkAdsalreadyExist(campaign_id) {
  return new Promise(function (resolve, reject) {
    model.tap_gotu_campaigns
      .findAll({
        where: {
          campaign_id: campaign_id
        }
      })
      .then(function (data) {
        var rows = data.map(function (data) {
          return data.toJSON();
        });
        console.log(rows.length);
        if (rows.length > 0) {
          resolve(rows[0]);
        } else {
          console.log("campaign id not found...");
        }
      })
      .catch(function (err) {
        console.log("in error...");
      });
  });
}
/**
 * Create Gotu track
 * @param {*} merchant_id
 * @param {*} campaign_code
 * @param {*} campaign_type
 * @param {*} total_purchase
 */
function createGotuTrack(
  merchant_id,
  campaign_code,
  campaign_type,
  total_purchase
) {
  var today = Math.floor(Date.now() / 1000);
  return new Promise(function (resolve, reject) {
    var insert_queryParam = {
      merchant_id: merchant_id,
      campaign_code: campaign_code,
      campaign_type: campaign_type,
      total_purchase: total_purchase,
      update_date: today
    };
    console.log("insert_query after calculate", insert_queryParam);

    model.tap_gotu_push_order_track
      .create(insert_queryParam)
      .then(function (info) {
        console.log("inserted....");
        resolve(true);
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * Update Ads Count
 * @param {*} priviousclicks
 * @param {*} ads_name
 */
function updateAdsCount(priviousclicks, ads_name) {
  var clicks = parseInt(priviousclicks) + 1;
  console.log("new clicks=" + clicks);
  return new Promise(function (resolve, reject) {
    var updateQueryParam = {
      click_count: click_count + 1
    };
    console.log(updateQuery);
    model.tap_customers_merchant
      .update(updateQueryParam, {
        where: {
          ads_name: ads_name
        }
      })
      .then(function (rows) {
        if (rows) {
          resolve(true);
        } else {
          reject("Please provide us valid merchant id");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}