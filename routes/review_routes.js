/**
 * Created by chandan on 09/06/2018
 */
var router = require("express").Router();
var cronFunction = require("../controller/cronsJobs/cronfunction");
var sendReviewSMSWithDelayController = require("../controller/sendReviewSMSWithDelayController");

//router.post("/sendreview", sendReviewSMSWithDelayController.sendBatchSMS);
router.post(
  "/sendimmediateautoresponse",
  cronFunction.sendImmediateAutoResponseBucketNotification
);

module.exports = router;