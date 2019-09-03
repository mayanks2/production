var model = require("../../model");
var Sequelize = require("sequelize");
var textmessage = require('../../language/textMessage');
var splitter = require('split-sms');
// var helper = require('../common/helper');
var tap_twilioSMSController = require("../tap_twilioSMSController");
var moment = require('moment')
const Op = Sequelize.Op;
var nodemailer = require("nodemailer");
var emailConfig = require("../../config/emailConfig");
var timestamp = require('unix-timestamp');
var async = require('async');
var trainingMode = require('../common/checkTrainingMode')

var transporterAdmin = nodemailer.createTransport({
  host: emailConfig.Admin_config.host,
  port: emailConfig.Admin_config.port,
  secure: emailConfig.Admin_config.secure, // true for 465, false for other ports
  auth: {
    user: emailConfig.Admin_config.user, // generated ethereal user
    pass: emailConfig.Admin_config.password // generated ethereal password
  }
});
module.exports = {
  tapScheduleSubscriptionUpdate: (
    newSubscriptionDate,
    merchant_id,
    schedule_id,
    tier_id
  ) => {
    try {
      return new Promise((resolve, reject) => {
        //update subscription for merchant
        model.tap_schedule_subscription
          .update(
          {
            subscription_start_date: newSubscriptionDate.start,
            subscription_end_date: newSubscriptionDate.end,
            update_date: newSubscriptionDate.start          
          },
          {
            where: {
              merchant_id: merchant_id,
              schedule_id: schedule_id,
              tier_id: tier_id
            }
          }
          )
          .then(response => {
            if (response) {
              // update merchants table
              model.tap_merchants
                .update(
                {
                  updated_at: newSubscriptionDate.start,
                  first_threshold_notified: "false",
                  second_threshold_notified: "false",
                  sms_sent: 0
                },
                {
                  where: {
                    merchant_id: merchant_id
                  }
                }
                )
                .then(merchantResponse => {
                  if (merchantResponse) {
                    resolve({ status: true });
                  } else {
                    resolve({ status: false });
                  }
                });
            } else {
              resolve({ status: false });
            }
          })
          .catch(err => {
            reject(err);
          });
      });
    } catch (error) {
      reject(error);
    }
  },
  tapScheduleSubscriptionAndTierUpdate: (
    newSubscriptionDate,
    merchant_id,
    schedule_id,
    tier_id,
    old_schedule_id,
    old_tier_id,
    upperBound
  ) => {
    try {
      return new Promise((resolve, reject) => {
        //update merchant subscription 
        model.tap_schedule_subscription
          .update(
          {
            subscription_start_date: newSubscriptionDate.start,
            subscription_end_date: newSubscriptionDate.end,
            update_date: newSubscriptionDate.start,
            tier_id: tier_id,
            schedule_id: schedule_id
          },
          {
            where: {
              merchant_id: merchant_id,
              schedule_id: old_schedule_id,
              tier_id: old_tier_id
            }
          }
          )
          .then(response => {
            if (response) {
              //update merchants
              model.tap_merchants
                .update(
                {
                  sms_limit: upperBound,
                  first_threshold_notified: "false",
                  second_threshold_notified: "false",
                  sms_sent: 0,
                  sms_unlimited: upperBound == 0 ? 1 : 0,
                  updated_at : newSubscriptionDate.start
                },
                {
                  where: {
                    merchant_id: merchant_id
                  }
                }
                )
                .then(merchantResponse => {
                  if (merchantResponse) {
                    resolve({ status: true });
                  } else {
                    resolve({ status: false });
                  }
                });
            } else {
              ({ status: false });
            }
          })
          .catch(err => {
            reject(err);
          });
      });
    } catch (error) {
      reject(error);
    }
  },

  tapScheduleTierInformationFind: tier_id => {
    return new Promise((resolve, reject) => {
      try {
        model.tap_schedule_tier_information
          .find({
            attributes: [
              "subscribed_price",
              "subscription_upper_bound_seg_count"
            ],
            where: {
              id: tier_id
            }
          })
          .then(tierInfoResponse => {
            if (tierInfoResponse) {
              resolve({ status: true, data: tierInfoResponse });
            } else {
              resolve({ status: false, data: [] });
            }
          })
          .catch(err => {
            reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  },

  tapDowngradeRequestStatusChange: (tier_id, merchant_id, schedule_id) => {
    return new Promise((resolve, reject) => {
      try {
        model.tap_downgrade_requests
          .update(
          {
            isdowngrade_used: "1",
            update_date: Math.floor(Date.now() / 1000)
          },
          {
            where: {
              merchant_id: merchant_id,
              schedule_id: schedule_id,
              tier_id: tier_id
            }
          }
          )
          .then(tierInfoResponse => {
            if (tierInfoResponse) {
              resolve({ status: true });
            } else {
              resolve({ status: false });
            }
          })
          .catch(err => {
            reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  },

  tapMerchantNickName: merchant_id => {
    return new Promise((resolve, reject) => {
      try {
        model.tap_merchants
          .find({
            attributes: ["nick_name"],
            where: {
              merchant_id: merchant_id
            }
          })
          .then(nicknameResponse => {
            if (nicknameResponse) {
              resolve({ status: true, data: nicknameResponse });
            } else {
              resolve({ status: false, data: [] });
            }
          })
          .catch(err => {
            reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  },

  getMerchantSubscriptionDate: merchant_id => {
    return new Promise((resolve, reject) => {
      try {
        model.tap_schedule_subscription
          .find({
            attributes: [
              "subscription_start_date",
              "subscription_end_date",
              "schedule_id",
              "tier_id",
              "merchant_id"
            ],
            where: {
              merchant_id: merchant_id
            }
          })
          .then(nicknameResponse => {
            if (nicknameResponse) {
              resolve({ status: true, data: nicknameResponse });
            } else {
              resolve({ status: false, data: [] });
            }
          })
          .catch(err => {
            reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  },
  checkTierInfo: (schedule_id, tier_id, count) => {
    return new Promise((resolve, reject) => {
      try {
        model.tap_schedule_tier_information
          .find({
            attributes: [
              "subscription_lower_bound_seg_count",
              "subscription_upper_bound_seg_count",
              "subscribed_price",
              "tier_number"
            ],
            where: {
              id: tier_id,
              schedule_id: schedule_id,
              subscription_upper_bound_seg_count: {
                [Op.gt]: 0
              }
            }
          })
          .then(tierInfo => {
            if (tierInfo) {
              model.tap_schedule_tier_information
                .find({
                  attributes: ["overage_price"],
                  where: {
                    schedule_id: schedule_id,
                    tier_number: tierInfo.tier_number + 1
                  }
                })
                .then(overageResponse => {
                  if (overageResponse) {
                    resolve({
                      status: true,
                      data: tierInfo,
                      overageData: overageResponse.overage_price
                        ? overageResponse.overage_price
                        : 0
                    });
                  } else {
                    resolve({
                      status: false,
                      data: []
                    });
                  }
                });
            } else {
              resolve({ status: false, data: [] });
            }
          })
          .catch(err => {
            reject(err);
          });
      } catch (error) {
        reject(error);
      }
    });
  },
  checkTierInfoThreshold: (schedule_id, tier_id, count) => {
    return new Promise((resolve, reject) => {
      try {
        model.tap_schedule_tier_information
          .find({
            attributes: [
              "subscription_lower_bound_seg_count",
              "subscription_upper_bound_seg_count",
              "subscribed_price",
              "tier_number"
            ],
            where: {
              id: tier_id,
              schedule_id: schedule_id,
              subscription_upper_bound_seg_count: {
                [Op.gt]: 0
              }
            }
          })
          .then(tierInfo => {
            if (tierInfo) {
              model.tap_schedule_tier_information
                .find({
                  attributes: ["overage_price"],
                  where: {
                    schedule_id: schedule_id,
                    tier_number: tierInfo.tier_number + 1
                  }
                })
                .then(overageResponse => {
                  if (overageResponse) {
                    resolve({
                      status: true,
                      data: tierInfo,
                      overageData: overageResponse.overage_price
                        ? overageResponse.overage_price
                        : 0
                    });
                  } else {
                    resolve({
                      status: true,
                      data: tierInfo,
                      overageData: 0
                    });
                  }
                });
            } else {
              resolve({ status: false, data: [] });
            }
          })
          .catch(err => {
            reject(err);
          });
      } catch (error) {
        reject(error);
      }
    });
  },
  checkMessagePercentage: (
    merchant_id,
    upperBound,
    count,
    first_threshold_status,
    second_threshold_status,
    first,
    second
  ) => {
    return new Promise((resolve, reject) => {
   
      try {
        var percentage = (count / upperBound) * 100;
        if (
          first_threshold_status === "false" &&
          percentage >= 100 - first &&
          percentage < 100 - second
        ) {
          resolve({
            status: true,
            type: "first",
            value: percentage,
            merchant_id: merchant_id
          });
        } else if (
          second_threshold_status === "false" &&
          percentage >= 100 - second &&
          percentage > 0 &&
          percentage < 100
        ) {
          resolve({
            status: true,
            type: "second",
            value: percentage,
            merchant_id: merchant_id
          });
        } else {
          resolve({ status: false });
        }
      } catch (error) {
        resolve({ status: false });
      }
    });
  },
  getThreshold: () => {
    return new Promise((resolve, reject) => {
      try {
        model.tap_settings
          .find({
            attributes: [
              "first_threshold_val",
              "second_threshold_val",
              "sms_notification_check",
              "email_notification_check"
            ]
          })
          .then(tapSettingsResponse => {
            if (tapSettingsResponse) {
              resolve({ status: true, data: tapSettingsResponse.dataValues });
            } else {
              resolve({ status: false });
            }
          });
      } catch (error) {
        resolve({ status: false });
      }
    });
  },
  changeThresholdState: (valueToChange, merchant_id) => {
    return new Promise((resolve, reject) => {
      try {
        let updateData = {};
        let on = {};
        if (valueToChange == "second_threshold_notified") {
          updateData[valueToChange] = true;
          updateData["first_threshold_notified"] = true;
          updateData["updated_at"] = Math.floor(Date.now() / 1000);
        } else {
          updateData[valueToChange] = "true";
          updateData["updated_at"] = Math.floor(Date.now() / 1000);
        }

        on["where"] = {
          merchant_id: merchant_id
        };

        model.tap_merchants.update(updateData, on).then(tapSettingsResponse => {
          if (tapSettingsResponse) {
            resolve({ status: true });
          } else {
            resolve({ status: false });
          }
        });
      } catch (error) {
        console.log(error);
        resolve({ status: false });
      }
    });
  },
  // getSegmentsx: (customers, offer, merchantResponse) => {
  //   return new Promise((resolve, reject) => {
  //     try {

  //       var segment = 0
  //       var english = 0
  //       var englishSegmentCount = 0
  //       var spanishSegmentCount = 0
  //       var spanish = 0
  //       function decodeHTMLEntities(text) {
  //         var entities = [
  //           ["amp", "&"],
  //           ["apos", "'"],
  //           ["#x27", "'"],
  //           ["#x2F", "/"],
  //           ["#39", "'"],
  //           ["#47", "/"],
  //           ["lt", "<"],
  //           ["gt", ">"],
  //           ["nbsp", " "],
  //           ["quot", '"']
  //         ];
  //         for (var i = 0, max = entities.length; i < max; ++i) {
  //           text = text.replace(
  //             new RegExp("&" + entities[i][0] + ";", "g"),
  //             entities[i][1]
  //           );
  //         }
  //         return text;
  //       }
  //       customers.forEach(async function (customer, index) {
  //         console.log(customer.prefContactMethod)

      
  //         if ((index === (customers.length - 1) )) {
  //           if(customer.prefContactMethod == 0 || customer.prefContactMethod == 2){
  //             function PuertoRico2(phonenumber) {
  //               phonenumber = phonenumber.toString();
  //               return phonenumber.startsWith("1939") ||
  //                 phonenumber.startsWith("+1939") ||
  //                 phonenumber.startsWith("939") ||
  //                 phonenumber.startsWith("+939") ||
  //                 phonenumber.startsWith("1787") ||
  //                 phonenumber.startsWith("787") ||
  //                 phonenumber.startsWith("+1787") ||
  //                 phonenumber.startsWith("+787")
  //                 ? true
  //                 : false;
  //             }
  //             var customerPhone = (customer.customer_phone).toString();
  //             console.log('aaaaaaaaaaaaaaaaaaa')
  //             var PuertoRico = await PuertoRico2(customerPhone);
  //             console.log(PuertoRico , customerPhone)
  //             if (!PuertoRico) {
  //               var message = textmessage.giveCouponWithShortUrl.english;
  //               english = english + 1
  //             }
  //             if (PuertoRico) {
  //               message = textmessage.giveCouponWithShortUrl.spanish;
  //               spanish = spanish + 1
  //             }
  //             message = message.replace("%SHORTURL%", '111111111111111111111');
  
  //             message = message.replace(
  //               "%DBA%",
  //               offer !== null ?
  //                 merchantResponse.nick_name :
  //                 ""
  //             );
  //             console.log(message)
  //             message = message.replace(
  //               "%REWARD_TEXT%",
  //               offer.reward_text !== null ?
  //                 decodeHTMLEntities(offer.reward_text) :
  //                 ""
  //             );
  //             message = message.replace(
  //               "%SPANISH_REWARD_TEXT%",
  //               offer.reward_text !== null ?
  //                 decodeHTMLEntities(offer.reward_text) :
  //                 ""
  //             );
  
  //             var info = splitter.split(message);
  //             var messagesegment = info.parts.length;
  //             console.log(messagesegment , message , info)
              
  //             segment = segment + messagesegment
  //             return resolve(segment);
  //           }else{
  //             console.log("segment" , segment)
  //             return resolve(segment);
  //           }

  //         } else {
  //           if(customer.prefContactMethod == 0 || customer.prefContactMethod == 2){
  //             function PuertoRico3(phonenumber) {
  //               phonenumber = phonenumber.toString();
  //               return phonenumber.startsWith("1939") ||
  //                 phonenumber.startsWith("+1939") ||
  //                 phonenumber.startsWith("939") ||
  //                 phonenumber.startsWith("+939") ||
  //                 phonenumber.startsWith("1787") ||
  //                 phonenumber.startsWith("787") ||
  //                 phonenumber.startsWith("+1787") ||
  //                 phonenumber.startsWith("+787")
  //                 ? true
  //                 : false;
  //             }
  //             var customerPhone = (customer.customer_phone).toString();
  //             var PuertoRico = await PuertoRico3(customerPhone);
  //             console.log(PuertoRico , customerPhone)
  
  //             if (!PuertoRico) {
  //               var message = textmessage.giveCouponWithShortUrl.english;
  //               english = english + 1
  //             }
  //             if (PuertoRico) {
  //               message = textmessage.giveCouponWithShortUrl.spanish;
  //               spanish = spanish + 1
  //             }
  //             message = message.replace("%SHORTURL%", '111111111111111111111');
  
  //             message = message.replace(
  //               "%DBA%",
  //               offer !== null ?
  //                 merchantResponse.nick_name :
  //                 ""
  //             );
  //             message = message.replace(
  //               "%REWARD_TEXT%",
  //               offer.reward_text !== null ?
  //                 decodeHTMLEntities(offer.reward_text) :
  //                 ""
  //             );
  //             console.log(message)
  //             message = message.replace(
  //               "%SPANISH_REWARD_TEXT%",
  //               offer.reward_text !== null ?
  //                 decodeHTMLEntities(offer.reward_text) :
  //                 ""
  //             );
  
  //             var info = splitter.split(message);
  //             var messagesegment = info.parts.length;
  //             console.log("22222" , messagesegment , message , info)
  //             segment = segment + messagesegment
  //           }

  //         }
  //       })

  //     } catch (error) {
  //       console.log(error)
  //       return resolve(error)
  //     }
  //   })
  // },
  getSegments : (customers, offer, merchantResponse) => {
      return new Promise((resolve , reject) => {
        var segment = 0
        var english = 0
        var englishSegmentCount = 0
        var spanishSegmentCount = 0
        var spanish = 0
        async.forEachSeries(customers, function (customer, callback) { 
          try {
                var customerPhone = (customer.customer_phone).toString();
                var PuertoRico =  PuertoRicoCheck(customerPhone);
                console.log(PuertoRico , customerPhone)
                if (!PuertoRico) {
                  var message = textmessage.giveCouponWithShortUrl.english;
                  english = english + 1
                }
                if (PuertoRico) {
                  message = textmessage.giveCouponWithShortUrl.spanish;
                  spanish = spanish + 1
                }
                message = message.replace("%SHORTURL%", '111111111111111111111');
                message = message.replace(
                  "%DBA%",
                  offer !== null ?
                    merchantResponse.nick_name :
                    ""
                );
                message = message.replace(
                  "%REWARD_TEXT%",
                  offer.reward_text !== null ?
                    decodeHTMLEntities(offer.reward_text) :
                    ""
                );
                message = message.replace(
                  "%SPANISH_REWARD_TEXT%",
                  offer.reward_text !== null ?
                    decodeHTMLEntities(offer.reward_text) :
                    ""
                );
                var info = splitter.split(message);
                var messagesegment = info.parts.length;
                console.log(messagesegment , message , info)
                if (!PuertoRico) {
                  englishSegmentCount = englishSegmentCount + messagesegment
                }
                if (PuertoRico) {
                  spanishSegmentCount = spanishSegmentCount + messagesegment
                }
                segment = segment + messagesegment;
                callback();
            
          } catch (error) {
            reject(error.message)
          }
        }, function(err){
            console.log("iteration ended", segment)
            console.log(segment , english , spanish , englishSegmentCount , spanishSegmentCount)
            resolve({
              totalSegments :  segment ,
              englishMerchants : english , 
              spanishMerchants : spanish ,
              englishMerchantsSegmentCount : englishSegmentCount ,
              spanishMerchantsSegmentCount : spanishSegmentCount
            })
        })
      })
  },
  getSegmentsForTextYourCustomers: (text) => {
    return new Promise((resolve, reject) => {
      console.log(text)
      try {
        var info = splitter.split(text);
        var messagesegment = info.parts.length;
        resolve(messagesegment)

      } catch (error) {
        reject(error)
      }
    })
  }
  ,
  getDba: (merchant_id) => {
    return new Promise((resolve, reject) => {
      try {
        model.tap_merchants.find({
          attributes: ["dba", "sms_sent", "sms_limit", "sms_unlimited", "email_limit", "email_sent" , "nick_name", "timezone"],
          where: [{
            merchant_id: merchant_id
          }
          ]
        }).then(function (merchantDba) {
          if (merchantDba) {
            resolve(merchantDba)
          } else {
            reject(new Error("no response"))
          }
        })

      } catch (error) {
        reject(error)
      }
    })
  },
  getMerchantCustomerWithUnusedCoupons: (startDate, endDate) => {
    return new Promise(function (resolve, reject) {
      try {
        var sql = "SELECT merch.taptext_status,offer.Data, offer.Discount_Percentage,offer.discount_unit, offer.reward_text, " +
          "merchCust.firstName, merchCust.customer_phone as phoneNumber, merchCust.customer_id as cid, merchCust.prefContactMethod, merchCust.emails, " +
          "merch.merchant_id, merch.dba, merch.nick_name, merch.email_sent, merch.sms_sent, " +
          "merchCust.optin " +
          "FROM tap_coupons coupon " +
          "LEFT JOIN tap_coupons_used used ON coupon.id = used.coupon_id " +
          "INNER JOIN tap_merchants merch on coupon.merchant_id = merch.merchant_id " +
          "INNER JOIN tap_merchant_offers offer on coupon.offerid = offer.id " +
          "INNER JOIN tap_customers_merchant merchCust on coupon.merchant_id = merchCust.merchant_id AND coupon.customer_id = merchCust.customer_id " +
          "WHERE used.id IS NULL AND coupon.expires >= " + startDate + " AND coupon.expires <= " + endDate + " AND merch.active = 'true'";
        console.log("Query: ", sql);
        model.sequelize.query(sql)
          .then(function (result) {
            if (result.length > 0) {
              resolve(result[0]);
            } else {
              resolve([]);
            }
          })
          .catch(function (err) {
            reject(err);
          });
      } catch (error) {
      }

    });
  },
  sendMessage: (phone, message, msgType) => {
    return new Promise((resolve, reject) => {
      try {
        console.log(phone, message, msgType)
        tap_twilioSMSController.twilioSMSSent({
          phone: phone,
          message: message,
          msgType: msgType
        }, function (err, send) {
          console.log("err, send" , err, send)
          if (err) {
            resolve({ status: false, res: err })
          } else {
            // update count for segment for merchant    
            resolve({ status: true, res: send })
          }

        })
      } catch (error) {
        console.log('error' , error)
        resolve({ status: false, res: error })
      }
    })
  },
  saveSmsLogs: (segments, price, subject, textmessage, merchant_id, phoneNumber, sentSMS) => {
    return new Promise(async (resolve, reject) => {
      try {

        const savesentSms = (data) => {
          return new Promise((resolve, reject) => {
            model.tap_sent_sms
              .bulkCreate(data)
              .then(function (issendSMSstored) {
                resolve(true);
              })
              .catch(function (err) {
                resolve(true);
              });
          })
        }
        let messsageValues = [];
        let sentSmsDetails = {
          timestamp: moment().unix(),
          merchant_id: merchant_id,
          message: textmessage,
          subject: subject,
          sms_segment: segments,
          price: price,
          type: 'SMS',
          numMedia: '0'
        }
        sentSmsDetails.customer_phone = phoneNumber;
        sentSmsDetails.res_data = JSON.stringify(sentSMS);
        messsageValues.push(sentSmsDetails);
        var returnValue = await savesentSms(messsageValues)
        return resolve(returnValue)
      } catch (error) {
        resolve(error)
      }
    })
  },
  saveSmsFailLogs: (segments, price, subject, textmessage, merchant_id, phoneNumber, sentSMS) => {
    return new Promise(async (resolve, reject) => {
      try {

        const savesentSms = (data) => {
          return new Promise((resolve, reject) => {
            model.tap_failed_sms
              .bulkCreate(data)
              .then(function (issendSMSstored) {
                resolve(true);
              })
              .catch(function (err) {
                resolve(true);
              });
          })
        }
        let messsageValues = [];
        let sentSmsDetails = {
          timestamp: moment().unix(),
          merchant_id: merchant_id,
          message: textmessage,
          subject: subject,
          sms_segment: segments,
          price: price,
          type: 'SMS',
          numMedia: '0'
        }
        sentSmsDetails.customer_phone = phoneNumber;
        sentSmsDetails.res_data = JSON.stringify(sentSMS);
        messsageValues.push(sentSmsDetails);
        var returnValue = await savesentSms(messsageValues)
        return resolve(returnValue)
      } catch (error) {
        resolve(error)
      }
    })
  },

  updateMerchants: (params) => {
    return new Promise(function (resolve, reject) {
      function shorturl(message) {
        var mesgseg = {};
        return new Promise(function (resolve, reject) {
          var info = splitter.split(message);
          var segment = info.parts.length;
          mesgseg.message = message;
          mesgseg.segment = segment;
          resolve(mesgseg);
        });
      }
      var today = Math.floor(Date.now() / 1000);
      var update_expression = `updated_at= ${today}`;
      shorturl(params.message).then(
        async function (mesgseg) {
          var addmessage = mesgseg.segment;
          var checkTrainingMode = await trainingMode.checkTrainingMode(params.merchant_id);
          if (params.sms_sent !== undefined && !checkTrainingMode) {
            update_expression += `,sms_sent = sms_sent + ${addmessage}`;
          }else if(params.sms_sent !== undefined && checkTrainingMode){
            update_expression += `,sms_sent_training = sms_sent_training + ${addmessage}`;
          }
          if (params.email_sent !== undefined) {
            update_expression += `,email_sent = email_sent + 1 `;
          }
          var sql = `UPDATE tap_merchants SET ${update_expression} WHERE merchant_id=:merchant_id`;
          console.log("update merchant sql", sql);
          model.sequelize
            .query(sql, {
              replacements: {
                update_expression: update_expression,
                merchant_id: params.merchant_id
              },
              type: model.sequelize.QueryTypes.UPDATE
            })
            .then(info => {
              console.log(info)
              resolve(info);
            })
            .catch(function (err) {
              console.log(err);
              reject(err);
            });
        },
        function (error) {
          console.log("email sent failed");
          reject(error);
        }
      );
    });
  },
  sendEmail: (emails, messageData, logstimestamp, email_subjects, email_from) => {
    return new Promise(function (resolve, reject) {
      try {
        function set_mail_template(subject, body) {
          var template = '<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Email Newsletter</title> <style> table tr td { padding: 0; font-family:Roboto-Regular,Helvetica,Arial,sans-serif; } .email-btn { padding: 7px 14px; background-color: #59ca46; color: #fff; font-size: 16px; text-align: center; display: inline-block; text-decoration: none; font-weight: 700; margin: 20px auto; } </style> </head> <body> <table width="100%" cellpadding="0" cellspacing="0"> <tr> <td> <table id="top-message" cellpadding="20" cellspacing="0" width="600" align="center"> <tr> <td style="padding: 30px 0px; background-color: #fff; background-image: url(https://boarding.taplocalmarketing.com/assets/images/header-bg.jpg); background-size: cover; border-top: 5px solid #59ca46; border-bottom: 1px solid #ccc;"> <img src="https://boarding.taplocalmarketing.com/assets/images/logo.png" alt="logo" style="width: 200px; margin: 0 auto; display: block;"> </td> </tr> <tr> <td> <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#fff" style="margin: 30px auto"> <tr> <td style="color: #000;"> <h2 style="color: #59ca46; margin: 0; font-size: 24px; text-align: center;">' + subject + '</h2> </td> </tr> <tr> <td> <p style="color: #000; font-size: 16px; text-align: center; line-height: 24px; padding-top: 20px;">' + body + '</p> </td> </tr> </table> </td> </tr> <tr> <td> <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFF" style="border-top: 1px solid #ccc;"> <tr> <td style="padding:20px 20px; font-size: 12px; text-align: center;"> <img src="https://boarding.taplocalmarketing.com/assets/images/logo.png" alt="logo" style="width: 160px; margin: 0 auto; display: block;"> </td> </tr> <tr> <td style="text-align: center; padding: 10px 0px;"> <p>&copy; 2017 Corp. All Rights Reserved </p> </td> </tr> </table> </td> </tr> </table> </td> </tr> </table><!-- Main Table --> </body> </html>'
          return template;
        }
        var timestampEmailLog = logstimestamp || Math.floor(Date.now() / 1000);
        var email_subject = (email_subjects !== "" ? email_subjects : "Coupon Expiry Reminder");
        var email_from = email_from || "admin@tapclover.com";
  
        let mailOptions = {
          from: email_from, // sender address
          to: emails, // list of receivers
          subject: email_subject, // Subject line
          html: messageData
        };
        transporterAdmin.sendMail(mailOptions, function (err, Maildata) {
          if (err) {
            resolve(err);
          } else {
            resolve(Maildata);
          }
        })  // sns.publish 
      } catch (error) {
        resolve(error);
      }
 
    });// promise end;

  },
  saveEmailLogs: (segments, price, subject, textmessage, merchant_id, phoneNumber, sentSMS, from, to) => {
    return new Promise(async (resolve, reject) => {
      function saveEmailData(data) {
        return new Promise((resolve, reject) => {
          model.tap_sent_emails
            .bulkCreate(data)
            .then(function (issendSMSstored) {
              insertValues = [];
              couponsCreated = [];
              insertValuesEmail = [];
              resolve('ok');
            })
            .catch(function (err) {
              createApiLogs.customOffersWrite(`SQL Error happen when saveEmailData function `, err);
              reject(err);
            });
        });
      }
      let messsageValues = [];
      let sentSmsDetails = {
        timestamp: moment().unix(),
        merchant_id: merchant_id,
        message: textmessage,
        subject: subject,
        sms_segment: segments,
        price: price,
        type: 'SMS',
        numMedia: '0',
        from: from,
        to: to
      }
      sentSmsDetails.customer_phone = phoneNumber;
      sentSmsDetails.res_data = JSON.stringify(sentSMS);
      messsageValues.push(sentSmsDetails);
      var returnValue = await saveEmailData(messsageValues)
      resolve(returnValue)
    })
  },
  checkCurrentScheduleIsTraining: function (merchant_id) {
    return new Promise(async function (resolve, reject) {
      // var sql = "SELECT tb.schedule_name FROM tap_schedule_subscription AS tss INNER JOIN tap_billingschedule AS tb ON tss.schedule_id = tb.id where tss.merchant_id = :merchant_id";
      // var queryParam = {
      //   merchant_id: merchant_id
      // };
      // model.sequelize
      //   .query(sql, {
      //     replacements: queryParam,
      //     type: model.sequelize.QueryTypes.SELECT
      //   }).then(function (data) {
      //     if (data.length > 0) {
      //       if (data[0].schedule_name == 'Training') {
      //         resolve(true);
      //       } else {
      //         resolve(false);
      //       }
      //     } else {
      //       resolve(false);
      //     }
      //   }).catch(function (err) {
      //     reject(err);
      //   });
      var checkTrainingModeIsActive = await trainingMode.checkTrainingMode(merchant_id);
      if (checkTrainingModeIsActive) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  },
   getScheduleTiers: function (schedule_id , segmentsToSend , limit , sent , calculatedSegments) {
    return new Promise(function (resolve, reject) {
       model.tap_schedule_tier_information.findAll({
         where : {
          schedule_id : schedule_id
         }
       }).then((getAllTiers) => {
        var found = getAllTiers.find(function(element) {
               return element.subscription_upper_bound_seg_count >= segmentsToSend
        });
        if(found){
           resolve({status : true , willGo : null , willFail : null , overageData : found.overage_price})
        }else{
           var getLength = getAllTiers.length;
           var messagesLeft = getAllTiers[getLength - 1].subscription_upper_bound_seg_count - sent;
           var messagesWillFail = messagesLeft - calculatedSegments;
           resolve({status : true , willGo : messagesLeft , willFail : messagesWillFail , overageData : getAllTiers[getLength - 1].overage_price , maxLimit : getAllTiers[getLength - 1].subscription_upper_bound_seg_count})
        }
       })
    });
  },
  getConsume: function (merchant_id, phoneNumber) {
    return new Promise(function (resolve, reject) {
      model.tap_merchants.find({
        where: {
          merchant_id: merchant_id
        }
      }).then((merchantResponse) => {
        getMerchantCustomerSMSCount(
          merchant_id,
          phoneNumber,
          "monthly",
          "sms"
        ).then(
          function (consumed_count) {
            if (consumed_count.consume >= merchantResponse.sms_limit_perUser) {
              resolve(false)
            } else {
              resolve(true)
            }
          },
          function (err) {
            reject(err);
          });
       })
    });
  }
};

function getMerchantCustomerSMSCount(
  merchant_id,
  customer_phone,
  filter_by,
  type
) {
  return new Promise(function (resolve, reject) {
    var tableName;
    var sql;
    var timestampStart;
    var timestampEnd;
    switch (type) {
      case "sms":
        tableName = "tap_sent_sms";
        break;
      case "email":
        tableName = "tap_sent_emails";
        break;
    }
    switch (filter_by) {
      case "daily":
        var start = new Date();
        start.setHours(0, 0, 0, 0);
        var end = new Date();
        end.setHours(23, 59, 59, 999);
        timestampStart = timestamp.fromDate(start.toUTCString());
        timestampEnd = timestamp.fromDate(end.toUTCString());
        sql =
          "SELECT COUNT(id) AS consume FROM " +
          tableName +
          " WHERE merchant_id = :merchant_id AND customer_phone = :customer_phone AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
        break;
      case "weekly":
        var curr = new Date(); // get current date
        var first = curr.getDate() - curr.getDay(); // First day is the day of the month - the day of the week
        var firstday = new Date(curr.setDate(first));
        var last = firstday.getDate() + 6; // last day is the first day + 7
        var lastday = new Date(curr.setDate(last));
        firstday.setHours(0, 0, 0, 0);
        lastday.setHours(23, 59, 59, 999);
        timestampStart = timestamp.fromDate(firstday.toUTCString());
        timestampEnd = timestamp.fromDate(lastday.toUTCString());
        sql =
          "SELECT COUNT(id) AS consume FROM " +
          tableName +
          " WHERE merchant_id = :merchant_id AND customer_phone = :customer_phone AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
        break;
      case "monthly":
        var tmpDate = new Date();
        var y = tmpDate.getFullYear();
        var m = tmpDate.getMonth();
        var firstDay = new Date(y, m, 1);
        var lastDay = new Date(y, m + 1, 0);
        lastDay.setHours(23, 59, 59, 999);
        firstDay.setHours(0, 0, 0, 0);
        timestampStart = timestamp.fromDate(firstDay.toUTCString());
        timestampEnd = timestamp.fromDate(lastDay.toUTCString());
        sql =
          "SELECT COUNT(id) AS consume FROM " +
          tableName +
          " WHERE merchant_id = :merchant_id AND customer_phone = :customer_phone AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
        break;
      case "quarterly":
        var today = new Date(),
          quarter = Math.floor(today.getMonth() / 3),
          firstday,
          lastday;
        firstday = new Date(today.getFullYear(), quarter * 3, 1);
        lastday = new Date(firstday.getFullYear(), firstday.getMonth() + 3, 0);
        firstday.setHours(0, 0, 0, 0);
        lastday.setHours(23, 59, 59, 999);
        timestampStart = timestamp.fromDate(firstday.toUTCString());
        timestampEnd = timestamp.fromDate(lastday.toUTCString());
        sql =
          "SELECT COUNT(id) AS consume FROM " +
          tableName +
          " WHERE merchant_id = :merchant_id AND customer_phone = :customer_phone AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
        break;
      case "yearly":
        var d = new Date();
        var firstday = new Date(d.getFullYear(), 0, 1);
        var lastday = new Date(d.getFullYear(), 11, 31);
        firstday.setHours(0, 0, 0, 0);
        lastday.setHours(23, 59, 59, 999);
        timestampStart = timestamp.fromDate(firstday.toUTCString());
        timestampEnd = timestamp.fromDate(lastday.toUTCString());
        sql =
          "SELECT COUNT(id) AS consume FROM " +
          tableName +
          " WHERE merchant_id = :merchant_id AND customer_phone = :customer_phone AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
        break;
      default:
        var start = new Date();
        start.setHours(0, 0, 0, 0);
        var end = new Date();
        end.setHours(23, 59, 59, 999);
        timestampStart = timestamp.fromDate(start.toUTCString());
        timestampEnd = timestamp.fromDate(end.toUTCString());
        sql =
          "SELECT COUNT(id) AS consume FROM " +
          tableName +
          " WHERE merchant_id = :merchant_id AND customer_phone = :customer_phone AND timestamp >= :timestampStart AND timestamp <= :timestampEnd GROUP BY merchant_id";
        break;
    }
    model.sequelize
      .query(sql, {
        replacements: {
          timestampStart: timestampStart,
          timestampEnd: timestampEnd,
          merchant_id: merchant_id,
          customer_phone: customer_phone
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function (rows) {
        if (rows.length > 0) {
          resolve(rows[0]);
        } else {
          var obj = {
            consume: 0
          };
          resolve(obj);
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}


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
function PuertoRicoCheck(phonenumber) {
  phonenumber = phonenumber.toString();
  return phonenumber.startsWith("1939") ||
    phonenumber.startsWith("+1939") ||
    phonenumber.startsWith("939") ||
    phonenumber.startsWith("+939") ||
    phonenumber.startsWith("1787") ||
    phonenumber.startsWith("787") ||
    phonenumber.startsWith("+1787") ||
    phonenumber.startsWith("+787")
    ? true
    : false;
}