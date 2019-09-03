"use strict";
var model = require("../model");
var config = require("../config/config");
var getRegularCustomerofferUsedbyUserController = require("../controller/getRegularCustomerofferUsedbyUserController");
var getMerchantCustomerByIdRDSController = require("../controller/getMerchantCustomerByIdRDSController");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));

module.exports = {
  getAllOffersRDS: function(req, callback) {
    responseMsg.RESPONSE200.invokeData = {};
    var merchant_id = req.id;
    var customer_id = req.customerId;
    var optin = req.optin ? req.optin : 0;
    if (!merchant_id || !customer_id) {
      responseMsg.RESPONSE400.message = "Missing mandatory fields.";
      callback(null, responseMsg.RESPONSE400);
    }
    var punch_request_body = {
      id: merchant_id,
      customerId: customer_id,
      byPhone: "false",
      expandPunches: "true",
      expandAvailableCoupons: "true"
    };
    model.tap_merchants
      .findAll({
        attributes: ["id"],
        where: {
          merchant_id: merchant_id
        }
      })
      .then(function(rows) {
        if (rows.length > 0) {
          model.tap_customers
            .findAll({
              attributes: ["id", "phoneNumber"],
              where: {
                id: customer_id
              }
            })
            .then(function(customer_info) {
              if (customer_info.length > 0) {
                model.tap_customers_merchant
                  .findAll({
                    where: {
                      customer_phone: customer_info[0].phoneNumber,
                      merchant_id: merchant_id
                    }
                  })
                  .then(function(cus_mer_data) {
                    // optin = cus_mer_data.optin;
                    console.log("cus_mer_data", cus_mer_data[0].optin);
                    if (cus_mer_data.length > 0) {
                      var punch_request_body = {
                        id: merchant_id,
                        customerId: customer_info[0].phoneNumber,
                        byPhone: "true",
                        expandPunches: "true",
                        expandAvailableCoupons: "true"
                      };

                      var check_used_regular = {
                        customer_id: customer_id,
                        customer_phone: customer_info[0].phoneNumber,
                        merchant_id: merchant_id
                      };
                      let offerType = 0;
                      getRegularCustomerofferUsedbyUserController.getRegularCustomerofferUsedbyUser(
                        check_used_regular,
                        function(error, resolve) {
                          if (resolve.statusCode == 200 && !error) {
                            offerType = resolve.offrer_type;
                            //offerType = -1;

                            console.log("offer type : " + offerType);
                            getMerchantCustomerByIdRDSController.getMerchantCustomerByIdRDS(
                              punch_request_body,
                              function(error, resolve) {
                                console.log(
                                  "getMerchantCustomerByIdRDSController resolve : ",
                                  resolve
                                );
                                if (resolve.statusCode == 200) {
                                  responseMsg.RESPONSE200.invokeData.customerProfile =
                                    resolve.customerProfile !== undefined
                                      ? resolve.customerProfile
                                      : "";
                                  responseMsg.RESPONSE200.invokeData.punches =
                                    resolve.punches !== undefined
                                      ? resolve.punches
                                      : "";
                                  responseMsg.RESPONSE200.invokeData.punchinfo =
                                    resolve.punchinfo !== undefined
                                      ? resolve.punchinfo
                                      : "";
                                  responseMsg.RESPONSE200.invokeData.availableCoupons =
                                    resolve.availableCoupons !== undefined
                                      ? resolve.availableCoupons
                                      : "";
                                  var allcoupon =
                                    resolve.MerchantOffers !== undefined
                                      ? resolve.MerchantOffers
                                      : "";
                                  responseMsg.RESPONSE200.invokeData.merchantInfo =
                                    cus_mer_data[0];
                                  console.log("offerType :" + offerType);
                                  var index = allcoupon.findIndex(function(
                                    item,
                                    i
                                  ) {
                                    return item.Discount_Type === offerType;
                                  });
                                  console.log("Index value : " + index);
                                  if (index !== -1) {
                                    allcoupon.splice(index, 1);
                                  }

                                  responseMsg.RESPONSE200.invokeData.merchantOffers = allcoupon;
                                  customer_visit_log(
                                    customer_id,
                                    merchant_id,
                                    optin
                                  ).then(
                                    function(resolve) {
                                      responseMsg.RESPONSE200.message =
                                        "Customer Updated Successfully";

                                      console.log("UP end = " + Date());
                                      callback(null, responseMsg.RESPONSE200);
                                    },
                                    function(reject) {
                                      responseMsg.RESPONSE200.message =
                                        "Customer Updated Successfully";
                                      callback(null, responseMsg.RESPONSE200);
                                    }
                                  );
                                } else {
                                  responseMsg.RESPONSE200.invokeData.availableCoupons = {};
                                  responseMsg.RESPONSE200.invokeData.merchantOffers = {};
                                  responseMsg.RESPONSE200.invokeData.customerProfile = {};
                                  responseMsg.RESPONSE200.invokeData.punches = {};
                                  responseMsg.RESPONSE200.invokeData.punchinfo = {};
                                  responseMsg.RESPONSE200.invokeData.merchantInfo =
                                    cus_mer_data[0];
                                  console.log("customer_visit_log " + Date());
                                  customer_visit_log(
                                    customer_info[0].id,
                                    merchant_id,
                                    optin
                                  ).then(
                                    function(resolve) {
                                      responseMsg.RESPONSE200.message =
                                        "Customer Updated Successfully";
                                      console.log("end = " + Date());
                                      callback(null, responseMsg.RESPONSE200);
                                    },
                                    function(reject) {
                                      responseMsg.RESPONSE200.message =
                                        "Customer Updated Successfully";
                                      callback(null, responseMsg.RESPONSE200);
                                    }
                                  );
                                }
                              }
                            );
                          } else {
                            offerType = 0;
                          }
                        }
                      );
                    } else {
                      responseMsg.RESPONSE400.message =
                        "Customer Merchant not found.";
                      callback(null, responseMsg.RESPONSE400);
                    }
                  })
                  .catch(function(err) {
                    responseMsg.RESPONSE400.message = err.message;
                    customer_visit_log(
                      customer_info[0].id,
                      merchant_id,
                      optin
                    ).then(
                      function(resolve) {
                        responseMsg.RESPONSE400.message =
                          "Customer Updated Successfully";
                        callback(JSON.stringify(responseMsg.RESPONSE400));
                      },
                      function(reject) {
                        responseMsg.RESPONSE400.message =
                          "Customer Updated Successfully";
                        callback(JSON.stringify(responseMsg.RESPONSE400));
                      }
                    );
                  });
              } else {
                responseMsg.RESPONSE400.message = "Customer not found.";
                callback(null, responseMsg.RESPONSE400);
              }
            })
            .catch(function(err) {
              responseMsg.RESPONSE400.message = err.message;
              callback(null, responseMsg.RESPONSE400);
            });
        } else {
          responseMsg.RESPONSE400.message = "Merchant not found.";
          callback(null, responseMsg.RESPONSE400);
        }
      })
      .catch(function(err) {
        responseMsg.RESPONSE400.message = err.message;
        callback(null, responseMsg.RESPONSE400);
      });
  }
};
/**
 * Insert customer visit log
 * @param {*} customer_id
 * @param {*} merchant_id
 * @param {*} optin
 */
function customer_visit_log(customer_id, merchant_id, optin) {
  console.log("customer_visit_log Start = " + Date());
  return new Promise(function(resolve, reject) {
    console.log("optin = ", optin);

    if (
      optin == 0 ||
      optin == "0" ||
      optin == "false" ||
      optin == false ||
      typeof optin == "undefined"
    ) {
      resolve("opt out status");
    } else {
      var customerLogParams = {
        TableName: "tab_customers_visitlog",
        Item: {
          customer_id: customer_id,
          merchant_id: merchant_id,
          visit_date: Math.floor(Date.now() / 1000)
        }
      };
      model.tab_customers_visitlog.create(customerLogParams.Item).then(
        function(info) {
          console.log("customer_visit_log End = " + Date());
          resolve("Log saved");
        },
        function(err) {
          reject(err);
        }
      );
    }
  });
}
