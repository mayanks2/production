"use strict";
var model = require("../model");
var config = require("../config/config");
var textmessage = require("../language/textMessage");
var helpher = require("../controller/common/helper");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));
// var tapGenerateCoupon = require("../controller/tapGenerateCouponController");
var tapGenerateCoupon = require("../controller/generateCouponController");

module.exports = {
  //Top Spend offer sent after customer purchase and full filled top spendor offer criteria. 
  topSpentOffer: function (req, callback) {
    responseMsg.RESPONSE200.message = "Record Saved successfully.!";
    var today = Math.floor(Date.now() / 1000);
    var customer_id = req.customer_id;
    var merchant_id = req.merchant_id;
    var saleAmountInsert = req.saleAmount;
    if (merchant_id && customer_id && saleAmountInsert) {
      //check top spent offer exist aginst this customer
      model.tap_merchant_offers
        .findAll({
          where: {
            MerchantId: merchant_id,
            Discount_Type: "6",
            active: "true",
            start_date: {
              $lte: today
            }
          }
        })
        .then(function (data) {
          var offer_detail = data.map(function (data) {
            return data.toJSON();
          });
          if (offer_detail.length > 0) {
            var top_spent_offer = offer_detail[0];

            if (
              top_spent_offer.min_to_earn !== undefined &&
              saleAmountInsert >= top_spent_offer.min_to_earn
            ) {
              // generate coupon and send using preferred contact method
              model.tap_customers
                .findAll({
                  where: {
                    id: customer_id
                  }
                })
                .then(function (data) {
                  var customerInfo = data.map(function (data) {
                    return data.toJSON();
                  });
                  if (customerInfo.length > 0) {
                    var phonenumber = customerInfo[0].phoneNumber.toString();
                    var PuertoRico = helpher.PuertoRico(phonenumber);
                    var message_content = textmessage.topSpentOfferWithShortUrl.english;
                    if (PuertoRico) {
                      message_content = textmessage.topSpentOfferWithShortUrl.spanish;
                    }
                    tapGenerateCoupon.GenerateCoupon({
                        offer_type: top_spent_offer.Discount_Type,
                        merchant_id: merchant_id,
                        customer_id: customerInfo[0].id,
                        message: message_content,
                        mediaUrl: top_spent_offer.reward_text_media_image,
                        msgType: top_spent_offer.reward_text_message_type,
                        spanishmediaUrl: top_spent_offer.spanish_reward_text_media_image,
                        spanishmsgType: top_spent_offer.spanish_reward_text_message_type
                      },
                      function (error, response) {
                        console.log('error in ', error);
                        if (error) {
                          responseMsg.RESPONSE400.message = "not sent";
                          callback(null, responseMsg.RESPONSE400);
                        } else {
                          if (response.statusCode == 200) {
                            console.log("sent: " + JSON.stringify(response));
                            responseMsg.RESPONSE200.message =
                              "Offer sent successfully.";
                            callback(null, responseMsg.RESPONSE200);
                          } else {
                            console.log(response);
                            responseMsg.RESPONSE400.message = "not sent";
                            callback(null, responseMsg.RESPONSE400);
                          }
                        }
                      }
                    );
                  } else {
                    responseMsg.RESPONSE400.message =
                      "Customer not found against that offer.";
                    callback(null, responseMsg.RESPONSE400);
                  }
                })
                .catch(function (err) {
                  responseMsg.RESPONSE400.message = err;
                  callback(null, responseMsg.RESPONSE400);
                });
            } else {
              responseMsg.RESPONSE400.message =
                "sale Amount is less than min purchase amount.";
              callback(null, responseMsg.RESPONSE400);
            }
          } else {
            responseMsg.RESPONSE400.message =
              "Top spent offer not found against the merchant.";
            callback(null, responseMsg.RESPONSE400);
          }
        })
        .catch(function (err) {
          responseMsg.RESPONSE400.message = err;
          callback(null, responseMsg.RESPONSE400);
        });
    } else {
      responseMsg.RESPONSE400.message = "Not found.";
      callback(null, responseMsg.RESPONSE400);
    }
  }
};