"use strict";
var model = require("../model");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));

module.exports = {
  // get app version
  getVersionControll: function(req, res) {
    responseMsg.RESPONSE200.message = "All Records.";
    getAppVersion(req, res).then(
      function(details) {
        responseMsg.RESPONSE200.data = details;
        res
          .status(responseMsg.RESPONSE200.statusCode)
          .send(responseMsg.RESPONSE200);
      },
      function(error) {
        responseMsg.RESPONSE400.message = error;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      }
    );
  },
  updateAppVersion: function(req, res) {
    var version_no = req.body.version_no;
    var version_code = req.body.version_code;
    var merchant_app_no = req.body.merchant_app_no;
    var merchant_app = req.body.merchant_app;
    if (
      version_code == "" ||
      version_no == "" ||
      merchant_app_no == "" ||
      merchant_app == ""
    ) {
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    }
    model.tap_appversion
      .update(
        {
          app_version_no: version_no,
          version_code: version_code,
          merchant_app_version_no: merchant_app_no,
          merchant_version_code: merchant_app
        },
        {
          where: {
            id: 1
          }
        }
      )
      .then(function(versionUpdate) {
        console.log(responseMsg.OK);
        res.status(responseMsg.RESPONSE200.statusCode).send(responseMsg.OK);
      })
      .catch(function(err) {
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      });
  }
};

/**
 * Get app version details
 * @param {*} req
 * @param {*} res
 */
function getAppVersion(req, res) {
  return new Promise(function(resolve, reject) {
    model.tap_appversion.findAll({}).then(
      function(rows) {
        if (rows.length >= 0) {
          resolve(rows);
        } else {
          reject("Sorry somthing went wrong..");
        }
      },
      function(err) {
        reject(err);
      }
    );
  });
}
