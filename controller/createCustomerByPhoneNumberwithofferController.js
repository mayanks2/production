"use strict";
var model = require("../model");
var config = require("../config/config");
var getAllOffersRDSController = require("../controller/getAllOffersRDSController");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));

module.exports = {
  createCustomerByPhoneNumberwithoffer: function (req, res) {
    var phone_no = req.body.phone_no;
    var merchant_id = req.body.merchant_id;
    getMerchantDetails(merchant_id).then(
      function (merdetail) {
        getCustomerByphone(phone_no, merchant_id).then(
          function (details) {
            if (details == "create_customer") {
              createNewCustomer(phone_no, merchant_id).then(
                function (newCustomerDetails) {
                  var customer_id = newCustomerDetails.customer_id;
                  Promise.all([
                    chekCustomerWithMerchant(phone_no, customer_id, merchant_id)
                  ]).then(
                    function (dataval) {
                      getallloffer(merchant_id, customer_id).then(
                        function (offerdatas) {
                          var MerchantCustomers = dataval[0];
                          var offerdetrails = offerdatas;
                          console.log(
                            "my new data======================================================================================================================================================",
                            offerdetrails
                          );
                          responseMsg.loginSuccess.data = MerchantCustomers;
                          responseMsg.loginSuccess.offerdata = offerdetrails;
                          console.log(responseMsg.loginSuccess);
                          res
                            .status(responseMsg.loginSuccess.statusCode)
                            .send(responseMsg.loginSuccess);
                        },
                        function (error) {
                          responseMsg.RESPONSE400.message = error;
                          res
                            .status(responseMsg.RESPONSE400.statusCode)
                            .send(responseMsg.RESPONSE400);
                        }
                      );
                    },
                    function (error) {
                      responseMsg.RESPONSE400.message = error;
                      res
                        .status(responseMsg.RESPONSE400.statusCode)
                        .send(responseMsg.RESPONSE400);
                    }
                  );
                },
                function (error) {
                  responseMsg.RESPONSE400.message = error;
                  res
                    .status(responseMsg.RESPONSE400.statusCode)
                    .send(responseMsg.RESPONSE400);
                }
              );
            } else {
              console.log(
                "customer available link to the merchant...." +
                JSON.stringify(details)
              );
              var customer_id = details.id;
              Promise.all([
                chekCustomerWithMerchant(phone_no, customer_id, merchant_id)
              ]).then(
                function (dataval) {
                  getallloffer(merchant_id, customer_id).then(
                    function (offerdatas) {
                      var MerchantCustomers = dataval[0];
                      var offerdetrails = offerdatas;
                      console.log(
                        "my new data====================================================================================================old ==================================================",
                        offerdetrails
                      );
                      responseMsg.loginSuccess.data = MerchantCustomers;
                      responseMsg.loginSuccess.offerdata = offerdetrails;
                      console.log(responseMsg.loginSuccess);
                      res
                        .status(responseMsg.loginSuccess.statusCode)
                        .send(responseMsg.loginSuccess);
                    },
                    function (error) {
                      responseMsg.RESPONSE400.message = error;
                      res
                        .status(responseMsg.RESPONSE400.statusCode)
                        .send(responseMsg.RESPONSE400);
                    }
                  );
                },
                function (error) {
                  responseMsg.RESPONSE400.message = error;
                  res
                    .status(responseMsg.RESPONSE400.statusCode)
                    .send(responseMsg.RESPONSE400);
                }
              );
            }
          },
          function (error) {
            responseMsg.RESPONSE400.message = error;
            res
              .status(responseMsg.RESPONSE400.statusCode)
              .send(responseMsg.RESPONSE400);
          }
        );
      },
      function (error) {
        responseMsg.RESPONSE400.message = error;
        responseMsg.RESPONSE400.error = error;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    );
  }
};
/**
 * Get merchant details
 * @param {*} merchant_id
 */
function getMerchantDetails(merchant_id) {
  return new Promise(function (resolve, reject) {
    var temp_merchant_id = merchant_id !== undefined ? merchant_id : null;
    model.tap_merchants
      .findAll({
        attributes: [model.sequelize.fn("COUNT", model.sequelize.col("id"))],
        where: {
          active: "true",
          taptext_status: "true",
          merchant_id: temp_merchant_id
        }
      })
      .then(function (rows) {
        if (rows.length > 0) {
          resolve(rows[0]);
        } else {
          reject(
            "No Merchant Found or taplocal text not active or merchant not active"
          );
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * Get customers by phone number
 * @param {*} phone_no
 * @param {*} merchant_id
 */
function getCustomerByphone(phone_no, merchant_id) {
  return new Promise(function (resolve, reject) {
    model.tap_customers
      .findAll({
        attributes: ["id"],
        where: {
          phoneNumber: phone_no
        }
      })
      .then(function (rows) {
        if (rows.length > 0) {
          console.log("record in databse" + rows[0]);
          resolve(rows[0]);
        } else {
          resolve("create_customer");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * Check customer with merchant
 * @param {*} phone_no
 * @param {*} customer_id
 * @param {*} merchant_id
 */
function chekCustomerWithMerchant(phone_no, customer_id, merchant_id) {
  return new Promise(function (resolve, reject) {
    model.tap_customers_merchant
      .findAll({
        where: {
          customer_phone: phone_no,
          merchant_id: merchant_id
        }
      })
      .then(function (rows) {
        if (rows.length > 0) {
          console.log("record in databse" + rows[0]);
          resolve(rows[0]);
        } else {
          var insertparamsmerchant = {
            TableName: "tap_customers_merchant",
            Item: {
              customer_phone: phone_no.toString(),
              merchant_id: merchant_id,
              created_at: Math.floor(Date.now() / 1000),
              clover_id: "RTX11-" + merchant_id + "-" + customer_id,
              optin: "0",
              prefContactMethod: 0,
              last_visit_at: Math.floor(Date.now() / 1000),
              updated_at: Math.floor(Date.now() / 1000),
              customer_id: customer_id,
              type: "normal"
            }
          };
          model.tap_customers_merchant
            .create(insertparamsmerchant.Item)
            .then(info1 => {
              console.log(
                "sql_customer_merchant created succesessfully 1" +
                JSON.stringify(info1)
              );
              model.tap_customers_merchant
                .findAll({
                  where: {
                    id: info1.id
                  }
                })
                .then(function (rows) {
                  console.log(
                    "sql_customer_merchant created succesessfully 2" +
                    JSON.stringify(info1)
                  );
                  resolve(rows[0]);
                })
                .catch(function (err) {
                  reject(err);
                });
            })
            .catch(function (err) {
              reject(err);
            });
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * Get random string
 * @param {*} length
 * @param {*} input
 */
function randomString(length, input) {
  var result = "";
  var chars = typeof input !== "undefined" ? input : "0123456789";
  for (var i = length; i > 0; --i)
    result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}
/**
 * Create new customer with customer phone number
 * @param {*} phone_no
 * @param {*} merchant_id
 */
function createNewCustomer(phone_no, merchant_id) {
  var type = "normal";
  var current_day = Math.floor(Date.now() / 1000);
  var short_code = randomString(20, "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  return new Promise(function (resolve, reject) {
    model.tap_customers
      .create({
        phoneNumber: phone_no,
        created_at: current_day,
        last_visit_at: current_day,
        type: type,
        short_code: short_code
      })
      .then(info => {
        console.log("customer created");
        console.log("info id===" + info.id);
        var insertparamsmerchant = {
          TableName: "tap_customers_merchant",
          Item: {
            customer_phone: phone_no.toString(),
            merchant_id: merchant_id,
            created_at: Math.floor(Date.now() / 1000),
            clover_id: "RTX11-" + merchant_id + "-" + info.id,
            prefContactMethod: 0,
            last_visit_at: Math.floor(Date.now() / 1000),
            updated_at: Math.floor(Date.now() / 1000),
            optin: "0",
            customer_id: info.id,
            type: "normal"
          }
        };
        model.tap_customers_merchant
          .create(insertparamsmerchant.Item)
          .then(info1 => {
            console.log("sql_customer_merchant created succesessfully 3");
            model.tap_customers_merchant
              .findAll({
                where: {
                  customer_id: info.id,
                  merchant_id: merchant_id
                }
              })
              .then(function (rows) {
                if (rows.length > 0) {
                  console.log("record in databse" + rows);
                  resolve(rows[0]);
                } else {
                  reject(err);
                }
              })
              .catch(function (err) {
                reject(err);
              });
          })
          .catch(function (err) {
            console.log("sql_customer_merchant error");
            reject(err);
          });
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * get all offer
 * @param {*} merchant_id
 * @param {*} customerId
 */
function getallloffer(merchant_id, customerId) {
  return new Promise(function (resolve, reject) {
    model.tap_customers_merchant
      .findAll({
        attributes: ["optin"],
        where: {
          customer_id: customerId,
          merchant_id: merchant_id
        }
      })
      .then(function (rows) {
        if (rows.length > 0) {
          getAllOffersRDSController.getAllOffersRDS({
            id: merchant_id,
            customerId: customerId,
            optin: rows[0].optin
          },
            function (error, resolve_customer) {
              responseMsg.RESPONSE200.data = resolve_customer.invokeData;
              if (resolve_customer.statusCode == 200) {
                resolve(resolve_customer.invokeData);
              } else {
                resolve({});
              }
            }
          );
        } else {
          resolve({});
        }
      })
      .catch(function (err) {
        reject({});
      });
  });
}