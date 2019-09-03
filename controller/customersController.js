"use strict";
var model = require("../model");
var config = require("../config/config");
const RES_MESSAGE = require("../language/errorMsg");
var commonFunction = require("../controller/common");
var helpher = require("../controller/common/helper");
var textmessage = require("../language/textMessage");
var tapGenerateCoupon = require("../controller/tapGenerateCouponController");

module.exports = {
  UpdateCustomerPersonalDetails: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    var customer_id = req.params.customer_id;
    var merchant_id = req.params.merchant_id;
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var emails = req.body.emails;
    var birthDay = req.body.birthDay;
    var birthMonth = req.body.birthMonth;
    var birthYear = req.body.birthYear;
    var full_dob = req.body.dob;
    var zip = req.body.zip;
    var notes = req.body.notes;

    commonFunction.getMerchantWithCustomer(customer_id, merchant_id).then(
      function (customer_merchant) {
        model.tap_customers_merchant
          .update({
            firstName: firstName,
            lastName: lastName,
            emails: emails,
            birthDay: birthDay,
            birthMonth: birthMonth,
            birthYear: birthYear,
            full_dob: full_dob,
            zip: zip,
            notes: notes
          }, {
              where: {
                customer_id: customer_id,
                merchant_id: merchant_id
              }
            })
          .then(function (customer_update) {
            console.log(
              "results",
              "---------------======-----",
              customer_update
            );
            responseMsg.OK.message = RES_MESSAGE.UPDATE_SUCCESSFULLY;
            res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
          })
          .catch(function (err) {
            console.log("--------------------------------------", err);
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          });
      },
      function (error) {
        responseMsg.RESPONSE400.message = error;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    );
  },
  /**
   *
   * USED for fetch the customer merchant details.
   * @param {*} req customerId,merchant_id,
   * @param {*} res
   */
  getCustomerMerchantDetails: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    console.log("request params 1122@=====>", req.query);
    console.log("request params=====> req.query.byPhone", req.params);
    var phone = "";
    var customer_id = req.params.customerId;
    var merchant_id = req.query.merchant_id;
    commonFunction
      .getCustomerMerchantDetailsInnerJoin(customer_id, merchant_id, phone)
      .then(
        function (customerMerchantDetails) {
          console.log("customerMerchantDetails===", customerMerchantDetails);
          responseMsg.OK.message = RES_MESSAGE.SUCCESS_MESSAGE;
          responseMsg.OK.data = customerMerchantDetails;
          res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
        },
        function (error) {
          responseMsg.RESPONSE400.message = error;
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        }
      );
  },
  /**
   * Complete Merchant's customer profile.
   * @param {*} req
   * @param {*} res
   */
  completeCustomerProfile: function (req, res) {
    var responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    var customer_id = req.params.customer_id;
    var merchant_id = req.params.merchant_id;
    var phoneNumber = req.body.phoneNumber;
    var zip = req.body.zip;
    var gender = req.body.gender;
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var birthDay = req.body.birthDay;
    var birthMonth = req.body.birthMonth;
    var birthYear = req.body.birthYear;
    var prefContactMethod = req.body.prefContactMethod;
    var emails = req.body.emails[0];
    var merchants = req.body.merchants;
    console.log(emails)
    var isCognitoSet = "cognito_id" in req.body ? req.body.cognito_id : 0;
    if (
      !customer_id ||
      !merchant_id ||
      !phoneNumber ||
      !zip ||
      !gender ||
      !firstName ||
      !lastName ||
      !birthDay ||
      !birthMonth ||
      !birthYear ||
      !prefContactMethod ||
      !emails
    ) {
      console.log("error");
      responseMsg.RESPONSE400.message = RES_MESSAGE.ERROR_PARAM_MISSING;
      console.log("error", responseMsg.RESPONSE400.message);
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      var PuertoRico = helpher.PuertoRico(phoneNumber);
      var sql =
        "SELECT c.* FROM tap_customers c INNER JOIN tap_customers_merchant cm ON c.id=cm.customer_id WHERE c.id=:customer_id AND merchant_id=:merchant_id";
      var sqlParam = {
        customer_id: customer_id,
        merchant_id: merchant_id
      };
      model.sequelize
        .query(sql, {
          replacements: sqlParam,
          type: model.sequelize.QueryTypes.SELECT
        })
        .then(function (info) {
          if (info.length > 0) {
            var update = {
              Item: {
                firstName: firstName,
                lastName: lastName,
                emails: emails,
                birthDay: birthDay,
                birthMonth: birthMonth,
                birthYear: birthYear,
                full_dob: birthYear + "-" + birthMonth + "-" + birthDay,
                zip: zip,
                prefContactMethod: prefContactMethod,
                gender: gender,
                profile_completed: 1
              }
            };
            model.tap_customers_merchant
              .update(update.Item, {
                where: {
                  customer_id: customer_id,
                  merchant_id: merchant_id
                }
              })
              .then(function (info) {
                console.log(info)
                var message_content = textmessage.profileCompleteOfferWithShortUrl.english;
                if (PuertoRico) {
                  message_content = textmessage.profileCompleteOfferWithShortUrl.spanish;
                }
                console.log(message_content);
                model.tap_merchant_offers
                  .findAll({
                    where: {
                      MerchantId: merchant_id,
                      Discount_Type: "5",
                      active: "true"
                    }
                  })
                  .then(function (data) {
                    if (data.length > 0) {
                      var offer_detail = data.map(function (data) {
                        return data.toJSON();
                      });
                      console.log("offer : ", offer_detail);
                      console.log(
                        "message type : ",
                        offer_detail[0].reward_text_message_type
                      );
                      tapGenerateCoupon.GenerateCoupon({
                        offer_type: "5",
                        merchant_id: merchant_id,
                        customer_id: customer_id,
                        message: message_content,
                        mediaUrl: offer_detail[0].reward_text_media_image,
                        msgType: offer_detail[0].reward_text_message_type,
                        spanishmediaUrl: offer_detail[0].spanish_reward_text_media_image,
                        spanishmsgType: offer_detail[0].spanish_reward_text_message_type
                      },
                        function (error, response) {
                          if (error) {
                            if (isCognitoSet) {
                              model.tap_customers
                                .update({
                                  cognito_id: 1
                                }, {
                                  where: {
                                    id: customer_id
                                  }
                                })
                                .then(function (info) {
                                  responseMsg.OK.message =
                                    RES_MESSAGE.CUSTOMER_RECORD_UPDATED;
                                  res
                                    .status(responseMsg.OK.statusCode)
                                    .send(responseMsg.OK);
                                })
                                .catch(function (err) {
                                  responseMsg.RESPONSE400.message = err;
                                  res
                                    .status(responseMsg.RESPONSE400.statusCode)
                                    .send(responseMsg.RESPONSE400);
                                });
                            } else {
                              responseMsg.OK.message =
                                RES_MESSAGE.CUSTOMER_RECORD_UPDATED;
                              res
                                .status(responseMsg.OK.statusCode)
                                .send(responseMsg.OK);
                            }
                          } else {
                            if (response.statusCode == 200) {
                              if (isCognitoSet) {
                                model.tap_customers
                                  .update({
                                    cognito_id: 1
                                  }, {
                                      where: {
                                        id: customer_id
                                      }
                                    })
                                  .then(function (info) {
                                    responseMsg.OK.message =
                                      RES_MESSAGE.CUSTOMER_RECORD_UPDATED;
                                    res
                                      .status(responseMsg.OK.statusCode)
                                      .send(responseMsg.OK);
                                  })
                                  .catch(function (err) {
                                    responseMsg.RESPONSE400.message = err;
                                    res
                                      .status(
                                        responseMsg.RESPONSE400.statusCode
                                      )
                                      .send(responseMsg.RESPONSE400);
                                  });
                              } else {
                                responseMsg.OK.message =
                                  RES_MESSAGE.CUSTOMER_RECORD_UPDATED;
                                res
                                  .status(responseMsg.OK.statusCode)
                                  .send(responseMsg.OK);
                              }
                            } else {
                              if (isCognitoSet) {
                                model.tap_customers
                                  .update({
                                    cognito_id: 1
                                  }, {
                                    where: {
                                      id: customer_id
                                    }
                                  })
                                  .then(function (info) {
                                    responseMsg.OK.message =
                                      RES_MESSAGE.CUSTOMER_RECORD_UPDATED;
                                    res
                                      .status(responseMsg.OK.statusCode)
                                      .send(responseMsg.OK);
                                  })
                                  .catch(function (err) {
                                    responseMsg.RESPONSE400.message = err;
                                    res
                                      .status(
                                        responseMsg.RESPONSE400.statusCode
                                      )
                                      .send(responseMsg.RESPONSE400);
                                  });
                              } else {
                                responseMsg.OK.message =
                                  RES_MESSAGE.CUSTOMER_RECORD_UPDATED;
                                res
                                  .status(responseMsg.OK.statusCode)
                                  .send(responseMsg.OK);
                              }
                            }
                          }
                        }
                      );
                    } else {
                      if (isCognitoSet) {
                        model.tap_customers
                          .update({
                            cognito_id: 1
                          },{
                            where: {
                              id: customer_id
                            }
                          })
                          .then(function (info) {
                            responseMsg.OK.message =
                              RES_MESSAGE.CUSTOMER_RECORD_UPDATED;
                            res
                              .status(responseMsg.OK.statusCode)
                              .send(responseMsg.OK);
                          })
                          .catch(function (err) {
                            responseMsg.RESPONSE400.message = err;
                            res
                              .status(responseMsg.RESPONSE400.statusCode)
                              .send(responseMsg.RESPONSE400);
                          });
                      } else {
                        responseMsg.OK.message =
                          RES_MESSAGE.CUSTOMER_RECORD_UPDATED;
                        res
                          .status(responseMsg.OK.statusCode)
                          .send(responseMsg.OK);
                      }
                    }
                  })
                  .catch(function (err) {
                    responseMsg.RESPONSE400.message = err;
                    res
                      .status(responseMsg.RESPONSE400.statusCode)
                      .send(responseMsg.RESPONSE400);
                  });
              })
              .catch(function (err) {
                console.log(err)
                responseMsg.RESPONSE400.message = err;
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              });
          } else {
            responseMsg.RESPONSE400.message = RES_MESSAGE.NOT_FOUND;
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
  }
};