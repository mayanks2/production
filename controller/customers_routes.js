var router = require('../config/routes');
var optinWithofferRDSController = require('../controller/optinWithofferRDSController');
var createCustomerByPhoneNumberwithofferController = require('../controller/createCustomerByPhoneNumberwithofferController');
var customersController = require('../controller/customersController');

// Opt In routes
router.post('/:customer_id/tos/offers', optinWithofferRDSController.optinWithofferRDS);

// update customer details 
router.post('/:customer_id/merchants/:merchant_id/updatepersonaldetails', customersController.UpdateCustomerPersonalDetails);
// 

//create new customer by phone mumber
router.post('/createcustomerbyphonenumberoffers', createCustomerByPhoneNumberwithofferController.createCustomerByPhoneNumberwithoffer);

module.exports = router;