"use strict";

var model = require("../model");
var config = require("../config/config");
var commonFunction = require("../controller/common");
var createApiLogs = require("../controller/common/apiLoggerController");
var invokeFunction = require("../controller/invoked");
const RES_MESSAGE = require("../language/errorMsg");
const moment = require("moment");
var atob = require("atob");
var unixtimestamp = require("unix-timestamp");
const request = require("request");
var async = require("async");
var path = require("path");
var crypto = require("crypto");
var helper = require("../controller/common/helper");

//Controller Used for schedule-tier billing.
module.exports = {
  /**
   *
   * Create Schedule tier billing Application.
   * @param {*} req @schedule_name,@start_date & @tier_count
   * @param {*} res
   */
  createShedule: function (req, res) {
    var responseMsg = require("../language/resMessage");
    console.log("req=====>1schedule_formData", req.body.schedule_formData);
    console.log("req=====>1bulk_tierInfo", req.body.bulk_tierInfo);
    var schedule_data = req.body.schedule_formData;
    var tier_data = req.body.bulk_tierInfo;
    if (schedule_data == undefined || tier_data == undefined) {
      console.log("Please provide us required field.");
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      console.log("Success.");
      var today_time = Math.floor(Date.now() / 1000);
      model.tap_billingschedule
        .create({
          schedule_name: schedule_data.schedule_name,
          tier_count: schedule_data.tier_count,
          created_by: schedule_data.created_by,
          isschedule_active: schedule_data.isScheduleActive,
          start_date: today_time,
          update_date: today_time
        })
        .then(function (result) {
          for (var i = 0; i < tier_data.length; i++) {
            tier_data[i]["schedule_id"] = result.id;
          }
          console.log("after shedule id:", tier_data);
          model.tap_schedule_tier_information
            .bulkCreate(tier_data)
            .then(function (issendSMSstored) {
              console.log("success");
              responseMsg.OK.message = "Schedule created successfully.";
              res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
            })
            .catch(function (err) {
              console.log("catch err", err);
              responseMsg.RESPONSE400.message = err;
              res
                .status(responseMsg.RESPONSE400.statusCode)
                .send(responseMsg.RESPONSE400);
            });
        })
        .catch(function (err) {
          console.log("catch err", err);
          responseMsg.RESPONSE400.message = err;
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        });
    }
  },
  /**
   *
   * Edit the Schedule Tierinformation....
   * @param {*} req
   * @param {*} res
   */
  editShedule: function (req, res) {
    var responseMsg = require("../language/resMessage");
    console.log("req=====>1schedule_formData", req.body.schedule_formData);
    console.log("req=====>1bulk_tierInfo", req.body.bulk_tierInfo);
    var schedule_data = req.body.schedule_formData;
    var tier_data = req.body.bulk_tierInfo;
    var insert_tier_data = req.body.insertBulkTierInfo;
    console.log("insert_tier_data========>", insert_tier_data);
    if (schedule_data == undefined || tier_data == undefined) {
      console.log("Please provide us required field.");
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      console.log("Success.");
      var today_time = Math.floor(Date.now() / 1000);
      model.tap_billingschedule
        .update(
          {
            schedule_name: schedule_data.schedule_name,
            tier_count: schedule_data.tier_count,
            isschedule_active: schedule_data.isScheduleActive,
            update_date: today_time
          },
          {
            where: {
              id: schedule_data.schedule_id
            }
          }
        )
        .then(function (result) {
          for (var i = 0; i < tier_data.length; i++) {
            tier_data[i]["schedule_id"] = schedule_data.schedule_id;
          }
          Promise.all([
            module.exports.insertTierDuringEdit(
              insert_tier_data,
              schedule_data.schedule_id
            ),
            module.exports.updateTier(tier_data, schedule_data.scheduleTierId)
          ])
            .then(function (values) {
              responseMsg.OK.message = "Schedule updated successfully.";
              res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
            })
            .catch(function (err) {
              console.log("catch err", err);
              responseMsg.RESPONSE400.message = err;
              res
                .status(responseMsg.RESPONSE400.statusCode)
                .send(responseMsg.RESPONSE400);
            });
        })
        .catch(function (err) {
          console.log("catch err", err);
          responseMsg.RESPONSE400.message = err;
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        });
    }
  },
  /**
   *
   * Delete All Previous tier for this
   * @param {*} schedule_id
   */
  updateTier: function (previousTier, allTierId) {
    return new Promise(function (resolve, reject) {
      console.log("previousTier====>", previousTier);
      console.log("previousTier====>", allTierId);
      if (allTierId.length > 0) {
        async.forEachOf(
          previousTier,
          function (value, key, callback) {
            console.log("===================================", value);
            console.log("===================================", allTierId[key]);
            console.log(
              key + "===================================",
              allTierId.length
            );
            model.tap_schedule_tier_information
              .update(value, {
                where: {
                  id: allTierId[key]
                }
              })
              .then(function (result) {
                if (key + 1 == allTierId.length) {
                  resolve(true);
                }
              })
              .catch(function (err) {
                if (key + 1 == allTierId.length) {
                  resolve(true);
                }
              });
          },
          function (err) {
            if (key + 1 == allTierId.length) {
              resolve(true);
            }
          }
        );
      } else {
        resolve(true);
      }
    });
  },
  /**
   * Edit Tier information
   * Create New Tier for a schedule...
   * @param {*} schedule_id
   */
  insertTierDuringEdit: function (insertTier, schedule_id) {
    return new Promise(function (resolve, reject) {
      var createTier = insertTier || [];
      console.log("createTier=============>", createTier);
      if (createTier.length > 0 && createTier.length != undefined) {
        for (var i = 0; i < createTier.length; i++) {
          createTier[i]["schedule_id"] = schedule_id;
        }
        model.tap_schedule_tier_information
          .bulkCreate(createTier)
          .then(function (issendSMSstored) {
            resolve(true);
          })
          .catch(function (err) {
            resolve(true);
          });
      } else {
        resolve(true);
      }
    });
  },
  activateSchedule: function (req, res) {
    var responseMsg = require("../language/resMessage");
    const scheduleId = req.body.schedule_id;
    const isScheduleActive = req.body.isScheduleActivated;
    if (
      (scheduleId == undefined && scheduleId == "") ||
      (isScheduleActive == undefined && isScheduleActive == "")
    ) {
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      model.tap_billingschedule
        .update(
          {
            isschedule_active: isScheduleActive == "1" ? "1" : "0"
          },
          {
            where: {
              id: scheduleId
            }
          }
        )
        .then(function (result) {
          responseMsg.OK.message =
            isScheduleActive == "1"
              ? "Schedule activated successfully."
              : "Schedule deactivated successfully.";
          res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
        })
        .catch(function (err) {
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        });
    }
  },
  /**
   *
   * Delete All Previous tier for this
   * @param {*} schedule_id
   */
  deletePreviousTier: function (schedule_id) {
    return new Promise(function (resolve, reject) {
      model.tap_schedule_tier_information
        .destroy({
          where: {
            schedule_id: schedule_id
          }
        })
        .then(function (result) {
          resolve(true);
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },
  /**
   *
   * Get the schedule listing.
   * @param {*} req
   * @param {*} res
   */
  getAllScheduleInfo: function (req, res) {
    console.log("NEXT SMS...");
    var responseMsg = require("../language/resMessage");
    var sql = `SELECT *, IFNULL((SELECT count(id) FROM tap_schedule_subscription where schedule_id=tb.id  GROUP BY tap_schedule_subscription.schedule_id),0) as schedule_used_by_merchant
        FROM tap_billingschedule as tb ORDER BY id desc`;
    model.sequelize
      .query(sql, {
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function (result) {
        if (result.length > 0) {
          responseMsg.RESPONSE200.data = result;
          res
            .status(responseMsg.RESPONSE200.statusCode)
            .send(responseMsg.RESPONSE200);
        } else {
          responseMsg.RESPONSE400.message = "Sorry no records found.";
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        }
      })
      .catch(function (err) {
        console.log("catch err", err);
        responseMsg.RESPONSE400.message = err;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      });
  },
  /**
   *
   * GET tier information of schedule.
   * @param {*} req @schedule_id
   * @param {*} res
   */
  getScheduleTiers: function (req, res) {
    console.log("chs");
    var responseMsg = require("../language/resMessage");
    const schedule_id = req.body.schedule_id;
    console.log(schedule_id);
    if (schedule_id == "" || schedule_id == undefined) {
      responseMsg.RESPONSE400.message = "Please provide us valid schedule id.";
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      model.tap_schedule_tier_information
        .findAll({
          where: {
            schedule_id: schedule_id
          }
        })
        .then(function (result) {
          responseMsg.RESPONSE200.data = result;
          res
            .status(responseMsg.RESPONSE200.statusCode)
            .send(responseMsg.RESPONSE200);
        })
        .catch(function (err) {
          responseMsg.RESPONSE400.message = err;
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        });
    }
  },
  /**
   *
   * Used for update the threshold notification value.
   * @param {*} req
   * @param {*} res
   */
  updateNotificationThreshold: function (req, res) {
    var responseMsg = require("../language/resMessage");
    var first_threshold = req.body.first_threshold;
    var second_threshold = req.body.second_threshold;
    if (
      first_threshold == undefined ||
      second_threshold == undefined ||
      first_threshold == "" ||
      second_threshold == ""
    ) {
      responseMsg.RESPONSE400.message = "Please provide us valid input field.";
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      model.tap_settings
        .update(
          {
            first_threshold_val: first_threshold,
            second_threshold_val: second_threshold
          },
          {
            where: {
              id: 1
            }
          }
        )
        .then(function (data) {
          responseMsg.OK.message = "Updated successfully.";
          res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
        })
        .catch(function (err) {
          console.log(err);
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        });
    }
  },
  checkSheduleExist: function (req, res) {
    let responseMsg = require("../language/resMessage");
    if (req.body.schedule_name == "") {
      responseMsg.RESPONSE400.message = "Schedule name is required.";
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      model.tap_billingschedule
        .findAll({
          attributes: ["id", "schedule_name"],
          where: {
            schedule_name: req.body.schedule_name
          }
        })
        .then(function (result) {
          console.log("resultexist===>", result);
          if (result.length > 0) {
            responseMsg.RESPONSE200.message = "Schedule name already exist.";
            responseMsg.RESPONSE200.data = {
              schedule_name_exist: true
            };
            res
              .status(responseMsg.RESPONSE200.statusCode)
              .send(responseMsg.RESPONSE200);
          } else {
            responseMsg.RESPONSE200.message = "Success";
            responseMsg.RESPONSE200.data = {
              schedule_name_exist: false
            };
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
    }
  },
  /**
   * Get Billing report list with filter.
   * @param {*} req
   * @param {*} res
   */
  billingReport: function (req, res) {
    var responseMsg = require("../language/resMessage");
    console.log("req=====>", JSON.stringify(req.body));
    var filterdData = req.body.filterData;
    var whereCondition = {
      active: "true"
    };
    var billingWhereCondition = {};
    if (filterdData["search"]["value"]) {
      whereCondition["$or"] = [
        {
          merchant_id: {
            $like: "%" + filterdData["search"]["value"] + "%"
          }
        },
        {
          dba: {
            $like: "%" + filterdData["search"]["value"] + "%"
          }
        },
        {
          email: {
            $like: "%" + filterdData["search"]["value"] + "%"
          }
        },
        {
          phoneNumber: {
            $like: "%" + filterdData["search"]["value"] + "%"
          }
        }
      ];
    }
    if (filterdData["start_date"] && filterdData["end_date"]) {
      billingWhereCondition.date_triggered = {
        $gte: filterdData["start_date"],
        $lte: filterdData["end_date"]
      };
    }
    var start = parseInt(filterdData["start"]); //Paging first record indicator.
    var length = parseInt(filterdData["length"]); //Number of records that the table can display in the current draw

    model.tap_billing_report.belongsTo(model.tap_merchants, {
      foreignKey: "merchant_id",
      targetKey: "merchant_id"
    });
    model.tap_billing_report.belongsTo(model.tap_billingschedule, {
      foreignKey: "schedule_id",
      targetKey: "id"
    });

    var outputData = {};
    outputData.totalRecords = 0;
    model.tap_billing_report
      .findAll({
        attributes: [
          [
            model.sequelize.fn(
              "COUNT",
              model.sequelize.col("tap_billing_report.id")
            ),
            "totalRecords"
          ]
        ],
        where: billingWhereCondition,
        include: {
          attributes: ["dba"],
          model: model.tap_merchants,
          where: whereCondition
        }
      })
      .then(function (data) {
        var totalRecordData = data.map(function (data) {
          return data.toJSON();
        });
        console.log("merchant details: ", totalRecordData);
        if (totalRecordData[0].totalRecords) {
          outputData.totalRecords = totalRecordData[0].totalRecords;
          if (length == "-1") {
            length = totalRecordData[0].totalRecords;
          }
          model.tap_billing_report
            .findAll({
              attributes: [
                "merchant_id",
                "schedule_id",
                "segment_count",
                "overage_charge",
                "current_monthly_subscription",
                "new_monthly_subscription",
                "billing_event",
                "date_triggered",
                "event_completion_date",
                [
                  model.sequelize.literal(
                    "(SELECT tier_number FROM tap_schedule_tier_information WHERE tap_schedule_tier_information.id = tap_billing_report.current_tier)"
                  ),
                  "current_tier"
                ],
                [
                  model.sequelize.literal(
                    "(SELECT tier_number FROM tap_schedule_tier_information WHERE tap_schedule_tier_information.id = tap_billing_report.new_tier)"
                  ),
                  "new_tier"
                ]
              ],
              where: billingWhereCondition,
              include: [
                {
                  attributes: ["dba"],
                  model: model.tap_merchants,
                  where: whereCondition
                },
                {
                  attributes: ["schedule_name"],
                  model: model.tap_billingschedule
                }
              ],
              order: [["date_triggered", "DESC"]],
              offset: start,
              limit: length
            })
            .then(function (data) {
              var paginationData = data.map(function (data) {
                data.date_triggered = moment(
                  data.date_triggered * 1000
                ).format("MM/DD/YYYY");
                data.event_completion_date = moment(
                  data.event_completion_date * 1000
                ).format("MM/DD/YYYY");
                return data.toJSON();
              });
              console.log("merchant paginationData : ", paginationData);
              outputData.paginationData = {};
              if (paginationData.length > 0) {
                outputData.paginationData = paginationData;
                responseMsg.OK.message = "billing report data";
                responseMsg.OK.data = outputData;
                res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
              } else {
                responseMsg.OK.message = "billing report data";
                responseMsg.OK.data = outputData;
                res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
              }
            })
            .catch(function (err) {
              console.log(err);
              res
                .status(responseMsg.RESPONSE400.statusCode)
                .send(responseMsg.RESPONSE400);
            });
        } else {
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
  },
  /**
   *
   * GET ALL MERCHANTS LIST WHO HAVE THIS SCHEDULE.
   * @param {*} req
   * @param {*} res
   */
  scheduleMerchantList: function (req, res) {
    const schedule_id = req.body.schedule_id;
    let responseMsg = require("../language/resMessage");
    let sql = `SELECT tm.merchant_id,tm.dba
            FROM tap_schedule_subscription as ts
            INNER JOIN tap_merchants as tm ON ts.merchant_id = tm.merchant_id where ts.schedule_id=${schedule_id}`;
    model.sequelize
      .query(sql, {
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function (result) {
        responseMsg.RESPONSE200.message = "Success.";
        responseMsg.RESPONSE200.data = result;
        res
          .status(responseMsg.RESPONSE200.statusCode)
          .send(responseMsg.RESPONSE200);
      })
      .catch(function (err) {
        console.log("catch err", err);
        responseMsg.RESPONSE400.message = err;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      });
  },
  /**
   * Fetch current schedule detail
   * @param {*} req
   * @param {*} res
   */
  currentScheduleInfo: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    console.log(req.body);
    var merchant_id = req.body.merchant_id;
    var roleTypeList = req.body.roleTypeList;
    if (!merchant_id) {
      responseMsg.RESPONSE400.message = RES_MESSAGE.ERROR_PARAM_MISSING;
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      model.tap_schedule_subscription.belongsTo(model.tap_billingschedule, {
        foreignKey: "schedule_id",
        targetKey: "id"
      });
      model.tap_schedule_subscription.hasMany(
        model.tap_schedule_tier_information,
        {
          foreignKey: "schedule_id",
          sourceKey: "schedule_id"
        }
      );
      model.tap_schedule_subscription.belongsTo(model.tap_merchants, {
        foreignKey: "merchant_id",
        targetKey: "merchant_id"
      });
      model.tap_schedule_subscription
        .findAll({
          where: {
            merchant_id: merchant_id
          },
          include: [
            {
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
                "sms_limit",
                "sms_unlimited",
                "sms_sent"
              ],
              model: model.tap_merchants
            }
          ]
        })
        .then(function (data) {
          var scheduleData = data.map(function (data) {
            return data.toJSON();
          });
          console.log("Schedule Data: ", scheduleData);
          if (scheduleData.length > 0) {
            responseMsg.OK.message = "schedule data found.";
            console.log("scheduleListData[0].subscription_assign_date: ", scheduleData[0].subscription_assign_date);
            scheduleData[0].start_date = scheduleData[0].subscription_start_date;
            scheduleData[0].subscription_assign_date = moment(
              scheduleData[0].subscription_assign_date * 1000
            ).format("MM/DD/YYYY");
            scheduleData[0].subscription_start_date = moment(
              scheduleData[0].subscription_start_date * 1000
            ).format("MM/DD/YYYY");
            responseMsg.OK.data = scheduleData[0];
            model.tap_billingschedule
              .findAll({
                attributes: [
                  "id",
                  "schedule_name",
                  "tier_count",
                  "start_date",
                  "created_by"
                ],
                where: {
                  isschedule_active: "1"
                },
                order: [
                  ['schedule_name', 'asc'],
                ]
              })
              .then(function (data) {
                var scheduleListData = data.map(function (data) {
                  return data.toJSON();
                });
                console.log("Schedule List: ", scheduleListData);
                
                
                responseMsg.OK.data.scheduleListData = scheduleListData;
                res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
              })
              .catch(function (err) {
                console.log(err);
                responseMsg.OK.data.scheduleListData = {};
                res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
              });
          } else {
            model.tap_billingschedule
              .findAll({
                attributes: [
                  "id",
                  "schedule_name",
                  "tier_count",
                  "start_date",
                  "created_by"
                ],
                where: {
                  isschedule_active: "1"
                },
                order: [
                  ['schedule_name', 'asc'],
                ]
              })
              .then(function (data) {
                var scheduleListData = data.map(function (data) {
                  return data.toJSON();
                });
                console.log("Schedule List: ", scheduleListData);
                responseMsg.RESPONSE400.data = {};
                responseMsg.RESPONSE400.data.scheduleListData = scheduleListData;
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              })
              .catch(function (err) {
                console.log(err);
                responseMsg.RESPONSE400.data = {};
                responseMsg.RESPONSE400.data.scheduleListData = {};
                responseMsg.RESPONSE400.message = "schedule data found.";
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              });
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
   * Fetch selected schedule detail
   * @param {*} req
   * @param {*} res
   */
  scheduleInfo: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../language/resMessage"))
    );
    console.log(req.body);
    var merchant_id = req.body.merchant_id;
    var roleTypeList = req.body.roleTypeList;
    var scheduleID = req.body.scheduleID;
    if (!merchant_id && scheduleID) {
      responseMsg.RESPONSE400.message = RES_MESSAGE.ERROR_PARAM_MISSING;
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    } else {
      model.tap_billingschedule.hasMany(model.tap_schedule_tier_information, {
        foreignKey: "schedule_id",
        sourceKey: "id"
      });
      model.tap_billingschedule
        .findAll({
          where: {
            isschedule_active: "1",
            id: scheduleID
          },
          include: [
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
            }
          ]
        })
        .then(function (data) {
          var scheduleData = data.map(function (data) {
            return data.toJSON();
          });
          console.log("Schedule Details Data: ", scheduleData);
          if (scheduleData.length > 0) {
            responseMsg.OK.message = "schedule data found.";
            responseMsg.OK.data = scheduleData[0];
            scheduleData[0].start_date = scheduleData[0].subscription_start_date;
            scheduleData[0].subscription_assign_date = moment(
              scheduleData[0].subscription_assign_date * 1000
            ).format("MM/DD/YYYY");
            scheduleData[0].subscription_start_date = moment(
              scheduleData[0].subscription_start_date * 1000
            ).format("MM/DD/YYYY");
            res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
          } else {
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
   * Fetch selected schedule detail
   * @param {*} req
   * @param {*} res
   */
  emailSmsNotificationCheck: function (req, res) {
    try {
      const responseMsg = JSON.parse(
        JSON.stringify(require("../language/resMessage"))
      );
      var email_check = req.body.email_check;
      var sms_check = req.body.sms_check;
      if (email_check == null || sms_check == null || email_check == undefined || sms_check == undefined) {

      } else {
        model.tap_settings.update(
          {
            email_notification_check: email_check,
            sms_notification_check: sms_check
          },
          {
            where: {
              id: 1
            }
          }
        ).then((updatedResponse) => {
          if (updatedResponse) {

            responseMsg.OK.message = "Updated successfully.";
            res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
          } else {
            responseMsg.RESPONSE400.message = 'Some Error Occured';
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          }
        })
      }
    } catch (error) {
      responseMsg.RESPONSE400.message = error;
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    }
  },
  /**
   * Get Billing report list with filter.
   * @param {*} req
   * @param {*} res
   */
  getCSV: function (req, res) {
    var responseMsg = require("../language/resMessage");
    console.log("req=====>", JSON.stringify(req.body));
    var filterdData = req.body.filterData;
    var whereCondition = {
      active: "true"
    };
    var billingWhereCondition = {};
    if (filterdData["search"]) {
      whereCondition["$or"] = [
        {
          merchant_id: {
            $like: "%" + filterdData["search"] + "%"
          }
        },
        {
          dba: {
            $like: "%" + filterdData["search"] + "%"
          }
        },
        {
          email: {
            $like: "%" + filterdData["search"] + "%"
          }
        },
        {
          phoneNumber: {
            $like: "%" + filterdData["search"] + "%"
          }
        }
      ];
    }
    if (filterdData["start_date"] && filterdData["end_date"]) {
      billingWhereCondition.date_triggered = {
        $gte: filterdData["start_date"],
        $lte: filterdData["end_date"]
      };
    }

    model.tap_billing_report.belongsTo(model.tap_merchants, {
      foreignKey: "merchant_id",
      targetKey: "merchant_id"
    });
    model.tap_billing_report.belongsTo(model.tap_billingschedule, {
      foreignKey: "schedule_id",
      targetKey: "id"
    });

    var outputData = {};

    model.tap_billing_report
      .findAll({
        attributes: [
          "merchant_id",
          "schedule_id",
          "segment_count",
          "overage_charge",
          "current_monthly_subscription",
          "new_monthly_subscription",
          "billing_event",
          "date_triggered",
          "event_completion_date",
          [
            model.sequelize.literal(
              "(SELECT tier_number FROM tap_schedule_tier_information WHERE tap_schedule_tier_information.id = tap_billing_report.current_tier)"
            ),
            "current_tier"
          ],
          [
            model.sequelize.literal(
              "(SELECT tier_number FROM tap_schedule_tier_information WHERE tap_schedule_tier_information.id = tap_billing_report.new_tier)"
            ),
            "new_tier"
          ]
        ],
        where: billingWhereCondition,
        include: [
          {
            attributes: ["dba"],
            model: model.tap_merchants,
            where: whereCondition
          },
          {
            attributes: ["schedule_name"],
            model: model.tap_billingschedule
          }
        ],
        order: [["date_triggered", "DESC"]],
      })
      .then(function (data) {
        var paginationData = data.map(function (data) {
          data.date_triggered = moment(
            data.date_triggered * 1000
          ).format("MM/DD/YYYY");
          data.event_completion_date = moment(
            data.event_completion_date * 1000
          ).format("MM/DD/YYYY");
          return data.toJSON();
        });
        console.log("merchant paginationData : ", paginationData);
        outputData.paginationData = {};
        if (paginationData.length > 0) {
          outputData.paginationData = paginationData;
          responseMsg.OK.message = "billing report data";
          responseMsg.OK.data = outputData;
          res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
        } else {
          responseMsg.OK.message = "billing report data";
          responseMsg.OK.data = outputData;
          res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
        }
      })
      .catch(function (err) {
        console.log(err);
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      });
  },
};
