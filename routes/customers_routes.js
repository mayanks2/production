"use strict";
var router = require("express").Router();
var optinWithofferRDSController = require("../controller/optinWithofferRDSController");
var createCustomerByPhoneNumberwithofferController = require("../controller/createCustomerByPhoneNumberwithofferController");
var saveCustomerOrderController = require("../controller/saveCustomerOrderController");
var saveCustomerOrderSimpleController = require("../controller/saveCustomerOrderSimpleController");
var customersController = require("../controller/customersController");

// Opt In routes
router.post(
  "/:customer_id/tos/offers",
  optinWithofferRDSController.optinWithofferRDS
);

// update customer details
// router.post(
//   "/:customer_id/merchants/:merchant_id/updatepersonaldetails",
//   customersController.UpdateCustomerPersonalDetails
// );
//

//create new customer by phone mumber
router.post(
  "/createcustomerbyphonenumberoffers",
  createCustomerByPhoneNumberwithofferController.createCustomerByPhoneNumberwithoffer
);

// create customer order

router.post(
  "/:customer_id/orders",
  saveCustomerOrderController.saveCustomerOrder
);
router.post(
  "/:customer_id/simpleorders",
  saveCustomerOrderSimpleController.saveCustomerOrderSimple
);
router.post(
  "/:customer_id/complete_profile/:merchant_id",
  customersController.completeCustomerProfile
);
module.exports = router;
