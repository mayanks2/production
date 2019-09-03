"use strict";
var model = require("../../model");
// var config = require('../config/config');
var responseMsg = JSON.parse(
  JSON.stringify(require("../../language/resMessage"))
);
var async = require("async");

var Sequelize = require('sequelize')
const Op = Sequelize.Op
var commonFunction = require("../../controller/common/index");
const moment = require("moment-timezone");
var helper = require("../common/helper");
const excel = require("node-excel-export");
const emailContent = require("../../language/emailContent");
var _ = require("underscore");
var fs = require("fs");
var constantData = require("../../language/constantData");
var textSMSConstants = require("../../language/textMessage");
const request = require("request");
var config = require("../../config/config");
var tap_twilioSMSController = require("../tap_twilioSMSController");
var tierBillingScheduleInfo = require("../tierBillingScheduleInfo")
var cronHelpers = require("./cronHelpers")
var BigNumber = require('bignumber.js')
var trainingMode = require('../common/checkTrainingMode')
module.exports = {
  //come back offers 30 days 60 days and 90 days offers
  comebackoffers: function (req, res) {
    return new Promise(function (resolve, reject) {
      var type_id = req.type_id;
      var today = Math.floor(Date.now() / 1000);
      switch (type_id) {
        case 0:
          var totalday = constantData.MERCHANT_30_DAYS_OFFERS;
          break;
        case 1:
          var totalday = constantData.MERCHANT_60_DAYS_OFFERS;
          break;
        case 2:
          var totalday = constantData.MERCHANT_90_DAYS_OFFERS;
      }
      var startdate = moment();
      var stdate = ((moment(startdate).subtract(totalday, "days").startOf('day')) / 1000);
      var endate = ((moment(startdate).subtract(totalday, "days").endOf('day')) / 1000);
      async.waterfall([
        function (callback) {
          commonFunction.getComeBackOffers(type_id, stdate, endate).then(function (offers) {
            callback(null, offers)
          }, function (err) {
            callback(err);
          });
        },
        function (offers, callback) {
          console.log('second offers', offers);
          async.forEachSeries(offers, function (offer, offerCallback) {
            var generate_coupon = false;
            if (offer['time'] !== undefined && offer['time_zone'] !== undefined) {
              generate_coupon = commonFunction.comebackofferTimezoneset(offer['start_date'], offer['time'], offer['time_zone']);
            } else {
              var currentTimeInUTC = moment().unix();
              generate_coupon = commonFunction.comebackofferTimezoneset(currentTimeInUTC, "12:00", "UTC");
            }
            var customer_last_visit_at = (offer.last_visit_at !== null) ? offer.last_visit_at : offer.created_at;
            if (generate_coupon) {
              var days = commonFunction.getTimestampDayss(today, customer_last_visit_at);
              console.log(offer.customer_id + " " + days);
              if (!isNaN(days)) {
                switch (true) {
                  case (days == 30 && parseInt(type_id) === 0):
                    commonFunction.giveOfferToCustomer(offer).then(function (offerSuccess) {
                      console.log(JSON.stringify(offerSuccess));
                      offerCallback();
                    }, function (offerFail) {
                      console.log(offerFail);
                      offerCallback();
                    });
                    break;
                  case (days == 60 && parseInt(type_id) === 1):
                    commonFunction.giveOfferToCustomer(offer).then(function (offerSuccess) {
                      console.log(JSON.stringify(offerSuccess));
                      offerCallback();
                    }, function (offerFail) {
                      console.log(offerFail);
                      offerCallback();
                    });
                    break;
                  case (days == 90 && parseInt(type_id) === 2):
                    commonFunction.giveOfferToCustomer(offer).then(function (offerSuccess) {
                      console.log(JSON.stringify(offerSuccess));
                      offerCallback();
                    }, function (offerFail) {
                      console.log(offerFail);
                      offerCallback();
                    });
                    break;
                }
              }
            } else {
              offerCallback();
            }
          }, function (error, data) {
            callback(null, 'seccess');
          });
        }
      ], function (error, results) {
        resolve(responseMsg.RESPONSE200);
      });
    });

  },
  // token expire from device functionality
  expireToken: function () {
    // commonFunction.removeUnusedToken();
  },
  completeprofileSMS: function () {
    async.waterfall([
      function (callback) {
        commonFunction.getmessageDetails().then(function (result) {
          if (result.length) {
            callback(null, result);
          } else {
            callback('No details Found');
          }
        }).catch(function (err) {
          console.log('Error Message: ', err);
          callback(err);
        });
      },
      function (result, callback) {
        async.forEachOf(result, (offer, index, seccallback) => {
          var phonenumber = offer.customer_phone;
          var merchant_id = offer.merchant_id;
          var customer_id = offer.customer_id;
          if (merchant_id) {
            var PuertoRico = helper.PuertoRico(phonenumber);
            tap_twilioSMSController.twilioSMS({
              "phone": phonenumber,
              "message": offer.message
            }, function (err, sendsms) {
              if (err) {
                console.log("sms sent failed", err);
              } else {
                if (sendsms.statusCode == 200) {
                  model.tap_merchant_optin_batch_sms.update({
                    sms_status: 1
                  }, {
                      where: {
                        id: offer.id
                      }
                    });
                } else {
                  model.tap_merchant_optin_batch_sms.update({
                    sms_status: 1
                  }, {
                      where: {
                        id: offer.id
                      }
                    });
                }
              }
            });


          }

        }, err => {
          if (err)
            callback(err);
          callback(null, 'success');
        });

      }
    ], function (err, result) {
      if (err) {
        return err;
      } else {
        return result;
      }
      // result now equals 'done'    
    });
  },
  merchantActiveInactivestatus: function () {
    var activityDay = constantData.MERCHANT_ACTIVITY_DAYS;
    var couponDay = constantData.MERCHANT_COUPON_DAYS;
    var customeryDay = constantData.MERCHANT_CUSTOMER_DAYS;
    Promise.all([commonFunction.merchant_activity_detail(activityDay), commonFunction.merchant_coupon_detail(couponDay), commonFunction.merchant_customers_detail(customeryDay)]).then(function (data) {
      var activity = JSON.stringify(data[0]);
      var merchant_Coupon = JSON.stringify(data[1]);
      var customers_details = JSON.stringify(data[2]);

      console.log(' Activity   ' + activity);
      console.log(' mcoupon   ' + merchant_Coupon);
      console.log(' cdetails   ' + customers_details);

      var parseactivitydata = JSON.parse(activity);
      var perseCoupon = JSON.parse(merchant_Coupon);
      var persecustomers_details = JSON.parse(customers_details);
      for (var i = 0; i < perseCoupon.length; i++) {
        var filtered = _.where(parseactivitydata, {
          merchant_id: perseCoupon[i].merchant_id
        });
        var index = _.indexOf(_.pluck(parseactivitydata, 'merchant_id'), perseCoupon[i].merchant_id);
        console.log(filtered);
        if (!filtered.length) {
          parseactivitydata.push(perseCoupon[i]);
        } else {
          parseactivitydata[index].lastCouponCreation = perseCoupon[i].lastCouponCreation;
        }
      }

      for (var j = 0; j < persecustomers_details.length; j++) {
        var filtered = _.where(parseactivitydata, {
          merchant_id: persecustomers_details[j].merchant_id
        });
        var index = _.indexOf(_.pluck(parseactivitydata, 'merchant_id'), persecustomers_details[j].merchant_id);

        if (!filtered.length) {
          parseactivitydata.push(persecustomers_details[j]);
        } else {
          parseactivitydata[index].lastOptIn = persecustomers_details[j].lastOptIn;
        }
      }
      console.log(parseactivitydata);
      const styles = {
        headerDark: {
          fill: {
            fgColor: {
              rgb: 'ffe308'
            }
          },
          font: {
            color: {
              rgb: '000000'
            }
          }
        },
        cellPink: {
          fill: {
            fgColor: {
              rgb: 'FFFFCCFF'
            }
          }
        },
        cellGreen: {
          fill: {
            fgColor: {
              rgb: 'FF00FF00'
            }
          }
        },
        cellWhite: {
          fill: {
            fgColor: {
              rgb: 'FBFCFC'
            }
          }
        }
      };

      //Array of objects representing heading rows (very top)
      const heading = [
        [{
          value: 'Merchant details',
          style: {
            fill: {
              fgColor: {
                rgb: ''
              }
            }
          }
        },],
        // <-- It can be only values
      ];

      //Here you specify the export structure
      const specification = {
        merchnat_name: {
          displayName: 'Merchant name',
          headerStyle: styles.headerDark,
          width: 220 // <- width in chars (when the number is passed as string)
        },
        lastlogin: {
          displayName: 'Last date Logged in to Customer Facing Dashboard (' + activityDay + ' days)',
          headerStyle: styles.headerDark,
          cellStyle: function (value, dataset) { // <- style renderer function
            var predate = moment().subtract(activityDay, "days").unix();
            console.log(dataset.login + "<" + dataset.merchant_id + " mer  " + predate);
            // if the status is 1 then color in green else color in red
            // Notice how we use another cell value to style the current one
            return (dataset.login < predate) ? {} : styles.cellGreen; // <- Inline cell style is possible 
          },
          width: 380 // <- width in chars (when the number is passed as string)
        },
        lastOptIn: {
          displayName: 'Last Date of Customer Opt in (' + customeryDay + ' days)',
          headerStyle: styles.headerDark,
          cellStyle: function (value, dataset) { // <- style renderer function
            var predateopt = moment().subtract(customeryDay, "days").unix();
            console.log(dataset.optin + "<" + dataset.merchant_id + " mer  " + predateopt);
            // if the status is 1 then color in green else color in red
            // Notice how we use another cell value to style the current one
            return (dataset.optin < predateopt) ? {} : styles.cellGreen; // <- Inline cell style is possible 
          },
          //cellStyle: styles.cellPink, // <- Cell style
          width: 320 // <- width in pixels
        },
        lastCouponCreation: {
          displayName: 'Last date of coupon creation (' + couponDay + ' days)',
          headerStyle: styles.headerDark,
          cellStyle: function (value, dataset) { // <- style renderer function
            var predateoffer = moment().subtract(couponDay, "days").unix();
            console.log(dataset.offer + "<" + dataset.merchant_id + " mer  " + predateoffer);
            // if the status is 1 then color in green else color in red
            // Notice how we use another cell value to style the current one
            return (dataset.offer < predateoffer) ? {} : styles.cellGreen; // <- Inline cell style is possible 
          },
          //cellStyle: styles.cellPink, // <- Cell style
          width: 320 // <- width in pixels
        }
      }

      const dataset = parseactivitydata;
      // Define an array of merges. 1-1 = A:1
      // The merges are independent of the data.
      // A merge will overwrite all data _not_ in the top-left cell.
      const merges = [{
        start: {
          row: 2,
          column: 1
        },
        end: {
          row: 2,
          column: 1
        }
      },
      {
        start: {
          row: 2,
          column: 2
        },
        end: {
          row: 3,
          column: 1
        }
      },
      {
        start: {
          row: 2,
          column: 3
        },
        end: {
          row: 4,
          column: 1
        }
      }
      ]

      // Create the excel report.
      // This function will return Buffer
      const report = excel.buildExport(
        [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
          {
            name: 'Report', // <- Specify sheet name (optional)
            //heading: heading, // <- Raw heading array (optional)
            merges: merges, // <- Merge cell ranges
            specification: specification, // <- Report specification
            data: dataset // <-- Report data
          }
        ]
      );
      var fileName = moment().format("MM-DD-YYYY_HH:mm:ss") + '_report.xlsx';
      var emailData = emailContent.MERCHANT_ACTIVE_INACTIVE;
      helper.sendEmailFromAdmin(emailData.to, emailData.subject, emailData.html, report, fileName);

    }, function (error) {
      console.log(error);
    });

  },
  /**
   * Cron Job for send mail notfication to merchant regarding auto response message bucket
   */
  sendAutoResponseBucketNotification: function (timezone) {
    model.tap_merchant_deep_link.belongsTo(model.tap_merchants, {
      foreignKey: "merchant_id",
      targetKey: "merchant_id"
    });
    model.tap_merchant_deep_link
      .findAll({
        attributes: [
          "positive_messages",
          "negative_messages",
          "positive_auto_reply_status",
          "negative_auto_reply_status",
          "positive_mail_notification",
          "positive_last_mail_notification_time",
          "negative_mail_notification",
          "negative_last_mail_notification_time"
        ],
        where: {
          review_generation_process_status: "1"
        },
        include: {
          model: model.tap_merchants,
          where: {
            active: "true",
            yext: "1",
            timezone: timezone
          }
        }
      })
      .then(function (data) {
        var autoResponseData = data.map(function (data) {
          return data.toJSON();
        });
        console.log("auto Response details: ", autoResponseData);
        if (autoResponseData.length > 0) {
          async.forEachOf(
            autoResponseData,
            (autoResponseMessages, index, callback) => {
              var positiveMessages = {};
              if (autoResponseMessages.positive_messages) {
                positiveMessages = JSON.parse(
                  autoResponseMessages.positive_messages
                );
              }
              var positiveUnUsedCount = helper.unUsedResponseCount(
                positiveMessages
              );
              console.log(
                "Merchant Id------ " +
                autoResponseMessages.tap_merchant.merchant_id +
                " Positive count------------ " +
                positiveUnUsedCount
              );
              var negativeMessages = {};
              if (autoResponseMessages.negative_messages) {
                negativeMessages = JSON.parse(
                  autoResponseMessages.negative_messages
                );
              }
              var negativeUnUsedCount = helper.unUsedResponseCount(
                negativeMessages
              );
              console.log(
                "Merchant Id------ " +
                "" +
                autoResponseMessages.tap_merchant.merchant_id +
                " Negative count------------ " +
                negativeUnUsedCount
              );
              var notificationCategory = [];
              if (
                positiveUnUsedCount <= 3 &&
                autoResponseMessages.positive_auto_reply_status &&
                autoResponseMessages.tap_merchant.timezone
              ) {
                notificationCategory.push("positive");
              }
              if (
                negativeUnUsedCount <= 3 &&
                autoResponseMessages.negative_auto_reply_status &&
                autoResponseMessages.tap_merchant.timezone
              ) {
                notificationCategory.push("negative");
              }
              async.forEachOf(
                notificationCategory,
                (type, index, mailCallback) => {
                  var today = moment();
                  var mail_notification = 0;
                  var last_mail_notification_time = "";
                  var email_subject = emailContent.AUTO_RESPONSE_MAIL.subject;
                  var email_from = emailContent.AUTO_RESPONSE_MAIL.from_mail;
                  var messageData = emailContent.AUTO_RESPONSE_MAIL.html;
                  if (type == "positive") {
                    email_subject = email_subject.replace("%TYPE%", "positive");
                    email_subject = email_subject.replace(
                      "%COUNT%",
                      positiveUnUsedCount
                    );
                    messageData = messageData.replace("%TYPE%", "positive");
                    messageData = messageData.replace(
                      "%COUNT%",
                      positiveUnUsedCount
                    );
                    mail_notification =
                      autoResponseMessages.positive_mail_notification;
                    last_mail_notification_time =
                      autoResponseMessages.positive_last_mail_notification_time;
                  } else if (type == "negative") {
                    email_subject = email_subject.replace("%TYPE%", "negative");
                    email_subject = email_subject.replace(
                      "%COUNT%",
                      negativeUnUsedCount
                    );
                    messageData = messageData.replace("%TYPE%", "negative");
                    messageData = messageData.replace(
                      "%COUNT%",
                      negativeUnUsedCount
                    );
                    mail_notification =
                      autoResponseMessages.negative_mail_notification;
                    last_mail_notification_time =
                      autoResponseMessages.negative_last_mail_notification_time;
                  } else {
                    email_subject = email_subject.replace("%TYPE%", "");
                    messageData = messageData.replace("%TYPE%", "");
                    email_subject = email_subject.replace("%COUNT%", "");
                    messageData = messageData.replace("%COUNT%", "");
                  }

                  var mailparams = {
                    Destination: {
                      ToAddresses: autoResponseMessages.tap_merchant.email
                    },
                    Message: {
                      Body: {
                        Html: messageData
                      }
                    },
                    Subject: email_subject,
                    Source: email_from
                  };
                  console.log(
                    "mail_notification---------------- ",
                    mail_notification
                  );

                  // Send Email notification to merchnat after fourteen days
                  const d = new Date();
                  var currentDate = "";
                  var currentTime = "";
                  if (autoResponseMessages.tap_merchant.timezone) {
                    currentDate = moment(d)
                      .tz(autoResponseMessages.tap_merchant.timezone)
                      .format("MM-DD-YYYY");
                    currentTime = moment(d)
                      .tz(autoResponseMessages.tap_merchant.timezone)
                      .format("HH:mm");
                  }
                  console.log(
                    "current date--------------------- ",
                    currentDate
                  );
                  console.log(
                    "current time--------------------- ",
                    currentTime
                  );
                  var totalday = constantData.MERCHANT_DAYS_EMAIL_NOTIFICATION;
                  var afterFourteenDays = moment(
                    last_mail_notification_time * 1000
                  )
                    .add(totalday, "days")
                    .tz(autoResponseMessages.tap_merchant.timezone)
                    .format("MM-DD-YYYY");
                  console.log("after 14 days date", afterFourteenDays);
                  if (mail_notification >= 3 && last_mail_notification_time) {
                    if (
                      Date.parse(currentDate) >=
                      Date.parse(afterFourteenDays) &&
                      currentTime >=
                      constantData.MERCHANT_DAYS_EMAIL_NOTIFICATION_TIME
                    ) {
                      console.log(
                        "after 14 condition success ------------",
                        autoResponseMessages.tap_merchant.merchant_id
                      );
                      module.exports
                        .sendMailNotfication(
                          mailparams,
                          autoResponseMessages,
                          type
                        )
                        .then(
                          function (response) {
                            console.log(response);
                            mailCallback();
                          },
                          function (error) {
                            console.log(error);
                            mailCallback();
                          }
                        );
                    } else {
                      console.log(
                        "after 14 condition failed -----------",
                        autoResponseMessages.tap_merchant.merchant_id
                      );
                      mailCallback();
                    }
                  } else {
                    if (last_mail_notification_time) {
                      var last_mail_notification_time_with_timezone = moment(
                        last_mail_notification_time * 1000
                      )
                        .tz(autoResponseMessages.tap_merchant.timezone)
                        .format("MM-DD-YYYY");
                      console.log("currentDate-------- ", currentDate);
                      console.log(
                        "last_mail_notification_time-------- ",
                        last_mail_notification_time
                      );
                      if (
                        Date.parse(last_mail_notification_time_with_timezone) <
                        Date.parse(currentDate) &&
                        currentTime >=
                        constantData.MERCHANT_DAYS_EMAIL_NOTIFICATION_TIME
                      ) {
                        // Send Email notification to merchnat 3 consecutive days
                        console.log("less than 3");
                        module.exports
                          .sendMailNotfication(
                            mailparams,
                            autoResponseMessages,
                            type
                          )
                          .then(
                            function (response) {
                              console.log(response);
                              mailCallback();
                            },
                            function (error) {
                              console.log(error);
                              mailCallback();
                            }
                          );
                      } else {
                        console.log("failed less than 3");
                        mailCallback();
                      }
                    } else {
                      if (
                        currentTime >=
                        constantData.MERCHANT_DAYS_EMAIL_NOTIFICATION_TIME
                      ) {
                        // Send Email notification to merchnat 3 consecutive days
                        console.log("less than 3");
                        module.exports
                          .sendMailNotfication(
                            mailparams,
                            autoResponseMessages,
                            type
                          )
                          .then(
                            function (response) {
                              console.log(response);
                              mailCallback();
                            },
                            function (error) {
                              console.log(error);
                              mailCallback();
                            }
                          );
                      } else {
                        mailCallback();
                      }
                    }
                  }
                },
                err => {
                  if (err) {
                    console.error("end error : " + err);
                  }
                  console.error("end succes ----");
                  callback();
                }
              );
            },
            err => {
              if (err) {
                console.error("end error : " + err);
              }
              console.error("end succes ----");
            }
          );
        }
      })
      .catch(function (err) {
        console.log(err);
      });
  },
  /**
   * Send exceed limit nitfication at 4:00 PM
   * @param {*} merchant_id
   * @param {*} upgradeTierData
   */
  sendExceedLimitNotification: (timezone) => {
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
      }); const settings = model.tap_settings.findAll();
      const scheduleSubscription = model.tap_schedule_subscription
        .findAll({
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
              "merchant_id",
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
              "exceed_limit_notification_sent",
              "last_exceed_limit_notification_sent_time"
            ],
            where: {
              active: "true",
              timezone: timezone
            },
            model: model.tap_merchants
          }
          ]
        });
      Promise.all([scheduleSubscription, settings]).then(function (merchantData) {
        var allMerchantSettingData = merchantData[0].map(function (merchantData) {
          return merchantData.toJSON();
        });
        var settingsData = merchantData[1].map(function (result) {
          return result.toJSON();
        });
        async.forEachOfSeries(
          allMerchantSettingData,
          (scheduleData, index, callback) => {
            const mailData = {};
            mailData.scheduleData = scheduleData;
            mailData.settingsData = settingsData;
            console.log("sms_sent: ", scheduleData.tap_merchant.sms_sent);
            console.log("sms_limit: ", scheduleData.tap_merchant.sms_limit);
            if (scheduleData.tap_merchant.sms_limit <= scheduleData.tap_merchant.sms_sent && scheduleData.tap_merchant.sms_unlimited != 1) {
              console.log("Schedule Data: ", scheduleData.tap_merchant.sms_limit);
              console.log("settingsData details: ", settingsData);
              console.log("All tier of current schedule-----", scheduleData.tap_schedule_tier_informations);
              var curretTierData = scheduleData.tap_schedule_tier_informations.find(function (element) {
                if (element.id == scheduleData.tier_id)
                  return element;
              });
              console.log("curretTierData----", curretTierData);
              var needTierToActivate = curretTierData.tier_number;
              var needUpgradeTierData = scheduleData.tap_schedule_tier_informations.find(function (element) {
                if (element.tier_number > needTierToActivate && (element.subscription_upper_bound_seg_count >= (scheduleData.tap_merchant.sms_sent + 1) || element.subscription_upper_bound_seg_count == '0'))
                  return element;
              });
              if (needUpgradeTierData == undefined || !needUpgradeTierData) {
                tierBillingScheduleInfo.checkCurrentScheduleIsTraining(scheduleData.tap_merchant.merchant_id).then(isTraining => {
                  if (isTraining) {
                    console.log("Training mode on");
                    callback(null);
                  } else {
                    const d = new Date();
                    var last_mail_notification_time = scheduleData.tap_merchant.last_exceed_limit_notification_sent_time;
                    var totalday = constantData.MERCHANT_DAYS_EMAIL_NOTIFICATION;
                    var currentDate = moment(d)
                      .tz(scheduleData.tap_merchant.timezone)
                      .format("MM-DD-YYYY");
                    var currentTime = moment(d)
                      .tz(scheduleData.tap_merchant.timezone)
                      .format("HH:mm");
                    console.log("currentDate-------- ", currentDate);
                    console.log("currentTime-------- ", currentTime);
                    if (scheduleData.tap_merchant.exceed_limit_notification_sent >= 3 && last_mail_notification_time) {
                      var afterFourteenDays = moment(
                        last_mail_notification_time * 1000
                      )
                        .add(totalday, "days")
                        .tz(scheduleData.tap_merchant.timezone)
                        .format("MM-DD-YYYY");
                      console.log("after 14 days date", afterFourteenDays);
                      if (
                        Date.parse(currentDate) >=
                        Date.parse(afterFourteenDays) &&
                        currentTime >=
                        constantData.MERCHANT_DAYS_EMAIL_NOTIFICATION_TIME
                      ) {
                        console.log(
                          "after 14 condition success ------------",
                          scheduleData.tap_merchant.timezone
                        );
                        tierBillingScheduleInfo.sendLimitMailNotfication(
                          scheduleData.tap_merchant.merchant_id,
                          mailData,
                          "TimeZone"
                        )
                          .then(
                            function (Maildata) {
                              console.log("maildataArray ", Maildata);
                              tierBillingScheduleInfo
                                .insertNotficationLog({
                                  merchant_id: scheduleData.tap_merchant.merchant_id,
                                  billing_event: timezone ? 
                                  `Exceed Notfication From ${timezone} CRON` : "Exceed Notfication From CRON",
                                  notification_type: "EMAIL",
                                  notification_status: 1,
                                  notification_time: Math.floor(Date.now() / 1000)
                                })
                                .then(
                                  function (success) {
                                    console.log("mail send success.");
                                    callback(null);
                                  },
                                  function (err) {
                                    console.log("mail send success.");
                                    callback(null);
                                  }
                                );
                            },
                            function (error) {
                              console.log(
                                "maildataArray ERROR============== ",
                                error
                              );
                              callback(null);
                            }
                          );
                      } else {
                        console.log(
                          "after 14 condition failed -----------",
                          scheduleData.tap_merchant.timezone
                        );
                        callback(null);
                      }
                    } else {
                      if (last_mail_notification_time) {
                        var last_mail_notification_time_with_timezone = moment(
                          last_mail_notification_time * 1000
                        )
                          .tz(scheduleData.tap_merchant.timezone)
                          .format("MM-DD-YYYY");

                        console.log(
                          "last_mail_notification_time-------- ",
                          last_mail_notification_time
                        );
                        if (
                          Date.parse(last_mail_notification_time_with_timezone) <
                          Date.parse(currentDate)) {
                          tierBillingScheduleInfo.sendLimitMailNotfication(
                            scheduleData.tap_merchant.merchant_id,
                            mailData,
                            "TimeZone"
                          )
                            .then(
                              function (Maildata) {
                                console.log("maildataArray ", Maildata);
                                tierBillingScheduleInfo
                                  .insertNotficationLog({
                                    merchant_id: scheduleData.tap_merchant.merchant_id,
                                    billing_event: timezone ? 
                                    `Exceed Notfication From ${timezone} CRON` : "Exceed Notfication From CRON",
                                    notification_type: "EMAIL",
                                    notification_status: 1,
                                    notification_time: Math.floor(Date.now() / 1000)
                                  })
                                  .then(
                                    function (success) {
                                      console.log("mail send success.");
                                      callback(null);
                                    },
                                    function (err) {
                                      console.log("mail send success.");
                                      callback(null);
                                    }
                                  );
                              },
                              function (error) {
                                console.log(
                                  "maildataArray ERROR============== ",
                                  error
                                );
                                callback(null);
                              }
                            );
                        } else {
                          console.log("today mail notification already send");
                          callback(null);
                        }
                      } else {
                        tierBillingScheduleInfo.sendLimitMailNotfication(
                          scheduleData.tap_merchant.merchant_id,
                          mailData,
                          "TimeZone"
                        )
                          .then(
                            function (Maildata) {
                              console.log("maildataArray ", Maildata);
                              tierBillingScheduleInfo
                                .insertNotficationLog({
                                  merchant_id: scheduleData.tap_merchant.merchant_id,
                                  billing_event: timezone ? 
                                  `Exceed Notfication From ${timezone} CRON` : "Exceed Notfication From CRON",
                                  notification_type: "EMAIL",
                                  notification_status: 1,
                                  notification_time: Math.floor(Date.now() / 1000)
                                })
                                .then(
                                  function (success) {
                                    console.log("mail send success.");
                                    callback(null);
                                  },
                                  function (err) {
                                    console.log("mail send success.");
                                    callback(null);
                                  }
                                );
                            },
                            function (error) {
                              console.log(
                                "maildataArray ERROR============== ",
                                error
                              );
                              callback(null);
                            }
                          );
                      }
                    }
                  }

                }, (error) => {
                  console.log(error);
                  callback(null);
                });

              } else {
                console.log("schedule data not found");
                callback(null);
              }
            } else {
              console.log("limit not going to exceed");
              callback(null);
            }
          }, error => {
            if (error) {
              console.log(error);
            }
            console.log("Notification send successfully for all merchant.");
          });
      })
        .catch(function (err) {
          console.log(err);
          reject(err);
        });
    });
  },
  /**
   * Send mail notification to merchant update the status in database
   *  @param {*} mailparams
   *  @param {*} autoResponseMessages
   *  @param {*} type
   */
  sendMailNotfication: function (mailparams, autoResponseMessages, type) {
    return new Promise(function (resolve, reject) {
      helper
        .sendEmailFromAdmin(
          mailparams.Destination.ToAddresses,
          mailparams.Subject,
          mailparams.Message.Body.Html,
          null,
          mailparams.Source
        )
        .then(
          function (Maildata) {
            var today = Math.floor(Date.now() / 1000);
            console.log("Email Data..................", Maildata);
            var autoResponseUpdateMessage = {};
            if (type == "positive") {
              if (autoResponseMessages.positive_mail_notification) {
                autoResponseUpdateMessage.positive_mail_notification =
                  autoResponseMessages.positive_mail_notification + 1;
              } else {
                autoResponseUpdateMessage.positive_mail_notification = 1;
              }
              autoResponseUpdateMessage.positive_last_mail_notification_time = today;
            } else if (type == "negative") {
              if (autoResponseMessages.negative_mail_notification) {
                autoResponseUpdateMessage.negative_mail_notification =
                  autoResponseMessages.negative_mail_notification + 1;
              } else {
                autoResponseUpdateMessage.negative_mail_notification = 1;
              }
              autoResponseUpdateMessage.negative_last_mail_notification_time = today;
            }
            model.tap_merchant_deep_link
              .update(autoResponseUpdateMessage, {
                where: {
                  merchant_id: autoResponseMessages.tap_merchant.merchant_id
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
            console.log("Email Data Error..................", error);
            reject("mail failed and data not updated");
          }
        );
    });
  },
  /**
   * Send immediate email to merchant regarding auto response message bucket
   * @param {*} req
   * @param {*} res
   */
  sendImmediateAutoResponseBucketNotification: function (req, res) {
    const responseMsg = JSON.parse(
      JSON.stringify(require("../../language/resMessage"))
    );
    console.log(req.body);
    var merchant_id = req.body.merchant_id;
    var type = req.body.type;
    model.tap_merchant_deep_link
      .findAll({
        where: {
          review_generation_process_status: "1",
          merchant_id: merchant_id
        }
      })
      .then(function (data) {
        var autoResponseData = data.map(function (data) {
          return data.toJSON();
        });
        console.log("autoResponseData--------- ", autoResponseData);
        if (autoResponseData.length > 0) {
          var merchantData = autoResponseData[0];
          console.log("merchantData---------- ", merchantData);
          var positiveMessages = {};
          if (merchantData.positive_messages) {
            positiveMessages = JSON.parse(merchantData.positive_messages);
          }
          var positiveUnUsedCount = helper.unUsedResponseCount(
            positiveMessages
          );
          console.log(
            "Merchant Id------ " +
            "" +
            merchantData.merchant_id +
            " Positive count------------ " +
            positiveUnUsedCount
          );
          var negativeMessages = {};
          if (merchantData.negative_messages) {
            negativeMessages = JSON.parse(merchantData.negative_messages);
          }
          var negativeUnUsedCount = helper.unUsedResponseCount(
            negativeMessages
          );
          console.log(
            "Merchnat Id------ " +
            "" +
            merchantData.merchant_id +
            " Negative count------------ " +
            negativeUnUsedCount
          );

          if (
            (negativeUnUsedCount <= 3 &&
              merchantData.negative_auto_reply_status) ||
            (positiveUnUsedCount <= 3 &&
              merchantData.positive_auto_reply_status)
          ) {
            model.tap_merchants
              .findAll({
                where: {
                  merchant_id: merchantData.merchant_id,
                  active: "true",
                  yext: "1"
                }
              })
              .then(function (data) {
                var merchantRow = data.map(function (data) {
                  return data.toJSON();
                });
                var email_subject =
                  emailContent.IMMEDIATE_AUTO_RESPONSE_MAIL.subject;
                var email_from =
                  emailContent.IMMEDIATE_AUTO_RESPONSE_MAIL.from_mail;
                var messageData =
                  emailContent.IMMEDIATE_AUTO_RESPONSE_MAIL.html;
                if (type == "positive") {
                  email_subject = email_subject.replace("%TYPE%", "positive");
                  messageData = messageData.replace("%TYPE%", "positive");
                  email_subject = email_subject.replace(
                    "%COUNT%",
                    positiveUnUsedCount
                  );
                  messageData = messageData.replace(
                    "%COUNT%",
                    positiveUnUsedCount
                  );
                } else if (type == "negative") {
                  email_subject = email_subject.replace("%TYPE%", "negative");
                  messageData = messageData.replace("%TYPE%", "negative");
                  email_subject = email_subject.replace(
                    "%COUNT%",
                    negativeUnUsedCount
                  );
                  messageData = messageData.replace(
                    "%COUNT%",
                    negativeUnUsedCount
                  );
                } else {
                  email_subject = email_subject.replace("%TYPE%", "");
                  messageData = messageData.replace("%TYPE%", "");
                  email_subject = email_subject.replace("%COUNT%", "");
                  messageData = messageData.replace("%COUNT%", "");
                }
                var mailparams = {
                  Destination: {
                    ToAddresses: merchantRow[0].email
                  },
                  Message: {
                    Body: {
                      Html: messageData
                    }
                  },
                  Subject: email_subject,
                  Source: email_from
                };
                console.log("less than 3------ ", JSON.stringify(mailparams));
                module.exports
                  .sendImmediateMailNotfication(mailparams, merchantData, type)
                  .then(
                    function (response) {
                      console.log(response);
                      res
                        .status(responseMsg.OK.statusCode)
                        .send(responseMsg.OK);
                    },
                    function (error) {
                      console.log(error);
                      res
                        .status(responseMsg.RESPONSE400.statusCode)
                        .send(responseMsg.RESPONSE400);
                    }
                  );
              })
              .catch(function (err) {
                console.log(
                  "Merchant not found..................",
                  merchantData.merchant_id
                );
                res
                  .status(responseMsg.RESPONSE400.statusCode)
                  .send(responseMsg.RESPONSE400);
              });
          } else {
            console.log("No mail..................", merchantData.merchant_id);
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          }
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
   * Send immediate mail notification to merchant update the status in database
   *  @param {*} mailparams
   *  @param {*} autoResponseMessages
   */
  sendImmediateMailNotfication: function (
    mailparams,
    autoResponseMessages,
    type
  ) {
    return new Promise(function (resolve, reject) {
      helper
        .sendEmailFromAdmin(
          mailparams.Destination.ToAddresses,
          mailparams.Subject,
          mailparams.Message.Body.Html,
          null,
          mailparams.Source
        )
        .then(
          function (Maildata) {
            var today = Math.floor(Date.now() / 1000);
            console.log("Email Data..................", Maildata);
            var autoResponseUpdateMessage = {};
            if (type == "positive") {
              autoResponseUpdateMessage.positive_mail_notification = 0;
              autoResponseUpdateMessage.positive_last_mail_notification_time = today;
            } else if (type == "negative") {
              autoResponseUpdateMessage.negative_mail_notification = 0;
              autoResponseUpdateMessage.negative_last_mail_notification_time = today;
            }
            model.tap_merchant_deep_link
              .update(autoResponseUpdateMessage, {
                where: {
                  merchant_id: autoResponseMessages.merchant_id
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
            console.log("Email Data Error..................", error);
            reject("mail failed and data not updated");
          }
        );
    });
  },
  /**
   * Create YEXT user ID with cron scheduler
   */
  createYextUserAndUpdate: function () {
    model.tap_merchants
      .findAll({
        where: {
          active: "true",
          yext: "1",
          yext_user_creation_process: "0"
        }
      })
      .then(function (data) {
        var merchantData = data.map(function (data) {
          return data.toJSON();
        });
        console.log("merchant data : ", merchantData);
        if (merchantData.length > 0) {
          async.forEachOf(
            merchantData,
            (merchantItem, index, callback) => {
              if (!merchantItem.yext_user_id && merchantItem.yext_location_id) {
                var radomValue = Math.floor(1000 + Math.random() * 9000);
                var yextUserID = merchantItem.first_name + radomValue;
                console.log("yext User ID --- ", yextUserID);
                var requestData = {
                  id: yextUserID,
                  firstName: merchantItem.first_name,
                  lastName: merchantItem.last_name,
                  username: merchantItem.email,
                  emailAddress: merchantItem.email,
                  sso: false,
                  acl: [{
                    roleId: config.app.roleId,
                    roleName: config.app.roleName,
                    on: merchantItem.yext_location_id,
                    accountId: config.app.yextAccountid,
                    onType: config.app.onType
                  }]
                };
                console.log(requestData);
                try {
                  request.post({
                    headers: {
                      "content-type": "application/json"
                    },
                    url: config.app.yexUserURL +
                      "?api_key=" +
                      config.app.yextAPIKey +
                      "&v=" +
                      config.app.yextVersion,
                    body: requestData,
                    json: true
                  },
                    (error, response, body) => {
                      if (error) {
                        console.log("error------------", JSON.stringify(error));
                        module.exports
                          .updateMerchant("failed", merchantItem, "")
                          .then(
                            function (response) {
                              console.log(response);
                              callback();
                            },
                            function (error) {
                              console.log(error);
                              callback();
                            }
                          );
                      } else {
                        console.log(body);
                        if (body.meta.errors.length > 0) {
                          console.log(
                            "error------------",
                            JSON.stringify(body.meta.errors)
                          );
                          module.exports
                            .updateMerchant("failed", merchantItem, "")
                            .then(
                              function (response) {
                                console.log(response);
                                callback();
                              },
                              function (error) {
                                console.log(error);
                                callback();
                              }
                            );
                        } else if (body.response.id) {
                          module.exports
                            .updateMerchant(
                              "success",
                              merchantItem,
                              body.response.id
                            )
                            .then(
                              function (response) {
                                console.log(response);
                                callback();
                              },
                              function (error) {
                                console.log(error);
                                callback();
                              }
                            );
                        } else {
                          module.exports
                            .updateMerchant("failed", merchantItem, "")
                            .then(
                              function (response) {
                                console.log(response);
                                callback();
                              },
                              function (error) {
                                console.log(error);
                                callback();
                              }
                            );
                        }
                      }
                    }
                  );
                } catch (e) {
                  console.log(e);
                  callback();
                }
              } else {
                model.tap_merchants
                  .update({
                    yext_user_creation_process: "1"
                  }, {
                      where: {
                      }
                    })
                  .then(function (data) {
                    console.log("Already Yext User ID Available.");
                    callback();
                  })
                  .catch(function (err) {
                    console.log(err);
                    callback();
                  });
              }
            },
            function (err) {
              if (err) console.error(err);
              console.log("iterating done");
            }
          );
        }
      })
      .catch(function (err) {
        console.log(err);
      });
  },
  /**
   * Update merchant and send mail notification to admin
   *  @param {*} status
   *  @param {*} merchantItem
   *  @param {*} yextUserId
   */
  updateMerchant: function (status, merchantItem, yextUserId) {
    return new Promise(function (resolve, reject) {
      var yext_user_creation_process = "1";
      model.tap_merchants
        .update({
          yext_user_id: yextUserId,
          yext_user_creation_process: yext_user_creation_process
        }, {
            where: {
              merchant_id: merchantItem.merchant_id
            }
          })
        .then(function (data) {
          if (status == "success") {
            console.log(
              "new yext user created." +
              yextUserId +
              " merchant Id" +
              merchantItem.merchant_id
            );
            resolve("user updated");
          } else {
            console.log(
              "new yext user creation failed." +
              yextUserId +
              " merchant Id" +
              merchantItem.merchant_id
            );
            var mailConetent =
              emailContent.SSO_AUTO_YEXT_USER_CREATEION_MAIL.html;
            const d = new Date();
            var currentDate = "";
            var currentTime = "";
            currentDate = moment(d).format("MM/DD/YYYY h:mm A");
            mailConetent = mailConetent.replace("%DATE_TIME%", currentDate);
            mailConetent = mailConetent.replace(
              "%YEXT_LOCATION_ID%",
              merchantItem.yext_location_id
            );
            mailConetent = mailConetent.replace(
              "%MERCHANT_DBA_NAME%",
              merchantItem.nick_name
            );
            helper
              .sendEmailFromAdmin(
                config.app.toMailIdForYextUserID,
                emailContent.SSO_AUTO_YEXT_USER_CREATEION_MAIL.subject,
                mailConetent,
                null,
                emailContent.SSO_AUTO_YEXT_USER_CREATEION_MAIL.from_mail
              )
              .then(
                function (Maildata) {
                  console.log("user updated and mail send.");
                  resolve("user updated and mail send.");
                },
                function (error) {
                  console.log("user updated and mail not send.", error);
                  reject("user updated and mail not send.");
                }
              );
          }
        })
        .catch(function (err) {
          console.log(err);
          reject(err);
        });
    });
  },

  /**
   * Cron function  for updating subscription of the merchant by checking the subscription_end_time
  */
  updateMerchantSubscription: (timeZonePassed) => {
    return new Promise((resolve, reject) => {
      try {
        var whereCondition;
        if (timeZonePassed != '') {
          whereCondition = {
            active: true,
            timezone: timeZonePassed
          }
        } else {
          whereCondition = {
            active: true,
            [Op.or]: [{ timezone: '' }, { timezone: null }]
          }
        }
        //  find merchant id with expired subscription_end_time
        model.tap_schedule_subscription.belongsTo(model.tap_merchants, {
          foreignKey: "merchant_id",
          targetKey: "merchant_id"
        });
        model.tap_schedule_subscription.findAll({
          attributes: [
            "merchant_id",
            "schedule_id",
            "tier_id",
            "subscription_end_date",
            "subscription_start_date",
            "update_date"
          ],
          include: [
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
              where: whereCondition,
              model: model.tap_merchants
            }
          ]
        }).then((tap_schedule_subscription_response) => {
          var tapScheduleDataParsed = tap_schedule_subscription_response.map((data) => {
            return data.toJSON();
          });
          if (tapScheduleDataParsed.length > 0) {

            // for each merchant we should check the downgrade requests
            // tapScheduleDataParsed.forEach((merchants) => {
            async.forEachSeries(tapScheduleDataParsed, function (merchants, merchantCallback) {
              if (new Date(merchants.subscription_start_date * 1000).getDate() == new Date().getDate()) {
                model.tap_downgrade_requests.find({
                  attributes: [
                    "merchant_id",
                    "schedule_id",
                    "tier_id"
                  ],
                  where: {
                    merchant_id: merchants.merchant_id,
                    isdowngrade_used: '0'
                  }
                }).then(async (downgradeResponse) => {
                  // if downgrade request we have to change the tier of the merchant 
                  var trainingModeStatusCheck = await trainingMode.checkTrainingMode(merchants.merchant_id)
                  if (downgradeResponse && !trainingModeStatusCheck) {
                    let newSubscriptionDate = Math.floor(Date.now() / 1000);
                    var getSubDates = await tierBillingScheduleInfo.getBillingEndDate(newSubscriptionDate);  //get new start-end dates
                    var infoResponse = await cronHelpers.tapScheduleTierInformationFind(downgradeResponse.tier_id);  // get Tier Informatiion for new Downgrade 
                    var currentTierInfoResponse = await cronHelpers.tapScheduleTierInformationFind(merchants.tier_id); // get Tier information for current Tier
                    var updateResponse = await cronHelpers.tapScheduleSubscriptionAndTierUpdate(
                      getSubDates,
                      merchants.merchant_id,
                      downgradeResponse.schedule_id,
                      downgradeResponse.tier_id,
                      merchants.schedule_id,
                      merchants.tier_id,
                      infoResponse.data.subscription_upper_bound_seg_count
                    );   // update the merchant
                    if (updateResponse.status) {
                      if (infoResponse.status) {
                        var nckName = await cronHelpers.tapMerchantNickName(merchants.merchant_id);   // get merchants nick name
                        if (nckName.status) {
                          // insert the billing record 
                          tierBillingScheduleInfo.insertBillingRecord({
                            merchant_id: merchants.merchant_id,
                            scheduleID: downgradeResponse.schedule_id,
                            currentTierId: merchants.tier_id,
                            tierID: downgradeResponse.tier_id,
                            currentTierSegementCount: currentTierInfoResponse.data.subscription_upper_bound_seg_count,
                            segmentCount: infoResponse.data.subscription_upper_bound_seg_count,
                            overagePrice: 0,
                            currentScheduleSubscribedPrice: currentTierInfoResponse.data.subscribed_price,
                            scheduleSubscribedPrice: infoResponse.data.subscribed_price,
                            nick_name: nckName.data.nick_name,
                            billing_event: constantData.TIERED_BILLING_EVENTS.AUTOMATIC_DOWNGRADE,
                            billingAmount: 0
                          })
                          var changeDowngradeRequestStatus = await cronHelpers.tapDowngradeRequestStatusChange(downgradeResponse.tier_id, downgradeResponse.merchant_id, downgradeResponse.schedule_id);
                          merchantCallback();
                        }
                      }
                    }
                  } else if (!trainingModeStatusCheck) {
                    // else we have to just update the merchant with same tier
                    let newSubscriptionDate = Math.floor(Date.now() / 1000);
                    var getSubDates = await tierBillingScheduleInfo.getBillingEndDate(newSubscriptionDate) // get new start end date
                    var updateResponse = await cronHelpers.tapScheduleSubscriptionUpdate(
                      getSubDates,
                      merchants.merchant_id,
                      merchants.schedule_id,
                      merchants.tier_id
                    ); // update the merchant 
                    if (updateResponse)
                      var infoResponse = await cronHelpers.tapScheduleTierInformationFind(merchants.tier_id); // get tier info
                    if (infoResponse.status) {
                      var nckName = await cronHelpers.tapMerchantNickName(merchants.merchant_id); //get Nick name
                      if (nckName.status) {
                        //insert the billing record
                        await tierBillingScheduleInfo.insertBillingRecord({
                          merchant_id: merchants.merchant_id,
                          scheduleID: merchants.schedule_id,
                          currentTierId: merchants.tier_id,
                          tierID: merchants.tier_id,
                          currentTierSegementCount: infoResponse.data.subscription_upper_bound_seg_count,
                          segmentCount: infoResponse.data.subscription_upper_bound_seg_count,
                          overagePrice: 0,
                          currentScheduleSubscribedPrice: infoResponse.data.subscribed_price,
                          scheduleSubscribedPrice: infoResponse.data.subscribed_price,
                          nick_name: nckName.data.nick_name,
                          billing_event: constantData.TIERED_BILLING_EVENTS.AUTOMATIC_BILLING_CYCLE_UPDATE,
                          billingAmount: 0
                        })
                        merchantCallback();
                      }
                    }
                  } else {
                    merchantCallback();
                  }
                })
              } else {
                console.log('merchant still in the subscription period')
                merchantCallback()
              }

            })
          } else {
            reject("Unable to get Parsed Data");
          }
        })
      } catch (error) {
        reject(error);
      }

    });
  },
  /**
 * Check for first_threshold and second_threshold for the alert to merchants before he exceeds the limit 
*/
  smsLimitReachedAlert: function () {
    return new Promise(async function (resolve, reject) {
      String.prototype.allReplace = function (obj) {
        var retStr = this;
        for (var x in obj) {
          retStr = retStr.replace(new RegExp(x, 'g'), obj[x]);
        }
        return retStr;
      };
      // get threshold values for first and second threshold set by super admin
      var getThreshold = await cronHelpers.getThreshold();
      if (getThreshold.status) {
        // get all merchants with limited sms and who are active
        model.tap_merchants.findAll({
          where: {
            active: true,
            sms_unlimited: 0
          }
        }).then((response) => {
          // response.forEach(async (merchant) => {
          async.forEachSeries(response, function (merchant, customerCallback) {
            // check merchant subscription
            Promise.all([cronHelpers.checkCurrentScheduleIsTraining(merchant.merchant_id)]).then(async (checkMerchantTraining) => {
              if (!checkMerchantTraining[0]) {
                var getMerchantSubscriptionResponse = await cronHelpers.getMerchantSubscriptionDate(merchant.merchant_id);
                if (getMerchantSubscriptionResponse.status) {
                  var getMerchantSmsCount = await helper.getMerchantSMSCount(
                    getMerchantSubscriptionResponse.data.merchant_id,
                    "monthly",
                    "sms"
                  );
                  // get upper bound and lower bound of the tier 
                  var checkTierInfo = await cronHelpers.checkTierInfoThreshold(getMerchantSubscriptionResponse.data.schedule_id,
                    getMerchantSubscriptionResponse.data.tier_id,
                    getMerchantSmsCount
                  );

                  if (checkTierInfo.data.subscription_upper_bound_seg_count && checkTierInfo.data.subscription_lower_bound_seg_count) {
                    //check the message percentage consumed by the merchant 
                    var checkPercentage = await cronHelpers.checkMessagePercentage(
                      merchant.merchant_id,
                      checkTierInfo.data.subscription_upper_bound_seg_count,
                      getMerchantSmsCount,
                      merchant.first_threshold_notified,
                      merchant.second_threshold_notified,
                      getThreshold.data.first_threshold_val,
                      getThreshold.data.second_threshold_val
                    )

                    if (checkPercentage.status) {

                      if (checkPercentage.type == 'first') {
                        // if falls in first threshold send sms with the predefined text
                        if (getThreshold.data.sms_notification_check == 'true' && merchant.sms_notification_check == 'true') {
                          var phoneOfTheMerchant = merchant.secondary_phone ? merchant.secondary_phone : merchant.phoneNumber
                          var textToSend = merchant.tier_billing_notification_language == 'Spanish' ? textSMSConstants.smsReachingToExceedLimit.spanish : textSMSConstants.smsReachingToExceedLimit.english;
                          var editedText = textToSend.replace("%percentage%", `${getThreshold.data.first_threshold_val}%`);
                          if(phoneOfTheMerchant){
                            tap_twilioSMSController.twilioSMSSent({
                              phone: phoneOfTheMerchant,
                              message: editedText,
                              msgType: 'SMS'
                            }, function () {
  
                            })
                          }
                
                        }
                        if (getThreshold.data.email_notification_check == 'true' && merchant.email_notification_check == 'true') {
                          // if sms send then also send the mail to that merchant
                          var emailOfTheMerchant = merchant.secondary_email ? merchant.secondary_email : merchant.email
                          var subject = merchant.tier_billing_notification_language == 'Spanish' ? emailContent.SMS_REACHING_TO_EXCEED_LIMIT.spanish.subject : emailContent.SMS_REACHING_TO_EXCEED_LIMIT.english.subject;
                          var body = merchant.tier_billing_notification_language == 'Spanish' ? emailContent.SMS_REACHING_TO_EXCEED_LIMIT.spanish.body : emailContent.SMS_REACHING_TO_EXCEED_LIMIT.english.body;
                          var editedSubject = subject.replace("%percentage%", `${Math.floor(getThreshold.data.first_threshold_val)}%`);
                          var bodyEdited = body.allReplace({ '%day%': new Date(getMerchantSubscriptionResponse.data.subscription_start_date * 1000).getDate(), '%Bound% ': `${Math.floor(getThreshold.data.first_threshold_val)}%`, '%Overage_fee-less_current_subscription_price%': checkTierInfo.overageData == 0 ? 0 : BigNumber(checkTierInfo.overageData).minus(checkTierInfo.data.subscribed_price).toFixed(2) })
                          // Replace SSO link for Tiered Billing Page
                          let billingPageLink = helper.generateBillingPageLink(config.app.MERCHANT_BILLING_LINK, merchant.merchant_id);
                          bodyEdited = bodyEdited.replace(
                            "%BILLING_LINK%",
                            billingPageLink
                          );
                          if(emailOfTheMerchant){
                             var sendMail = await helper.sendEmailFromAdmin(emailOfTheMerchant, editedSubject, bodyEdited)
                          }
                        }
                        var changeStatus = await cronHelpers.changeThresholdState("first_threshold_notified", merchant.merchant_id)
                        if (changeStatus.status) {
                          customerCallback()
                        } else {
                          customerCallback()

                        }
                      } else if (checkPercentage.type == 'second') {
                        // if falls in second threshold send sms with the predefined text
                        if (getThreshold.data.sms_notification_check == 'true' && merchant.sms_notification_check == 'true') {
                          var phoneOfTheMerchant = merchant.secondary_phone ? merchant.secondary_phone : merchant.phoneNumber
                          var textToSend = merchant.tier_billing_notification_language == 'Spanish' ? textSMSConstants.smsReachingToExceedLimit.spanish : textSMSConstants.smsReachingToExceedLimit.english;
                          var editedText = textToSend.replace("%percentage%", `${getThreshold.data.second_threshold_val}%`);
                          if(phoneOfTheMerchant){
                            tap_twilioSMSController.twilioSMSSent({
                              phone: phoneOfTheMerchant,
                              message: editedText,
                              msgType: 'SMS'
                            }, function (err, send) {
                              console.log(send, err)
                            })
                          }
                        }
                        if (getThreshold.data.email_notification_check == 'true' && merchant.email_notification_check == 'true') {
                          // if sms send then also send the mail to that merchant
                          var emailOfTheMerchant = merchant.secondary_email ? merchant.secondary_email : merchant.email
                          var subject = merchant.tier_billing_notification_language == 'Spanish' ? emailContent.SMS_REACHING_TO_EXCEED_LIMIT.spanish.subject : emailContent.SMS_REACHING_TO_EXCEED_LIMIT.english.subject;
                          var body = merchant.tier_billing_notification_language == 'Spanish' ? emailContent.SMS_REACHING_TO_EXCEED_LIMIT.spanish.body : emailContent.SMS_REACHING_TO_EXCEED_LIMIT.english.body;
                          var editedSubject = subject.replace("%percentage%", `${Math.floor(getThreshold.data.second_threshold_val)}%`);
                          var bodyEdited = body.allReplace({ '%day%': new Date(getMerchantSubscriptionResponse.data.subscription_start_date * 1000).getDate(), '%Bound% ': `${Math.floor(getThreshold.data.second_threshold_val)}%`, '%Overage_fee-less_current_subscription_price%': checkTierInfo.overageData == 0 ? 0 : BigNumber(checkTierInfo.overageData).minus(checkTierInfo.data.subscribed_price).toFixed(2) })
                          // Replace SSO link for Tiered Billing Page
                          let billingPageLink = helper.generateBillingPageLink(config.app.MERCHANT_BILLING_LINK, merchant.merchant_id);
                          bodyEdited = bodyEdited.replace(
                            "%BILLING_LINK%",
                            billingPageLink
                          );
                          if(emailOfTheMerchant){
                          var sendMail = await helper.sendEmailFromAdmin(emailOfTheMerchant, editedSubject, bodyEdited)
                          }
                        }
                        var changeStatus = await cronHelpers.changeThresholdState("second_threshold_notified", merchant.merchant_id)
                        if (changeStatus.status) {
                          customerCallback()
                        } else {
                          customerCallback()

                        }
                      } else {
                        customerCallback()
                      }
                    } else {
                      customerCallback()
                    }
                  } else {

                    customerCallback()
                  }

                } else {
                  customerCallback()

                }
              } else {
                customerCallback()
              }
            })


          }, function (err) {
            console.log("iteration done")
          })
        })
      } else {
        reject("Unable to get Threshold Data");
      }
    });
  },
  // Coupon expiry reminder
  couponReminder: function (event) {
    return new Promise((resolve, reject) => {
      var days = parseInt(event.days);
      var timestamp = Math.floor(Date.now() / 1000);
      var startDate = timestamp + ((days - 1) * 24 * 60 * 60);
      var endDate = timestamp + (days * 24 * 60 * 60);
      try {
        cronHelpers.getMerchantCustomerWithUnusedCoupons(startDate, endDate).then(function (merchantCustomers) {
          // console.log("Got result: ", merchantCustomers);
          // console.log("\n\nAll Data: ", JSON.stringify(merchantCustomers));
          async.forEachSeries(merchantCustomers, function (merchantCustomer, customerCallback) {
            if (merchantCustomer.taptext_status == 'true') {
              var offerName = merchantCustomer.Data;
              var offerAmount = merchantCustomer.Discount_Percentage;
              var offerUnit = merchantCustomer.discount_unit;
              var rewards_text = merchantCustomer.reward_text ? merchantCustomer.reward_text : "";
              var first_name = merchantCustomer.firstName;
              var DBA = merchantCustomer.nick_name;
              var unit_dol = offerUnit == "$" ? "$" : "";
              var unit_per = offerUnit == "%" ? "%" : "";
              var phonenumber = merchantCustomer.phoneNumber.toString();
              var PuertoRico = (phonenumber.startsWith("1939") || phonenumber.startsWith("939") || phonenumber.startsWith("1787") || phonenumber.startsWith("787")) ? true : false;
              var useUpdatedTemplateReminder = async function (template_reminder) {
                var getConsumeStatus = await cronHelpers.getConsume(merchantCustomer.merchant_id, merchantCustomer.phoneNumber.toString());
                var getDba = await cronHelpers.getDba(merchantCustomer.merchant_id);
                var getLeftSms = getDba.sms_limit - getDba.sms_sent;
                var getLeftEmail = getDba.email_limit - getDba.email_sent;
                template_reminder = template_reminder.replace("%DBA%", DBA);
                template_reminder = template_reminder.replace("%DAYS%", days);
                template_reminder = template_reminder.replace("%REWARDSTEXT%", rewards_text);
                var message_content = template_reminder;
                var getSegment = await cronHelpers.getSegmentsForTextYourCustomers(message_content);

                // check pref contact method for sending the reminder
                if (parseInt(merchantCustomer.prefContactMethod) === 0 && parseInt(merchantCustomer.optin) == 1 && getConsumeStatus && merchantCustomer.phoneNumber) {
                  if ((getLeftSms >= getSegment) || (getDba.sms_limit == 0 && getDba.sms_unlimited == 1)) {
                    Promise.all([
                      cronHelpers.sendMessage(merchantCustomer.phoneNumber, message_content, 'SMS'),
                      cronHelpers.updateMerchants({ message: message_content, sms_sent: getSegment, merchant_id: merchantCustomer.merchant_id })
                    ]).then(async function (prefContactNoUpgrade) {
                      var waitForSave = await cronHelpers.saveSmsLogs(getSegment, null, 'coupon expiry reminder', message_content, merchantCustomer.merchant_id, phonenumber, prefContactNoUpgrade[0].res);
                      customerCallback();
                    })
                  } else {
                    let upgradeTierData = { segmentNeedToAdd: (getDba.sms_sent + getSegment) , trigger : "coupon expiry reminder" };
                    tierBillingScheduleInfo.updgardeTierWithOveragePrice(merchantCustomer.merchant_id, upgradeTierData)
                      .then(async function (res) {
                        Promise.all([
                          cronHelpers.sendMessage(merchantCustomer.phoneNumber, message_content, 'SMS'),
                          cronHelpers.updateMerchants({ message: message_content, sms_sent: getSegment, merchant_id: merchantCustomer.merchant_id })
                        ]).then(async function (prefContactUpgrade) {
                          var waitForSaveOnUpgrade = await cronHelpers.saveSmsLogs(getSegment, null, 'coupon expiry reminder', message_content, merchantCustomer.merchant_id, phonenumber, prefContactUpgrade[0].res);
                          customerCallback();
                        })
                      },
                        async function (err) {
                          var saveSendMessage = await cronHelpers.saveSmsFailLogs(getSegment, null, 'coupon expiry reminder', message_content, merchantCustomer.merchant_id, phonenumber, 'limit exceeded for merchant');
                          customerCallback();
                        }
                      );
                  } //send email if the prefered contact is set to 1
                } else if (parseInt(merchantCustomer.prefContactMethod) == 1 && parseInt(merchantCustomer.optin) == 1 && merchantCustomer.emails) {

                  if (getLeftEmail >= 1) {
                    var today = Math.floor(Date.now() / 1000);
                    Promise.all([
                      cronHelpers.sendEmail(merchantCustomer.emails, message_content, today, 'Coupon Expiry Reminder'),
                      cronHelpers.updateMerchants({ message: message_content, email_sent: 1, merchant_id: merchantCustomer.merchant_id })
                    ]).then(async function (emailpref) {
                      var saveEmailLogsWait = await cronHelpers.saveEmailLogs(1, null, 'Coupon Expiry Reminder', message_content, merchantCustomer.merchant_id, merchantCustomer.phoneNumber, emailpref[0], null, merchantCustomer.emails)
                      customerCallback();
                    })
                  }
                } else if (parseInt(merchantCustomer.prefContactMethod) == 2 && parseInt(merchantCustomer.optin) == 1) {

                  if ((getLeftSms >= getSegment) || (getDba.sms_limit == 0 && getDba.sms_unlimited == 1)) {
                    if (getConsumeStatus && merchantCustomer.phoneNumber) {
                      Promise.all([
                        cronHelpers.sendMessage(merchantCustomer.phoneNumber, message_content, 'SMS'),
                        cronHelpers.updateMerchants({ message: message_content, sms_sent: getSegment, merchant_id: merchantCustomer.merchant_id })
                      ]).then(async function (prefContactNoUpgrade) {
                        var waitForSave = await cronHelpers.saveSmsLogs(getSegment, null, 'coupon expiry reminder', message_content, merchantCustomer.merchant_id, phonenumber, prefContactNoUpgrade[0].res);
                        if (getLeftEmail >= 1 && merchantCustomer.emails) {
                          var today = Math.floor(Date.now() / 1000);
                          Promise.all([
                            cronHelpers.sendEmail(merchantCustomer.emails, message_content, today, 'Coupon Expiry Reminder'),
                            cronHelpers.updateMerchants({ message: message_content, email_sent: 1, merchant_id: merchantCustomer.merchant_id })
                          ]).then(async function (emailpref) {
                            var saveEmailLogsWait = await cronHelpers.saveEmailLogs(1, null, 'Coupon Expiry Reminder', message_content, merchantCustomer.merchant_id, merchantCustomer.phoneNumber, emailpref[0], null, merchantCustomer.emails)
                            customerCallback();
                          })
                        }else{
                          customerCallback();
                          
                        }
                      })
                    } else {
                      if (getLeftEmail >= 1 &&  merchantCustomer.emails) {
                        var today = Math.floor(Date.now() / 1000);
                        Promise.all([
                          cronHelpers.sendEmail(merchantCustomer.emails, message_content, today, 'Coupon Expiry Reminder'),
                          cronHelpers.updateMerchants({ message: message_content, email_sent: 1, merchant_id: merchantCustomer.merchant_id })
                        ]).then(async function (emailpref) {
                          var saveEmailLogsWait = await cronHelpers.saveEmailLogs(1, null, 'Coupon Expiry Reminder', message_content, merchantCustomer.merchant_id, merchantCustomer.phoneNumber, emailpref[0], null, merchantCustomer.emails)
                          customerCallback();
                        })
                      }else{
                        customerCallback();
                        
                      }
                    }

                  } else {
                    if (getConsumeStatus && merchantCustomer.phoneNumber) {
                      let upgradeTierData = { segmentNeedToAdd: (getDba.sms_sent + getSegment)  , trigger : "coupon expiry reminder"};
                      tierBillingScheduleInfo.updgardeTierWithOveragePrice(merchantCustomer.merchant_id, upgradeTierData)
                        .then(async function (res) {
                          Promise.all([
                            cronHelpers.sendMessage(merchantCustomer.phoneNumber, message_content, 'SMS'),
                            cronHelpers.updateMerchants({ message: message_content, sms_sent: getSegment, merchant_id: merchantCustomer.merchant_id })
                          ]).then(async function (prefContactUpgrade) {
                            var waitForSaveOnUpgrade = await cronHelpers.saveSmsLogs(getSegment, null, 'coupon expiry reminder', message_content, merchantCustomer.merchant_id, phonenumber, prefContactUpgrade[0].res);
                            if (getLeftEmail >= 1 && merchantCustomer.emails) {
                              var today = Math.floor(Date.now() / 1000);
                              Promise.all([
                                cronHelpers.sendEmail(merchantCustomer.emails, message_content, today, 'Coupon Expiry Reminder'),
                                cronHelpers.updateMerchants({ message: message_content, email_sent: 1, merchant_id: merchantCustomer.merchant_id })
                              ]).then(async function (emailpref) {
                                var saveEmailLogsWait = await cronHelpers.saveEmailLogs(1, null, 'Coupon Expiry Reminder', message_content, merchantCustomer.merchant_id, merchantCustomer.phoneNumber, emailpref[0], null, merchantCustomer.emails)
                                customerCallback();
                              })
                            }else{
                              customerCallback();
                            }
                          })
                        },
                          async function (err) {
                            var saveSendMessage = await cronHelpers.saveSmsFailLogs(getSegment, null, 'coupon expiry reminder', message_content, merchantCustomer.merchant_id, phonenumber, 'limit exceeded for merchant');
                            if (getLeftEmail >= 1 && merchantCustomer.emails) {
                              var today = Math.floor(Date.now() / 1000);
                              Promise.all([
                                cronHelpers.sendEmail(merchantCustomer.emails, message_content, today, 'Coupon Expiry Reminder'),
                                cronHelpers.updateMerchants({ message: message_content, email_sent: 1, merchant_id: merchantCustomer.merchant_id })
                              ]).then(async function (emailpref) {
                                var saveEmailLogsWait = await cronHelpers.saveEmailLogs(1, null, 'Coupon Expiry Reminder', message_content, merchantCustomer.merchant_id, merchantCustomer.phoneNumber, emailpref[0], null, merchantCustomer.emails)
                                customerCallback();
                              })
                            }else{
                              customerCallback();
                            }
                          }
                        );
                    } else {
                      if (getLeftEmail >= 1 && merchantCustomer.emails) {
                        var today = Math.floor(Date.now() / 1000);
                        Promise.all([
                          cronHelpers.sendEmail(merchantCustomer.emails, message_content, today, 'Coupon Expiry Reminder'),
                          cronHelpers.updateMerchants({ message: message_content, email_sent: 1, merchant_id: merchantCustomer.merchant_id })
                        ]).then(async function (emailpref) {
                          var saveEmailLogsWait = await cronHelpers.saveEmailLogs(1, null, 'Coupon Expiry Reminder', message_content, merchantCustomer.merchant_id, merchantCustomer.phoneNumber, emailpref[0], null, merchantCustomer.emails)
                          customerCallback();
                        })
                      }else{
                        customerCallback();
                      }
                    }

                  }
                } else {
                  // console.log("no optin or sms and email limit");
                  customerCallback();
                }
                // console.log("before next call");
              };
              if (PuertoRico) {
                var reminder_template = emailContent.templateForReminderSpanish;
                useUpdatedTemplateReminder(reminder_template);
              } else {
                // console.log("Not PuertoRico");
                var reminder_template = emailContent.templateForReminderEnglish;
                useUpdatedTemplateReminder(reminder_template);
              }
            } else {
              console.log('Tap Text Status is False')
              customerCallback()
            }

          }, function (err) {
            // console.log("list ended", err)
          });

        }, function (reject) {
          // console.log(reject)
        });
      } catch (e) {
        // console.log(e)
      }
    })
  }
}