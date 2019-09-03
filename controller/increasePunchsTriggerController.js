"use strict";
var model = require("../model");
var config = require("../config/config");
var textmessage = require("../language/textMessage");
var helpher = require("../controller/common/helper");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));
// var tapGenerateCoupon = require("../controller/tapGenerateCouponController");
var tapGenerateCoupon = require("../controller/generateCouponController");

module.exports = {
  // when customer order and merchant active their punch offer then system provide them to punch offers. 
  increasePunchsTrigger: function (req, callback) {
    var customer_id = req.customer_id;
    var merchant_id = req.merchant_id;
    var saleamount = req.saleAmount;
    var punches = 0;
    if (merchant_id && customer_id && saleamount) {
      new PunchesOfferCount(merchant_id).then(
        function (resolve) {
          getCustomerById(customer_id).then(
            function (customer_info) {
              var min_to_earn =
                resolve.min_to_earn !== null ?
                parseFloat(resolve.min_to_earn) :
                0; //now we will use min_to_earn attribute. this check order with minimum amount to increase punch card
              var discount_type =
                resolve.Discount_Type !== null ? resolve.Discount_Type : "";
              if (saleamount >= min_to_earn) {
                //get customer punches
                model.tap_customer_punchcards
                  .findAll({
                    where: {
                      customer_id: customer_id,
                      merchant_id: merchant_id
                    }
                  })
                  .then(function (rows) {
                    var data = rows.map(function (rows) {
                      return rows.toJSON();
                    });
                    if (data.length > 0) {
                      punches = data[0].punches + 1;
                      if (discount_type !== "") {
                        if (
                          (punches >= 5 && discount_type == "10") ||
                          (punches >= 10 && discount_type == "11") ||
                          (punches >= 15 && discount_type == "12")
                        ) {
                          //invoke send coupon function
                          var phonenumber = customer_info.phoneNumber.toString();
                          var PuertoRico = helpher.PuertoRico(phonenumber);
                          var message_content = textmessage.punchCardOfferWithShortUrl.english;
                          if (PuertoRico) {
                            message_content = textmessage.punchCardOfferWithShortUrl.spanish;
                          }
                          tapGenerateCoupon.GenerateCoupon({
                              offer_type: discount_type,
                              merchant_id: merchant_id,
                              customer_id: customer_id,
                              message: message_content,
                              mediaUrl: resolve.reward_text_media_image,
                              msgType: resolve.reward_text_message_type,
                              spanishmediaUrl: resolve.spanish_reward_text_media_image,
                              spanishmsgType: resolve.spanish_reward_text_message_type
                            },
                            function (error, response) {
                              if (error) {
                                responseMsg.RESPONSE400.message = error.message;
                                callback(responseMsg.RESPONSE400);
                              } else {
                                if (response.statusCode == 200) {
                                  punches = 0;
                                  console.log(JSON.stringify(response));
                                  updateCustomerPunchCards(
                                    customer_id,
                                    merchant_id,
                                    punches
                                  ).then(
                                    function (updated_response) {
                                      responseMsg.OK.message =
                                        "coupon generated successfully for discount type " +
                                        discount_type;
                                      callback(null, responseMsg.OK);
                                    },
                                    function (error) {
                                      responseMsg.RESPONSE400.message = error;
                                      callback(responseMsg.RESPONSE400);
                                    }
                                  );
                                } else {
                                  responseMsg.RESPONSE400.message =
                                    response.message;
                                  callback(responseMsg.RESPONSE400);
                                }
                              }
                            }
                          );
                        } else {
                          updateCustomerPunchCards(
                            customer_id,
                            merchant_id,
                            punches
                          ).then(
                            function (response) {
                              responseMsg.OK.message = "punches count updated";
                              callback(null, responseMsg.OK);
                            },
                            function (error) {
                              responseMsg.RESPONSE400.message = error;
                              callback(responseMsg.RESPONSE400);
                            }
                          );
                        }
                      }
                    } else {
                      punches = 1;
                      insertCustomerPunchCards(
                        customer_id,
                        merchant_id,
                        punches
                      ).then(
                        function (response) {
                          responseMsg.OK.message =
                            "customer merchant punch card created";
                          callback(null, responseMsg.OK);
                        },
                        function (error) {
                          responseMsg.RESPONSE400.message = error;
                          callback(responseMsg.RESPONSE400);
                        }
                      );
                    }
                  })
                  .catch(function (err) {
                    responseMsg.RESPONSE400.message = err;
                    callback(responseMsg.RESPONSE400);
                  });
              } else {
                responseMsg.RESPONSE400.message =
                  "Sale amount is less than min purchase amount to earn punch.";
                callback(responseMsg.RESPONSE400);
              }
            },
            function (err) {
              responseMsg.RESPONSE400.message = err;
              callback(responseMsg.RESPONSE400);
            }
          );
        },
        function (reject) {
          responseMsg.RESPONSE400.message = reject;
          callback(responseMsg.RESPONSE400);
        }
      );
    }
  }
};
/**
 * Get punch offer count
 * @param {*} mid
 */
function PunchesOfferCount(mid) {
  return new Promise(function (resolve, reject) {
    var today = Math.floor(Date.now() / 1000);
    model.tap_merchant_offers
      .findAll({
        where: {
          MerchantId: mid,
          Discount_Type: {
            $in: ["10", "11", "12"]
          },
          active: "true",
          start_date: {
            $lte: today
          }
        }
      })
      .then(function (rows) {
        var data = rows.map(function (rows) {
          return rows.toJSON();
        });
        if (data.length === 0) {
          reject("No Active Punch offer found");
        } else {
          resolve(data[0]);
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * Insert customers punch cards
 * @param {*} customer_id
 * @param {*} merchant_id
 * @param {*} punches
 */
function insertCustomerPunchCards(customer_id, merchant_id, punches) {
  return new Promise(function (resolve, reject) {
    model.tap_customer_punchcards
      .create({
        customer_id: customer_id,
        merchant_id: merchant_id,
        punches: punches
      })
      .then(function (data) {
        resolve(data);
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * Update customer punch card
 * @param {*} customer_id
 * @param {*} merchant_id
 * @param {*} punches
 */
function updateCustomerPunchCards(customer_id, merchant_id, punches) {
  return new Promise(function (resolve, reject) {
    model.tap_customer_punchcards
      .update({
        punches: punches
      }, {
        where: {
          customer_id: customer_id,
          merchant_id: merchant_id
        }
      })
      .then(function (data) {
        resolve(data);
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * Get customer by id
 * @param {*} customer_id
 */
function getCustomerById(customer_id) {
  return new Promise(function (resolve, reject) {
    model.tap_customers
      .findAll({
        where: {
          id: customer_id
        }
      })
      .then(function (rows) {
        var result = rows.map(function (rows) {
          return rows.toJSON();
        });
        if (result.length > 0) resolve(result[0]);
        else reject("No Customer Found.");
      })
      .catch(function (err) {
        reject(err);
      });
  });
}