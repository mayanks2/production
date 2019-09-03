/**
 * Created by chandan on 09/14/2018
 */
var router = require("express").Router();
var servicesController = require("../controller/servicesController");
var merchantController = require("../controller/merchantController");
var responseMsg = require("../language/resMessage");
const mobileNumberController = require("../controller/mobileOptinController");

// router.post("/product-notification", servicesController.ProductSignupEmail);
// router.get("/coupons", servicesController.SingleCouponRDS);
router.get("/customoffer", merchantController.CustomOffer);
// router.get("/merchantshorturl", servicesController.generateShortUrlMerchant);
router.post(
  "/textmessagesignups",
  mobileNumberController.textmessagemobileSignup
);

module.exports = router;
