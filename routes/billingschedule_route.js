"use strict";
/**@CHETU
 * Created by Adarsh on 08/31/2018
 */
var router = require("express").Router();
var TierBillingController = require("../controller/tierBillingSchedule");
var tierBillingScheduleInfo = require("../controller/tierBillingScheduleInfo");
var getCsvForBillingReportController = require("../controller/getCsvForBillingReportController")

//Routing for create shedule...
router.post("/createshedule", TierBillingController.createShedule);
router.post("/editshedule", TierBillingController.editShedule);
router.post(
  "/activatedeactivateschedule",
  TierBillingController.activateSchedule
);
router.get("/getallSchedule", TierBillingController.getAllScheduleInfo);
router.post("/checkSheduleExist", TierBillingController.checkSheduleExist);
router.post(
  "/scheduleMerchantList",
  TierBillingController.scheduleMerchantList
);
router.post("/getsheduletierinfo", TierBillingController.getScheduleTiers);
router.post(
  "/updatethresholdvalue",
  TierBillingController.updateNotificationThreshold
);
router.post("/billing_report", TierBillingController.billingReport);
router.post(
  "/current_schedule_info",
  TierBillingController.currentScheduleInfo
);
router.post("/schedule_info", TierBillingController.scheduleInfo);
router.post(
  "/save_update_schedule_info",
  tierBillingScheduleInfo.saveAndUpdateScheduleInfo
);
router.post(
  "/updateNotificationCheck",
  TierBillingController.emailSmsNotificationCheck
);
router.post("/tieredbillinglogin", tierBillingScheduleInfo.tieredBillinLogin);
router.post("/deactivate/training/mode", tierBillingScheduleInfo.deActivateTrainingSchedule);
router.post("/getCsv", TierBillingController.getCSV);
module.exports = router;
