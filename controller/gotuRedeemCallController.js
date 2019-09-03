"use strict";
var model = require("../model");
var config = require("../config/config");
var textmessage = require("../language/textMessage");
var helpher = require("../controller/common/helper");
const request = require("request");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));

module.exports = {
  gotuRedeemCall: function(req, callback) {
    var campaignCode = req.campaignCode !== undefined ? req.campaignCode : "";
    var couponCode = req.couponCode !== undefined ? req.couponCode : "";
    if (campaignCode !== "" && couponCode !== "") {
      console.log({ campaignCode: campaignCode, couponCode: couponCode });
      redeemCouponGotU({
        campaignCode: campaignCode,
        couponCode: couponCode
      }).then(
        function(resolve) {
          console.log(resolve);
          callback(null, responseMsg.OK);
        },
        function(reject) {
          responseMsg.RESPONSE400.message = reject;
          callback(null, responseMsg.RESPONSE400);
        }
      );
    } else {
      responseMsg.RESPONSE400.message = "Missing mandatory fields.";
      callback(null, responseMsg.RESPONSE400);
    }
  }
};
/**
 * Get gotu redeem coupons
 * @param {*} data
 */
function redeemCouponGotU(data) {
  var options = {
    uri: "http://allied-fbadmanager.uat.77test.co.uk/api/allied/useCoupon",
    method: "POST",
    json: data,
    headers: {
      "Content-type": "application/json",
      "app-secret": "49774577DA77EE7737771D77C7777"
    }
  };
  return new Promise(function(resolve, reject) {
    request(options, function(error, response, body) {
      // console.log(response);
      if (!error && response.statusCode == 200) {
        resolve(body); // Print the shortened url.
      } else {
        reject("something went wrong");
      }
    });
  });
}
