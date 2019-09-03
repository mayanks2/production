/**
 * Created by chandan on 08/31/2018
 */
var router = require('../config/routes');
var getMerchantsByIdRDSController = require('../controller/getMerchantsByIdRDSController');
var merchantController = require('../controller/merchantController');
var customersController = require('../controller/customersController');
// merchant current active
router.get('/:merchant_id/coupons/current', merchantController.MerchantcurrentoffersRDS);
//merchant details by id
router.get('/:merchant_id', getMerchantsByIdRDSController.merchantsByIdRDS);

router.post('/:merchant_id/customers/:customer_id/updatepersonaldetails', customersController.UpdateCustomerPersonalDetails);


// Function to display reporting for dashboard index.

router.get('/:merchant_id/dashboard/:type', merchantController.tapDashboardReportRDS);
//create the PIN for device if that merchant and device id not in our database.
router.post('/createmerchantdevicepin', merchantController.createDevicePin);
router.post('/checkpinexpired', merchantController.ckeckPinExpired);
// merchant current offer report 
router.get('/:merchant_id/text/offers', merchantController.MerchantCurrentOffersReportRDS);
module.exports = router;