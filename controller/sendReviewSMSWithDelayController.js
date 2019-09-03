/**
 * Created by Amit on 09/06/2018
 */
"use strict";
var model = require("../model");
var config = require("../config/config");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));
var trainingMode = require('../controller/common/checkTrainingMode')
var helper = require("../controller/common/helper");
var tap_twilioSMSController = require("../controller/tap_twilioSMSController");
const tierBillingScheduleInfo = require('../controller/tierBillingScheduleInfo');
var async = require("async");

module.exports = {
  sendBatchSMS: function (req, res) {
    getmessageDetails().then(
      function (result) {
        async.forEachOfSeries(
          result,
          (offer, index, callback) => {
            console.log("result data: " + JSON.stringify(offer));
            var phonenumber = offer.customer_phone;
            var merchant_id = offer.merchant_id;
            var customer_id = offer.customer_id;
            if (merchant_id) {
              getdelaySms(merchant_id).then(function (merchant_delay_result) {
                console.log("sms id : " + offer.id);
                var sms_delay_time = merchant_delay_result[0].sms_delay_time;
                if (!sms_delay_time) {
                  sms_delay_time = 60;
                }
                var current_timestamp = Math.floor(Date.now() / 1000);
                var optin_time_with_delay = offer.optin_at + sms_delay_time * 60;
                console.log("current_timestamp: " + current_timestamp);
                console.log("optin_time_with_delay: " + optin_time_with_delay);
                if (current_timestamp >= optin_time_with_delay) {
                  var PuertoRico = helper.PuertoRico(phonenumber);
                  if (PuertoRico) {
                    sendSMS(
                      offer.id,
                      merchant_id,
                      customer_id,
                      phonenumber,
                      offer.message,
                      merchant_delay_result[0].tap_merchant,
                      offer.subject
                    ).then(
                      function (sentResponse) {
                        console.log("portico", sentResponse);
                        callback();
                      },
                      function (error) {
                        console.log("portico errro", error);
                        callback();
                      }
                    );
                  } else {
                    sendSMS(
                      offer.id,
                      merchant_id,
                      customer_id,
                      phonenumber,
                      offer.message,
                      merchant_delay_result[0].tap_merchant,
                      offer.subject
                    ).then(
                      function (smsSend) {
                        console.log("smsSend", smsSend);
                        callback();
                      },
                      function (error) {
                        console.log("error", error);
                        callback();
                      }
                    );
                  }
                } else {
                  callback();
                }
              });
            }
          },
          err => {
            if (err) {
              console.error("end loop : " + err);
              responseMsg.ERROR.message = err;
              return responseMsg.ERROR;
            }
            return responseMsg.OK;
          }
        );
      },
      function (error) {
        console.log("989jy7uabc12");
        responseMsg.RESPONSE200.message = error;
        return responseMsg.RESPONSE400;
      }
    );
  }
};
/**
 * Get delay SMS
 * @param {*} merchant_id
 */
function getdelaySms(merchant_id) {
  return new Promise(function (resolve, reject) {
    model.tap_merchant_deep_link.belongsTo(model.tap_merchants, {
      foreignKey: "merchant_id",
      targetKey: "merchant_id"
    });
    model.tap_merchant_deep_link
      .findAll({
        attributes: ["id", "sms_delay_time"],
        where: {
          merchant_id: merchant_id
        },
        include: [
          {
            attributes: [
              "email",
              "nick_name",
              "sms_unlimited",
              "sms_limit",
              "sms_limit_perUser"
            ],
            model: model.tap_merchants
          }
        ]
      })
      .then(function (data) {
        var merchant_delay_result = data.map(function (data) {
          return data.toJSON();
        });
        if (merchant_delay_result.length > 0) {
          resolve(merchant_delay_result);
        } else {
          reject("No merchant found.");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * Get message details form tap_merchant_optin_batch_sms table
 */
function getmessageDetails() {
  return new Promise(function (resolve, reject) {
    model.tap_merchant_optin_batch_sms
      .findAll({
        attributes: [
          "id",
          "merchant_id",
          "customer_id",
          "customer_phone",
          "message",
          "optin_at",
          "subject"
        ],
        where: {
          sms_status: "0",
          sms_type: {
            $ne: "2"
          }
        }
      })
      .then(function (result) {
        if (result.length > 0) {
          resolve(result);
        } else {
          console.log("No batch SMS.");
          reject("No batch SMS found.");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * send SMS PuertoRico number and US numbers
 * @param {*} id 
 * @param {*} merchant_id 
 * @param {*} customer_id 
 * @param {*} phone_number 
 * @param {*} message 
 * @param {*} merData 
 */
function sendSMS(id, merchant_id, customer_id, phone_number, message, merData, subject = null) {
  return new Promise(async function (resolve, reject) {
    var checkTrainingStatus = await trainingMode.checkTrainingMode(merchant_id)
    helper
      .getMerchantSMSCount(merchant_id, "monthly", "sms")
      .then(function (smsSent) {
        console.log("merchant Data----------", merData);
        if (merData.sms_limit <= smsSent && merData.sms_unlimited != "1" && !checkTrainingStatus) {
          let upgradeTierData = { segmentNeedToAdd: (smsSent + 1), trigger: "send review sms with delay" };
          tierBillingScheduleInfo
            .updgardeTierWithOveragePrice(merchant_id, upgradeTierData)
            .then(
              function (res) {
                console.log("Sms sent Limit already reached and Tier Upgraded.");
                helper.getMerchantCustomerSMSCount(
                  merchant_id,
                  phone_number
                ).then(
                  function (consumed_count) {
                    console.log("consume count---- ", consumed_count.consume);
                    if (
                      consumed_count.consume >=
                      merData.sms_limit_perUser
                    ) {
                      // Update batch sms record in database
                      var updateQuery =
                        "UPDATE tap_merchant_optin_batch_sms SET sms_status = '1' WHERE id = :id";
                      model.sequelize
                        .query(updateQuery, {
                          replacements: {
                            id: id
                          },
                          type: model.sequelize.QueryTypes.UPDATE
                        })
                        .then(function (info) {
                          console.log(
                            "Sms sent limit against this customer already reached."
                          );
                          resolve(info);
                        })
                        .catch(function (err) {
                          console.log(err);
                          console.log("error in update");
                          resolve("error in update");
                        });
                    } else {
                      sendBatchSMS(id, merchant_id, customer_id, phone_number, message, subject).then(function (res) {
                        resolve(res);
                      }, function (err) {
                        resolve(err);
                      });
                    }
                  }, function (err) {
                    resolve(err);
                  });
              },
              function (err) {
                console.log(err);
                console.log("Sms sent Limit already reached and Tier not Upgraded.");
                // Update batch sms record in database
                var updateQuery =
                  "UPDATE tap_merchant_optin_batch_sms SET sms_status = '1' WHERE id = :id";
                model.sequelize
                  .query(updateQuery, {
                    replacements: {
                      id: id
                    },
                    type: model.sequelize.QueryTypes.UPDATE
                  })
                  .then(function (info) {
                    console.log(
                      "Sms sent limit against this customer already reached."
                    );
                    resolve(info);
                  })
                  .catch(function (err) {
                    console.log(err);
                    console.log("error in update");
                    resolve("error in update");
                  });
              }
            );
        } else {
          helper.getMerchantCustomerSMSCount(
            merchant_id,
            phone_number
          ).then(
            function (consumed_count) {
              console.log("consume count---- ", consumed_count.consume);
              console.log(" merData.sms_limit_PerUser---- ", merData.sms_limit_perUser);
              if (
                consumed_count.consume >=
                merData.sms_limit_perUser
              ) {
                // Update batch sms record in database
                var updateQuery =
                  "UPDATE tap_merchant_optin_batch_sms SET sms_status = '1' WHERE id = :id";
                model.sequelize
                  .query(updateQuery, {
                    replacements: {
                      id: id
                    },
                    type: model.sequelize.QueryTypes.UPDATE
                  })
                  .then(function (info) {
                    console.log(
                      "Sms sent limit against this customer already reached."
                    );
                    resolve(info);
                  })
                  .catch(function (err) {
                    console.log(err);
                    console.log("error in update");
                    resolve("error in update");
                  });
              } else {
                sendBatchSMS(id, merchant_id, customer_id, phone_number, message, subject).then(function (res) {
                  resolve(res);
                }, function (err) {
                  resolve(err);
                });
              }
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
 * Send batch SMS
 * @param {*} id
 * @param {*} merchant_id
 * @param {*} customer_id
 * @param {*} phone_number
 * @param {*} message
 */
function sendBatchSMS(id, merchant_id, customer_id, phone_number, message, subject) {
  var today = Math.floor(Date.now() / 1000);
  return new Promise(function (resolve, reject) {
    var updateQuery =
      "UPDATE tap_merchant_optin_batch_sms SET sms_status = '1' WHERE id = :id";
    tap_twilioSMSController.twilioSMS(
      {
        phone: phone_number,
        message: message
      },
      function (err, sendsms) {
        console.log(sendsms);
        if (err) {
          model.sequelize
            .query(updateQuery, {
              replacements: {
                id: id
              },
              type: model.sequelize.QueryTypes.UPDATE
            })
            .then(function (info) {
              console.log("sms not sent and record updated");
              resolve(info);
            })
            .catch(function (err) {
              console.log(err);
              console.log("error in update");
              resolve("error in update");
            });
        } else {
          let log_data = {
            timestamp: parseInt(today),
            merchant_id: merchant_id,
            customer_phone: phone_number,
            subject: subject,
            message: sendsms.data.body,
            sms_segment: "1",
            price: sendsms.data.price,
            type: "SMS",
            numMedia: "0",
            res_data: JSON.stringify(sendsms.data),
            offer_id: ""
          };
          if (sendsms.statusCode == 200) {
            model.sequelize
              .query(updateQuery, {
                replacements: {
                  id: id
                },
                type: model.sequelize.QueryTypes.UPDATE
              })
              .then(function (info) {
                console.log("sms sent and record updated");
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
                    resolve(fail);
                  }
                );
              })
              .catch(function (err) {
                console.log(err);
                console.log("error in update");
                console.log("sms sent and record not updated");
                resolve("error in update");
              });
          } else {
            console.log("sms not sent---------------------------");
            model.sequelize
              .query(updateQuery, {
                replacements: {
                  id: id
                },
                type: model.sequelize.QueryTypes.UPDATE
              })
              .then(function (info) {
                console.log("sms sent and record updated");
                Promise.all([
                  helper.insertFailedLogsSMS(log_data),
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
                    resolve(fail);
                  }
                );
              })
              .catch(function (err) {
                console.log(err);
                console.log("error in update");
                console.log("sms sent and record not updated");
                resolve("error in update");
              });
          }
        }
      }
    );
  });
}
