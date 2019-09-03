"use strict";
var model = require("../model");
var config = require("../config/config");
var async = require("async");
var filterMerchantSMSEmailConsumeRDSController = require("../controller/filterMerchantSMSEmailConsumeRDSController");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));

module.exports = {
  merchantsByIdRDS: function (req, res) {
    console.log('abc-----------------------------------');
    var merchantId = req.params.merchant_id;
    if (!merchantId || merchantId === "" || merchantId.length <= 0) {
      responseMsg.RESPONSE400.message = "Missing mandatory fields.";
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    }
    async.waterfall(
      [
        // get merchant
        function (asyncCallback) {
          model.tap_merchants
            .findAll({
              where: {
                merchant_id: merchantId
              }
            })
            .then(function (rows) {
              var data = rows.map(function (rows) {
                return rows.toJSON();
              });
              if (!data.length) {
                res
                  .status(responseMsg.RESPONSE404.statusCode)
                  .send(responseMsg.RESPONSE404);
              } else {
                asyncCallback(null, data);
              }
            })
            .catch(function (err) {
              console.log(err);
              asyncCallback(err);
            });
        },
        // check merchant company type
        function (merchants, asyncCallback) {
          merchants.forEach(function (merchant) {
            if (merchant.merchant_id.match(/528000|513323|536353/)) {
              // merchant belong to defined company
              switch (merchant.merchant_id.match(/528000|513323|536353/)[0]) {
                case "528000":
                  merchant.company_type = "tap";
                  break;
                case "513323":
                  merchant.company_type = "banktech";
                  break;
                case "536353":
                  merchant.company_type = "usvi";
                  break;
                default:
                  merchant.company_type = "global";
              }
            } else {
              merchant.company_type = "global";
            }

            if (merchant.merchant_type != "") {
              switch (true) {
                case merchant.merchant_type == "528000":
                  merchant.company_type = "tap";
                  break;
                case merchant.merchant_type == "513323":
                  merchant.company_type = "banktech";
                  break;
                case merchant.merchant_type == "536353":
                  merchant.company_type = "usvi";
                  break;
                default:
                  merchant.company_type = "global";
                  break;
              }
            }
          });
          asyncCallback(null, merchants);
        },
        // get sms & email report
        function (merchants, asyncCallback) {
          var invokeData = {
            merchant_id: merchants[0].merchant_id,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear()
          };
          filterMerchantSMSEmailConsumeRDSController.filterMerchantSMSEmail(
            invokeData,
            function (error, response) {
              if (error || response.statusCode != 200) {
                asyncCallback(error);
              } else {
                merchants[0].emailSmsReport = response.data;
                delete responseMsg.RESPONSE200.data;
                asyncCallback(null, merchants);
              }
            }
          );
        },
        // get beacons
        function (merchants, asyncCallback) {
          model.tap_merchant_beacon
            .findAll({
              where: {
                merchant_id: merchantId
              }
            })
            .then(function (rows) {
              var beaconArr = [];
              rows.forEach(function (item) {
                beaconArr.push(item.beacon);
              });
              merchants[0].beacons = beaconArr;
              asyncCallback(null, merchants);
            })
            .catch(function (err) {
              asyncCallback(err);
            });
        }
      ],
      function (err, merchants) {
        if (err) {
          responseMsg.RESPONSE400.message = err.message;
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        }
        responseMsg.RESPONSE200.message = "Success";
        responseMsg.RESPONSE200.Data = merchants;
        res
          .status(responseMsg.RESPONSE200.statusCode)
          .send(responseMsg.RESPONSE200);
      }
    );
  }
};