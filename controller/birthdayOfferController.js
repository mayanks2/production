"use strict";
var model = require("../model");
var config = require("../config/config");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));
var helpher = require("../controller/common/helper");
var tap_twilioSMSController = require("../controller/tap_twilioSMSController");
var textmessage = require("../language/textMessage");
const RES_MESSAGE = require("../language/errorMsg");
// var tapGenerateCoupon = require("../controller/tapGenerateCouponController");
var tapGenerateCoupon = require("../controller/generateCouponController");
const moment = require("moment-timezone");
const async = require("async");
module.exports = {
  sendOffer: function (req, res) {
    let today = Math.floor(Date.now() / 1000);
    getAllActiveBirthdayCustomers().then(
      function (customersOffers) {
        async.eachSeries(customersOffers, function (offer, callback) {
          console.log('customer_phone----------------------------------------------------------------------------------------------------------------------', offer.customer_phone);
          let generate_coupon = false;
          if (offer["time"] !== undefined && offer["time_zone"] !== undefined) {
            generate_coupon = check_coupon_time(
              offer["start_date"],
              offer["time"],
              offer["time_zone"]
            );
          } else {
            let currentTimeInUTC = moment().unix();
            generate_coupon = check_coupon_time(
              currentTimeInUTC,
              "12:00",
              "UTC"
            );
          }
          if (generate_coupon) {
            let phonenumber = offer.customer_phone.toString();
            let PuertoRico = helpher.PuertoRico(phonenumber);
            let sms_content = textmessage.happyBirthdayOfferWithShortUrl.english;
            if (PuertoRico) {
              sms_content = textmessage.happyBirthdayOfferWithShortUrl.spanish;
            }
            console.log('content----------------------------------------------------------------------------------------------------------------------', sms_content, phonenumber);
            tapGenerateCoupon.GenerateCoupon({
              offer_type: "14",
              merchant_id: offer.merchant_id,
              customer_id: offer.customer_id,
              message: sms_content,
              mediaUrl: offer.reward_text_media_image,
              msgType: offer.reward_text_message_type,
              spanishmediaUrl: offer.spanish_reward_text_media_image,
              spanishmsgType: offer.spanish_reward_text_message_type,
            },
              function (error, response) {
                if (error) {
                  console.log("Fail to send offer: " + JSON.stringify(error));
                  callback();
                } else {
                  if (response.statusCode == 200) {
                    console.log(
                      "Offer send successfully: " + JSON.stringify(response)
                    );
                    callback();
                  } else {
                    console.log(
                      "Fail to send offer: " + JSON.stringify(response)
                    );
                    callback();
                  }
                }
              }
            );
          } else {
            callback();
          }
        }, (error) => {
          if (error) {
            console.log(error);
          }
          console.log(RES_MESSAGE.CRON_JOB_SUCCESS);
          responseMsg.OK.message = RES_MESSAGE.CRON_JOB_SUCCESS;
          return responseMsg.OK;
        });
      },
      function (error) {
        responseMsg.RESPONSE400.message = error;
        console.log(responseMsg.RESPONSE400);
        return responseMsg.RESPONSE400;
      }
    );
  }
};

function getAllActiveBirthdayCustomers() {
  var today = new Date();
  var today_time = Math.floor(Date.now() / 1000);
  var bithdayDate = today.getDate();
  var bithdayMonth = today.getMonth() + 1;
  bithdayDate = bithdayDate < 10 ? bithdayDate : bithdayDate;
  bithdayMonth = bithdayMonth < 10 ? bithdayMonth : bithdayMonth;
  return new Promise(function (resolve, reject) {
    var sqlGetCustomersWithBirthDayToday =
      `SELECT  m.reward_text_media_image, m.reward_text_message_type, spanish_reward_text_message_type, spanish_reward_text_media_image,
       m.start_date,m.MerchantId as merchant_id, m.time,m.time_zone,m.Discount_Type, cm.customer_id,cm.customer_phone,cm.last_visit_at FROM tap_merchant_offers m 
      INNER JOIN tap_customers_merchant cm ON m.MerchantId = cm.merchant_id INNER JOIN tap_customers c on cm.customer_id = c.id WHERE m.active='true' 
      AND cm.optin='1' and start_date<=:today_time AND m.Discount_Type = 14 AND cm.birthDay =  :bithdayDate  AND cm.birthMonth =  :bithdayMonth`;
    var sqlGetCustomersWithBirthDayTodayParam = {
      today_time: today_time,
      bithdayDate: bithdayDate,
      bithdayMonth: bithdayMonth
    };
    model.sequelize
      .query(sqlGetCustomersWithBirthDayToday, {
        replacements: sqlGetCustomersWithBirthDayTodayParam,
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function (rows) {
        if (rows.length > 0) {
          console.log("rows", rows);
          resolve(rows);
        } else {
          var errorCustomer = "Sorry! No Record found.";
          reject(errorCustomer);
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}

function check_coupon_time(start_date, time, timezones) {
  var zone = helpher.timezone(timezones);
  var givendate = moment.unix(start_date).format("YYYY-MM-DD");
  console.log(
    "given date-------------" + time + "--------------- : " + givendate
  );
  var selTime = moment(givendate + " " + time + ":00").unix();
  console.log("Selected date " + selTime);
  //below current time on selected time zone
  var couponTime = moment.tz(zone).format("YYYY-MM-DD " + time + ":00");
  var currTime = moment.tz(zone).format("YYYY-MM-DD HH:mm:ss");
  // below mainCurrTime time in selected time zone with unix format
  var mainCurrTime = moment(currTime).unix();
  var mainCouponTime = moment(couponTime).unix();
  console.log(zone + "---" + currTime);
  // 3mints back time with time zone and send it to between range when cron like if mst 8am then check offer betwwen 7:57 am or 7:58am to 8 :00 or 8:01 am

  var timezoneAdd = moment(couponTime)
    .add(3, "minutes")
    .unix();
  console.log(timezoneAdd);
  // selTime is time for start coupon for thuis offer
  // for start coupon (mainCurrTime > selTime)
  // for check current time greater than couopn time (mainCurrTime >= mainCouponTime)
  console.log(
    mainCurrTime +
    " >= " +
    selTime +
    " && " +
    mainCurrTime +
    " >= " +
    mainCouponTime +
    " && " +
    mainCurrTime +
    "<=" +
    timezoneAdd
  );
  if (
    mainCurrTime >= selTime &&
    mainCurrTime >= mainCouponTime &&
    mainCurrTime <= timezoneAdd
  ) {
    return true;
  } else {
    return false;
  }
}