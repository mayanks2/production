"use strict";
var model = require("../model");
var config = require("../config/config");
var textmessage = require("../language/textMessage");
var helpher = require("../controller/common/helper");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));
var topSpentOfferController = require("../controller/topSpentOfferController");
var getCustomOfferCouponController = require("../controller/getCustomOfferCouponController");
var customerTypeTriggerController = require("../controller/customerTypeTriggerController");
var increasePunchsTriggerController = require("../controller/increasePunchsTriggerController");
var gotuRedeemCallController = require("../controller/gotuRedeemCallController");
const async = require("async");

module.exports = {
  saveCustomerOrder: function (req, res) {
    delete responseMsg.RESPONSE200.data;
    responseMsg.RESPONSE200.message = "Record Saved successfully.!";
    responseMsg.RESPONSE400.message = "Something went wrong. Please try again.";
    var orderID = req.body.orderID;
    var saleAmount = parseFloat(req.body.saleAmount);
    var customer_id = req.params.customer_id;
    var merchant_id = req.body.merchant_id;
    var offer_id = req.body.offer_id;
    var gotu = "gotu" in req.body ? req.body.gotu : "0";
    console.log(
      customer_id + " " + saleAmount + " " + merchant_id + " " + orderID
    );
    if (
      !customer_id ||
      !orderID ||
      (!saleAmount && saleAmount !== 0) ||
      !merchant_id
    ) {
      responseMsg.RESPONSE400.message = "Missing mandatory fields.";
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    }
    model.tap_customers
      .findAll({
        where: {
          id: customer_id
        }
      })
      .then(function (rows) {
        var customer_info = rows.map(function (rows) {
          return rows.toJSON();
        });
        if (customer_info.length > 0) {
          var lastVisitDate = Math.floor(Date.now() / 1000);
          var payload = {
            customer_id: customer_id,
            merchant_id: merchant_id,
            saleAmount: saleAmount,
            created_at: lastVisitDate
          };
          async.series([
            function (callback) {
              //give top spender offer
              topSpentOfferController.topSpentOffer(payload, function (
                error,
                response
              ) {
                if (error) {
                  console.log(JSON.stringify(error));
                  callback(null, "top spend offer failed_1");
                } else {
                  console.log(response);
                  if (response.statusCode == 200) {
                    console.log(JSON.stringify(response));
                    callback(null, "top spend offer sent");
                  } else {
                    console.log(JSON.stringify(response));
                    callback(null, "top spend offer failed_section");
                  }
                }
              });
            },
            function (callback) {
              // trigger for give custom offer invoking the lambda function
              getCustomOfferCouponController.getCustomOfferCoupon(payload, function (
                error,
                response
              ) {
                if (error) {
                  console.log(JSON.stringify(error));
                  callback(null, "Error custom offer");
                } else {
                  console.log(JSON.stringify(response));
                  callback(null, "custom offer");
                }
              });

            },
            function (callback) {
              //trigger give punches offer
              increasePunchsTriggerController.increasePunchsTrigger(
                payload,
                function (error, response) {
                  if (error) {
                    console.log(JSON.stringify(error));
                    callback(null, "Increased punches trigger execution failed");
                  } else {
                    if (response.statusCode == 200) {
                      console.log(JSON.stringify(response));
                      callback(null,
                        "Increased punches trigger executed successfully"
                      );
                    } else {
                      console.log(JSON.stringify(response));
                      callback(null, "Increased punches trigger execution failed");
                    }
                  }
                }
              );

            },
            function (callback) {
              //custom offer
              //trigger to change customer type
              console.log("customer type offer trigger......");

              getCustomerByphone(customer_id, merchant_id).then(function (
                customer_type
              ) {
                console.log("customers_type=" + customer_type.type);
                var payload_customer_type = {
                  customer_id: customer_id,
                  merchant_id: merchant_id,
                  saleAmount: saleAmount,
                  customer_phone: customer_info[0].phoneNumber,
                  customer_type: customer_type.type
                };
                customerTypeTriggerController.customerTypeTrigger(
                  payload_customer_type,
                  function (error, response) {
                    if (error) {
                      console.log(JSON.stringify(error));
                      callback(null, "customer type trigger execution failed");
                    } else {
                      console.log(JSON.stringify(response));
                      callback(null, "customer type trigger executed successfully");
                    }
                  }
                );
              });

            }
          ],
            // optional callback
            function (err, results) {
              if (err) {
                console.log("error----", err);
              } else {
                console.log("results----", results);
              }
            });
          //redeem gotu call
          if (parseInt(gotu) == 1 && offer_id) {
            model.tap_gotu_campaigns
              .findAll({
                where: {
                  campaign_id: offer_id
                }
              })
              .then(function (data) {
                var gotu_info = data.map(function (data) {
                  return data.toJSON();
                });
                if (gotu_info.length > 0) {
                  if (gotu_info[0].type == "gotu") {
                    gotuRedeemCallController.gotuRedeemCall({
                      campaignCode: gotu_info[0].campaign_code,
                      couponCode: gotu_info[0].coupon_code
                    },
                      function (reject, resolve) {
                        if (reject) {
                          console.log(reject);
                          res
                            .status(responseMsg.RESPONSE200.statusCode)
                            .send(responseMsg.RESPONSE200);
                        } else {
                          if (response.statusCode == 200) {
                            res
                              .status(responseMsg.RESPONSE200.statusCode)
                              .send(responseMsg.RESPONSE200);
                          } else {
                            console.log(response);
                            res
                              .status(responseMsg.RESPONSE200.statusCode)
                              .send(responseMsg.RESPONSE200);
                          }
                        }
                      }
                    );
                  } else {
                    res
                      .status(responseMsg.RESPONSE200.statusCode)
                      .send(responseMsg.RESPONSE200);
                  }
                } else {
                  res
                    .status(responseMsg.RESPONSE200.statusCode)
                    .send(responseMsg.RESPONSE200);
                }
              })
              .catch(function (err) {
                responseMsg.RESPONSE400.message = err;
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              });
          } else {
            res
              .status(responseMsg.RESPONSE200.statusCode)
              .send(responseMsg.RESPONSE200);
          }
        } else {
          responseMsg.RESPONSE400.message = "Bad Request.";
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        }
      })
      .catch(function (err) {
        responseMsg.RESPONSE400.message = err.message;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      });
  }
};
/**
 * Get customer by phone number
 * @param {*} customer_id
 * @param {*} merchant_id
 */
function getCustomerByphone(customer_id, merchant_id) {
  return new Promise(function (resolve, reject) {
    model.tap_customers_merchant
      .findAll({
        attributes: ["type"],
        where: {
          customer_id: customer_id,
          merchant_id: merchant_id
        }
      })
      .then(function (data) {
        var rows = data.map(function (data) {
          return data.toJSON();
        });
        if (rows.length > 0) {
          console.log("record in databse" + rows[0]);
          resolve(rows[0]);
        } else {
          resolve("create_customer");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}