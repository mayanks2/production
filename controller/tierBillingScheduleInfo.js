"use strict";

var model = require("../model");
var config = require("../config/config");
var commonFunction = require("../controller/common");
const RES_MESSAGE = require("../language/errorMsg");
const moment = require("moment");
const emailContent = require("../language/emailContent");
const constantData = require("../language/constantData");
var tap_twilioSMSController = require("../controller/tap_twilioSMSController");
var helper = require("../controller/common/helper");
var async = require("async");
var textmessage = require("../language/textMessage");
var BigNumber = require('bignumber.js')
var trainingMode = require('../controller/common/checkTrainingMode')

module.exports = {
  /**
   * Save and Update current schedule detail
   * @param {*} req
   * @param {*} res
   */
  saveAndUpdateScheduleInfo: async function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    console.log(req.body);
    var merchant_id = req.body.merchant_id;
    var roleTypeList = req.body.roleTypeList;
    var scheduleID = req.body.scheduleID;
    var tierID = req.body.tierID;
    var minimumTier = req.body.minimumTier;
    var currentScheduleId = req.body.currentScheduleId;
    var currentTierId = req.body.currentTierId;
    var startDate = req.body.startDate;
    var resetDate = req.body.resetDate;
    var scheduleSubscribedPrice = req.body.scheduleSubscribedPrice;
    var segmentCount = req.body.segmentCount;
    var assignFrom = req.body.assignFrom;
    var isSentWelcomeEmail = req.body.isSentWelcomeEmail;
    var trainingModeStatusCheck = await trainingMode.checkTrainingMode(merchant_id)
    console.log("trainingModeStatusCheck", trainingModeStatusCheck)
    if (!merchant_id && scheduleID && tierID && scheduleSubscribedPrice) {
      responseMsg.RESPONSE400.message = RES_MESSAGE.ERROR_PARAM_MISSING;
      return res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else if (trainingModeStatusCheck) {
      if (assignFrom == "merchantDasboard") {
        responseMsg.RESPONSE400.message = "You cannot request anything as training mode is assigned.";
      } else {
        responseMsg.RESPONSE400.message = "You cannot request anything as training mode is assigned. Turn off the training mode first.";
      }
      return res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else if (parseInt(currentTierId) === parseInt(tierID) && parseInt(scheduleID) === parseInt(currentScheduleId)) {
      // Update subscription data when niegther tier nor schedule change
      console.log("no tier change.");
      var subscriptionAssignDate = 0;
      if (startDate && startDate !== undefined && startDate !== null && startDate !== "") {
        subscriptionAssignDate = startDate;
      }
      var subscriptionStartDate = 0;
      var subscriptionEndDate = 0;
      if (resetDate && resetDate !== undefined && resetDate !== null && resetDate !== "") {
        dateData = module.exports.getBillingEndDate(resetDate);
        subscriptionStartDate = dateData.start;
        subscriptionEndDate = dateData.end;
      }
      model.tap_schedule_subscription
        .update({
          minimum_tier_id: minimumTier,
          subscription_start_date: subscriptionStartDate,
          subscription_end_date: subscriptionEndDate,
          subscription_assign_date: subscriptionAssignDate,
          update_date: Math.floor(Date.now() / 1000)
        }, {
            where: {
              merchant_id: merchant_id
            }
          })
        .then(function (result) {
          responseMsg.OK.message =
            "Schedule and tier billing information updated.";
          responseMsg.OK.data = {};
          responseMsg.OK.tierDowngraded = 0;
          res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
        }).catch(function () {
          console.log(err);
          responseMsg.RESPONSE400.message = "There is something wrong.";
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        });
    } else {
      model.tap_schedule_subscription.belongsTo(model.tap_billingschedule, {
        foreignKey: "schedule_id",
        targetKey: "id"
      });
      model.tap_schedule_subscription.hasMany(
        model.tap_schedule_tier_information, {
          foreignKey: "schedule_id",
          sourceKey: "schedule_id"
        }
      );
      if (currentTierId && currentScheduleId && currentTierId != "0") {
        model.tap_schedule_subscription
          .findAll({
            where: {
              merchant_id: merchant_id
            },
            include: {
              attributes: [
                "subscribed_price",
                "subscription_upper_bound_seg_count"
              ],
              where: {
                id: currentTierId
              },
              model: model.tap_schedule_tier_information
            }
          })
          .then(function (data) {
            var scheduleTierData = data.map(function (data) {
              return data.toJSON();
            });
            console.log("Schedule Tier Data: ", scheduleTierData);
            if (scheduleTierData.length > 0) {
              responseMsg.OK.message = "schedule tier data found.";
              var subscriptionAssignDate =
                scheduleTierData[0].subscription_assign_date;
              var subscriptionStartDate = scheduleTierData[0].subscription_start_date;
              var subscriptionEndDate = scheduleTierData[0].subscription_end_date;
              if (startDate && startDate !== undefined && startDate !== null && startDate !== "") {
                subscriptionAssignDate = startDate;
              }
              var dateData = {};
              if (resetDate && resetDate !== undefined && resetDate !== null && resetDate !== "") {
                dateData = module.exports.getBillingEndDate(resetDate);
                subscriptionStartDate = dateData.start;
                subscriptionEndDate = dateData.end;
              }
              var tieredBillingEvent = "";
              var requested_by = "";
              var tierDowngraded = 0;
              if (assignFrom == "merchantDasboard") {
                if (parseInt(currentTierId) > parseInt(tierID)) {
                  tieredBillingEvent =
                    constantData.TIERED_BILLING_EVENTS.MERCHANT_DOWNGRADE;
                  tierDowngraded = 1;
                } else {
                  tieredBillingEvent =
                    constantData.TIERED_BILLING_EVENTS.MERCHANT_UPGRADE;
                }
                requested_by = 2;
              } else {
                if (parseInt(currentTierId) > parseInt(tierID) && parseInt(scheduleID) == parseInt(currentScheduleId)) {
                  tieredBillingEvent =
                    constantData.TIERED_BILLING_EVENTS.SUPER_USER_DOWNGRADE;
                  tierDowngraded = 1;
                } else if (parseInt(scheduleID) != parseInt(currentScheduleId) && parseFloat(scheduleTierData[0].tap_schedule_tier_informations[0]
                  .subscribed_price) < parseFloat(scheduleSubscribedPrice) && ((parseInt(scheduleTierData[0].tap_schedule_tier_informations[0]
                    .subscription_upper_bound_seg_count) < parseInt(segmentCount) && parseInt(scheduleTierData[0].tap_schedule_tier_informations[0]
                      .subscription_upper_bound_seg_count) != 0) || parseInt(segmentCount) == 0)) {
                  tieredBillingEvent =
                    constantData.TIERED_BILLING_EVENTS
                      .PRICE_SCHEDULE_CHANGE;
                } else if (parseInt(scheduleID) != parseInt(currentScheduleId)) {
                  tieredBillingEvent =
                    constantData.TIERED_BILLING_EVENTS
                      .SUPER_USER_SCHEDULE_CHANGE_REQUEST;
                  tierDowngraded = 2;
                } else {
                  tieredBillingEvent =
                    constantData.TIERED_BILLING_EVENTS.SUPER_USER_UPGRADE;
                }
                requested_by = 1;
              }
              // Claculate billing amount for particular event
              var billingAmount = "";
              if (tieredBillingEvent ==
                constantData.TIERED_BILLING_EVENTS.MERCHANT_DOWNGRADE ||
                tieredBillingEvent ==
                constantData.TIERED_BILLING_EVENTS.SUPER_USER_DOWNGRADE ||
                tieredBillingEvent ==
                constantData.TIERED_BILLING_EVENTS
                  .SUPER_USER_SCHEDULE_CHANGE_REQUEST) {
                billingAmount = 0;
              } else {
                billingAmount = (scheduleSubscribedPrice - scheduleTierData[0].tap_schedule_tier_informations[0]
                  .subscribed_price);
              }
              var updateData = {
                action: "update",
                merchant_id: merchant_id,
                scheduleID: scheduleID,
                tierID: tierID,
                minimumTier: minimumTier,
                scheduleSubscribedPrice: scheduleSubscribedPrice,
                startDate: subscriptionStartDate,
                currentScheduleId: currentScheduleId,
                currentTierId: currentTierId,
                currentScheduleSubscribedPrice: scheduleTierData[0].tap_schedule_tier_informations[0]
                  .subscribed_price,
                currentTierSegementCount: scheduleTierData[0].tap_schedule_tier_informations[0]
                  .subscription_upper_bound_seg_count,
                subscriptionAssignDate: subscriptionAssignDate,
                overagePrice: 0,
                billing_event: tieredBillingEvent,
                requested_by: requested_by,
                segmentCount: segmentCount,
                endDate: subscriptionEndDate,
                billingAmount: billingAmount
              };
              if (
                tieredBillingEvent ==
                constantData.TIERED_BILLING_EVENTS.MERCHANT_DOWNGRADE ||
                tieredBillingEvent ==
                constantData.TIERED_BILLING_EVENTS.SUPER_USER_DOWNGRADE ||
                tieredBillingEvent ==
                constantData.TIERED_BILLING_EVENTS
                  .SUPER_USER_SCHEDULE_CHANGE_REQUEST
              ) {
                model.tap_downgrade_requests
                  .findAll({
                    attributes: ["id"],
                    where: {
                      merchant_id: merchant_id,
                      isdowngrade_used: '0',
                      schedule_id: scheduleID,
                      tier_id: tierID
                    }
                  })
                  .then(function (result) {
                    var requestData = result.map(function (result) {
                      return result.toJSON();
                    });
                    console.log('requestData...', requestData);
                    if (requestData.length > 0) {
                      responseMsg.OK.message =
                        "Schedule and tier billing information updated.";
                      responseMsg.OK.data = data;
                      responseMsg.OK.tierDowngraded = '3';
                      res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
                    } else {
                      module.exports.saveORUpdateBillingSchedule(updateData).then(
                        function (data) {
                          module.exports.updateMerchantIsTraining(merchant_id, '0'); // update is_training status flag 0
                          responseMsg.OK.message =
                            "Schedule and tier billing information updated.";
                          responseMsg.OK.data = data;
                          responseMsg.OK.tierDowngraded = tierDowngraded;
                          res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
                        },
                        function (err) {
                          console.log(err);
                          responseMsg.RESPONSE400.message = "There is something wrong.";
                          res
                            .status(responseMsg.RESPONSE400.statusCode)
                            .send(responseMsg.RESPONSE400);
                        }
                      );
                    }
                  }).catch(function () {
                    console.log(err);
                    responseMsg.RESPONSE400.message = "There is something wrong.";
                    res
                      .status(responseMsg.RESPONSE400.statusCode)
                      .send(responseMsg.RESPONSE400);
                  });
              } else {
                module.exports.saveORUpdateBillingSchedule(updateData).then(
                  function (data) {
                    module.exports.updateMerchantIsTraining(merchant_id, '0'); // update is_training status flag 0
                    responseMsg.OK.message =
                      "Schedule and tier billing information updated.";
                    responseMsg.OK.data = data;
                    responseMsg.OK.tierDowngraded = tierDowngraded;
                    res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
                  },
                  function (err) {
                    console.log(err);
                    responseMsg.RESPONSE400.message = "There is something wrong.";
                    res
                      .status(responseMsg.RESPONSE400.statusCode)
                      .send(responseMsg.RESPONSE400);
                  }
                );
              }


            } else {
              if (assignFrom == "merchantDasboard") {
                responseMsg.SCHEDULE_CHNAGED.message =
                  "Schedule has been changed.";
                res
                  .status(responseMsg.SCHEDULE_CHNAGED.statusCode)
                  .send(responseMsg.SCHEDULE_CHNAGED);
              } else {
                responseMsg.RESPONSE400.message =
                  "No tier billing information found.";
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              }
            }
          })
          .catch(function (err) {
            console.log(err);
            responseMsg.RESPONSE400.message = err;
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          });
      } else {
        var dateData = {};
        if (resetDate && resetDate !== undefined && resetDate !== null && resetDate !== "") {
          dateData = module.exports.getBillingEndDate(resetDate);
        }
        var saveData = {
          action: "insert",
          merchant_id: merchant_id,
          scheduleID: scheduleID,
          tierID: tierID,
          minimumTier: minimumTier,
          scheduleSubscribedPrice: scheduleSubscribedPrice,
          startDate: dateData.start,
          currentScheduleId: scheduleID,
          currentTierId: tierID,
          currentScheduleSubscribedPrice: scheduleSubscribedPrice,
          currentTierSegementCount: 0,
          subscriptionAssignDate: startDate,
          overagePrice: 0,
          billing_event: constantData.TIERED_BILLING_EVENTS.SUPER_USER_FIRST_TIME_ASSIGN,
          segmentCount: segmentCount,
          endDate: dateData.end,
          billingAmount: scheduleSubscribedPrice
        };
        module.exports.saveORUpdateBillingSchedule(saveData).then(
          function (data) {
            module.exports.sendEmailWhenTrainingToActive(merchant_id, isSentWelcomeEmail);
            responseMsg.OK.message =
              "Schedule and tier billing information inserted.";
            responseMsg.OK.data = data;
            responseMsg.OK.tierDowngraded = 0;
            res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
          },
          function (err) {
            console.log(err);
            responseMsg.RESPONSE400.message = "There is something wrong.";
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          }
        );
      }
    }
  },
  /**
   * Save or Update billing Schedule Data
   * @param {*} data
   */
  saveORUpdateBillingSchedule: function (data) {
    return new Promise(function (resolve, reject) {
      if (data.action == "insert") {
        model.tap_schedule_subscription
          .create({
            merchant_id: data.merchant_id,
            schedule_id: data.scheduleID,
            tier_id: data.tierID,
            minimum_tier_id: data.minimumTier,
            subscription_start_date: data.startDate,
            subscription_end_date: data.endDate,
            subscription_assign_date: data.subscriptionAssignDate,
            update_date: Math.floor(Date.now() / 1000)
          })
          .then(function (result) {
            module.exports
              .updateMerchantSMSLimit({
                merchant_id: data.merchant_id,
                sms_limit: data.segmentCount
              })
              .then(
                function (limitResponse) {
                  module.exports.insertBillingRecord(data).then(
                    function (response) {
                      console.log(response);
                      resolve("subscription inserted.");
                    },
                    function (err) {
                      console.log(err);
                      reject("subscription not inserted.");
                    }
                  );
                },
                function (err) {
                  console.log(err);
                  reject("subscription not inserted.");
                }
              );
          })
          .catch(function (err) {
            console.log(err);
            reject("subscription not updated.");
          });
      } else {
        if (
          data.billing_event ==
          constantData.TIERED_BILLING_EVENTS.MERCHANT_DOWNGRADE ||
          data.billing_event ==
          constantData.TIERED_BILLING_EVENTS.SUPER_USER_DOWNGRADE ||
          data.billing_event ==
          constantData.TIERED_BILLING_EVENTS
            .SUPER_USER_SCHEDULE_CHANGE_REQUEST
        ) {
          model.tap_schedule_subscription
            .update({
              minimum_tier_id: data.minimumTier,
              subscription_start_date: data.startDate,
              subscription_end_date: data.endDate,
              subscription_assign_date: data.subscriptionAssignDate,
              update_date: Math.floor(Date.now() / 1000)
            }, {
                where: {
                  merchant_id: data.merchant_id
                }
              })
            .then(function (result) {
              model.tap_downgrade_requests
                .findAll({
                  attributes: ["id"],
                  where: {
                    merchant_id: data.merchant_id
                  }
                })
                .then(function (result) {
                  var requestData = result.map(function (result) {
                    return result.toJSON();
                  });
                  if (requestData.length < 1) {
                    model.tap_downgrade_requests
                      .create({
                        merchant_id: data.merchant_id,
                        schedule_id: data.scheduleID,
                        tier_id: data.tierID,
                        requested_by_admin: data.requested_by,
                        isdowngrade_used: "0",
                        start_date: data.startDate,
                        update_date: Math.floor(Date.now() / 1000)
                      })
                      .then(function (result) {
                        model.tap_downgrade_requests_history
                          .create({
                            merchant_id: data.merchant_id,
                            schedule_id: data.scheduleID,
                            tier_id: data.tierID,
                            requested_by_admin: data.requested_by,
                            request_date: Math.floor(Date.now() / 1000)
                          })
                          .then(function (result) {
                            module.exports.insertBillingRecord(data).then(
                              function (response) {
                                console.log(response);
                                resolve("subscription updated.");
                              },
                              function (err) {
                                console.log(err);
                                reject("subscription not updated.");
                              }
                            );
                          })
                          .catch(function (err) {
                            console.log(err);
                            reject("subscription not updated.");
                          });
                      })
                      .catch(function (err) {
                        console.log(err);
                        reject("subscription not updated.");
                      });
                  } else {
                    model.tap_downgrade_requests
                      .update({
                        schedule_id: data.scheduleID,
                        tier_id: data.tierID,
                        requested_by_admin: data.requested_by,
                        isdowngrade_used: "0",
                        start_date: data.startDate,
                        update_date: Math.floor(Date.now() / 1000)
                      }, {
                          where: {
                            merchant_id: data.merchant_id
                          }
                        })
                      .then(function (result) {
                        model.tap_downgrade_requests_history
                          .create({
                            merchant_id: data.merchant_id,
                            schedule_id: data.scheduleID,
                            tier_id: data.tierID,
                            requested_by_admin: data.requested_by,
                            request_date: Math.floor(Date.now() / 1000)
                          })
                          .then(function (result) {
                            module.exports.insertBillingRecord(data).then(
                              function (response) {
                                console.log(response);
                                resolve("subscription updated.");
                              },
                              function (err) {
                                console.log(err);
                                reject("subscription not updated.");
                              }
                            );
                          })
                          .catch(function (err) {
                            console.log(err);
                            reject("subscription not updated.");
                          });
                      })
                      .catch(function (err) {
                        console.log(err);
                        reject("subscription not inserted.");
                      });
                  }
                })
                .catch(function (err) {
                  reject("subscription not inserted.");
                });
            })
            .catch(function (err) {
              reject("subscription not inserted.");
            });
        } else {
          model.tap_schedule_subscription
            .update({
              schedule_id: data.scheduleID,
              tier_id: data.tierID,
              minimum_tier_id: data.minimumTier,
              subscription_start_date: data.startDate,
              subscription_end_date: data.endDate,
              subscription_assign_date: data.subscriptionAssignDate,
              update_date: Math.floor(Date.now() / 1000)
            }, {
                where: {
                  merchant_id: data.merchant_id
                }
              })
            .then(function (result) {
              module.exports
                .updateMerchantSMSLimit({
                  merchant_id: data.merchant_id,
                  sms_limit: data.segmentCount
                })
                .then(
                  function (limitResponse) {
                    module.exports.insertBillingRecord(data).then(
                      function (response) {
                        console.log(response);
                        resolve("subscription inserted.");
                      },
                      function (err) {
                        console.log(err);
                        reject("subscription not inserted.");
                      }
                    );
                  },
                  function (err) {
                    console.log(err);
                    reject("subscription not inserted.");
                  }
                );
            })
            .catch(function (err) {
              console.log(err);
              reject("subscription not inserted.");
            });
        }
      }
    });
  },
  /**
   * update the merchant limit of sms
   * @param {*} params
   */
  updateMerchantSMSLimit: function (params) {
    return new Promise(function (resolve, reject) {
      var today = Math.floor(Date.now() / 1000);
      var update_expression = "updated_at=:updated_at";
      if (params.sms_limit !== undefined) {
        update_expression += ", sms_limit = :sms_limit";
      }
      var sms_unlimited = params.sms_limit == 0 ? 1 : 0;
      update_expression += ", sms_unlimited = :sms_unlimited";
      update_expression += ", first_threshold_notified = :first_threshold_notified, second_threshold_notified = :second_threshold_notified";

      var sql =
        "UPDATE tap_merchants SET " +
        update_expression +
        " WHERE merchant_id=:merchant_id";
      model.sequelize
        .query(sql, {
          replacements: {
            updated_at: today,
            merchant_id: params.merchant_id,
            sms_limit: params.sms_limit,
            sms_unlimited: sms_unlimited,
            first_threshold_notified: 'false',
            second_threshold_notified: 'false'
          },
          type: model.sequelize.QueryTypes.UPDATE
        })
        .then(info => {
          resolve(info);
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },
  /**
   * Save billing Record
   * @param {*} data
   */
  insertBillingRecord: function (data) {
    return new Promise(function (resolve, reject) {
      var requestCompleteionDate = "";
      if ((data.billing_event ==
        constantData.TIERED_BILLING_EVENTS.MERCHANT_DOWNGRADE ||
        data.billing_event ==
        constantData.TIERED_BILLING_EVENTS.SUPER_USER_DOWNGRADE ||
        data.billing_event ==
        constantData.TIERED_BILLING_EVENTS
          .SUPER_USER_SCHEDULE_CHANGE_REQUEST)) {

        var startDate = "";
        var currentDate = "";
        startDate = moment(
          data.startDate * 1000
        ).format("MM-DD-YYYY");
        currentDate = moment().format("MM-DD-YYYY");
        console.log("currentDate-------- ", currentDate);
        console.log(
          "startDate-------- ",
          startDate
        );
        if (
          Date.parse(startDate) >
          Date.parse(currentDate)) {
          requestCompleteionDate = moment(data.startDate * 1000).unix();
        } else {
          requestCompleteionDate = moment(data.endDate * 1000).add(1, "days").unix();
        }
      } else {
        requestCompleteionDate = Math.floor(Date.now() / 1000);
      }
      model.tap_billing_report
        .create({
          merchant_id: data.merchant_id,
          schedule_id: data.scheduleID,
          current_tier: data.currentTierId,
          new_tier: data.tierID,
          segment_count: data.segmentCount,
          overage_charge: data.overagePrice,
          current_monthly_subscription: (data.billing_event ==
            constantData.TIERED_BILLING_EVENTS.MERCHANT_DOWNGRADE ||
            data.billing_event ==
            constantData.TIERED_BILLING_EVENTS.SUPER_USER_DOWNGRADE ||
            data.billing_event ==
            constantData.TIERED_BILLING_EVENTS
              .SUPER_USER_SCHEDULE_CHANGE_REQUEST ||
            data.billing_event ==
            constantData.TIERED_BILLING_EVENTS
              .UPGRADE_TIER_ON_SMS_LIMIT_EXCEEDED) ? data.currentScheduleSubscribedPrice : data.scheduleSubscribedPrice,
          new_monthly_subscription: data.scheduleSubscribedPrice,
          date_triggered: Math.floor(Date.now() / 1000),
          billing_event: data.billing_event,
          billing_amount: data.billingAmount,
          event_completion_date: requestCompleteionDate,
        })
        .then(function (result) {
          console.log('result data', result);
          trainingMode.checkTrainingMode(data.merchant_id).then(isTraining => {
            if (isTraining) {
              resolve('Training mode');
            } else {
              module.exports.sendMailNotification(data).then(
                function (response) {
                  console.log(response);
                  resolve("billing record inserted and email or sms send.");
                },
                function (err) {
                  console.log(err);
                  resolve("billing record inserted and email or sms failed.");
                }
              );
            }
          });
        })
        .catch(function (err) {
          console.log(err);
          reject("billing record insertion failed");
        });
    });
  },
  /**
   * send mail notification to merchant and admin
   * @param {*} data
   */
  sendMailNotification: function (data) {
    return new Promise(function (resolve, reject) {
      // Prepare relationship between tables before query excute 
      model.tap_schedule_subscription.belongsTo(model.tap_billingschedule, {
        foreignKey: 'schedule_id',
        targetKey: 'id'
      });
      model.tap_schedule_subscription.hasMany(
        model.tap_schedule_tier_information, {
          foreignKey: "schedule_id",
          sourceKey: "schedule_id"
        }
      );
      model.tap_schedule_subscription.belongsTo(model.tap_merchants, {
        foreignKey: "merchant_id",
        targetKey: "merchant_id"
      });
      const settings = model.tap_settings.findAll();
      const scheduleSubscription = model.tap_schedule_subscription.findAll({
        attributes: [
          [
            model.sequelize.literal(
              "(SELECT tier_number FROM tap_schedule_tier_information WHERE tap_schedule_tier_information.id = '" +
              data.currentTierId +
              "')"
            ),
            'current_tier'
          ],
          [
            model.sequelize.literal(
              "(SELECT tier_number FROM tap_schedule_tier_information WHERE tap_schedule_tier_information.id = '" +
              data.tierID +
              "')"
            ),
            'new_tier'
          ]
        ],
        where: {
          merchant_id: data.merchant_id
        },
        include: [{
          attributes: [
            "schedule_name",
            "tier_count",
            "start_date",
            "created_by"
          ],
          model: model.tap_billingschedule,
          where: {
            isschedule_active: "1"
          }
        },
        {
          attributes: [
            "id",
            "subscription_lower_bound_seg_count",
            "subscription_upper_bound_seg_count",
            "subscribed_price",
            "overage_price",
            "tier_number",
            "tier_start_date",
            "tier_end_date"
          ],
          model: model.tap_schedule_tier_information
        },
        {
          attributes: [
            "email",
            "nick_name",
            "secondary_email",
            "phoneNumber",
            "secondary_phone",
            "sms_notification_check",
            "email_notification_check",
            "tier_billing_notification_language"
          ],
          model: model.tap_merchants
        }
        ]
      });
      Promise.all([scheduleSubscription, settings])
        .then(result => {
          var merchantData = result[0].map(function (result) {
            return result.toJSON();
          });
          var settingsData = result[1].map(function (result) {
            return result.toJSON();
          });
          console.log("merchant details: ", merchantData);
          console.log("settingsData details: ", settingsData);
          if (merchantData.length > 0) {
            var segmentCount =
              data.segmentCount == 0 ? "Unlimited" : data.segmentCount;
            var currentTierSegementCount =
              data.currentTierSegementCount == 0 ?
                "Unlimited" :
                data.currentTierSegementCount;
            const emailNotificationCheck =
              settingsData[0].email_notification_check;
            const merchantEmailNotificationCheck = merchantData[0].tap_merchant
              .email_notification_check;
            const smsNotificationCheck =
              settingsData[0].sms_notification_check;
            const merchantSmsNotificationCheck = merchantData[0].tap_merchant
              .sms_notification_check;
            const BillingNotificationLanguage = merchantData[0].tap_merchant
              .tier_billing_notification_language;
            var adminMailContent = helper.getEmailTemplateContent(
              "admin_notification_template.html"
            );
            var smsAndMailData = [];
            if (
              data.billing_event ==
              constantData.TIERED_BILLING_EVENTS.MERCHANT_DOWNGRADE ||
              data.billing_event ==
              constantData.TIERED_BILLING_EVENTS.SUPER_USER_DOWNGRADE ||
              data.billing_event ==
              constantData.TIERED_BILLING_EVENTS
                .SUPER_USER_SCHEDULE_CHANGE_REQUEST
            ) {
              smsAndMailData = [
                {
                  dataFOR: "merchantMail"
                },
                {
                  dataFOR: "merchantSMS"
                },
              ];
            } else {
              smsAndMailData = [
                {
                  dataFOR: "merchantMail"
                },
                {
                  dataFOR: "adminMail"
                },
                {
                  dataFOR: "merchantSMS"
                },
                {
                  dataFOR: "adminSMS"
                }
              ];
            }
            var currentMonthSubscription = (data.billing_event ==
              constantData.TIERED_BILLING_EVENTS.MERCHANT_DOWNGRADE ||
              data.billing_event ==
              constantData.TIERED_BILLING_EVENTS.SUPER_USER_DOWNGRADE ||
              data.billing_event ==
              constantData.TIERED_BILLING_EVENTS
                .SUPER_USER_SCHEDULE_CHANGE_REQUEST ||
              data.billing_event ==
              constantData.TIERED_BILLING_EVENTS
                .UPGRADE_TIER_ON_SMS_LIMIT_EXCEEDED) ? data.currentScheduleSubscribedPrice : data.scheduleSubscribedPrice;
            async.forEachOf(
              smsAndMailData,
              (value, key, callback) => {
                if (value.dataFOR == "merchantMail") {
                  var merchantPhoneNumber = merchantData[0].tap_merchant
                    .secondary_phone ?
                    merchantData[0].tap_merchant.secondary_phone :
                    merchantData[0].tap_merchant.phoneNumber;

                  if (emailNotificationCheck == "true" && merchantEmailNotificationCheck == "true") {
                    var mailContent = "";
                    var emailSubject = "";
                    var PuertoRico = helper.PuertoRico(merchantPhoneNumber);
                    // Select email template based on billing event 
                    if (
                      data.billing_event ==
                      constantData.TIERED_BILLING_EVENTS.SUPER_USER_FIRST_TIME_ASSIGN
                    ) {
                      mailContent = helper.getEmailTemplateContent(
                        "merchant_new_assignment_notification_template.html"
                      );
                    } else if (
                      data.billing_event ==
                      constantData.TIERED_BILLING_EVENTS.MERCHANT_DOWNGRADE ||
                      data.billing_event ==
                      constantData.TIERED_BILLING_EVENTS.SUPER_USER_DOWNGRADE ||
                      data.billing_event ==
                      constantData.TIERED_BILLING_EVENTS
                        .SUPER_USER_SCHEDULE_CHANGE_REQUEST
                    ) {
                      mailContent = helper.getEmailTemplateContent(
                        "merchant_downgrade_request_notification_template.html"
                      );
                    } else {
                      mailContent = helper.getEmailTemplateContent(
                        "merchant_notification_template.html"
                      );
                    }
                    // Replace shortcode in email template
                    if (data.billing_event ==
                      constantData.TIERED_BILLING_EVENTS.UPGRADE_TIER_ON_SMS_LIMIT_EXCEEDED) {
                      emailSubject = BillingNotificationLanguage == 'Spanish'
                        ? emailContent.MERCHANT_TIER_SMS_LIMT_EXCEED_NOTIFICATION.spanish.subject : emailContent.MERCHANT_TIER_SMS_LIMT_EXCEED_NOTIFICATION.english.subject;
                      mailContent = mailContent.replace(
                        "%HEADER_TEXT%",
                        BillingNotificationLanguage == 'Spanish'
                          ? emailContent.MERCHANT_TIER_SMS_LIMT_EXCEED_NOTIFICATION.spanish.header
                          : emailContent.MERCHANT_TIER_SMS_LIMT_EXCEED_NOTIFICATION.english.header
                      );
                      mailContent = mailContent.replace(
                        "%FOOTER_TEXT1%",
                        BillingNotificationLanguage == 'Spanish'
                          ? emailContent.MERCHANT_TIER_SMS_LIMT_EXCEED_NOTIFICATION.spanish
                            .footer1
                          : emailContent.MERCHANT_TIER_SMS_LIMT_EXCEED_NOTIFICATION.english
                            .footer1
                      );
                      mailContent = mailContent.replace(
                        "%FOOTER_TEXT2%",
                        BillingNotificationLanguage == 'Spanish'
                          ? emailContent.MERCHANT_TIER_SMS_LIMT_EXCEED_NOTIFICATION.spanish
                            .footer2
                          : emailContent.MERCHANT_TIER_SMS_LIMT_EXCEED_NOTIFICATION.english
                            .footer2
                      );
                      mailContent = mailContent.replace(
                        "%LINK_TEXT%",
                        BillingNotificationLanguage == 'Spanish'
                          ? emailContent.MERCHANT_TIER_NOTIFICATION.spanish
                            .link_text
                          : emailContent.MERCHANT_TIER_NOTIFICATION.english
                            .link_text
                      );
                    } else if (
                      data.billing_event ==
                      constantData.TIERED_BILLING_EVENTS.MERCHANT_DOWNGRADE ||
                      data.billing_event ==
                      constantData.TIERED_BILLING_EVENTS.SUPER_USER_DOWNGRADE ||
                      data.billing_event ==
                      constantData.TIERED_BILLING_EVENTS
                        .SUPER_USER_SCHEDULE_CHANGE_REQUEST
                    ) {
                      if (data.billing_event ==
                        constantData.TIERED_BILLING_EVENTS
                          .SUPER_USER_SCHEDULE_CHANGE_REQUEST) {
                        emailSubject = BillingNotificationLanguage == 'Spanish'
                          ? emailContent.MERCHANT_TIER_DOWNGRADE_NOTIFICATION.spanish.schedule_change_subject : emailContent.MERCHANT_TIER_DOWNGRADE_NOTIFICATION.english.schedule_change_subject;
                        mailContent = mailContent.replace(
                          "%HEADER_TEXT%",
                          BillingNotificationLanguage == 'Spanish'
                            ? emailContent.MERCHANT_TIER_DOWNGRADE_NOTIFICATION.spanish.schedule_change_header
                            : emailContent.MERCHANT_TIER_DOWNGRADE_NOTIFICATION.english.schedule_change_header
                        );
                      } else {
                        emailSubject = BillingNotificationLanguage == 'Spanish'
                          ? emailContent.MERCHANT_TIER_DOWNGRADE_NOTIFICATION.spanish.subject : emailContent.MERCHANT_TIER_DOWNGRADE_NOTIFICATION.english.subject;
                        mailContent = mailContent.replace(
                          "%HEADER_TEXT%",
                          BillingNotificationLanguage == 'Spanish'
                            ? emailContent.MERCHANT_TIER_DOWNGRADE_NOTIFICATION.spanish.header
                            : emailContent.MERCHANT_TIER_DOWNGRADE_NOTIFICATION.english.header
                        );
                      }
                      mailContent = mailContent.replace(
                        "%FOOTER_TEXT1%",
                        BillingNotificationLanguage == 'Spanish'
                          ? emailContent.MERCHANT_TIER_DOWNGRADE_NOTIFICATION.spanish
                            .footer1
                          : emailContent.MERCHANT_TIER_DOWNGRADE_NOTIFICATION.english
                            .footer1
                      );
                      mailContent = mailContent.replace(
                        "%FOOTER_TEXT2%",
                        BillingNotificationLanguage == 'Spanish'
                          ? emailContent.MERCHANT_TIER_DOWNGRADE_NOTIFICATION.spanish
                            .footer2
                          : emailContent.MERCHANT_TIER_DOWNGRADE_NOTIFICATION.english
                            .footer2
                      );
                      mailContent = mailContent.replace(
                        "%LINK_TEXT%",
                        BillingNotificationLanguage == 'Spanish'
                          ? emailContent.MERCHANT_TIER_NOTIFICATION.spanish
                            .link_text
                          : emailContent.MERCHANT_TIER_NOTIFICATION.english
                            .link_text
                      );

                    } else {
                      emailSubject = BillingNotificationLanguage == 'Spanish'
                        ? emailContent.MERCHANT_TIER_NOTIFICATION.spanish.subject : emailContent.MERCHANT_TIER_NOTIFICATION.english.subject;
                      mailContent = mailContent.replace(
                        "%HEADER_TEXT%",
                        BillingNotificationLanguage == 'Spanish'
                          ? emailContent.MERCHANT_TIER_NOTIFICATION.spanish.header
                          : emailContent.MERCHANT_TIER_NOTIFICATION.english.header
                      );
                      mailContent = mailContent.replace(
                        "%FOOTER_TEXT1%",
                        BillingNotificationLanguage == 'Spanish'
                          ? emailContent.MERCHANT_TIER_NOTIFICATION.spanish
                            .footer1
                          : emailContent.MERCHANT_TIER_NOTIFICATION.english
                            .footer1
                      );
                      mailContent = mailContent.replace(
                        "%FOOTER_TEXT2%",
                        BillingNotificationLanguage == 'Spanish'
                          ? emailContent.MERCHANT_TIER_NOTIFICATION.spanish
                            .footer2
                          : emailContent.MERCHANT_TIER_NOTIFICATION.english
                            .footer2
                      );
                      mailContent = mailContent.replace(
                        "%LINK_TEXT%",
                        BillingNotificationLanguage == 'Spanish'
                          ? emailContent.MERCHANT_TIER_NOTIFICATION.spanish
                            .link_text
                          : emailContent.MERCHANT_TIER_NOTIFICATION.english
                            .link_text
                      );
                    }
                    var overageStyle = '';
                    if (data.overagePrice === 0) {
                      mailContent = mailContent.replace(
                        "%STYLE%",
                        'style="display: none;"'
                      );
                      overageStyle = 'style="display: none;"';
                    } else {
                      mailContent = mailContent.replace(
                        "%STYLE%",
                        ''
                      );
                    }
                    // Prepare Old Tier and Schedule data
                    var oldTierData =
                      "<tr><td>" +
                      merchantData[0].current_tier +
                      "</td><td>" +
                      currentTierSegementCount +
                      "</td><td>$" +
                      data.currentScheduleSubscribedPrice +
                      "</td>";
                    // Prepare New Tier and Schedule data
                    var newTierData =
                      "<tr><td>" +
                      merchantData[0].new_tier +
                      "</td><td>" +
                      segmentCount +
                      "</td><td>$" +
                      currentMonthSubscription +
                      "</td><td>$" +
                      data.scheduleSubscribedPrice +
                      "</td><td " + overageStyle + ">$" +
                      data.overagePrice +
                      "</td></tr>";
                    var requestCompleteionDate = "";
                    var startDate = "";
                    var currentDate = "";
                    startDate = moment(
                      data.startDate * 1000
                    ).format("MM-DD-YYYY");
                    currentDate = moment().format("MM-DD-YYYY");
                    console.log("currentDate2-------- ", currentDate);
                    console.log(
                      "startDate2-------- ",
                      startDate
                    );
                    if (
                      Date.parse(startDate) >
                      Date.parse(currentDate)) {
                      requestCompleteionDate = moment(data.startDate * 1000).format("MM-DD-YYYY");
                    } else {
                      requestCompleteionDate = moment(data.endDate * 1000).add(1, "days").format("MM-DD-YYYY");
                    }
                    // Prepare Downgrade Data
                    var downgradeTierData =
                      "<tr><td>" +
                      merchantData[0].current_tier +
                      "</td><td>" +
                      merchantData[0].new_tier +
                      "</td><td>" +
                      currentTierSegementCount +
                      "</td><td>" +
                      segmentCount +
                      "</td><td>$" +
                      currentMonthSubscription +
                      "</td><td>$" +
                      data.scheduleSubscribedPrice +
                      "</td><td>" +
                      requestCompleteionDate +
                      "</td></tr>";

                    // Replace short code in email template based on language prefrenece
                    mailContent = mailContent.replace(
                      "%DBA%",
                      merchantData[0].tap_merchant.nick_name
                    );
                    let billingPageLink = helper.generateBillingPageLink(config.app.MERCHANT_BILLING_LINK, data.merchant_id);
                    mailContent = mailContent.replace(
                      "%BILLING_LINK%",
                      billingPageLink
                    );
                    mailContent = mailContent.replace(
                      "%OLD_TIER_DATA%",
                      oldTierData
                    );
                    mailContent = mailContent.replace(
                      "%NEW_TIER_DATA%",
                      newTierData
                    );
                    mailContent = mailContent.replace(
                      "%NEW_TIER_DATA_DOWNGRADE_REQUEST%",
                      downgradeTierData
                    );

                    // Send mail to merchant
                    var merchantEmailId = merchantData[0].tap_merchant
                      .secondary_email
                      ? merchantData[0].tap_merchant.secondary_email
                      : merchantData[0].tap_merchant.email;
                    helper
                      .sendEmailFromAdmin(
                        merchantEmailId,
                        emailSubject,
                        mailContent,
                        null,
                        emailContent.MERCHANT_TIER_NOTIFICATION.english
                          .from_mail
                      )
                      .then(
                        function (Maildata) {
                          console.log("maildataArray ", Maildata);
                          module.exports
                            .insertNotficationLog({
                              merchant_id: data.merchant_id,
                              billing_event: data.billing_event,
                              notification_type: "EMAIL",
                              notification_status: 1,
                              notification_time: Math.floor(Date.now() / 1000)
                            })
                            .then(
                              function (success) {
                                console.log("mail send success.");
                                callback();
                              },
                              function (err) {
                                console.log("mail send success.");
                                callback(err);
                              }
                            );
                        },
                        function (error) {
                          console.log(
                            "maildataArray ERROR============== ",
                            error
                          );
                          callback(error);
                        }
                      );
                  } else {
                    callback(null);
                  }
                } else if (value.dataFOR == "adminMail") {
                  if (emailNotificationCheck == "true" && merchantEmailNotificationCheck == "true") {
                    var overageStyle = '';
                    if (data.overagePrice === 0) {
                      adminMailContent = adminMailContent.replace(
                        "%STYLE%",
                        'style="display: none;"'
                      );
                      overageStyle = 'style="display: none;"';
                    } else {
                      adminMailContent = adminMailContent.replace(
                        "%STYLE%",
                        ''
                      );
                    }
                    // Prepare admin tier data to place data in email template
                    var adminTierData =
                      "<tr><td>" +
                      merchantData[0].tap_merchant.nick_name +
                      "</td><td>" +
                      merchantData[0].tap_billingschedule.schedule_name +
                      "</td><td>" +
                      merchantData[0].current_tier +
                      "</td><td>" +
                      merchantData[0].new_tier +
                      "</td><td>" +
                      segmentCount +
                      "</td><td " + overageStyle + ">$" +
                      data.overagePrice +
                      "</td><td>$" +
                      currentMonthSubscription +
                      "</td><td>$" +
                      data.scheduleSubscribedPrice +
                      "</td></tr>";
                    adminMailContent = adminMailContent.replace(
                      "%HEADER_TEXT%",
                      "Tier and Schedule has been assigned or updated.Please find the details as mentioned below-"
                    );
                    adminMailContent = adminMailContent.replace(
                      "%TIER_DATA%",
                      adminTierData
                    );
                    helper
                      .sendEmailFromAdmin(
                        constantData.BILLING_MAIL,
                        emailContent.ADMIN_TIER_NOTIFICATION.subject,
                        adminMailContent,
                        null,
                        emailContent.ADMIN_TIER_NOTIFICATION.from_mail
                      )
                      .then(
                        function (Maildata) {
                          console.log("maildataArray ", Maildata);
                          module.exports
                            .insertNotficationLog({
                              merchant_id: "",
                              billing_event: data.billing_event,
                              notification_type: "EMAIL",
                              notification_status: 1,
                              notification_time: Math.floor(Date.now() / 1000)
                            })
                            .then(
                              function (success) {
                                console.log("mail send success.");
                                callback();
                              },
                              function (err) {
                                console.log("mail send success.");
                                callback(err);
                              }
                            );
                        },
                        function (error) {
                          console.log(
                            "maildataArray ERROR============== ",
                            error
                          );
                          callback(error);
                        }
                      );
                  } else {
                    callback(null);
                  }
                } else if (value.dataFOR == "merchantSMS") {
                  var merchantPhoneNumber = merchantData[0].tap_merchant
                    .secondary_phone ?
                    merchantData[0].tap_merchant.secondary_phone :
                    merchantData[0].tap_merchant.phoneNumber;
                  if (merchantPhoneNumber && smsNotificationCheck == "true" && merchantSmsNotificationCheck == "true") {
                    var PuertoRico = helper.PuertoRico(merchantPhoneNumber);
                    var merchantBillingMesage = "";
                    // Choose SMS tepmplate based on biiling event
                    if (
                      data.billing_event ==
                      constantData.TIERED_BILLING_EVENTS.MERCHANT_DOWNGRADE ||
                      data.billing_event ==
                      constantData.TIERED_BILLING_EVENTS.SUPER_USER_DOWNGRADE ||
                      data.billing_event ==
                      constantData.TIERED_BILLING_EVENTS
                        .SUPER_USER_SCHEDULE_CHANGE_REQUEST
                    ) {
                      if (BillingNotificationLanguage == 'Spanish') {
                        merchantBillingMesage =
                          textmessage.merchantDowngradeBillingNotification.spanish;
                      } else {
                        merchantBillingMesage =
                          textmessage.merchantDowngradeBillingNotification.english;
                      }
                    } else {
                      if (BillingNotificationLanguage == 'Spanish') {
                        merchantBillingMesage =
                          textmessage.merchantBillingNotification.spanish;
                      } else {
                        merchantBillingMesage =
                          textmessage.merchantBillingNotification.english;
                      }
                    }
                    // Replace the shortcode with billing data
                    merchantBillingMesage = merchantBillingMesage.replace(
                      "%TIER%",
                      merchantData[0].new_tier
                    );
                    merchantBillingMesage = merchantBillingMesage.replace(
                      "%SEGEMENT%",
                      segmentCount
                    );
                    tap_twilioSMSController.twilioSMS(
                      {
                        phone: merchantPhoneNumber,
                        message: merchantBillingMesage
                      },
                      function (err, sendsms) {
                        if (err) {
                          console.log("sms send failed.");
                          callback(null);
                        } else {
                          if (sendsms.statusCode == 200) {
                            module.exports
                              .insertNotficationLog({
                                merchant_id: data.merchant_id,
                                billing_event: data.billing_event,
                                notification_type: "SMS",
                                notification_status: 1,
                                notification_time: Math.floor(Date.now() / 1000)
                              })
                              .then(
                                function (success) {
                                  console.log("sms send success.");
                                  callback();
                                },
                                function (err) {
                                  console.log("sms send success.");
                                  callback(err);
                                }
                              );
                          } else {
                            console.log("sms send failed.");
                            callback(null);
                          }
                        }
                      }
                    );
                  } else {
                    callback(null);
                  }
                } else if (value.dataFOR == "adminSMS") {
                  //Remove code for admin sms notifications
                  // var adminPhoneNumber = constantData.BILLING_MOBILE_NUMBER;
                  // if (adminPhoneNumber && smsNotificationCheck == "true" && merchantSmsNotificationCheck == "true") {
                  //   var PuertoRico = helper.PuertoRico(adminPhoneNumber);
                  //   var adminBillingMesage = "";
                  //   if (BillingNotificationLanguage == 'Spanish') {
                  //     adminBillingMesage =
                  //       textmessage.adminBillingNotification.spanish;
                  //   } else {
                  //     adminBillingMesage =
                  //       textmessage.adminBillingNotification.english;
                  //   }
                  //   adminBillingMesage = adminBillingMesage.replace(
                  //     "%TIER%",
                  //     merchantData[0].new_tier
                  //   );
                  //   adminBillingMesage = adminBillingMesage.replace(
                  //     "%SEGEMENT%",
                  //     segmentCount
                  //   );
                  //   tap_twilioSMSController.twilioSMS(
                  //     {
                  //       phone: adminPhoneNumber,
                  //       message: adminBillingMesage
                  //     },
                  //     function (err, sendsms) {
                  //       if (err) {
                  //         console.log("sms send failed.");
                  //         callback(err);
                  //       } else {
                  //         if (sendsms.statusCode == 200) {
                  //           module.exports
                  //             .insertNotficationLog({
                  //               merchant_id: "",
                  //               billing_event: data.billing_event,
                  //               notification_type: "SMS",
                  //               notification_status: 1,
                  //               notification_time: Math.floor(Date.now() / 1000)
                  //             })
                  //             .then(
                  //               function (success) {
                  //                 console.log("sms send success.");
                  //                 callback();
                  //               },
                  //               function (err) {
                  //                 console.log("sms send success.");
                  //                 callback(err);
                  //               }
                  //             );
                  //         } else {
                  //           console.log("sms send failed.");
                  //           callback(null);
                  //         }
                  //       }
                  //     }
                  //   );
                  // } else {
                  //   callback(null);
                  // }
                  callback(null);
                } else {
                  callback(null);
                }
              },
              err => {
                if (err) {
                  console.log("billing data updated and mail not send.", err);
                }
                console.log("billing data updated and email or sms send.");
                resolve("billing data updated and email or sms send.");
              }
            );
          }
        })
        .catch(function (err) {
          console.log("billing data updated and email or sms not send.", err);
          reject("billing data updated and email or sms not send.");
        });
    });
  },
  /**
   * Get billing end date
   * @param {*} data
   */
  getBillingEndDate: function (date) {
    var selectedDay = moment(date * 1000).format("DD");
    var selectedMonth = moment(date * 1000).format("MM");
    var selectedYear = moment(date * 1000).format("YYYY");
    var returnData = "";
    console.log("selectedDay==================", selectedDay);
    console.log("selectedMonth==================", selectedMonth);
    console.log("selectedYear==================", selectedYear);
    if (selectedDay == "29" || selectedDay == "30" || selectedDay == "31") {
      const startOfMonth = moment(date * 1000)
        .startOf("month")
        .unix();
      const endOfMonth = moment(date * 1000)
        .endOf("month")
        .unix();
      console.log("month start start ---------------- ", startOfMonth);
      console.log("month start end date ---------------- ", endOfMonth);
      returnData = {
        start: startOfMonth,
        end: endOfMonth
      };
    } else {
      var endDate = moment(date * 1000)
        .add(1, "M")
        .subtract(1, "days")
        .unix();
      console.log("end date==================", date);
      returnData = {
        start: date,
        end: endDate
      };
    }
    return returnData;
  },
  /**
   * Insert billing Notification Log
   * @param {*} data
   */
  insertNotficationLog: function (data) {
    return new Promise(function (resolve, reject) {
      model.tap_billing_notification_log
        .create(data)
        .then(function (result) {
          resolve("log inserted");
        })
        .catch(function (err) {
          console.log("log inserted failed ", err);
          reject("log inserted failed");
        });
    });
  },
  /**
   * Upgrade Tier of assign schedule with overage price
   * @param {*} merchant_id
   * @param {*} upgradeTierData
   */
  updgardeTierWithOveragePrice: (merchant_id, upgradeTierData, OfferType = null) => {
    return new Promise(function (resolve, reject) {
      model.tap_schedule_subscription.belongsTo(model.tap_billingschedule, {
        foreignKey: "schedule_id",
        targetKey: "id"
      });
      model.tap_schedule_subscription.hasMany(
        model.tap_schedule_tier_information, {
          foreignKey: "schedule_id",
          sourceKey: "schedule_id"
        }
      );
      model.tap_schedule_subscription.belongsTo(model.tap_merchants, {
        foreignKey: "merchant_id",
        targetKey: "merchant_id"
      });
      const settings = model.tap_settings.findAll();
      const scheduleSubscription = model.tap_schedule_subscription
        .findAll({
          where: {
            merchant_id: merchant_id
          },
          include: [{
            attributes: [
              "schedule_name",
              "tier_count",
              "start_date",
              "created_by"
            ],
            model: model.tap_billingschedule,
            where: {
              isschedule_active: "1"
            }
          },
          {
            attributes: [
              "id",
              "subscription_lower_bound_seg_count",
              "subscription_upper_bound_seg_count",
              "subscribed_price",
              "overage_price",
              "tier_number",
              "tier_start_date",
              "tier_end_date"
            ],
            model: model.tap_schedule_tier_information
          },
          {
            attributes: [
              "email",
              "nick_name",
              "secondary_email",
              "phoneNumber",
              "secondary_phone",
              "sms_notification_check",
              "email_notification_check",
              "tier_billing_notification_language",
              "sms_sent",
              "sms_limit",
              "sms_unlimited",
              "timezone",
              "last_exceed_limit_notification_sent_time"
            ],
            where: {
              active: true,
            },
            model: model.tap_merchants
          }
          ]
        });
      Promise.all([scheduleSubscription, settings]).then(function (data) {
        var scheduleData = data[0].map(function (data) {
          return data.toJSON();
        });
        var settingsData = data[1].map(function (result) {
          return result.toJSON();
        });
        var mailData = {};
        mailData.scheduleData = scheduleData[0];
        mailData.settingsData = settingsData;
        console.log("Schedule Data: ", scheduleData);
        console.log("settingsData details: ", settingsData);
        if (scheduleData.length > 0) {
          console.log("All tier of current schedule-----", scheduleData[0].tap_schedule_tier_informations);
          var curretTierData = scheduleData[0].tap_schedule_tier_informations.find(function (element) {
            if (element.id == scheduleData[0].tier_id)
              return element;
          });
          console.log("curretTierData----", curretTierData);
          console.log("segment need to Add--------------------------- ", upgradeTierData.segmentNeedToAdd);
          var needTierToActivate = curretTierData.tier_number;
          var allTierData = scheduleData[0].tap_schedule_tier_informations;
          console.log("before Sort Tier Data", allTierData);
          // allTierData.sort(function (a, b) {
          //   return a.subscription_upper_bound_seg_count - b.subscription_upper_bound_seg_count
          // });
          console.log("after Sort Tier Data", allTierData);
          var needUpgradeTierData = allTierData.find(function (element) {
            if ((element.id != scheduleData[0].tier_id) && (parseInt(element.subscription_upper_bound_seg_count) >= parseInt(upgradeTierData.segmentNeedToAdd) || element.subscription_upper_bound_seg_count == '0'))
              return element;
          });
          console.log('needUpgradeTierData SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS', needUpgradeTierData);
          console.log('upgradeTierData TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', upgradeTierData, upgradeTierData.segmentNeedToAdd);
          var BulkNeedUpgradeTierData = allTierData[allTierData.length - 1];
          console.log("Last Tier Data", BulkNeedUpgradeTierData);
          var overagePrice = 0;
          var updateData = {};
          if (OfferType == 'bulk_sms' && (needUpgradeTierData == undefined || !needUpgradeTierData) && BulkNeedUpgradeTierData.id != scheduleData[0].tier_id) {
            console.log('Offer type bulk sms+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
            needUpgradeTierData = BulkNeedUpgradeTierData;
            overagePrice = new BigNumber(needUpgradeTierData.overage_price).minus(curretTierData.subscribed_price).toFixed(2);
            console.log('needUpgradeTierData---- ', needUpgradeTierData);
            updateData = {
              action: "update",
              merchant_id: merchant_id,
              scheduleID: scheduleData[0].schedule_id,
              tierID: needUpgradeTierData.id,
              minimumTier: scheduleData[0].minimum_tier_id,
              scheduleSubscribedPrice: needUpgradeTierData.subscribed_price,
              startDate: scheduleData[0].subscription_start_date,
              currentScheduleId: scheduleData[0].schedule_id,
              currentTierId: curretTierData.id,
              currentScheduleSubscribedPrice: curretTierData
                .subscribed_price,
              currentTierSegementCount: curretTierData
                .subscription_upper_bound_seg_count,
              subscriptionAssignDate: scheduleData[0].subscription_assign_date,
              overagePrice: overagePrice,
              billing_event: constantData.TIERED_BILLING_EVENTS.UPGRADE_TIER_ON_SMS_LIMIT_EXCEEDED,
              requested_by: '',
              segmentCount: needUpgradeTierData.subscription_upper_bound_seg_count,
              endDate: scheduleData[0].subscription_end_date,
              billingAmount: overagePrice
            };
            console.log('updateData-----', updateData);
            module.exports.saveORUpdateBillingSchedule(updateData).then(function (res) {
              // Send Mail notification when execeed limit for bulk SMS
              trainingMode.checkTrainingMode(merchant_id).then(isTraining => {
                if (isTraining) {
                  console.log("Training mode on");
                  resolve("Training mode on");
                } else {
                  console.log('Else - if limit exceed +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
                  const d = new Date();
                  var last_mail_notification_time = scheduleData[0].tap_merchant.last_exceed_limit_notification_sent_time;
                  if (last_mail_notification_time) {
                    var last_mail_notification_time_with_timezone = "";
                    var currentDate = "";
                    if (scheduleData[0].tap_merchant.timezone) {
                      last_mail_notification_time_with_timezone = moment(
                        last_mail_notification_time * 1000
                      )
                        .tz(scheduleData[0].tap_merchant.timezone)
                        .format("MM-DD-YYYY");
                      currentDate = moment(d)
                        .tz(scheduleData[0].tap_merchant.timezone)
                        .format("MM-DD-YYYY");
                    } else {
                      last_mail_notification_time_with_timezone = moment(
                        last_mail_notification_time * 1000
                      )
                        .format("MM-DD-YYYY");
                      currentDate = moment(d)
                        .format("MM-DD-YYYY");
                    }
                    console.log("currentDate-------- ", currentDate);
                    console.log(
                      "last_mail_notification_time-------- ",
                      last_mail_notification_time
                    );
                    if (
                      Date.parse(last_mail_notification_time_with_timezone) <
                      Date.parse(currentDate)) {
                      module.exports
                        .sendLimitMailNotfication(
                          merchant_id,
                          mailData,
                          "Immidiate"
                        )
                        .then(
                          function (Maildata) {
                            console.log("maildataArray ", Maildata);
                            module.exports
                              .insertNotficationLog({
                                merchant_id: merchant_id,
                                billing_event: upgradeTierData.trigger ?
                                  `Exceed Notfication From ${upgradeTierData.trigger}` : "Exceed Notfication From",
                                notification_type: "EMAIL",
                                notification_status: 1,
                                notification_time: Math.floor(Date.now() / 1000)
                              })
                              .then(
                                function (success) {
                                  console.log("mail send success.");
                                  resolve(Maildata);
                                },
                                function (err) {
                                  console.log("mail send success.");
                                  resolve(Maildata);
                                }
                              );
                          },
                          function (error) {
                            console.log(
                              "maildataArray ERROR============== ",
                              error
                            );
                            resolve(error);

                          }
                        );
                    } else {
                      resolve("today mail notification already send");
                    }
                  } else {
                    module.exports
                      .sendLimitMailNotfication(
                        merchant_id,
                        mailData,
                        "Immidiate"
                      )
                      .then(
                        function (Maildata) {
                          console.log("maildataArray ", Maildata);
                          module.exports
                            .insertNotficationLog({
                              merchant_id: merchant_id,
                              billing_event: upgradeTierData.trigger ?
                                `Exceed Notfication From ${upgradeTierData.trigger}` : "Exceed Notfication From",
                              notification_type: "EMAIL",
                              notification_status: 1,
                              notification_time: Math.floor(Date.now() / 1000)
                            })
                            .then(
                              function (success) {
                                console.log("mail send success.");
                                resolve(Maildata);
                              },
                              function (err) {
                                console.log("mail send success.");
                                resolve(Maildata);
                              }
                            );
                        },
                        function (error) {
                          console.log(
                            "maildataArray ERROR============== ",
                            error
                          );
                          resolve(error);
                        }
                      );
                  }
                }
              }, (error) => {
                console.log(error);
                resolve(error);
              });
            }, function (err) {
              resolve(err);
            });
          } else if (needUpgradeTierData != undefined && needUpgradeTierData) {
            console.log('Else If Need to upgrade+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
            overagePrice = new BigNumber(needUpgradeTierData.overage_price).minus(curretTierData.subscribed_price).toFixed(2);
            console.log('needUpgradeTierData---- ', needUpgradeTierData);
            updateData = {
              action: "update",
              merchant_id: merchant_id,
              scheduleID: scheduleData[0].schedule_id,
              tierID: needUpgradeTierData.id,
              minimumTier: scheduleData[0].minimum_tier_id,
              scheduleSubscribedPrice: needUpgradeTierData.subscribed_price,
              startDate: scheduleData[0].subscription_start_date,
              currentScheduleId: scheduleData[0].schedule_id,
              currentTierId: curretTierData.id,
              currentScheduleSubscribedPrice: curretTierData
                .subscribed_price,
              currentTierSegementCount: curretTierData
                .subscription_upper_bound_seg_count,
              subscriptionAssignDate: scheduleData[0].subscription_assign_date,
              overagePrice: overagePrice,
              billing_event: constantData.TIERED_BILLING_EVENTS.UPGRADE_TIER_ON_SMS_LIMIT_EXCEEDED,
              requested_by: '',
              segmentCount: needUpgradeTierData.subscription_upper_bound_seg_count,
              endDate: scheduleData[0].subscription_end_date,
              billingAmount: overagePrice
            };
            console.log('updateData-----', updateData);
            module.exports.saveORUpdateBillingSchedule(updateData).then(function (res) {
              resolve(res);
            }, function (err) {
              reject(err);
            });
          } else {
            trainingMode.checkTrainingMode(merchant_id).then(isTraining => {
              if (isTraining) {
                console.log("Training mode on");
                resolve("Training mode on");
              } else {
                console.log('Else - if limit exceed +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
                const d = new Date();
                var last_mail_notification_time = scheduleData[0].tap_merchant.last_exceed_limit_notification_sent_time;
                if (last_mail_notification_time) {
                  var last_mail_notification_time_with_timezone = "";
                  var currentDate = "";
                  if (scheduleData[0].tap_merchant.timezone) {
                    last_mail_notification_time_with_timezone = moment(
                      last_mail_notification_time * 1000
                    )
                      .tz(scheduleData[0].tap_merchant.timezone)
                      .format("MM-DD-YYYY");
                    currentDate = moment(d)
                      .tz(scheduleData[0].tap_merchant.timezone)
                      .format("MM-DD-YYYY");
                  } else {
                    last_mail_notification_time_with_timezone = moment(
                      last_mail_notification_time * 1000
                    )
                      .format("MM-DD-YYYY");
                    currentDate = moment(d)
                      .format("MM-DD-YYYY");
                  }
                  console.log("currentDate-------- ", currentDate);
                  console.log(
                    "last_mail_notification_time-------- ",
                    last_mail_notification_time
                  );
                  if (
                    Date.parse(last_mail_notification_time_with_timezone) <
                    Date.parse(currentDate)) {
                    module.exports
                      .sendLimitMailNotfication(
                        merchant_id,
                        mailData,
                        "Immidiate"
                      )
                      .then(
                        function (Maildata) {
                          console.log("maildataArray ", Maildata);
                          module.exports
                            .insertNotficationLog({
                              merchant_id: merchant_id,
                              billing_event: upgradeTierData.trigger ?
                                `Exceed Notfication From ${upgradeTierData.trigger}` : "Exceed Notfication From",
                              notification_type: "EMAIL",
                              notification_status: 1,
                              notification_time: Math.floor(Date.now() / 1000)
                            })
                            .then(
                              function (success) {
                                console.log("mail send success.");
                                if (OfferType == 'bulk_sms') {
                                  resolve(Maildata);
                                } else {
                                  reject(Maildata);
                                }
                              },
                              function (err) {
                                console.log("mail send success.");
                                if (OfferType == 'bulk_sms') {
                                  resolve(Maildata);
                                } else {
                                  reject(Maildata);
                                }
                              }
                            );

                        },
                        function (error) {
                          console.log(
                            "maildataArray ERROR============== ",
                            error
                          );
                          if (OfferType == 'bulk_sms') {
                            resolve(error);
                          } else {
                            reject(error);
                          }
                        }
                      );
                  } else {
                    if (OfferType == 'bulk_sms') {
                      resolve("today mail notification already send");
                    } else {
                      reject("today mail notification already send");
                    }
                  }
                } else {
                  module.exports
                    .sendLimitMailNotfication(
                      merchant_id,
                      mailData,
                      "Immidiate"
                    )
                    .then(
                      function (Maildata) {
                        console.log("maildataArray ", Maildata);
                        module.exports
                          .insertNotficationLog({
                            merchant_id: merchant_id,
                            billing_event: upgradeTierData.trigger ?
                              `Exceed Notfication From ${upgradeTierData.trigger}` : "Exceed Notfication From",
                            notification_type: "EMAIL",
                            notification_status: 1,
                            notification_time: Math.floor(Date.now() / 1000)
                          })
                          .then(
                            function (success) {
                              console.log("mail send success.");
                              if (OfferType == 'bulk_sms') {
                                resolve(Maildata);
                              } else {
                                reject(Maildata);
                              }
                            },
                            function (err) {
                              console.log("mail send success.");
                              if (OfferType == 'bulk_sms') {
                                resolve(Maildata);
                              } else {
                                reject(Maildata);
                              }
                            }
                          );
                      },
                      function (error) {
                        console.log(
                          "maildataArray ERROR============== ",
                          error
                        );
                        if (OfferType == 'bulk_sms') {
                          resolve(error);
                        } else {
                          reject(error);
                        }
                      }
                    );
                }
              }

            }, (error) => {
              console.log(error);
              if (OfferType == 'bulk_sms') {
                resolve(error);
              } else {
                reject(error);
              }
            });
          }
        } else {
          console.log("schedule data not found");
          reject("schedule data not found");
        }
      })
        .catch(function (err) {
          console.log(err);
          reject(err);
        });
    });
  },
  /**
   * Activate the Training Schedule for merchant
   * @param obj data
   */
  deActivateTrainingSchedule: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    console.log(req.body);
    var merchant_id = req.body.merchant_id;
    if (!merchant_id) {
      responseMsg.RESPONSE400.message = RES_MESSAGE.ERROR_PARAM_MISSING;
      return res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      model.tap_schedule_subscription.hasMany(
        model.tap_schedule_tier_information, {
          foreignKey: "schedule_id",
          sourceKey: "schedule_id"
        }
      );
      model.tap_schedule_subscription
        .findAll({
          where: {
            merchant_id: merchant_id
          },
          include: {
            model: model.tap_schedule_tier_information
          }
        })
        .then(async function (data) {
          var scheduleTierData = data.map(function (data) {
            return data.toJSON();
          });
          console.log("Schedule Tier Data: ", scheduleTierData);
          if (scheduleTierData.length > 0) {
            var curretTierData = await scheduleTierData[0].tap_schedule_tier_informations.find(function (element) {
              if (element.id == scheduleTierData[0].tier_id)
                return element;
            });
            var tieredBillingEvent = constantData.TIERED_BILLING_EVENTS.TRAINING_MODE_OFF;
            var requested_by = "1";
            var tierDowngraded = 0;
            // Claculate billing amount for particular event
            var billingAmount = '0';
            var updateData = {
              action: "update",
              merchant_id: merchant_id,
              scheduleID: scheduleTierData[0].schedule_id,
              tierID: scheduleTierData[0].tier_id,
              minimumTier: scheduleTierData[0].minimum_tier_id,
              scheduleSubscribedPrice: curretTierData
                .subscribed_price,
              startDate: scheduleTierData[0].subscription_start_date,
              currentScheduleId: scheduleTierData[0].schedule_id,
              currentTierId: scheduleTierData[0].tier_id,
              currentScheduleSubscribedPrice: curretTierData
                .subscribed_price,
              currentTierSegementCount: curretTierData
                .subscription_upper_bound_seg_count,
              subscriptionAssignDate: scheduleTierData[0].subscription_assign_date,
              overagePrice: 0,
              billing_event: tieredBillingEvent,
              requested_by: requested_by,
              segmentCount: curretTierData
                .subscription_upper_bound_seg_count,
              endDate: scheduleTierData[0].subscription_end_date,
              billingAmount: billingAmount
            };
            let trainingModeOff = await module.exports.updateMerchantIsTraining(merchant_id, '0'); // update is_training status flag 0
            module.exports.saveORUpdateBillingSchedule(updateData).then(
              function (data) {
                responseMsg.OK.message =
                  "Schedule and tier billing information updated.";
                responseMsg.OK.data = data;
                responseMsg.OK.tierDowngraded = tierDowngraded;
                res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
              },
              function (err) {
                console.log(err);
                responseMsg.RESPONSE400.message = "There is something wrong.";
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              }
            );
          } else {
            responseMsg.RESPONSE400.message =
              "No schedule data found.";
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          }
        })
        .catch(function (err) {
          console.log(err);
          responseMsg.RESPONSE400.message = err;
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        });
    }
  },
  /**
   * Update merchant is_training flag
   * @param str merchant_id
   */
  updateMerchantIsTraining: function (merchant_id, flag) {
    return new Promise(function (resolve, reject) {
      var sql = "UPDATE tap_merchants SET is_training = :flag where merchant_id = :merchant_id";
      var queryParam = {
        merchant_id: merchant_id,
        flag: flag
      };
      model.sequelize
        .query(sql, {
          replacements: queryParam,
          type: model.sequelize.QueryTypes.UPDATE
        }).then(function (data) {
          resolve(data);
        }).catch(function (err) {
          reject(err);
        });
    });
  },
  /**
   * Function to check the training mode active or not
   * @param str merchant_id
   */
  checkCurrentScheduleIsTraining: function (merchant_id) {
    return new Promise(function (resolve, reject) {
      model.tap_merchants
        .findAll({
          where: {
            merchant_id: merchant_id,
            is_training: '1'
          }
        })
        .then(function (data) {
          var merchantData = data.map(function (data) {
            return data.toJSON();
          });
          if (merchantData.length > 0) {
            resolve(true);
          } else {
            resolve(false);
          }
        }).catch(function (err) {
          reject(err);
        });
    });
  },
  /**
   * Send email notification when Merchant goes to Training to Active Schedule
   * @param str merchant_id
   */
  sendEmailWhenTrainingToActive: function (merchant_id, isSentWelcomeEmail) {
    if (isSentWelcomeEmail === 'yes') {
      var sql = "SELECT * FROM tap_merchants where merchant_id = :merchant_id";
      var queryParam = {
        merchant_id: merchant_id
      };
      const settings = model.tap_settings.findAll();
      const merchantQuery = model.tap_merchants
        .findAll({
          where: {
            merchant_id: merchant_id
          }
        })
      Promise.all([merchantQuery, settings])
        .then(result => {
          var data = result[0].map(function (result) {
            return result.toJSON();
          });
          var settingsData = result[1].map(function (result) {
            return result.toJSON();
          });
          console.log("merchant details: ", data);
          console.log("settingsData details: ", settingsData);
          const emailNotificationCheck =
            settingsData[0].email_notification_check;
          const merchantEmailNotificationCheck = data[0]
            .email_notification_check;
          if (data.length > 0 && emailNotificationCheck == 'true' && merchantEmailNotificationCheck == 'true') {
            var merchantEmailId = data[0].email;
            var merchantSecondaryEmail = data[0].secondary_email;
            if (merchantSecondaryEmail) {
              merchantEmailId = merchantSecondaryEmail;
            }
            if (data[0].tier_billing_notification_language == 'Spanish') {
              var name = emailContent.MERCHANT_TRAINING_TO_ACTIVE.spanish.name;
              var emailSubject = emailContent.MERCHANT_TRAINING_TO_ACTIVE.spanish.subject;
              var content = emailContent.MERCHANT_TRAINING_TO_ACTIVE.spanish.content;
              var content1 = emailContent.MERCHANT_TRAINING_TO_ACTIVE.spanish.content1;
              var footer = emailContent.MERCHANT_TRAINING_TO_ACTIVE.spanish.footer;
              var unlimited = 'ilimitado';
            } else {
              var name = emailContent.MERCHANT_TRAINING_TO_ACTIVE.english.name;
              var emailSubject = emailContent.MERCHANT_TRAINING_TO_ACTIVE.english.subject;
              var content = emailContent.MERCHANT_TRAINING_TO_ACTIVE.english.content;
              var content1 = emailContent.MERCHANT_TRAINING_TO_ACTIVE.english.content1;
              var footer = emailContent.MERCHANT_TRAINING_TO_ACTIVE.english.footer;
              var unlimited = 'unlimited';
            }
            module.exports.getMerchantCurrentSubscription(merchant_id).then(subscriptionData => {
              var day = new Date(subscriptionData.subscription_start_date * 1000).getDate();
              var currentPrice = subscriptionData.subscribed_price;
              var smsLimit = subscriptionData.subscription_upper_bound_seg_count;
              var adminMailContent = helper.getEmailTemplateContent(
                "merchant_training_to_active_schedule.html"
              );

              name = name.replace("%FIRST_NAME%", data[0].first_name);
              content1 = content1.replace("%DAY%", helper.ordinal_suffix_of(day));
              content1 = content1.replace("%CURRENT_PRICE%", currentPrice);
              content1 = content1.replace("%SMS_LIMIT%", (smsLimit == 0 || smsLimit == '0') ? unlimited : smsLimit);

              adminMailContent = adminMailContent.replace("%FIRST_NAME%", name);
              adminMailContent = adminMailContent.replace("%CONTENT%", content);
              adminMailContent = adminMailContent.replace("%CONTENT_TEXT%", content1);
              adminMailContent = adminMailContent.replace("%FOOTER%", footer);
              adminMailContent = adminMailContent.replace("%CURRENT_YEAR%", new Date().getFullYear());
              if (data[0].tier_billing_notification_language == 'Spanish') {
                adminMailContent = adminMailContent.replace(
                  "%LINK_PHONE_NUMBER%",
                  '+1-787-991-7331'
                );
                adminMailContent = adminMailContent.replace(
                  "%PHONE_NUMBER%",
                  '+1-787-991-7331'
                );
              } else {
                adminMailContent = adminMailContent.replace(
                  "%LINK_PHONE_NUMBER%",
                  '+1-844-899-8559'
                );
                adminMailContent = adminMailContent.replace(
                  "%PHONE_NUMBER%",
                  '+1-844-899-8559'
                );
              }
              helper.sendEmailFromAdmin(merchantEmailId, emailSubject, adminMailContent);
            }, (error) => {
              console.log(error);
            });
          }
        }).catch(function (err) {
          console.log(err);
        });
    }
  },
  /**
   Function to get the Merchant current tier and subscription
   @param str merchant_id
   */
  getMerchantCurrentSubscription: function (merchant_id) {
    return new Promise(function (resolve, reject) {
      var sql = "SELECT tss.subscription_start_date, tss.subscription_end_date, tss.subscription_assign_date, tsti.* FROM tap_schedule_subscription AS tss INNER JOIN tap_schedule_tier_information AS tsti ON tss.tier_id = tsti.id where tss.merchant_id = :merchant_id";
      var queryParam = {
        merchant_id: merchant_id
      };
      model.sequelize
        .query(sql, {
          replacements: queryParam,
          type: model.sequelize.QueryTypes.SELECT
        }).then(function (data) {
          if (data.length > 0) {
            resolve(data[0]);
          } else {
            resolve(null);
          }
        }).catch(function (err) {
          console.log(err);
          reject(err);
        });
    });
  },
  /**
   * Send mail limit exceed notification Admin, Account manager, Merchant
   *  @param {*} mailparams
   *  @param {*} autoResponseMessages
   */
  sendLimitMailNotfication: function (
    merchant_id,
    data,
    type
  ) {
    return new Promise(function (resolve, reject) {
      const emailNotificationCheck =
        data.settingsData[0].email_notification_check;
      const merchantEmailNotificationCheck = data.scheduleData.tap_merchant
        .email_notification_check;
      const BillingNotificationLanguage = data.scheduleData.tap_merchant
        .tier_billing_notification_language;
      if (emailNotificationCheck == "true" && merchantEmailNotificationCheck == "true") {
        var mailContent = BillingNotificationLanguage == 'Spanish'
          ? emailContent.MERCHANT_TIER_SMS_LIMT_EXCEED_WRNING.spanish.html : emailContent.MERCHANT_TIER_SMS_LIMT_EXCEED_WRNING.english.html;
        var merchantEmailId = data.scheduleData.tap_merchant
          .secondary_email
          ? data.scheduleData.tap_merchant.secondary_email
          : data.scheduleData.tap_merchant.email;

        var emailSubject = BillingNotificationLanguage == 'Spanish'
          ? emailContent.MERCHANT_TIER_SMS_LIMT_EXCEED_WRNING.spanish.subject : emailContent.MERCHANT_TIER_SMS_LIMT_EXCEED_WRNING.english.subject;
        // Admin Mail Content and subject
        var adminMailContent = BillingNotificationLanguage == 'Spanish'
          ? emailContent.ADMIN_TIER_SMS_LIMT_EXCEED_WRNING.spanish.html : emailContent.ADMIN_TIER_SMS_LIMT_EXCEED_WRNING.english.html;
        var adminEmailId = constantData.BILLING_MAIL;
        var adminEmailSubject = BillingNotificationLanguage == 'Spanish' ? emailContent.ADMIN_TIER_SMS_LIMT_EXCEED_WRNING.spanish.subject : emailContent.ADMIN_TIER_SMS_LIMT_EXCEED_WRNING.english.subject;
        // Account taem Mail Content and subject
        var accountMailContent = BillingNotificationLanguage == 'Spanish'
          ? emailContent.ACCOUN_MANAGER_TIER_SMS_LIMT_EXCEED_WRNING.spanish.html : emailContent.ACCOUN_MANAGER_TIER_SMS_LIMT_EXCEED_WRNING.english.html;
        var accountEmailId = constantData.BILLING_ACCOUNT_MANAGER_MAIL;
        var accountEmailSubject = BillingNotificationLanguage == 'Spanish' ? emailContent.ACCOUN_MANAGER_TIER_SMS_LIMT_EXCEED_WRNING.spanish.subject : emailContent.ACCOUN_MANAGER_TIER_SMS_LIMT_EXCEED_WRNING.english.subject;
        // Replace short code in merchant email content
        mailContent = mailContent.replace(
          "%UPPER_BOUND%",
          data.scheduleData.tap_merchant.sms_limit
        );
        mailContent = mailContent.replace(
          "%SENT_SMS%",
          data.scheduleData.tap_merchant.sms_sent
        );
        if (BillingNotificationLanguage == 'Spanish') {
          mailContent = mailContent.replace(
            "%LINK_PHONE_NUMBER%",
            '+1-787-991-7331'
          );
          mailContent = mailContent.replace(
            "%PHONE_NUMBER%",
            '+1-787-991-7331'
          );
        } else {
          mailContent = mailContent.replace(
            "%LINK_PHONE_NUMBER%",
            '+1-844-899-8559'
          );
          mailContent = mailContent.replace(
            "%PHONE_NUMBER%",
            '+1-844-899-8559'
          );
        }

        var requestCompleteionDate = "";
        var startDate = "";
        var currentDate = "";
        startDate = moment(
          data.scheduleData.subscription_start_date * 1000
        ).format("MM-DD-YYYY");
        currentDate = moment().format("MM-DD-YYYY");
        console.log("currentDate2-------- ", currentDate);
        console.log(
          "startDate2-------- ",
          startDate
        );
        if (
          Date.parse(startDate) >
          Date.parse(currentDate)) {
          requestCompleteionDate = moment(data.scheduleData.subscription_start_date * 1000).format("MM-DD-YYYY");
        } else {
          requestCompleteionDate = moment(data.scheduleData.subscription_end_date * 1000).add(1, "days").format("MM-DD-YYYY");
        }
        mailContent = mailContent.replace(
          "%CYCLE_REFRESH_DATE%",
          requestCompleteionDate
        );
        // Replace short code in admin email content
        adminMailContent = adminMailContent.replace(
          "%DBA%",
          data.scheduleData.tap_merchant.nick_name
        );
        adminEmailSubject = adminEmailSubject.replace(
          "%DBA%",
          data.scheduleData.tap_merchant.nick_name
        );
        adminMailContent = adminMailContent.replace(
          "%UPPER_BOUND%",
          data.scheduleData.tap_merchant.sms_limit
        );
        adminMailContent = adminMailContent.replace(
          "%SENT_SMS%",
          data.scheduleData.tap_merchant.sms_sent
        );
        // Replace short code in account team email content
        accountMailContent = accountMailContent.replace(
          "%DBA%",
          data.scheduleData.tap_merchant.nick_name
        );
        accountEmailSubject = accountEmailSubject.replace(
          "%DBA%",
          data.scheduleData.tap_merchant.nick_name
        );
        accountMailContent = accountMailContent.replace(
          "%UPPER_BOUND%",
          data.scheduleData.tap_merchant.sms_limit
        );
        accountMailContent = accountMailContent.replace(
          "%SENT_SMS%",
          data.scheduleData.tap_merchant.sms_sent
        );
        Promise.all([helper
          .sendEmailFromAdmin(
            merchantEmailId,
            emailSubject,
            mailContent
          ), helper
            .sendEmailFromAdmin(
              adminEmailId,
              adminEmailSubject,
              adminMailContent
            ), helper
              .sendEmailFromAdmin(
                accountEmailId,
                accountEmailSubject,
                accountMailContent
              )])
          .then(
            function (Maildata) {
              console.log("maildataArray ", Maildata);
              var today = Math.floor(Date.now() / 1000);
              console.log("Email Data..................", Maildata);
              var updateNotificationTime = {};
              if (type == "Immidiate") {
                updateNotificationTime.exceed_limit_notification_sent = 0;
                updateNotificationTime.last_exceed_limit_notification_sent_time = today;
              } else if (type == "TimeZone") {
                updateNotificationTime.exceed_limit_notification_sent = data.scheduleData.tap_merchant.exceed_limit_notification_sent + 1;
                updateNotificationTime.last_exceed_limit_notification_sent_time = today;
              }
              model.tap_merchants
                .update(updateNotificationTime, {
                  where: {
                    merchant_id: merchant_id
                  }
                })
                .then(function (data) {
                  resolve("mail send successfully and data updated");
                })
                .catch(function (err) {
                  resolve("mail send successfully and data not updated");
                });
            },
            function (error) {
              console.log(
                "maildataArray ERROR============== ",
                error
              );
              var today = Math.floor(Date.now() / 1000);
              var updateNotificationTime = {};
              if (type == "Immidiate") {
                updateNotificationTime.exceed_limit_notification_sent = 0;
                updateNotificationTime.last_exceed_limit_notification_sent_time = today;
              } else if (type == "TimeZone") {
                updateNotificationTime.exceed_limit_notification_sent = data.scheduleData.tap_merchant.exceed_limit_notification_sent + 1;
                updateNotificationTime.last_exceed_limit_notification_sent_time = today;
              }
              model.tap_merchants
                .update(updateNotificationTime, {
                  where: {
                    merchant_id: merchant_id
                  }
                })
                .then(function (data) {
                  resolve("mail send successfully and data updated");
                })
                .catch(function (err) {
                  resolve("mail send successfully and data not updated");
                });
            }
          );
      } else {
        console.log("Email setting off");
        reject("Email setting off");
      }
    });
  },
  /**
   * SSO login for Tiered Billing
   * @param {*} req 
   * @param {*} res 
   */
  tieredBillinLogin: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    console.log(req.body);
    var mid = req.body.mid;
    if (!mid) {
      responseMsg.RESPONSE400.message = RES_MESSAGE.ERROR_PARAM_MISSING;
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      let merchant_id = helper.getMerchantIdFromEncodedLink(mid);
      model.tap_merchants
        .findAll({
          where: {
            merchant_id: merchant_id
          }
        })
        .then(function (data) {
          var merchantData = data.map(function (data) {
            return data.toJSON();
          });
          console.log("merchant details: ", merchantData);
          if (
            merchantData.length > 0
          ) {
            responseMsg.OK.message = "Merchant data found.";
            responseMsg.OK.data = merchantData;
            res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
          } else {
            responseMsg.RESPONSE400.message = "Merchant data not found.";
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          }
        })
        .catch(function (err) {
          console.log(err);
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        });
    }
  }
};