/**
 * Created by chandan on 08/31/2018
 */
var router = require("express").Router();
var getMerchantsByIdRDSController = require("../controller/getMerchantsByIdRDSController");
var merchantController = require("../controller/merchantController");
var customersController = require("../controller/customersController");
var merchantExpiredOffersController = require("../controller/merchantExpiredOffersController");
var requestController = require("../controller/requestController");
const taptextController = require("../controller/tapTextYoursCustomerController.js");
var requestController = require("../controller/requestController");
//create and update merchant information.
// router.get("/", merchantController.GetMerchantsRDS);
router.post("/", merchantController.MerchantsRDS);

// // merchant current active
// router.get(
//   "/:merchant_id/coupons/current",
//   merchantController.MerchantcurrentoffersRDS
// );
// get all merchant details by email id
router.post("/multipleMerchant", merchantController.merchantDetailsByemail);
//performance app
router.post("/performance", merchantController.updatePerformance);
//update nickname and secondary email and phone number.
router.post("/updatenickname", merchantController.updateNickname);
// tap text your customer bulk sms
router.get(
  "/:merchant_id/customers/getsmscustomers/",
  taptextController.getcustomerdetails
);
router.post(
  "/:merchant_id/customers/getsmscustomersforpopup/",
  taptextController.getcustomerdetailsforpopup
);
router.post("/sendsmsonly", taptextController.textYourcustomer);
// //API route used for hit the custome offer sheduler using this route.
router.get("/startnowhitcustomoffer", merchantController.CustomOffer);
// // Calculate revenue against gotu campaign
// router.get("/gotureport", merchantController.gotuRevenue);
// // //merchant details by id
// router.get("/:merchant_id/zipcode/", merchantController.getMerchantZip);
// router.post(
//   "/:merchant_id/customers/:customer_id/updatepersonaldetails",
//   customersController.UpdateCustomerPersonalDetails
// );

// // // Function to display reporting for dashboard index.
// router.get(
//   "/:merchant_id/dashboard/:type",
//   merchantController.tapDashboardReportRDS
// );
// //create the PIN for device if that merchant and device id not in our database.

router.post("/checkpinexpired", merchantController.ckeckPinExpired);
router.post("/devicepin", merchantController.getdevicePin);
router.post("/releasedevicepin", merchantController.releasePin);
// router.get("/:id/push/stats", merchantController.getPushWebstats);
// merchant current offer report
router.get(
  "/:merchant_id/text/offers",
  merchantController.MerchantCurrentOffersReportRDS
);
// get merchant expied offer
router.get(
  "/:merchant_id/coupons/expired",
  merchantExpiredOffersController.merchantExpiredOffers
);
router.get(
  "/:merchant_id/consumesms",
  merchantController.merchantSMSConsume
);
// router.get(
//   "/:merchant_id/push/stats/click",
//   merchantController.getPhysicalWebClickStatsByMerchantIdRDS
// );

// // //wbp2b83khi.execute-api.us-west-2.amazonaws.com/staging/merchants/{id}/push/stats
// // // Get number of redeems for physical web campaign
// router.get(
//   "/:merchant_id/push/stats/redeems",
//   merchantController.getPhysicalWebRedeemStatsByMerchantId
// );
// router.post(
//   "/:merchant_id/coupons/:coupon_id/updatestatus",
//   merchantController.updateOfferStatus
// );
// router.get(
//   "/:merchant_id/coupons/availables",
//   merchantController.MerchantAvaliableOffersRDS
// );
// router.get("/:merchant_id/coupons/punchesoffer", requestController.getRequest);
// router.get(
//   "/:merchant_id/coupons/:coupon_id",
//   merchantController.getMerchantCouponById
// );

// router.get("/countpushsent/:ads_url", merchantController.CountPushAdsClicks);
// router.post(
//   "/merchantactivitystatus",
//   merchantController.merchantActiveInactivestatusreport
// );
router.get(
  "/:merchant_id/customers/getsmscustomers",
  merchantController.filterCustomerNumberRDS
);
// //Function for Tap Local Text Reporting
// router.get(
//   "/:merchant_id/text/report",
//   merchantController.tapLocalTextReporting
// );
// router.post(
//   "/:merchant_id/uploadnewimage",
//   merchantController.uploadNewImageFile
// );
// router.get("/:merchant_id", getMerchantsByIdRDSController.merchantsByIdRDS);
// Resolve merchant id issue for center issue stop here
router.post("/countpushsent", requestController.postRequest);
router.post("/countrystate", requestController.postRequest);
router.post("/gotumonthly", requestController.postRequest);
router.post("/goturedeemed", requestController.postRequest);
router.post("/merchantactivitystatus", requestController.postRequest);
router.post("/resetmerchantpassword", requestController.postRequest);
router.post("/resetpassword", requestController.postRequest);
router.post("/signuplogin", requestController.postRequest);
router.post("/uploadmerchantlogo", requestController.postRequest);
router.post("/deletelogo", requestController.postRequest);
router.post("/updatepushoriginalurl", requestController.postRequest);
router.post("/updatesmslimitsendagain", requestController.postRequest);
// Resolve merchant id issue for center issue stop here
router.post("/:merchant_id/", merchantController.CreateMerchantByIdRDS);
// router.get("/:merchant_id/coupons", merchantController.MerchantOffersRDS);
router.post("/:merchant_id/coupons", merchantController.SaveMerchantCoupon);
// router.post("/:merchant_id/boardingsection", merchantController.boardingloginRDS);
router.post(
  "/:merchant_id/createyextuseraccount",
  merchantController.createYextUser
);
router.post("/:merchant_id/saveyextuser", merchantController.saveYextUser);
router.post(
  "/:merchant_id/deleteyextuseraccount",
  merchantController.deleteYextUser
);
router.get("/:merchant_id/getssolink/:type", merchantController.createSSOLink);
router.post(
  "/:merchant_id/autoresponsemodification",
  merchantController.autoResponseModification
);
router.post(
  "/:merchant_id/saveautoresponse",
  merchantController.saveAutoResponse
);
router.get("/:merchant_id/getautoresponse", merchantController.getAutoResponse);
router.post(
  "/:merchant_id/updatetimezone",
  merchantController.saveMerchantTimeZone
);
router.post(
  "/:merchant_id/create_review_short_url",
  merchantController.createReviewShortURL
);
router.post(
  "/:merchant_id/check_review_generation_process",
  merchantController.checkReviewProcess
);

// Merhcant tarining mode activate route
router.post("/activate/training/mode", merchantController.activateTrainingMode);

module.exports = router;
