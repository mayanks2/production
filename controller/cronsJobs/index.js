const CronJob = require("cron").CronJob;
const async = require("async");
const cronFunction = require("./cronfunction");
const sendReviewSMSWithDelayController = require("../sendReviewSMSWithDelayController");
const birthdayOfferController = require("../birthdayOfferController");
const optinCompleteProfileSMSController = require("../optinCompleteProfileSMSController");
const invoked = require("../invoked");
const common = require("../../controller/common");
const config = require("../../config/config");
const completeYourProfile = require("../CompleteYourProfileReminder.js");
const MySQLEvents = require("mysql-events");
var customOffersbulk = require("../bulkCustomOfferSMS");
var taptext = require("../tapTextYoursCustomerController");
var pendingOfferSMS = require("../pendingOfferSMSController");

// var dsn = {
//   host: "localhost",
//   user: "root",
//   password: ""
// };
// var dsn = {
//   host: config.host,
//   user: config.username,
//   password: config.password
// };

// var mysqlEventWatcher = MySQLEvents(dsn);

// var watcher = mysqlEventWatcher.add(
//   "tapstaging.tap_merchant_deep_link",
//   function(oldRow, newRow, event) {
//     cronFunction.sendImmediateAutoResponseBucketNotification(newRow.fields);
//     // console.log("table modification oldRow ", oldRow);
//     // console.log("table modification newRow ", newRow.fields);
//     console.log("table modification done");
//     // console.log("table modification------------ ", event);
//   }
// );
// console.log(watcher);

//cron job fr comeback offer(30 days, 60 days, 90 days offers) for 5 minutes interval
// const comebackoffer = new CronJob("0 */15 * * * *", function () {
//   const d = new Date();
//   async.series([
//     function (callback) {
//       //30 days offers
//       cronFunction.comebackoffers({
//         type_id: 0
//       }).then(function (response) { callback(null, '30 days'); });

//     },
//     function (callback) {
//       //60 days offers
//       cronFunction.comebackoffers({
//         type_id: 1
//       }).then(function (response) { callback(null, '60 days'); });

//     },
//     function (callback) {
//       //90 days offers
//       cronFunction.comebackoffers({
//         type_id: 2
//       }).then(function (response) { callback(null, '90 days'); });

//     }
//   ],
//     // optional callback
//     function (err, results) {
//       if (err) {
//         console.log("error of comeback offer----", err);
//       } else {
//         console.log("come back offer success----", results);
//       }
//     });
// });
const devicetokenremove = new CronJob("*/1 * * * * *", function () {
  const d = new Date();
  cronFunction.expireToken();
});
// const teptextschedularstart = new CronJob("0 */16 * * * *", function () {
//   taptext.teptextschedular().then(
//     maindata => {
//       console.log("tap local text", maindata);
//     },
//     error => {
//       console.log(error);
//     }
//   );
// });
const sendBatchSMSCron = new CronJob("0 */5 * * * *", function () {
  const d = new Date();
  console.log("Every five Minute:", d);
  sendReviewSMSWithDelayController.sendBatchSMS();
});
//send birthday offer
// const sendBirthdaOfferSMSCron = new CronJob("0 */5 * * * *", function () {
//   const d = new Date();
//   console.log("Every five Minute:", d);
//   birthdayOfferController.sendOffer();
// });
// send complete profile sms with 1 minute delay
const completeProfileSMSWithDelay = new CronJob("0 */1 * * * *", function () {
  const d = new Date();
  console.log("Every one Minute:", d);
  optinCompleteProfileSMSController.sendBatchSMS();
});
// send complete profile Reminder
const completeProfileReminderSchedulerForThirtyDayInMonth = new CronJob(
  "* 55 23 30 3,5,4,6,9,11 *",
  function () {
    const d = new Date();
    console.log("Date: ", d);
    invoked.completeProfileReminder();
  }
);
const completeProfileReminderSchedulerForThirtyOneDayInMonth = new CronJob(
  "* 55 23 31 7,8,10,12 *",
  function () {
    const d = new Date();
    console.log("Date: ", d);
    invoked.completeProfileReminder();
  }
);
const completeProfileReminderSchedulerForFebruary = new CronJob(
  "* 55 23 28 2 *",
  function () {
    const d = new Date();
    console.log("Date: ", d);
    invoked.completeProfileReminder();
  }
);
const completeProfileReminderSchedulerForJanuary = new CronJob(
  "* 55 23 29 1 *",
  function () {
    const d = new Date();
    console.log("Date: ", d);
    invoked.completeProfileReminder();
  }
);

//send custom offer, Text , ComeBack Offer
const CustomAndText = new CronJob("0 */15 * * * *", function () {
  async.series([
    function (callback) {
      //30 days offers
      cronFunction.comebackoffers({
        type_id: 0
      }).then(function (response) { callback(null, '30 days'); });

    },
    function (callback) {
      //60 days offers
      cronFunction.comebackoffers({
        type_id: 1
      }).then(function (response) { callback(null, '60 days'); });

    },
    function (callback) {
      //90 days offers
      cronFunction.comebackoffers({
        type_id: 2
      }).then(function (response) { callback(null, '90 days'); });

    },
    function (callback) {
      //custom offer
      customOffersbulk.callCustomOffers().then(function (response) { callback(null, 'custom offer'); });

    },
    function (callback) {
      //text your customer scheduler
      taptext.teptextschedular().then(function (response) { callback(null, 'text your customer'); });
    },
    function (callback) {
      //text your customer scheduler
      pendingOfferSMS.sendPendingBatchSMS().then(function (response) { callback(null, 'Pending Offers SMS.'); });
    },
    function (callback) {
      //send birthday offer
      birthdayOfferController.sendOffer();
      callback(null, 'birthday offer');
    }
  ],
    // optional callback
    function (err, results) {
      if (err) {
        console.log("error----", err);
      } else {
        console.log("results----", results);
      }
    });
});

const merchantActiveInactivestatus = new CronJob("0 */1 * * * *", function () {
  cronFunction.merchantActiveInactivestatus();
});

// check tap schedule subscription end time
const checkTapScheduleSubEndTime = new CronJob(
  "00 00 00 * * *",
  function () {
    cronFunction.updateMerchantSubscription('');
  },
  null,
  false,
  "America/Menominee"
);

//check subscription time according to zone
// 00 00 00 * * *
const checkTapScheduleSubEndTimeAnchorage = new CronJob(
  "00 00 00 * * *",
  function () {
    cronFunction.updateMerchantSubscription("America/Anchorage");
  },
  null,
  false,
  "America/Anchorage"
);

const checkTapScheduleSubEndTimeLos_Angeles = new CronJob(
  "00 00 00 * * *",
  function () {
    cronFunction.updateMerchantSubscription("America/Los_Angeles");
  },
  null,
  false,
  "America/Los_Angeles"
);

const checkTapScheduleSubEndTimeDenver = new CronJob(
  "00 00 00 * * *",
  function () {
    cronFunction.updateMerchantSubscription("America/Denver");
  },
  null,
  false,
  "America/Denver"
);

const checkTapScheduleSubEndTimePhoenix = new CronJob(
  "00 00 00 * * * ",
  function () {
    cronFunction.updateMerchantSubscription("America/Phoenix");
  },
  null,
  false,
  "America/Phoenix"
);

const checkTapScheduleSubEndTimeChicago = new CronJob(
  "00 00 00 * * *",
  function () {
    cronFunction.updateMerchantSubscription("America/Chicago");
  },
  null,
  false,
  "America/Chicago"
);

const checkTapScheduleSubEndTimeNew_York = new CronJob(
  "00 00 00 * * *",
  function () {
    cronFunction.updateMerchantSubscription("America/New_York");
  },
  null,
  false,
  "America/New_York"
);

const checkTapScheduleSubEndTimeCaracas = new CronJob(
  "00 00 00 * * *",
  function () {
    cronFunction.updateMerchantSubscription("America/Caracas");
  },
  null,
  false,
  "America/Caracas"
);

const checkTapScheduleSubEndTimePuerto_Rico = new CronJob(
  "00 00 00 * * *",
  function () {
    cronFunction.updateMerchantSubscription("America/Puerto_Rico");
  },
  null,
  false,
  "America/Puerto_Rico"
);

const checkTapScheduleSubEndTimeBuenos_Aires = new CronJob(
  "00 00 00 * * *",
  function () {
    cronFunction.updateMerchantSubscription("America/Buenos_Aires");
  },
  null,
  false,
  "America/Buenos_Aires"
);

// end here

//scheduler for 5% and 10% reminder
const checkTapSmsLimitReach = new CronJob("0 */15 * * * *", function () {
  const d = new Date();
  console.log("Every Hour Date: ", d);
  cronFunction.smsLimitReachedAlert();
});

/**
 * Send mail notification to merchant regarding auto response bucket
 */
const sendAutoResponseBucketNotificationAnchorage = new CronJob(
  "0 0 16 * * *",
  function () {
    cronFunction.sendAutoResponseBucketNotification("America/Anchorage");
    cronFunction.sendExceedLimitNotification("America/Anchorage");
  },
  null,
  true,
  "America/Anchorage"
);
sendAutoResponseBucketNotificationAnchorage.start();

const sendAutoResponseBucketNotificationLos_Angeles = new CronJob(
  "0 0 16 * * *",
  function () {
    cronFunction.sendAutoResponseBucketNotification("America/Los_Angeles");
    cronFunction.sendExceedLimitNotification("America/Los_Angeles");
  },
  null,
  true,
  "America/Los_Angeles"
);
sendAutoResponseBucketNotificationLos_Angeles.start();

const sendAutoResponseBucketNotificationDenver = new CronJob(
  "0 0 16 * * *",
  function () {
    cronFunction.sendAutoResponseBucketNotification("America/Denver");
    cronFunction.sendExceedLimitNotification("America/Denver");
  },
  null,
  true,
  "America/Denver"
);
sendAutoResponseBucketNotificationDenver.start();

const sendAutoResponseBucketNotificationPhoenix = new CronJob(
  "0 0 16 * * *",
  function () {
    cronFunction.sendAutoResponseBucketNotification("America/Phoenix");
    cronFunction.sendExceedLimitNotification("America/Phoenix");
  },
  null,
  true,
  "America/Phoenix"
);
sendAutoResponseBucketNotificationPhoenix.start();

const sendAutoResponseBucketNotificationChicago = new CronJob(
  "0 0 16 * * *",
  function () {
    cronFunction.sendAutoResponseBucketNotification("America/Chicago");
    cronFunction.sendExceedLimitNotification("America/Chicago");
  },
  null,
  true,
  "America/Chicago"
);
sendAutoResponseBucketNotificationChicago.start();

const sendAutoResponseBucketNotificationNew_York = new CronJob(
  "0 0 16 * * *",
  function () {
    cronFunction.sendAutoResponseBucketNotification("America/New_York");
    cronFunction.sendExceedLimitNotification("America/New_York");
  },
  null,
  true,
  "America/New_York"
);
sendAutoResponseBucketNotificationNew_York.start();

const sendAutoResponseBucketNotificationCaracas = new CronJob(
  "0 0 16 * * *",
  function () {
    cronFunction.sendAutoResponseBucketNotification("America/Caracas");
    cronFunction.sendExceedLimitNotification("America/Caracas");
  },
  null,
  true,
  "America/Caracas"
);
sendAutoResponseBucketNotificationCaracas.start();

const sendAutoResponseBucketNotificationPuerto_Rico = new CronJob(
  "0 0 16 * * *",
  function () {
    cronFunction.sendAutoResponseBucketNotification("America/Puerto_Rico");
    cronFunction.sendExceedLimitNotification("America/Puerto_Rico");
  },
  null,
  true,
  "America/Puerto_Rico"
);
sendAutoResponseBucketNotificationPuerto_Rico.start();

const sendAutoResponseBucketNotificationBuenos_Aires = new CronJob(
  "0 0 16 * * *",
  function () {
    cronFunction.sendAutoResponseBucketNotification("America/Buenos_Aires");
    cronFunction.sendExceedLimitNotification("America/Buenos_Aires");
  },
  null,
  true,
  "America/Buenos_Aires"
);
sendAutoResponseBucketNotificationBuenos_Aires.start();

/**
 * Scheduler for auto YEXT user Id creation
 */
const createYextUserAndUpdate = new CronJob("0 */1 * * * *", function () {
  cronFunction.createYextUserAndUpdate();
});
// 30 days complete your profile sending
const completeYourprofilereminder = new CronJob("0 */15 * * * *", function () {
  completeYourProfile.completeYourProfileReminder().then(
    data => {
      console.log(data);
    },
    error => {
      console.log(error);
    }
  );
});
const couponExpiryReminder = new CronJob("0 18 * * *", function () {
  cronFunction.couponReminder({ days: 5 }).then(
    data => {
      console.log(data);
    },
    error => {
      console.log(error);
    }
  );
});
/*
 *****************************************
 *========START ALL CRONE================*
 *****************************************
 */
// sendBatchSMSCron.start();
// CustomAndText.start();
// completeProfileSMSWithDelay.start();
// checkTapScheduleSubEndTimeAnchorage.start()
// checkTapScheduleSubEndTimeLos_Angeles.start()
// checkTapScheduleSubEndTimeDenver.start()
// checkTapScheduleSubEndTimePhoenix.start()
// checkTapScheduleSubEndTimeChicago.start()
// checkTapScheduleSubEndTimeNew_York.start()
// checkTapScheduleSubEndTimeCaracas.start()
// checkTapScheduleSubEndTimePuerto_Rico.start()
// checkTapScheduleSubEndTimeBuenos_Aires.start()
// checkTapScheduleSubEndTime.start();
// checkTapSmsLimitReach.start();
// couponExpiryReminder.start();
