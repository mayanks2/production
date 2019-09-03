"use strict";
var model = require("../model");
var config = require("../config/config");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));

module.exports = {
  globalMerchantsOptinRDS: function(req, callback) {
    responseMsg.RESPONSE200.message = "Optin merchants successfully.!";
    responseMsg.RESPONSE400.message = "Fail to optin all merchants.";
    var customer_phone = req.customer_phone;
    var merchant_id = req.merchant_id;
    var optin = req.optin;
    getMerchantById(merchant_id).then(
      function(merchant) {
        getGlobalLinksMerchants(merchant.owner_id).then(
          function(merchants) {
            var index = 0;
            var totalLength = merchants.length;
            var recursiveMerchants = function(index) {
              if (index == totalLength) {
                callback(null, responseMsg.RESPONSE200);
              } else {
                var get_merchant = merchants[index];
                getCustomerMerchantById(
                  customer_phone,
                  get_merchant.merchant_id
                ).then(
                  function(successCustomerMerchant) {
                    updateMerchantOptin(
                      customer_phone,
                      get_merchant.merchant_id,
                      optin.toString()
                    ).then(
                      function(successOptin) {
                        recursiveMerchants(++index);
                      },
                      function(failOptin) {
                        recursiveMerchants(++index);
                      }
                    );
                  },
                  function(failCustomerMerchant) {
                    recursiveMerchants(++index);
                  }
                );
              }
            };
            recursiveMerchants(index);
          },
          function(errorMerchant) {
            responseMsg.RESPONSE400.error = errorMerchant;
            return callback(null, responseMsg.RESPONSE400);
          }
        );
      },
      function(failMerchant) {
        responseMsg.RESPONSE400.error = failMerchant;
        return callback(null, responseMsg.RESPONSE400);
      }
    );
  }
};

/**
 * get merchant by id
 * @param {*} merchant_id
 */
function getMerchantById(merchant_id) {
  var temp_merchant_id = merchant_id !== undefined ? merchant_id : null;
  return new Promise(function(resolve, reject) {
    model.tap_merchants
      .findAll({
        where: {
          merchant_id: temp_merchant_id
        }
      })
      .then(function(result) {
        console.log("tap_globalMerchantsOptinRDS : getMerchantById :", result);
        if (result.length > 0) {
          resolve(result[0]);
        } else {
          reject("No Merchant Found.");
        }
      })
      .catch(function(err) {
        reject(err);
      });
  });
}

/**
 * get all merchant against owner id.
 * @param {*} global_id
 */
function getGlobalLinksMerchants(global_id) {
  var temp_owner_id = global_id !== undefined ? global_id : null;
  return new Promise(function(resolve, reject) {
    model.tap_merchants
      .findAll({
        where: {
          owner_id: temp_owner_id
        }
      })
      .then(function(result) {
        console.log(
          "tap_globalMerchantsOptinRDS : getGlobalLinksMerchants :",
          result
        );
        if (result.length > 0) {
          resolve(result);
        } else {
          reject("No Merchant Found.");
        }
      })
      .catch(function(err) {
        reject(err);
      });
  });
}

/**
 * get customer merchant by id
 * @param {*} customer_phone
 * @param {*} merchant_id
 */
function getCustomerMerchantById(customer_phone, merchant_id) {
  return new Promise(function(resolve, reject) {
    model.tap_customers_merchant
      .findAll({
        where: {
          customer_phone: customer_phone.toString(),
          merchant_id: merchant_id
        }
      })
      .then(function(result) {
        console.log(
          "tap_globalMerchantsOptinRDS : getCustomerMerchantById :",
          result
        );
        if (result.length > 0) {
          resolve(result[0]);
        } else {
          reject("No User Found.");
        }
      })
      .catch(function(err) {
        reject(err);
      });
  });
}
/**
 * Update merchant optin
 * @param {*} phoneNumber
 * @param {*} merchant_id
 * @param {*} optin
 */
function updateMerchantOptin(phoneNumber, merchant_id, optin) {
  return new Promise(function(resolve, reject) {
    var today = Math.floor(Date.now() / 1000);
    var updateparams = {
      TableName: "tap_customers_merchant",
      Key: {
        customer_phone: phoneNumber.toString(),
        merchant_id: merchant_id
      },
      Item: {}
    };
    updateparams.Item.updated_at = parseInt(today);
    if (optin !== undefined) {
      updateparams.Item.optin = optin.toString();
      updateparams.Item.optin_at = Math.floor(Date.now() / 1000);
      updateparams.Item.last_visit_at = Math.floor(Date.now() / 1000);
    }
    model.tap_customers_merchant
      .update(updateparams.Item, {
        where: updateparams.Key
      })
      .then(function(data) {
        console.log(
          "tap_globalMerchantsOptinRDS : updateMerchantOptin :",
          data
        );
        resolve(data);
      })
      .catch(function(err) {
        reject(err);
      });
  });
}
