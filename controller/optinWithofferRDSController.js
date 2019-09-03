"use strict";
var model = require("../model");
var config = require("../config/config");
var tapGenerateCoupon = require("../controller/tapGenerateCouponController");
var tap_globalMerchantsOptinRDS = require("../controller/tapGlobalMerchantsOptinRDSController");
var getAllOffersRDSController = require("../controller/getAllOffersRDSController");
var tap_twilioSMSController = require("../controller/tap_twilioSMSController");
var textmessage = require("../language/textMessage");
var helper = require("../controller/common/helper");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));
const common = require("../language/constantData");
const tierBillingScheduleInfo = require('../controller/tierBillingScheduleInfo');
const splitter = require("split-sms");


module.exports = {
  optinWithofferRDS: function (req, res) {
    responseMsg.RESPONSE200.data = [];
    responseMsg.RESPONSE200.otherDetails = [];
    responseMsg.RESPONSE200.otherDetails.push({
      Start: Math.floor(Date.now())
    });
    console.log(responseMsg.RESPONSE200);
    var customer_id = req.params.customer_id;
    var merchant_id = req.query.merchant_id;
    var optin = req.body.optin;
    var requested_from = req.body.device_type;
    var device_data = req.body.device_uuid;
    requested_from = (requested_from == "customer") ? "Customer facing tablet" : "Register Widget";

    console.log("customer_id :", customer_id);
    console.log("merchant_id :", merchant_id);
    console.log("optin :", optin);
    if (!customer_id) {
      responseMsg.RESPONSE400.message = "customer_id is required. ";
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    }

    if (!merchant_id) {
      responseMsg.RESPONSE400.message = "merchant_id is required. ";
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    }

    if (optin === "1" || optin === 1 || optin === true || optin === "true") {
      optin = "1";
    } else {
      optin = "0";
    }

    Promise.all([
      getMerchantById(merchant_id),
      getCustomerById(customer_id, merchant_id)
    ]).then(
      function (values) {
        var mer_data = values[0];
        var customer = values[1];
        responseMsg.RESPONSE200.otherDetails.push({
          getCustomerById: "After getCustomerById: " + Math.floor(Date.now())
        });
        //check is it puerto rico number
        var phonenumber = customer.phoneNumber.toString();
        var PuertoRico = helper.PuertoRico(phonenumber);
        console.log("this check number text converter: " + PuertoRico);
        if (optin === "1") {
          var review_genertion_url =
            config.app.review_genertion_url +
            "?merchant_id=" +
            merchant_id +
            "&user_number=" +
            phonenumber;
          // review genertion message
          if (PuertoRico) {
            var review_genertion_message =
              textmessage.reviewGenertionMessage.spanish;
          } else {
            var review_genertion_message =
              textmessage.reviewGenertionMessage.english;
          }
          review_genertion_message = review_genertion_message.replace(
            "%DBA%",
            mer_data.nick_name
          );
          review_genertion_message = review_genertion_message.replace(
            "%LINK%",
            review_genertion_url
          );
          delaySMS(
            merchant_id,
            customer_id,
            phonenumber,
            review_genertion_message,
            "Review Generation with delay"
          ).then(
            function (delay_sms) {
              console.log("review data : ", delay_sms);
              if (!delay_sms) {
                console.log("review messge inserted");
              }
            },
            function (err) {
              console.log("delay sms review", err);
            }
          );
        }
        var template_optin = textmessage.OptInSMS.english;
        //Discount_Percentage,discount_unit
        if (PuertoRico) {
          template_optin = textmessage.OptInSMS.spanish;
        }
        var optSms = textmessage.OptInSMS.english;

        //Discount_Percentage,discount_unit
        if (PuertoRico) {
          optSms = textmessage.OptInSMS.spanish;
        }
        customerOptinWithMerchant(
          customer,
          merchant_id,
          optin,
          template_optin,
          requested_from,
          device_data,
          optSms,
          mer_data
        ).then(
          function (optinsection) {
            var successResponse = optinsection;
            getallloffer(merchant_id, customer_id, optin).then(
              function (allvalue) {
                responseMsg.RESPONSE200.data = allvalue;
                console.log("getallloffer allvalue : ", allvalue);
                responseMsg.RESPONSE200.otherDetails.push({
                  after_customerOptinWithMerchant:
                    "After customerOptinWithMerchant: " + Math.floor(Date.now())
                });
                responseMsg.RESPONSE200.message = "Record updated success.";
                //send complete profile link
                if (optin === "1") {
                  template_optin = template_optin.replace(
                    "%DBA%",
                    mer_data.nick_name
                  );
                  template_optin = template_optin.replace(
                    "%FREQUENCY%",
                    mer_data.sms_limit_perUser
                  );
                  template_optin = template_optin.replace(
                    "%TERMS_LINK%",
                    config.app.TERMS_LINK
                  );

                  optSms = optSms.replace("%DBA%", mer_data.nick_name);
                  optSms = optSms.replace(
                    "%FREQUENCY%",
                    mer_data.sms_limit_perUser
                  );
                  optSms = optSms.replace(
                    "%TERMS_LINK%",
                    config.app.TERMS_LINK
                  );

                  var compeleteProfileOnly = "";
                  if (PuertoRico) {
                    compeleteProfileOnly =
                      textmessage.compeleteProfileOnly.spanish;
                    sendSMS(
                      mer_data.merchant_id,
                      customer.phoneNumber,
                      optSms,
                      mer_data
                    ).then(
                      function (sentResponse) {
                        console.log("portico");
                        console.log(sentResponse);
                        sendSmsafteroptin(
                          mer_data,
                          customer_id,
                          merchant_id,
                          customer,
                          PuertoRico,
                          compeleteProfileOnly
                        ).then(
                          function (profilesms) {
                            responseMsg.RESPONSE200.message =
                              "Record updated success.";
                            res
                              .status(responseMsg.RESPONSE200.statusCode)
                              .send(responseMsg.RESPONSE200);
                          },
                          function (error) {
                            res
                              .status(responseMsg.RESPONSE400.statusCode)
                              .send(responseMsg.RESPONSE400);
                          }
                        );
                      },
                      function (err) {
                        console.log(err);
                        sendSmsafteroptin(
                          mer_data,
                          customer_id,
                          merchant_id,
                          customer,
                          PuertoRico,
                          compeleteProfileOnly
                        ).then(
                          function (profilesms) {
                            responseMsg.RESPONSE200.message =
                              "Record updated success.";
                            res
                              .status(responseMsg.RESPONSE200.statusCode)
                              .send(responseMsg.RESPONSE200);
                          },
                          function (error) {
                            res
                              .status(responseMsg.RESPONSE400.statusCode)
                              .send(responseMsg.RESPONSE400);
                          }
                        );
                      }
                    );
                  } else {
                    compeleteProfileOnly =
                      textmessage.compeleteProfileOnly.english;

                    sendSMS(
                      mer_data.merchant_id,
                      customer.phoneNumber,
                      optSms,
                      mer_data
                    ).then(
                      function (smsSend) {
                        console.log(
                          "optin sms send successfully:" +
                          JSON.stringify(smsSend)
                        );
                        sendSmsafteroptin(
                          mer_data,
                          customer_id,
                          merchant_id,
                          customer,
                          PuertoRico,
                          compeleteProfileOnly
                        ).then(
                          function (profilesms) {
                            console.log(
                              "sendSmsafteroptin RESPONSE : ",
                              responseMsg.RESPONSE200.data
                            );
                            responseMsg.RESPONSE200.message =
                              "Record updated success.";
                            res
                              .status(responseMsg.RESPONSE200.statusCode)
                              .send(responseMsg.RESPONSE200);
                          },
                          function (error) {
                            res
                              .status(responseMsg.RESPONSE400.statusCode)
                              .send(responseMsg.RESPONSE400);
                          }
                        );
                      },
                      function (smsSendFail) {
                        console.log("optin Sms send error1:", smsSendFail);
                        sendSmsafteroptin(
                          mer_data,
                          customer_id,
                          merchant_id,
                          customer,
                          PuertoRico,
                          compeleteProfileOnly
                        ).then(
                          function (profilesms) {
                            console.log(
                              "sendSmsafteroptin RESPONSE : ",
                              responseMsg.RESPONSE200.data
                            );
                            responseMsg.RESPONSE200.message =
                              "Record updated success.";
                            res
                              .status(responseMsg.RESPONSE200.statusCode)
                              .send(responseMsg.RESPONSE200);
                          },
                          function (error) {
                            res
                              .status(responseMsg.RESPONSE400.statusCode)
                              .send(responseMsg.RESPONSE400);
                          }
                        );
                      }
                    );
                  }
                } else {
                  responseMsg.RESPONSE200.data = [];
                  responseMsg.RESPONSE200.otherDetails.push({
                    Before_RESPONSE:
                      "Before RESPONSE: " + Math.floor(Date.now())
                  });
                  responseMsg.RESPONSE200.message = "Record updated success.";
                  res.send(responseMsg.RESPONSE200);
                }
              },
              function (err) {
                responseMsg.RESPONSE400.message = "no data found.";
                responseMsg.RESPONSE400.error = err;
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              },
              function (err) {
                responseMsg.RESPONSE400.message = "Fail to optin.";
                responseMsg.RESPONSE400.error = err;
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              }
            );
          },
          function (err) {
            responseMsg.RESPONSE400.error = err;
            responseMsg.RESPONSE400.message = "error ";
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          }
        );
      },
      function (err) {
        responseMsg.RESPONSE400.error = err;
        responseMsg.RESPONSE400.message = "error ";
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    );
  }
};
/**
 *
 * @param {*} mer_data
 * @param {*} customer_id
 * @param {*} merchant_id
 * @param {*} customer
 * @param {*} PuertoRico
 * @param {*} compeleteProfileOnly
 */
function sendSmsafteroptin(
  mer_data,
  customer_id,
  merchant_id,
  customer,
  PuertoRico,
  compeleteProfileOnly
) {
  return new Promise(function (resolve, reject) {
    compeleteProfileOnly = compeleteProfileOnly.replace(
      "%DBA%",
      mer_data.nick_name
    );
    compeleteProfileOnly = compeleteProfileOnly.replace(
      "%LINK%",
      config.app.complete_profile_link +
      "complete_profile.php?id=" +
      customer.id +
      "&mid=" +
      merchant_id +
      ""
    );
    if (customer.profile_completed == 1) {
      resolve("success");
    } else {
      merchant_offer_detail(merchant_id, "5", "").then(
        function (offer_detail) {
          responseMsg.RESPONSE200.otherDetails.push({
            after_merchant_offer_detail:
              "After merchant_offer_detail: " + Math.floor(Date.now())
          });
          console.log("offer sent");
          console.log(offer_detail);
          //customer info
          if (customer.profile_completed !== 1) {
            var compeleteProfile = "";
            if (PuertoRico) {
              compeleteProfile = textmessage.compeleteProfileWithReward.spanish;
            } else {
              compeleteProfile = textmessage.compeleteProfileWithReward.english;
            }
            console.log("reward_text :", offer_detail.reward_text);
            console.log(
              "spanish_reward_text :",
              offer_detail.spanish_reward_text
            );
            compeleteProfile = compeleteProfile.replace(
              "%DBA%",
              mer_data.nick_name
            );
            compeleteProfile = compeleteProfile.replace(
              "%LINK%",
              config.app.complete_profile_link +
              "complete_profile.php?id=" +
              customer.id +
              "&mid=" +
              merchant_id +
              ""
            );
            compeleteProfile = compeleteProfile.replace(
              "%REWARD_TEXT%",
              offer_detail.reward_text !== null
                ? decodeHTMLEntities(offer_detail.reward_text)
                : ""
            );
            if (offer_detail.before_profile_complete_spanish_reward_text) {
              compeleteProfile = compeleteProfile.replace(
                "%SPANISH_REWARD_TEXT%",
                decodeHTMLEntities(
                  offer_detail.before_profile_complete_spanish_reward_text
                )
              );
            } else {
              compeleteProfile = compeleteProfile.replace(
                "%SPANISH_REWARD_TEXT%",
                offer_detail.spanish_reward_text !== null
                  ? decodeHTMLEntities(offer_detail.spanish_reward_text)
                  : ""
              );
            }

            if (
              offer_detail.discount_unit !== "" &&
              offer_detail.Discount_Percentage !== ""
            ) {
              if (offer_detail.discount_unit == "$") {
                compeleteProfile = compeleteProfile.replace(
                  "%DISCOUNT%",
                  "$" + offer_detail.Discount_Percentage
                );
              } else if (offer_detail.discount_unit == "%") {
                compeleteProfile = compeleteProfile.replace(
                  "%DISCOUNT%",
                  offer_detail.Discount_Percentage + "%"
                );
              }
            }
            console.log(compeleteProfile);
            if (PuertoRico) {
              delayCheckStatusSMS(
                merchant_id,
                customer_id,
                customer.phoneNumber,
                compeleteProfile,
                "Complete your profile with coupon"
              ).then(
                function (delay_sms) {
                  console.log("delay sms 1", delay_sms);
                  if (delay_sms) {
                    resolve("success");
                  } else {
                    resolve("success");
                  }
                },
                function (err) {
                  console.log("delay sms 212", err);
                }
              );
            } else {
              console.log("profile not complete section");
              delayCheckStatusSMS(
                merchant_id,
                customer_id,
                customer.phoneNumber,
                compeleteProfile,
                "Complete your profile with coupon"
              ).then(
                function (delay_sms) {
                  console.log("delay sms 1", delay_sms);
                  if (delay_sms) {
                    resolve("success");
                  } else {
                    resolve("success");
                  }
                },
                function (err) {
                  console.log("delay sms 212", err);
                }
              );
            }
          } else {
            console.log("customer complete profile");
            console.log("customer 1");
            resolve("success");
          }
        },
        function (reject) {
          var tos_message = compeleteProfileOnly;
          if (customer.profile_completed == "1") {
            resolve("success");
          } else {
            if (PuertoRico) {
              delayCheckStatusSMS(
                merchant_id,
                customer_id,
                customer.phoneNumber,
                tos_message,
                "Complete your profile without coupon"
              ).then(
                function (delay_sms) {
                  console.log("delay sms 5", delay_sms);
                  if (delay_sms) {
                    resolve("success");
                  } else {
                    resolve("success");
                  }
                },
                function (err) {
                  console.log("delay sms 24", err);
                }
              );
            } else {
              delayCheckStatusSMS(
                merchant_id,
                customer_id,
                customer.phoneNumber,
                tos_message,
                "Complete your profile without coupon"
              ).then(
                function (delay_sms) {
                  console.log("delay sms 5", delay_sms);
                  if (delay_sms) {
                    resolve("success");
                  } else {
                    resolve("success");
                  }
                },
                function (err) {
                  console.log("delay sms 24", err);
                }
              );
            }
          }
        }
      );
    }
  });
}
/**
 *
 * @param {*} text
 */
function decodeHTMLEntities(text) {
  var entities = [
    ["amp", "&"],
    ["apos", "'"],
    ["#x27", "'"],
    ["#x2F", "/"],
    ["#39", "'"],
    ["#47", "/"],
    ["lt", "<"],
    ["gt", ">"],
    ["nbsp", " "],
    ["quot", '"']
  ];
  for (var i = 0, max = entities.length; i < max; ++i) {
    text = text.replace(
      new RegExp("&" + entities[i][0] + ";", "g"),
      entities[i][1]
    );
  }
  return text;
}
/**
 *
 * @param {*} customer
 * @param {*} template_optin
 * @param {*} merchant_id
 */
function giveSignUpOffer(customer, template_optin, merchant_id) {
  return new Promise(function (resolve, reject) {
    var today = Math.floor(Date.now() / 1000);
    template_optin = template_optin.replace(
      "%LINK%",
      config.app.terms_link +
      "terms.php?id=" +
      customer.id +
      "&mid=" +
      merchant_id +
      " Policies, Terms and Conditions"
    );
    console.log({
      offer_type: "4",
      merchant_id: merchant_id,
      customer_id: customer.id,
      message: template_optin
    });
    tapGenerateCoupon.GenerateCoupon(
      {
        offer_type: "4",
        merchant_id: merchant_id,
        customer_id: customer.id,
        message: template_optin
      },
      function (err, response) {
        if (err) {
          reject(responseMsg.RESPONSE400);
        } else {
          if (response.statusCode == 200) {
            resolve(responseMsg.RESPONSE200);
          } else {
            responseMsg.RESPONSE400.message = response.message;
            reject(responseMsg.RESPONSE400);
          }
        }
      }
    );
  }); // end promises
}

/**
 * optin updated
 * @param {*} customer
 * @param {*} merchant_id
 * @param {*} optin
 * @param {*} template_optin
 */
function customerOptinWithMerchant(
  customer,
  merchant_id,
  optin,
  template_optin,
  requested_from,
  device_data,
  optSms,
  mer_data
) {
  return new Promise(function (resolve, reject) {
    updateOptinOptoutLog(customer.phoneNumber , customer.id, merchant_id, optin , requested_from , device_data , optSms , mer_data).then(
      function (logupdated) {
        getCustomerMerchantById(customer.phoneNumber, merchant_id).then(
          function (successCustomerMerchant) {
            responseMsg.RESPONSE200.otherDetails.push({
              After_getCustomerMerchantById:
                "After getCustomerMerchantById: " + Math.floor(Date.now())
            });
            tap_globalMerchantsOptinRDS.globalMerchantsOptinRDS(
              {
                merchant_id: merchant_id,
                customer_phone: customer.phoneNumber,
                optin: optin
              },
              function (Failerror, successOptin) {
                if (Failerror) {
                  console.log(Failerror);
                  reject(Failerror);
                } else {
                  responseMsg.RESPONSE200.otherDetails.push({
                    After_tap_globalMerchantsOptinRDS:
                      "After tap_globalMerchantsOptinRDS: " +
                      Math.floor(Date.now())
                  });
                  console.log("send coupon 1");
                  if (
                    successCustomerMerchant.optin != optin &&
                    successCustomerMerchant.optin_at === null
                  ) {
                    responseMsg.RESPONSE200.otherDetails.push({
                      After_successCustomerMerchant_IF:
                        "After successCustomerMerchant IF: " +
                        Math.floor(Date.now())
                    });
                    if (optin) {
                      console.log("send coupon 2");
                      giveSignUpOffer(
                        customer,
                        template_optin,
                        merchant_id
                      ).then(
                        function (response) {
                          responseMsg.RESPONSE200.otherDetails.push({
                            After_giveSignUpOffer_SUCCESS:
                              "After giveSignUpOffer SUCCESS: " +
                              Math.floor(Date.now())
                          });
                          console.log("send coupon 3");
                          resolve("Record updated success");
                        },
                        function (err) {
                          responseMsg.RESPONSE200.otherDetails.push({
                            After_giveSignUpOffer_ERROR:
                              "After giveSignUpOffer ERROR: " +
                              Math.floor(Date.now())
                          });
                          console.log(err);
                          resolve("Record updated success");
                        }
                      );
                    } else {
                      responseMsg.RESPONSE200.otherDetails.push({
                        BEFORE_UPDATE_SUCCESS:
                          "BEFORE UPDATE SUCCESS: " + Math.floor(Date.now())
                      });
                      resolve("Record updated success");
                    }
                  } else {
                    responseMsg.RESPONSE200.otherDetails.push({
                      BEFORE_UPDATE_SUCCESS_2:
                        "BEFORE UPDATE SUCCESS 2: " + Math.floor(Date.now())
                    });
                    resolve("Record updated success");
                  }
                }
              }
            );
          },
          function (failCustomerMerchant) {
            var insertparams = {
              customer_phone: customer.phoneNumber.toString(),
              merchant_id: merchant_id,
              customer_id: customer.id,
              optin: optin,
              optin_at: Math.floor(Date.now() / 1000),
              type: "normal",
              last_visit_at: Math.floor(Date.now() / 1000),
              created_at: Math.floor(Date.now() / 1000)
            };
            model.tap_customers_merchant.create(insertparams).then(
              function (info) {
                tap_globalMerchantsOptinRDS.globalMerchantsOptinRDS(
                  {
                    merchant_id: merchant_id,
                    customer_phone: customer.phoneNumber,
                    optin: optin
                  },
                  function (Failerror, successOptin) {
                    if (err) {
                      resolve("successInsert");
                    } else {
                      giveSignUpOffer(
                        customer,
                        template_optin,
                        merchant_id
                      ).then(
                        function (response) {
                          resolve("successInsert");
                        },
                        function (err) {
                          resolve("successInsert");
                        }
                      );
                    }
                  }
                );
              },
              function (err) {
                reject(err);
              }
            );
          }
        );
      },
      function (error) {
        reject(error);
      }
    );
  });
}

/**
 * get customer by id
 * @param {*} customer_id
 * @param {*} merchant_id
 */
function getCustomerById(customer_id, merchant_id) {
  return new Promise(function (resolve, reject) {
    var sql =
      "SELECT c.id, c.phoneNumber, c.short_code, c.created_at, cm.last_visit_at, cm.prefContactMethod, c.type, c.couponsHold, c.total_discount, c.total_orders, c.total_purchase, c.updated_at, cm.full_dob, cm.lastName, cm.birthDay, cm.birthMonth, cm.birthYear, cm.emails, cm.firstName, c.social_ids, cm.zip, c.refferedByID, c.initialReferral, c.cognito_id, cm.gender, cm.profile_completed FROM tap_customers c INNER JOIN tap_customers_merchant cm ON c.id=cm.customer_id WHERE c.id = :customer_id AND cm.merchant_id=:merchant_id";
    console.log("customer_id..." + customer_id);
    console.log("merchant_id..." + merchant_id);
    model.sequelize
      .query(sql, {
        replacements: {
          customer_id: customer_id,
          merchant_id: merchant_id
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(result => {
        if (result.length > 0) {
          console.log("getCustomerById result : ", result);
          resolve(result[0]);
        } else {
          reject("No Customer Found.");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}

/**
 * get customer merchant by id
 * @param {*} customer_phone
 * @param {*} merchant_id
 */
function getCustomerMerchantById(customer_phone, merchant_id) {
  return new Promise(function (resolve, reject) {
    var temp_merchant_id = merchant_id !== undefined ? merchant_id : null;
    model.tap_customers_merchant
      .findAll({
        where: {
          customer_phone: customer_phone.toString(),
          merchant_id: temp_merchant_id
        }
      })
      .then(function (result) {
        if (result.length > 0) {
          console.log("getCustomerMerchantById : ", JSON.stringify(result));
          resolve(result[0]);
        } else {
          reject("No User Found.");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * get merchant offer detail
 * @param {*} merchant_id
 * @param {*} offer_type
 * @param {*} offer_id
 */
function merchant_offer_detail(merchant_id, offer_type, offer_id) {
  var query =
    "Select reward_text,spanish_reward_text,before_profile_complete_reward_text,before_profile_complete_spanish_reward_text,id,Discount_Percentage,discount_unit, before_profile_complete_reward_text_media_image, before_profile_complete_reward_text_message_type, before_profile_complete_spanish_reward_text_message_type, before_profile_complete_spanish_reward_text_media_image from tap_merchant_offers Where active='true' AND Discount_Type=:offer_type AND MerchantId='" +
    merchant_id +
    "'";
  if (offer_id !== "") query += " AND id='" + offer_id + "'";
  console.log(query);
  return new Promise(function (resolve, reject) {
    model.sequelize
      .query(query, {
        replacements: {
          offer_type: offer_type,
          merchant_id: merchant_id
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(rows => {
        if (rows.length > 0) {
          resolve(rows[0]);
        } else {
          reject("Sorry no Record found against given offer.");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * get merchant details by id
 * @param {*} merchant_id
 */
function getMerchantById(merchant_id) {
  return new Promise(function (resolve, reject) {
    var temp_merchant_id = merchant_id !== undefined ? merchant_id : null;
    model.tap_merchants
      .findAll({
        where: {
          active: "true",
          taptext_status: "true",
          merchant_id: temp_merchant_id
        }
      })
      .then(function (result) {
        if (result.length > 0) {
          console.log("getMerchantById : ", JSON.stringify(result));
          resolve(result[0]);
        } else {
          reject(
            "No Merchant Found or taplocal text not active or merchant not active"
          );
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * send SMS PuertoRico number and US numbers
 * @param {*} merchant_id
 * @param {*} phone_number
 * @param {*} message
 * @param {*} mer_data
 */
function sendSMS(merchant_id, phone_number, message, mer_data) {
  return new Promise(function (resolve, reject) {
    helper
      .getMerchantSMSCount(merchant_id, "monthly", "sms")
      .then(function (sms_sent) {
        if (mer_data.sms_limit <= sms_sent && mer_data.sms_unlimited != 1) {
          let upgradeTierData = { segmentNeedToAdd: (sms_sent + 1), trigger: "optin with offer rds" };
          tierBillingScheduleInfo
            .updgardeTierWithOveragePrice(merchant_id, upgradeTierData)
            .then(
              function (res) {
                console.log("Sms sent Limit already reached and Tier Upgraded.");
                sendSMStoCustomer(merchant_id, phone_number, message).then(function (res) {
                  resolve(res);
                }, function (err) {
                  resolve(err);
                });
              },
              function (err) {
                console.log(err);
                console.log("Sms sent Limit already reached and Tier not Upgraded.");
                resolve(err);
              }
            );
        } else {
          sendSMStoCustomer(merchant_id, phone_number, message).then(function (res) {
            resolve(res);
          }, function (err) {
            resolve(err);
          });
        }
      }, function (err) {
        console.log('sms count error----------- ', err);
        resolve(err);
      });
  });
}
/**
 * Sens SMS to customer
 * @param {*} merchant_id
 * @param {*} phone_number
 * @param {*} message
 */
function sendSMStoCustomer(merchant_id, phone_number, message) {
  var today = Math.floor(Date.now() / 1000);
  return new Promise(function (resolve, reject) {
    tap_twilioSMSController.twilioSMS(
      {
        phone: phone_number,
        message: message
      },
      function (err, sendsms) {
        if (err) {
          console.log("sms send failed.");
          resolve(err);
        } else {
          let log_data = {
            timestamp: parseInt(today),
            merchant_id: merchant_id,
            customer_phone: phone_number,
            subject: "Opt In",
            message: sendsms.data.body,
            sms_segment: "1",
            price: sendsms.data.price,
            type: "SMS",
            numMedia: sendsms.data.numMedia,
            res_data: JSON.stringify(sendsms.data),
            offer_id: ""
          };
          if (sendsms.statusCode == 200) {
            Promise.all([
              helper.insertLogsSMS(log_data),
              helper.updateMerchantsSentSMS({
                sms_sent: log_data.sms_segment,
                merchant_id: merchant_id
              })
            ]).then(
              function (success) {
                console.log("sms send and log inserted");
                resolve(success);
              },
              function (fail) {
                console.log("sms send and log insert failed");
                resolve(fail);
              }
            );
            delete responseMsg.RESPONSE200.path;
            delete responseMsg.RESPONSE200.sent_sms;
          } else {
            console.log("sms send failed.");
            Promise.all([
              helper.insertFailedLogsSMS(log_data),
              helper.updateMerchantsSentSMS({
                sms_sent: log_data.sms_segment,
                merchant_id: merchant_id
              })
            ]).then(
              function (success) {
                console.log("sms send and log inserted");
                resolve(success);
              },
              function (fail) {
                console.log("sms send and log insert failed");
                resolve(fail);
              }
            );
            delete responseMsg.RESPONSE200.path;
            delete responseMsg.RESPONSE200.sent_sms;
          }
        }
      }
    );
  });
}
/**
 * Get All Offers
 * @param {*} merchant_id
 * @param {*} customerId
 * @param {*} optin
 */
function getallloffer(merchant_id, customerId, optin) {
  return new Promise(function (resolve, reject) {
    console.log("optin status", optin);
    getAllOffersRDSController.getAllOffersRDS(
      {
        id: merchant_id,
        customerId: customerId,
        optin: optin
      },
      function (error, resolve_customer) {
        console.log("resolve_customer", resolve_customer);
        if (resolve_customer.statusCode == 200) {
          resolve(resolve_customer.invokeData);
          delete responseMsg.RESPONSE200.invokeData;
          delete responseMsg.RESPONSE200["availableCoupons"];
          delete responseMsg.RESPONSE200["customerProfile"];
          delete responseMsg.RESPONSE200["punches"];
          delete responseMsg.RESPONSE200["MerchantOffers"];
          delete responseMsg.RESPONSE200["punchinfo"];
        } else {
          resolve("[]");
        }
      }
    );
  });
}
/**
 * check review geration status and save review generation SMS in tap_merchant_optin_batch_sms table
 * @param {*} merchant_id
 * @param {*} customer_id
 * @param {*} phoneNumber
 * @param {*} message
 */
function delaySMS(merchant_id, customer_id, phoneNumber, message, subject = null) {
  return new Promise(function (resolve, reject) {
    console.log("merchant_id: " + merchant_id);
    console.log("customer_id: " + customer_id);
    console.log("phoneNumber: " + phoneNumber);
    console.log("message: " + message);
    model.tap_merchant_deep_link
      .findAll({
        attributes: ["id"],
        where: {
          merchant_id: merchant_id,
          review_generation_process_status: "1"
        }
      })
      .then(function (result) {
        console.log("result : " + JSON.stringify(result));
        if (result.length > 0) {
          console.log("125");
          var insertparams = {
            merchant_id: merchant_id,
            customer_id: customer_id,
            customer_phone: phoneNumber,
            message: message,
            optin_at: Math.floor(Date.now() / 1000),
            sms_type: "1",
            sms_status: "0",
            subject: subject
          };
          model.tap_merchant_optin_batch_sms
            .create(insertparams)
            .then(function (info) {
              resolve(0);
            })
            .catch(function (err) {
              reject("Data inserted error : " + err);
            });
        } else {
          resolve(1);
        }
      })
      .catch(function (err) {
        reject("delay SMS error: " + err);
      });
  });
}
/**
 * This function use for check review geration status and save Profile Complete SMS in tap_merchant_optin_batch_sms table
 * @param {*} merchant_id
 * @param {*} customer_id
 * @param {*} phoneNumber
 * @param {*} message
 */
function delayCheckStatusSMS(merchant_id, customer_id, phoneNumber, message, subject = null) {
  return new Promise(function (resolve, reject) {
    console.log("merchant_id: " + merchant_id);
    console.log("customer_id: " + customer_id);
    console.log("phoneNumber: " + phoneNumber);
    console.log("message: " + message);
    model.tap_merchant_deep_link
      .findAll({
        attributes: ["id"],
        where: {
          merchant_id: merchant_id,
          review_generation_process_status: "1"
        }
      })
      .then(function (result) {
        console.log("result : " + JSON.stringify(result));
        if (result.length > 0) {
          console.log("only check");
          resolve(0);
        } else {
          //   resolve(1);
          var insertparams = {
            merchant_id: merchant_id,
            customer_id: customer_id,
            customer_phone: phoneNumber,
            message: message,
            optin_at: Math.floor(Date.now() / 1000),
            sms_type: "2",
            sms_status: "0",
            subject: subject
          };
          model.tap_merchant_optin_batch_sms
            .create(insertparams)
            .then(function (info) {
              resolve(1);
            })
            .catch(function (err) {
              reject("Data inserted error complete profile : " + err);
            });
        }
      })
      .catch(function (err) {
        reject("delay SMS error: " + err);
      });
  });
}
/**
 * Log optin
 * @param {*} customer
 * @param {*} merchant_id
 * @param {*} optin
 */
function updateOptinOptoutLog(phoneNumber ,customer, merchant_id, optin , requested_from , device_data , optSms , mer_data) {
  console.log("Tap optin log maintain");
  return new Promise(function (resolve, reject) {
    var newoptSms = optSms.replace("%DBA%", mer_data.nick_name);
    newoptSms = newoptSms.replace(
      "%FREQUENCY%",
      mer_data.sms_limit_perUser
    );
    newoptSms = newoptSms.replace(
      "%TERMS_LINK%",
      config.app.TERMS_LINK
    );
    let getLength = splitter.split(newoptSms);
    let getSegments = getLength.parts.length;
    var logsparams = {
      TableName: "tap_customers_activity",
      Item: {
        customer_number: phoneNumber,
        merchant_id: merchant_id,
        customer_id: customer,
        subject: optin == 0 ? 'OPT-OUT' : 'OPT-IN',
        requested_from: requested_from,
        device_data: device_data,
        time: Math.floor(Date.now() / 1000),
        message_sent : optin == 0 ? 'Not Available' : newoptSms ,
        segments : optin == 0 ? 0 : 1 
      }
    };
    model.tap_customers_activity
      .create(logsparams.Item)
      .then(function (info) {
        resolve(true);
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
