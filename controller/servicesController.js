/**
 * Created by chandan on 09/04/2018
 */
"use strict";
var model = require("../model");
var config = require("../config/config");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));
var commonFunction = require("../controller/common");
var upperCaseFirst = require("upper-case-first");
var emailContent = require("../language/emailContent");
var helper = require("../controller/common/helper");
const RES_MESSAGE = require("../language/errorMsg");
var unixtimestamp = require("unix-timestamp");
const request = require("request");
const google_key = "AIzaSyDyVdS9nQWUoNJSAdq_egxyrIyr-EI0WEU";

module.exports = {
  // merchant current active coupon by merchant id
  ProductSignupEmail: function(req, res) {
    var merchant_id = req.body.merchant_id;
    var product_name = req.body.product_name;
    if (!product_name) {
      responseMsg.RESPONSE400.message = RES_MESSAGE.PRODUCT_NAME_REQUIRED;
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    }

    if (merchant_id == "") {
      responseMsg.RESPONSE400.message = RES_MESSAGE.MERCHANT_DETAILS_REQUIRED;
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    }
    var emailconfigure = {};
    var merchantemailconfigure = {};
    if (product_name == "gotu") {
      emailconfigure = emailContent.ADMIN.GOTU_SIGNUP;
      merchantemailconfigure = emailContent.MERCHANT.GOTU_SIGNUP;
    } else if (product_name == "yext") {
      emailconfigure = emailContent.ADMIN.YEXT_SIGNUP;
      merchantemailconfigure = emailContent.MERCHANT.YEXT_SIGNUP;
    } else if (product_name == "tap_text") {
      emailconfigure = emailContent.ADMIN.TAP_TEXT;
      merchantemailconfigure = emailContent.MERCHANT.TAP_TEXT;
    } else if (product_name == "push") {
      emailconfigure = emailContent.ADMIN.PUSH_SIGNUP;
      merchantemailconfigure = emailContent.MERCHANT.PUSH_SIGNUP;
    }
    console.log("Email Content", emailconfigure);

    model.tap_merchants
      .findAll({
        attributes: ["first_name", "last_name", "email", "phoneNumber", "dba"],
        where: {
          merchant_id: merchant_id
        }
      })
      .then(function(rows) {
        if (rows.length > 0) {
          var mailbody = emailconfigure.html;
          // format : to, subject, body, attachment, from, header
          mailbody = mailbody.replace("%DBA%", rows[0].dataValues.dba);
          mailbody = mailbody.replace("%BODY%", emailconfigure.body);
          mailbody = mailbody.replace(
            "%FNAME%",
            rows[0].dataValues.first_name ? rows[0].dataValues.first_name : ""
          );
          mailbody = mailbody.replace(
            "%LNAME%",
            rows[0].dataValues.last_name ? rows[0].dataValues.last_name : ""
          );
          mailbody = mailbody.replace(
            "%EMAIL%",
            rows[0].dataValues.email ? rows[0].dataValues.email : ""
          );
          mailbody = mailbody.replace(
            "%PHONE_NUMBER%",
            rows[0].dataValues.phoneNumber ? rows[0].dataValues.phoneNumber : ""
          );
          helper
            .sendEmailFromAdmin(
              emailconfigure.emailTo,
              emailconfigure.subject,
              mailbody
            )
            .then(
              function(resdata) {
                var merchantmailbody = merchantemailconfigure.html;
                merchantmailbody = merchantmailbody.replace(
                  "%DBA%",
                  rows[0].dataValues.dba
                );
                merchantmailbody = merchantmailbody.replace(
                  "%BODY%",
                  merchantemailconfigure.body
                );
                // params to, subject, body
                helper
                  .sendEmailFromSales(
                    rows[0].dataValues.email,
                    merchantemailconfigure.subject,
                    merchantmailbody
                  )
                  .then(
                    function(custData) {
                      responseMsg.OK.message = RES_MESSAGE.EMAIL_SENT;
                      res
                        .status(responseMsg.OK.statusCode)
                        .send(responseMsg.OK);
                    },
                    function(error) {
                      responseMsg.RESPONSE400.message = RES_MESSAGE.EMAIL_SENT;
                      responseMsg.RESPONSE400.error = error;
                      res
                        .status(responseMsg.RESPONSE400.statusCode)
                        .send(responseMsg.RESPONSE400);
                    }
                  );
              },
              function(error) {
                responseMsg.RESPONSE400.message = RES_MESSAGE.EMAIL_NOT_SENT;
                responseMsg.RESPONSE400.error = error;
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              }
            );
        } else {
          responseMsg.RESPONSE400.message =
            RES_MESSAGE.MERCHANT_DETAILS_NOT_FOUND;
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        }
      })
      .catch(function(err) {
        console.log(err);
      });
  },
  /**
   *
   *
   * @param {*} req
   * @param {*} res
   */
  SingleCouponRDS: function(req, res) {
    const coupon_id = req.query.id;
    getAvailableCoupons(coupon_id).then(
      function(coupon_info) {
        if (coupon_info.offerid !== undefined) {
          GetCouponInfo(coupon_info.offerid).then(
            function(coupon_detail) {
              coupon_info.coupon_info = coupon_detail;
              responseMsg.RESPONSE200.message = "Record found successfully.";
              responseMsg.RESPONSE200.data = coupon_info;
              return res
                .status(responseMsg.RESPONSE200.statusCode)
                .send(responseMsg.RESPONSE200);
            },
            function(error) {
              responseMsg.RESPONSE400.message = error;
              res
                .status(responseMsg.RESPONSE400.statusCode)
                .send(responseMsg.RESPONSE400);
            }
          );
        } else {
          responseMsg.RESPONSE400.message = "No records found.";
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        }
      },
      function(err_msg) {
        responseMsg.RESPONSE400.message = err_msg;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    );
  },
  /**
   * Function for Tap Local Text Reporting
   * @param {*} req mid:String
   * @param {*} res
   */
  generateShortUrlMerchant: function(req, res) {
    delete responseMsg.OK.message;
    var mid = req.query.mid;
    var merchantInfo = {};
    getMerchantById(mid).then(
      function(merchant_info) {
        merchant_info = merchant_info[0];
        if (
          merchant_info.base_url === undefined ||
          merchant_info.base_url === "" ||
          merchant_info.base_url === null
        ) {
          var longUrl = {
            longUrl: config.app.longUrl + mid
          };
          console.log("longUrl : ", longUrl);
          generate_url(mid, longUrl).then(
            function(resolve) {
              responseMsg.OK.data = resolve;
              res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
            },
            function(reject) {
              responseMsg.RESPONSE400.message = reject;
              res
                .status(responseMsg.RESPONSE400.statusCode)
                .send(responseMsg.RESPONSE400);
            }
          );
        } else {
          responseMsg.OK.data = merchant_info.base_url;
          res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
        }
      },
      function(err) {
        responseMsg.RESPONSE400.message = err;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    );
  }
};

/**
 *
 *
 * @param {*} id
 * @returns
 */
function getAvailableCoupons(id) {
  return new Promise(function(resolve, reject) {
    var sql_query =
      "SELECT c.*,cu.id as used_id FROM tap_coupons c LEFT JOIN tap_coupons_used cu ON c.id=cu.coupon_id WHERE c.id=:id";
    model.sequelize
      .query(sql_query, {
        replacements: {
          id: id
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function(data) {
        if (data.length > 0) {
          console.log("getAvailableCoupons data[0]", data[0]);
          if (data[0].used_id) {
            reject("Sorry! Coupon is already redeemed.");
          } else {
            resolve(data[0]);
          }
        } else {
          reject("Sorry! Coupon not found.");
        }
      })
      .catch(function(err) {
        reject(err);
      });
  });
}

/**
 *
 *
 * @param {*} id
 * @returns
 */
function GetCouponInfo(id) {
  return new Promise(function(resolve, reject) {
    var sql_query = "SELECT * FROM tap_merchant_offers WHERE id=:id";
    model.sequelize
      .query(sql_query, {
        replacements: {
          id: id.toString()
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function(data) {
        if (data.length > 0) {
          resolve(data[0]);
        } else {
          reject("No record found.");
        }
      })
      .catch(function(err) {
        reject(err);
      });
  });
}
/**
 * Get merchant id
 * @param {*} merchant_id
 */
function getMerchantById(merchant_id) {
  return new Promise(function(resolve, reject) {
    model.tap_merchants
      .findAll({
        where: {
          merchant_id: merchant_id
        }
      })
      .then(function(data) {
        var rows = data.map(function(data) {
          return data.toJSON();
        });

        if (rows.length > 0) {
          console.log("Merchant found");
          resolve(rows);
        } else {
          console.log("Merchant not found");
          reject("Merchant not found");
        }
      })
      .catch(function(err) {
        reject(err);
      });
  });
}
/**
 * Generate URL
 * @param {*} mid
 * @param {*} data
 */
function generate_url(mid, data) {
  var options = {
    uri: config.app.googleapisUrl + google_key,
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    json: data
  };
  console.log("Merchant data : ", data);
  return new Promise(function(resolve, reject) {
    request(options, function(error, response, body) {
      if (
        !error &&
        (response.statusCode == 200 || response.statusCode == 201) &&
        body.id !== undefined
      ) {
        //update merchant url
        var update_at = Math.floor(Date.now() / 1000);
        var updateparams = {
          TableName: "tap_merchants",
          Key: {
            id: mid
          },
          ExpressionAttributeValues: {
            updated_at: update_at,
            base_url: body.id
          }
        };

        model.tap_merchants
          .update(updateparams.ExpressionAttributeValues, {
            where: {
              merchant_id: updateparams.Key.id
            }
          })
          .then(function(rows) {
            console.log("Merchant url updated");
            resolve(body.id);
          })
          .catch(function(err) {
            console.log("Merchant url not updated");
            reject(err);
          });
      } else {
        reject("Something went wrong\n " + error);
      }
    });
  });
}
