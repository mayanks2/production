var router = require("../config/routes");
var app = require("../config/enviroment");
var requestController = require("../controller/requestController");
var config = require("../config/config");
var customersController = require("../controller/customersController");
var merchantController = require("../controller/merchantController");
var puertoRicoSmsController = require("../controller/puertoRicoSmsController.js");

//Routes for tier-billing Application.....
app.use(
  "/" + config.app.environment + "/tierbillingshedule",
  require("../routes/billingschedule_route")
);

// app.use(
//   "/" + config.app.environment + "/fileupload",
//   require("../routes/fileUpload_route")
// );
//app.get(
//  "/" + config.app.environment + "/customers/:customerId",
//  customersController.getCustomerMerchantDetails
//);
//All routes with prefix
app.use(
  "/" + config.app.environment + "/appversion",
  require("../routes/appversion")
);
app.post(
  "/" + config.app.environment + "/createmerchantdevicepin/",
  merchantController.createDevicePin
);
app.use(
  "/" + config.app.environment + "/merchants",
  require("../routes/merchant_routes")
);
app.use(
  "/" + config.app.environment + "/customers",
  require("../routes/customers_routes")
);
app.use(
  "/" + config.app.environment + "/review",
  require("../routes/review_routes")
);
app.use(
  "/" + config.app.environment + "/services",
  require("../routes/services_routes")
);
app.use(
  "/" + config.app.environment + "/billing",
  require("../routes/billingschedule_route")
);

//user routing...
// app.use(
//   "/" + config.app.environment + "/users",
//   require("../routes/users_routes")
// );

//converted Lambda
router.post("/prsms", puertoRicoSmsController.handlePuertoRicoSMS);
router.post("/getMerchantLimitForBulkSMS", merchantController.getMerchantLimit);

router.get("*", requestController.getRequest);
router.post("*", requestController.postRequest);
router.put("*", requestController.putRequest);
router.delete("*", requestController.deleteRequest);

module.exports = router;