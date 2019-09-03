"use strict";
var async = require("async");
var config = require("../../config/config");
var Sequelize = require("sequelize");
var model = require("../../model");
var moment = require("moment");
var unixtimestamp = require("unix-timestamp");
const uuidv4 = require("uuid/v4");
const https = require("https");
const _ = require("underscore");
var tapGenerateCoupon = require("../tapGenerateCouponController");
var emailContent = require("../../language/emailContent");
const RES_MESSAGE = require("../../language/errorMsg");
var commonFunction = require("../common");
var helper = require("../../controller/common/helper");
var textmessage = require("../../language/textMessage");
const common = require("../../language/constantData");
var tap_sendEmailController = require("../tap_sendEmailController");
var tap_twilioSMSController = require("../tap_twilioSMSController");
const tierBillingScheduleInfo = require('../../controller/tierBillingScheduleInfo');

const {
  gt,
  lte,
  or,
  ne,
  in: opIn
} = Sequelize.Op;
/**
 *
 *
 * USED FOR INVOKED LAMBDA FUNCTION.
 * @returns FUNCTION RESULT
 */
module.exports = {
  /**
   *
   * USED for change the status of merchant according to status of the gotu,push,yext,taplocal text
   * @param {*} merchant_id
   * @returns if any of them will be active then the status of the merchant will be active otherwise in-active
   */
  UpdateMerchantStatusRDS: function (merchant_id) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../../language/resMessage"))
    );
    return new Promise(function (resolve, reject) {
      module.exports.getAllStatus(merchant_id).then(
        function (details) {
          if (details.length > 0) {
            var taptext_status = details[0].dataValues.taptext_status;
            var yext = details[0].dataValues.yext;
            var giftcard_status = details[0].dataValues.giftcard_status;
            module.exports.gotustatus(merchant_id).then(
              function (gotudetails) {
                var gotu_status = gotudetails;
                module.exports.pushstatus(merchant_id).then(
                  function (pushdetails) {
                    var push_status = pushdetails;
                    var detailsdata = {
                      push_status: push_status,
                      gotu_status: gotu_status,
                      taptext_status: taptext_status,
                      yext_status: yext,
                      giftcard_status: giftcard_status
                    };
                    console.log(detailsdata);
                    module.exports
                      .updateMerchantStatus(merchant_id, detailsdata)
                      .then(
                        function (response) {
                          resolve(true);
                        },
                        function (error) {
                          reject(true);
                        }
                      );
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
        },
        function (error) {
          responseMsg.RESPONSE400.message = error;
          callback(null, responseMsg.RESPONSE400);
        }
      );
    });
  },
  /*
checking all status gotu,yext,push,text......
*/

  gotustatus: function (merchant_id) {
    return new Promise(function (resolve, reject) {
      model.tap_gotu_campaigns
        .findAll({
          attributes: ["active"],
          where: {
            type: "gotu",
            merchant_id: merchant_id
          }
        })
        .then(function (goturow) {
          if (goturow.length > 0) {
            var gotu_active = goturow[0].active;
            resolve(gotu_active);
          } else {
            var gotu_active = 0;
            resolve(gotu_active);
          }
        })
        .catch(function (err) {
          var gotu_active = 0;
          resolve(gotu_active);
        });
    });
  },

  pushstatus: function (merchant_id) {
    return new Promise(function (resolve, reject) {
      model.tap_gotu_campaigns
        .findAll({
          attributes: ["active"],
          where: {
            type: "push",
            merchant_id: merchant_id
          }
        })
        .then(function (pushrows) {
          if (pushrows.length > 0) {
            var push_active = pushrows[0].active;
            resolve(push_active);
          } else {
            var push_active = 0;
            resolve(push_active);
          }
        })
        .catch(function (err) {
          var push_active = 0;
          resolve(push_active);
        });
    });
  },

  getAllStatus: function (merchant_id) {
    return new Promise(function (resolve, reject) {
      model.tap_merchants
        .findAll({
          attributes: ["push_active", "yext", "taptext_status", "giftcard_status"],
          where: {
            merchant_id: merchant_id
          }
        })
        .then(function (rows) {
          if (rows.length > 0) {
            resolve(rows);
          } else {
            var nondata = [];
            resolve(nondata);
          }
        })
        .catch(function (err) {
          var nondata = [];
          resolve(nondata);
        });
    });
  },

  //updating merchant status....
  updateMerchantStatus: function (merchant_id, details) {
    console.log("in update merchant status");
    if (
      details.push_status == "true" ||
      details.gotu_status == "true" ||
      details.yext_status == "1" ||
      details.taptext_status == "true" ||
      details.giftcard_status == 'true'
    ) {
      var status = "true";
      console.log("active");
    } else {
      var status = "false";
      console.log("in active");
    }
    return new Promise(function (resolve, reject) {
      model.tap_merchants
        .update({
          active: status
        }, {
            where: {
              merchant_id: merchant_id
            }
          })
        .then(function (data) {
          if (data.length > 0) resolve(data);
          else {
            reject("not update");
          }
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },
  /**
   *
   * Invoke in tap_getUserByEmailRDS
   * @param {*} id
   * @param {*} type
   * @param {*} enc_type
   * @returns
   */
  encryptDecrypt: function (id, type, enc_type) {
    var id = id.toString();
    console.log("id==>", id + "type=====>", type + "enc_type====>", enc_type);
    var ret_id = null;
    var addition_integer = 10000000000;
    return new Promise(function (resolve, reject) {
      if (id.indexOf("TP") !== 0 && enc_type == "decrypt") {
        resolve({
          id: id,
          statusCode: 200
        });
      }
      switch (enc_type) {
        case "decrypt":
          switch (type) {
            case "customer":
              id = id.replace("TPCU", "");
              ret_id = parseInt(id) - parseInt(addition_integer);
              break;
            case "coupon":
              id = id.replace("TPC", "");
              ret_id = parseInt(id) - parseInt(addition_integer);
              break;
            case "user":
              id = id.replace("TPU", "");
              ret_id = parseInt(id) - parseInt(addition_integer);
              break;
            case "merchant":
              id = id.replace("TPM", "");
              ret_id = parseInt(id) - parseInt(addition_integer);
              break;
          }
          break;
        case "encrypt":
          switch (type) {
            case "customer":
              ret_id = parseInt(id) + parseInt(addition_integer);
              ret_id = "TPCU" + ret_id;
              break;
            case "coupon":
              ret_id = parseInt(id) + parseInt(addition_integer);
              ret_id = "TPC" + ret_id;
              break;
            case "user":
              ret_id = parseInt(id) + parseInt(addition_integer);
              ret_id = "TPU" + ret_id;
              break;
            case "merchant":
              ret_id = parseInt(id) + parseInt(addition_integer);
              ret_id = "TPM" + ret_id;
              break;
          }
          break;
      }
      resolve({
        id: ret_id,
        statusCode: 200
      });
    });
  },
  /**
   * scheduler that send profile complete reminder
   * @returns
   */
  completeProfileReminder: function () {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../../language/resMessage"))
    );
    module.exports.getMerchantCustomersHavingCompleteProfileOffer().then(
      function (merchantCustomers) {
        console.log("Total Customers returned: ", merchantCustomers.length);
        async.forEachSeries(
          merchantCustomers,
          function (merchantCustomer, customerCallback) {
            var previously_completed = false;
            var phoneNumber = merchantCustomer.phoneNumber.toString();
            var PuertoRico = helper.PuertoRico(phoneNumber);
            var reward_text = merchantCustomer.reward_text ?
              helper.decodeHTMLEntities(
                merchantCustomer.reward_text
              ) :
              "";
            var spanish_reward_text = merchantCustomer.spanish_reward_text ?
              helper.decodeHTMLEntities(
                merchantCustomer.spanish_reward_text
              ) :
              helper.decodeHTMLEntities(
                merchantCustomer.reward_text
              );
            const mediaURL = merchantCustomer.before_profile_complete_reward_text_media_image ?
              merchantCustomer.before_profile_complete_reward_text_media_image :
              common.DEFAULT_IMAGE;
            const msgType =
              merchantCustomer.before_profile_complete_reward_text_message_type;
            const spanishmsgType =
              merchantCustomer.before_profile_complete_spanish_reward_text_message_type;
            const spanishmediaUrl = merchantCustomer.before_profile_complete_spanish_reward_text_media_image ?
              merchantCustomer.before_profile_complete_spanish_reward_text_media_image :
              common.DEFAULT_IMAGE;
            var DBA =
              merchantCustomer.phoneCount > 1 ?
                "TAPLocal Text" :
                merchantCustomer.nick_name;

            if (
              merchantCustomer.firstName &&
              merchantCustomer.lastName &&
              merchantCustomer.birthYear &&
              merchantCustomer.birthMonth &&
              merchantCustomer.birthDay &&
              merchantCustomer.zip
            ) {
              console.log(
                merchantCustomer.phoneNumber,
                " Profile is complete."
              );
              previously_completed = true;
              customerCallback(null, true);
            }

            if (!previously_completed) {
              var msg_template = textmessage.compeleteProfileWithReward.english;
              if (PuertoRico) {
                msg_template = textmessage.compeleteProfileWithReward.spanish;
              }
              msg_template = msg_template.replace("%DBA%", DBA);
              msg_template = msg_template.replace(
                "%REWARD_TEXT%",
                reward_text
              );
              if (spanish_reward_text) {
                msg_template = msg_template.replace(
                  "%SPANISH_REWARD_TEXT%",
                  spanish_reward_text
                );
              } else {
                msg_template = msg_template.replace(
                  "%SPANISH_REWARD_TEXT%",
                  spanish_reward_text
                );
              }

              msg_template = msg_template.replace(
                "%LINK%",
                config.app.complete_profile_link +
                "complete_profile.php?id=" +
                merchantCustomer.cid +
                "&mid=" +
                merchantCustomer.merchant_id +
                " Profile completion."
              );
              console.log("phone number..........", phoneNumber);
              //console.log("merchantCustomer : --------", merchantCustomer);
              console.log(
                "merchantCustomer.prefContactMethod : --------",
                merchantCustomer.prefContactMethod
              );
              console.log(
                "merchantCustomer.optin : --------",
                merchantCustomer.optin
              );
              if (
                parseInt(merchantCustomer.prefContactMethod) === 0 &&
                parseInt(merchantCustomer.optin) == 1
              ) {
                module.exports
                  .sendEmailSMS(
                    merchantCustomer,
                    "sms",
                    msg_template,
                    mediaURL,
                    msgType,
                    spanishmediaUrl,
                    spanishmsgType
                  )
                  .then(
                    function (passResponse) {
                      console.log("sms sent " + JSON.stringify(passResponse));
                      customerCallback(null, true);
                    },
                    function (failResponse) {
                      console.log(
                        "sms not sent " + JSON.stringify(failResponse)
                      );
                      customerCallback(null, true);
                    }
                  );
              } else if (
                parseInt(merchantCustomer.prefContactMethod) == 1 &&
                parseInt(merchantCustomer.optin) == 1
              ) {
                module.exports
                  .sendEmailSMS(
                    merchantCustomer,
                    "email",
                    msg_template,
                    mediaURL,
                    msgType,
                    spanishmediaUrl,
                    spanishmsgType
                  )
                  .then(
                    function (passResponse) {
                      console.log("Email sent " + JSON.stringify(passResponse));
                      customerCallback(null, true);
                    },
                    function (failResponse) {
                      console.log(
                        "Email not sent " + JSON.stringify(failResponse)
                      );
                      customerCallback(null, true);
                    }
                  );
              } else if (
                parseInt(merchantCustomer.prefContactMethod) == 2 &&
                parseInt(merchantCustomer.optin) == 1
              ) {
                if (merchantCustomer.emails) {
                  module.exports
                    .sendEmailSMS(
                      merchantCustomer,
                      "email",
                      msg_template,
                      mediaURL,
                      msgType,
                      spanishmediaUrl,
                      spanishmsgType
                    )
                    .then(
                      function (passResponse) {
                        console.log(
                          "1 email sent " + JSON.stringify(passResponse)
                        );
                        module.exports
                          .sendEmailSMS(
                            merchantCustomer,
                            "sms",
                            msg_template,
                            mediaURL,
                            msgType,
                            spanishmediaUrl,
                            spanishmsgType
                          )
                          .then(
                            function (passResponse) {
                              console.log(
                                "1 sms sent " + JSON.stringify(passResponse)
                              );
                              customerCallback(null, true);
                            },
                            function (failResponse) {
                              console.log(
                                "1 sms not sent " + JSON.stringify(failResponse)
                              );
                              customerCallback(null, true);
                            }
                          );
                      },
                      function (failResponse) {
                        console.log(
                          "2 email not sent " + JSON.stringify(failResponse)
                        );

                        module.exports
                          .sendEmailSMS(
                            merchantCustomer,
                            "sms",
                            msg_template,
                            mediaURL,
                            msgType,
                            spanishmediaUrl,
                            spanishmsgType
                          )
                          .then(
                            function (passResponse) {
                              console.log(
                                "2 sms sent " + JSON.stringify(passResponse)
                              );
                              customerCallback(null, true);
                            },
                            function (failResponse) {
                              console.log(
                                "2 sms not sent " + JSON.stringify(failResponse)
                              );
                              customerCallback(null, true);
                            }
                          );
                      }
                    );
                } else {
                  module.exports
                    .sendEmailSMS(
                      merchantCustomer,
                      "sms",
                      msg_template,
                      mediaURL,
                      msgType,
                      spanishmediaUrl,
                      spanishmsgType
                    )
                    .then(
                      function (passResponse) {
                        console.log("sms sent " + JSON.stringify(passResponse));
                        customerCallback(null, true);
                      },
                      function (failResponse) {
                        console.log(
                          "sms not sent " + JSON.stringify(failResponse)
                        );
                        customerCallback(null, true);
                      }
                    );
                }
              } else {
                console.log("no optin or sms and email limit");
                customerCallback(null, true);
              }
            }
          },
          function (err) {
            console.log("records");
            console.log("result", responseMsg.OK);
            return responseMsg.OK;
          }
        );
      },
      function (reject) {
        console.log("no records");
        return reject;
      }
    );
  },
  /**
   * get customer having complete profile offer
   */
  getMerchantCustomersHavingCompleteProfileOffer: function () {
    var today = Math.floor(Date.now() / 1000);
    return new Promise(function (resolve, reject) {
      // fetch customer who belong to such merchant who has offered complete profile offer.
      var sql =
        "SELECT count(customer.phoneNumber) as phoneCount, customer.phoneNumber, offer.before_profile_complete_reward_text, offer.before_profile_complete_spanish_reward_text, offer.before_profile_complete_reward_text_media_image, offer.before_profile_complete_reward_text_message_type, offer.before_profile_complete_spanish_reward_text_message_type, offer.before_profile_complete_spanish_reward_text_media_image,offer.reward_text,offer.spanish_reward_text, merch.dba, merch.nick_name, custMer.merchant_id, merch.id as mid, merch.email_sent, merch.sms_sent, merch.sms_unlimited, merch.sms_limit, merch.sms_limit_perUser, custMer.optin, custMer.firstName, custMer.lastName, custMer.birthYear, custMer.birthMonth, custMer.birthDay, custMer.zip, customer.id as cid, custMer.prefContactMethod, custMer.emails " +
        "FROM tap_merchant_offers offer " +
        "INNER JOIN tap_customers_merchant custMer ON offer.MerchantId = custMer.merchant_id " +
        "INNER JOIN tap_customers customer ON custMer.customer_id = customer.id " +
        "INNER JOIN tap_merchants merch ON custMer.merchant_id = merch.merchant_id " +
        "WHERE offer.Discount_Type = 5  AND offer.active = 'true' AND start_date>=:start_date GROUP BY customer.phoneNumber ";
      console.log("MEGAL##@:");
      console.log(sql);
      model.sequelize
        .query(sql, {
          replacements: {
            start_date: today
          },
          type: model.sequelize.QueryTypes.SELECT
        })
        .then(function (data) {
          if (data.length > 0) {
            resolve(data);
            console.log("Data : ", data);
          } else {
            reject("No record found");
          }
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },
  /**
   * send Email and SMS
   * @param {*} merchantCustomer
   * @param {*} type
   * @param {*} message
   * @param {*} mediaURL
   * @param {*} mediaURL
   * @param {*} spanishmediaUrl
   * @param {*} spanishmsgType
   */
  sendEmailSMS: function (
    merchantCustomer,
    type,
    message,
    mediaURL,
    msgType,
    spanishmediaUrl,
    spanishmsgType
  ) {
    return new Promise(function (resolve, reject) {
      var today = Math.floor(Date.now() / 1000);
      console.log("send ", type, " to ", merchantCustomer.phoneNumber);
      //check the limit..
      if (type == "email") {
        getMerchantEmailSMSLimit({
          merchant_id: merchantCustomer.merchant_id,
          phone: merchantCustomer.phoneNumber,
          type: type
        }).then(
          function (responseLimit) {
            console.log("responseLimit====", responseLimit);
            if (responseLimit.statusCode == 200) {
              console.log("enter 1");
              tap_sendEmailController.sendEmail({
                emails: merchantCustomer.emails,
                message: message,
                timestamp: today,
                subject: "Complete Profile Reminder"
              },
                function (error, sendsms) {
                  if (sendsms.statusCode == 200) {
                    saveLogsSMSEmail({
                      type: type,
                      merchant_id: merchantCustomer.merchant_id,
                      phone: merchantCustomer.phoneNumber,
                      message: message,
                      offer_name: "Complete Profile Reminder",
                      timestamp: today,
                      to: merchantCustomer.emails
                    }).then(
                      function (logs) {
                        if (logs.statusCode == 200) {
                          merchantCustomer.email_sent ?
                            "" :
                            (merchantCustomer.email_sent = 0);
                          updateMerchant({
                            merchant_id: merchantCustomer.merchant_id,
                            sms_sent: merchantCustomer.email_sent + 1
                          }).then(
                            function (updateResponse) {
                              if (updateResponse.statusCode == 200) {
                                resolve(updateResponse);
                              } else {
                                reject(updateResponse);
                              }
                            },
                            function (error) {
                              reject(error);
                            }
                          );
                        } else {
                          reject(logs);
                        }
                      },
                      function (error) {
                        reject(error);
                      }
                    );
                  } else {
                    reject(sendsms);
                  }
                }
              );
            } else {
              console.log("error 8");
              reject(responseLimit);
            }
          },
          function (error) {
            console.log("error 1 -------------", error);
            reject(error);
          }
        );
      } else {
        helper
          .getMerchantSMSCount(merchantCustomer.merchant_id, "monthly", "sms")
          .then(function (smsSent) {
            console.log("merchant Data----------", merchantCustomer);
            if (merchantCustomer.sms_limit <= smsSent && merchantCustomer.sms_unlimited != "1") {
              let upgradeTierData = { segmentNeedToAdd: (smsSent + 1) , trigger : message};
              tierBillingScheduleInfo
                .updgardeTierWithOveragePrice(merchantCustomer.merchant_id, upgradeTierData)
                .then(
                  function (res) {
                    console.log("Sms sent Limit already reached and Tier Upgraded.");
                    helper.getMerchantCustomerSMSCount(
                      merchantCustomer.merchant_id,
                      merchantCustomer.phoneNumber
                    ).then(
                      function (consumed_count) {
                        console.log("consume count---- ", consumed_count.consume);
                        if (
                          consumed_count.consume >=
                          merchantCustomer.sms_limit_perUser
                        ) {
                          reject(consumed_count);
                        } else {
                          sendProfileSMS(merchantCustomer.merchant_id, merchantCustomer.phoneNumber, message).then(function (res) {
                            resolve(res);
                          }, function (err) {
                            reject(err);
                          });
                        }
                      }, function (err) {
                        reject(err);
                      });
                  },
                  function (err) {
                    console.log(err);
                    console.log("Sms sent Limit already reached and Tier not Upgraded.");
                    reject(err);
                  }
                );
            } else {
              helper.getMerchantCustomerSMSCount(
                merchantCustomer.merchant_id,
                merchantCustomer.phoneNumber
              ).then(
                function (consumed_count) {
                  console.log("consume count---- ", consumed_count.consume);
                  if (
                    consumed_count.consume >=
                    merchantCustomer.sms_limit_perUser
                  ) {
                    reject(consumed_count);
                  } else {
                    sendProfileSMS(merchantCustomer.merchant_id, merchantCustomer.phoneNumber, message).then(function (res) {
                      resolve(res);
                    }, function (err) {
                      reject(err);
                    });
                  }
                }, function (err) {
                  reject(err);
                });
            }
          }, function (err) {
            console.log('sms count error----------- ', err);
            reject(err);
          });
      }
    });
  }
};
/**
 * Send batch SMS
 * @param {*} id
 * @param {*} merchant_id
 * @param {*} phone_number
 * @param {*} message
 */
function sendProfileSMS(merchant_id, phone_number, message) {
  return new Promise(function (resolve, reject) {
    var today = Math.floor(Date.now() / 1000);
    tap_twilioSMSController.twilioSMS(
      {
        phone: phone_number,
        message: message
      },
      function (err, sendsms) {
        if (err) {
          reject("error in update");
        } else {
          if (sendsms.statusCode == 200) {
            message = sendsms.sent_sms;
            let log_data = {
              timestamp: parseInt(today),
              merchant_id: merchant_id,
              customer_phone: phone_number,
              subject: "Complete Profile Reminder",
              message: sendsms.data.body,
              sms_segment: "1",
              price: sendsms.data.price,
              type: "SMS",
              numMedia: sendsms.data.numMedia,
              res_data: JSON.stringify(sendsms.data),
              offer_id: ""
            };
            Promise.all([
              helper.insertLogsSMS(log_data),
              helper.updateMerchantsSentSMS({
                sms_sent: log_data.sms_segment,
                merchant_id: merchant_id
              })
            ]).then(
              function (success) {
                console.log("sms failed and log inserted");
                resolve(success);
              },
              function (fail) {
                console.log("sms send failed and log insert failed");
                reject(fail);
              }
            );

          } else {
            reject("error in update");
          }
        }
      }
    );
  });
}
/**
 *
 * @param {*} req
 */
function getMerchantEmailSMSLimit(req) {
  const responseMsg = JSON.parse(
    JSON.stringify(require("../../language/resMessage"))
  );
  var merchant_id = req.merchant_id;
  var phone_number = req.phone;
  var type = req.type || "sms";
  var filter_by = req.filter_by || "monthly";
  return new Promise(function (resolve, reject) {
    console.log("hiiiiiiiii");
    helper.checkLimitEmailSMS(merchant_id, phone_number, type, filter_by).then(
      function (response) {
        console.log("success limit ---------", response);
        resolve(response);
      },
      function (error) {
        console.log("error limit ---------", error);
        reject(error);
      }
    );
  });
}
/**
 * @param {*} req
 */
function saveLogsSMSEmail(req) {
  const responseMsg = JSON.parse(
    JSON.stringify(require("../../language/resMessage"))
  );
  var type = req.type || "sms";
  var LogParams = {};
  LogParams.merchant_id = req.merchant_id;
  LogParams.customer_phone = req.phone;
  LogParams.subject = req.offer_name;
  LogParams.message = req.message;

  LogParams.email_from = req.from || "admin@tapclover.com";
  LogParams.email_to = req.to;
  LogParams.timestampEmailLog = req.timestamp;
  return new Promise(function (resolve, reject) {
    helper.insertLogsSMS_Email(type, LogParams).then(
      function (success) {
        responseMsg.OK.data = {};
        responseMsg.OK.data.success = success;
        resolve(responseMsg.OK);
      },
      function (error) {
        responseMsg.RESPONSE400.message = error;
        reject(responseMsg.RESPONSE400);
      }
    );
  });
}
/**
 * @param {*} req
 */
function updateMerchant(req) {
  const responseMsg = JSON.parse(
    JSON.stringify(require("../../language/resMessage"))
  );
  return new Promise(function (resolve, reject) {
    helper.updateMerchants(req).then(
      function (result) {
        responseMsg.OK.data = {};
        responseMsg.OK.data.success = result;
        resolve(responseMsg.OK);
      },
      function (error) {
        responseMsg.RESPONSE400.message = error;
        reject(responseMsg.RESPONSE400);
      }
    );
  });
}