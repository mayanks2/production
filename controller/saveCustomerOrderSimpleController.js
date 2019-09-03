"use strict";
var model = require("../model");
var config = require("../config/config");
var textmessage = require("../language/textMessage");
var helpher = require("../controller/common/helper");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));
var trackGotuRedeemedsaleAmountController = require("../controller/trackGotuRedeemedsaleAmountController");

module.exports = {
  saveCustomerOrderSimple: function (req, res) {
    responseMsg.OK.message = "Record Saved successfully.!";
    responseMsg.RESPONSE400.message = "Something went wrong. Please try again.";
    var orderID = req.body.orderID;
    var saleAmount = parseFloat(req.body.saleAmount);
    var discount = parseFloat(req.body.discount);
    var customer_id = req.params.customer_id;
    var merchant_id = req.body.merchant_id;
    var offer_id = req.body.offer_id || 0;
    var offer_type = req.body.offer_type || 0;
    var coupon_id = req.body.coupon_id || 0;
    var timestampEmailLog = Math.floor(Date.now() / 1000);
    var gotu = "gotu" in req.body ? req.body.gotu : "0";
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
    model.tap_customer_orders
      .findAll({
        where: {
          orderID: orderID
        }
      })
      .then(function (data) {
        var rows = data.map(function (data) {
          return data.toJSON();
        });
        if (rows.length > 0) {
          responseMsg.RESPONSE400.message = "Id Already Exist.";
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        } else {
          model.tap_customers
            .findAll({
              where: {
                id: customer_id
              }
            })
            .then(function (data) {
              var customer_info = data.map(function (data) {
                return data.toJSON();
              });
              if (customer_info.length > 0) {
                if (coupon_id && gotu != 1) {
                  new UseCoupon(coupon_id, customer_id, merchant_id).then(
                    function (response) {
                      new SaveOrder(
                        customer_id,
                        orderID,
                        saleAmount,
                        merchant_id,
                        gotu,
                        discount,
                        offer_type,
                        offer_id,
                        coupon_id
                      ).then(
                        function (id) {
                          responseMsg.OK.data = {};
                          responseMsg.OK.data.id = id;
                          responseMsg.OK.data.orderID = orderID;
                          responseMsg.OK.data.customer_id = customer_id;
                          responseMsg.OK.data.merchant_id = merchant_id;
                          res
                            .status(responseMsg.OK.statusCode)
                            .send(responseMsg.OK);
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
                      new SaveOrder(
                        customer_id,
                        orderID,
                        saleAmount,
                        merchant_id,
                        gotu,
                        discount,
                        offer_type,
                        offer_id,
                        coupon_id
                      ).then(
                        function (id) {
                          responseMsg.OK.data = {};
                          responseMsg.OK.data.id = id;
                          responseMsg.OK.data.orderID = orderID;
                          responseMsg.OK.data.customer_id = customer_id;
                          responseMsg.OK.data.merchant_id = merchant_id;
                          res
                            .status(responseMsg.OK.statusCode)
                            .send(responseMsg.OK);
                        },
                        function (error) {
                          responseMsg.RESPONSE400.message = error;
                          res
                            .status(responseMsg.RESPONSE400.statusCode)
                            .send(responseMsg.RESPONSE400);
                        }
                      );
                    }
                  );
                } else {
                  new SaveOrder(
                    customer_id,
                    orderID,
                    saleAmount,
                    merchant_id,
                    gotu,
                    discount,
                    offer_type,
                    offer_id,
                    coupon_id
                  ).then(
                    function (id) {
                      responseMsg.OK.data = {};
                      responseMsg.OK.data.id = id;
                      responseMsg.OK.data.orderID = orderID;
                      responseMsg.OK.data.customer_id = customer_id;
                      responseMsg.OK.data.merchant_id = merchant_id;
                      res
                        .status(responseMsg.OK.statusCode)
                        .send(responseMsg.OK);
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
                responseMsg.RESPONSE400.message = "Bad Request.";
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
        }
      })
      .catch(function (err) {
        responseMsg.RESPONSE400.message = err;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      });
  }
};
/**
 * UseCoupon call
 * @param {*} coupon_id
 * @param {*} customer_id
 * @param {*} merchant_id
 */
function UseCoupon(coupon_id, customer_id, merchant_id) {
  return new Promise(function (resolve, reject) {
    var CouponFindParams = {
      TableName: "tap_coupons",
      Keys: {
        id: parseInt(coupon_id),
        customer_id: parseInt(customer_id),
        merchant_id: merchant_id
      }
    };
    var used_at = Math.floor(Date.now() / 1000);
    var used_by = "";
    model.tap_coupons
      .findAll({
        where: {
          id: CouponFindParams.Keys.id,
          merchant_id: CouponFindParams.Keys.merchant_id,
          customer_id: CouponFindParams.Keys.customer_id
        }
      })
      .then(function (data) {
        var rows = data.map(function (data) {
          return data.toJSON();
        });
        if (rows.length > 0) {
          var used_coupon_params = {
            TableName: "tap_coupons_used",
            Item: {
              customer_id: rows[0].customer_id,
              merchant_id: rows[0].merchant_id,
              coupon_id: rows[0].id
            }
          };
          var sqlCheckCouponAvailibility =
            "SELECT * FROM tap_coupons as c  INNER JOIN " +
            used_coupon_params.TableName +
            " as used ON c.id=used.coupon_id  WHERE coupon_id =:coupon_id AND ( used_by = :used_by)";
          var sqlCheckCouponAvailibilityParam = {
            coupon_id: used_coupon_params.Item.coupon_id,
            used_by: used_coupon_params.Item.customer_id
          };
          model.sequelize
            .query(sqlCheckCouponAvailibility, {
              replacements: sqlCheckCouponAvailibilityParam,
              type: model.sequelize.QueryTypes.SELECT
            })
            .then(function (rows) {
              if (rows.length > 0) {
                reject("Coupon Already used");
              } else {
                if (
                  used_coupon_params.Item.customer_id !== undefined &&
                  used_coupon_params.Item.customer_id !== ""
                ) {
                  used_by = used_coupon_params.Item.customer_id;
                }
                var used_coupon_insert = {
                  TableName: "tap_coupons_used",
                  Item: {
                    used_by: used_by,
                    used_at: used_at,
                    coupon_id: used_coupon_params.Item.coupon_id
                  }
                };
                model.tap_coupons_used
                  .create(used_coupon_insert.Item)
                  .then(function (rows) {
                    resolve("Coupon Used successfully");
                  })
                  .catch(function (err) {
                    reject("Coupon used record can't be updated");
                  });
              }
            })
            .catch(function (err) {
              reject(err);
            });
        } else {
          reject("Coupon not found");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * Save order
 * @param {*} running_campaign_id
 * @param {*} qrcode
 * @param {*} customer_id
 * @param {*} orderID
 * @param {*} saleAmount
 * @param {*} merchant_id
 * @param {*} gotu
 * @param {*} discount
 * @param {*} offer_type
 * @param {*} offer_id
 * @param {*} coupon_id
 */
function SaveOrder(
  customer_id,
  orderID,
  saleAmount,
  merchant_id,
  gotu,
  discount,
  offer_type,
  offer_id,
  coupon_id
) {
  return new Promise(function (resolve, reject) {
    var lastVisitDate = Math.floor(Date.now() / 1000);
    //create order if merchant exist
    var insertparams = {
      TableName: "tap_customer_orders",
      Item: {
        customer_id: customer_id,
        orderID: orderID.toString(),
        saleAmount: saleAmount,
        created_at: lastVisitDate,
        merchant_id: merchant_id,
        discount: 0,
        offer_type: 0,
        offer_id: 0,
        coupon_id: 0,
        gotu: 0
      }
    };
    if (discount && discount !== undefined) {
      insertparams.Item.discount = discount;
    }
    if (offer_type && offer_type !== undefined) {
      insertparams.Item.offer_type = offer_type;
    }
    if (offer_id && offer_id !== undefined) {
      insertparams.Item.offer_id = offer_id;
    }
    if (coupon_id && coupon_id !== undefined) {
      insertparams.Item.coupon_id = coupon_id;
    }
    if (gotu !== undefined) {
      insertparams.Item.gotu = parseInt(gotu);
    }
    model.tap_customer_orders
      .create(insertparams.Item)
      .then(function (info) {
        if (gotu !== undefined) {
          insertparams.Item.gotu = parseInt(gotu);
          if (insertparams.Item.gotu == 1) {
            var payload_track_gotu = {
              campaign_id: coupon_id,
              saleAmount: saleAmount
            };

            var qrcodestatus = {
              customer_id: customer_id,
              id: merchant_id,
              campaign_id: coupon_id
            };
            Promise.all([
              invokeTrackGotuRedeemedsaleAmount(payload_track_gotu)
            ]).then(
              function (response) {
                console.log(JSON.stringify(response));
                resolve(info.id);
              },
              function (error) {
                console.log(error);
                console.log(
                  "track report excution failed execution failed 1"
                );
                console.log(JSON.stringify(error));
                resolve(info.id);
              }
            );

          } else {
            console.log("GotU not applied", info.id);
            resolve(info.id);
          }
        } else {
          console.log("GotU undefined");
          resolve(info.id);
        }
      })
      .catch(function (err) {
        console.log('Error Handling', err);
        reject(err);
      });
  });
}
/**
 * call trackGotuRedeemedsaleAmount function
 * @param {*} payload
 */
function invokeTrackGotuRedeemedsaleAmount(payload) {
  console.log('GOTU Log ');
  return new Promise(function (resolve, reject) {
    trackGotuRedeemedsaleAmountController.trackGotuRedeemedsaleAmount(
      payload,
      function (error, response) {
        if (error) {
          reject(error);
        } else {
          if (response.statusCode == 200) {
            resolve(response);
          } else {
            reject(error);
          }
        }
      }
    );
  });
}
/**
 * update QR code table
 * @param {*} coupon_id
 * @param {*} merchantId
 * @param {*} qrcode
 * @param {*} userid
 * @param {*} reedmtype
 */
function updateusedqrcodetable(
  coupon_id,
  merchantId,
  userid,
  reedmtype
) {
  var currentTime = Math.round(new Date().getTime() / 1000);
  return new Promise(function (resolve, reject) {
    var insertData = {
      campaign_id: coupon_id,
      used_by: userid,
      merchant_id: merchantId,
      used_on: currentTime
    };
    model.tap_qrcode_used
      .create(insertparams.Item)
      .then(function (data) {
        if (data.id) {
          console.log("insert data in used table");
          resolve(data);
        } else {
          reject("Some internal error to redeem this coupon");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * Search offer type by qrcode
 * @param {*} merchantId
 * @param {*} qrcode
 */
function searchqrcode(merchantId, qrcode) {
  return new Promise(function (resolve, reject) {
    model.tap_qrcode
      .findAll({
        attributes: ["code_for"],
        where: {
          qrcode_value: qrcode,
          merchant_id: merchantId
        }
      })
      .then(function (rows) {
        var data = rows.map(function (rows) {
          return rows.toJSON();
        });
        if (data.length > 0) {
          resolve(data[0]);
        } else {
          model.tap_campaigns
            .findAll({
              attributes: [
                ["campaign_type", "code_for"]
              ],
              where: {
                merchant_id: merchantId,
                coupon_code: qrcode
              }
            })
            .then(function (rows) {
              var datas = rows.map(function (rows) {
                return rows.toJSON();
              });
              if (datas.length > 0) {
                resolve(datas[0]);
              } else {
                reject("Coupon Code not found against this merchant.");
              }
            })
            .catch(function (err) {
              reject("Coupon Code not found against this merchant.");
            });
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}