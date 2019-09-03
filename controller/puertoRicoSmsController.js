var mobileOptinController = require('./mobileOptinController')
var xml = require("xml");
var helper = require('./common/helper')
const tierBillingScheduleInfo = require('../controller/tierBillingScheduleInfo');
const logData = require('./common/apiLoggerController');

module.exports = {
  handlePuertoRicoSMS: (async (req, res) => {
    try {
      function getParameterByName(name, url) {
        if (!url) {
          url = window.location.href;
        }
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
          results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return "";
        return decodeURIComponent(results[2].replace(/\+/g, " "));
      }
      function sendResponse() {
        res.set("Content-Type", "text/xml");
        return res.send(
          xml(
            {
              "submit-response": [
                {
                  status: 0,
                },
                {
                  infor: "Text Received"
                }
              ]
            },
            {
              declaration: {
                encoding: "UTF-8"
              }
            }
          )
        );
      }
      /**
       * Add log log
       */
      logData.mobileWrite("Request body data----------"+JSON.stringify(req.body));
      if (!req.body["submit-request"].text[0] || !req.body["submit-request"].user[0] || !req.body["submit-request"]["message-id"][0]) {
        console.log("no log------",req);
        sendResponse();
      } else {
        console.log("log------",req.body["submit-request"].text[0]);
        console.log("log------",req.body["submit-request"].user[0]);
        var data = {
          body: {
            From: req.body["submit-request"].user[0].trim().slice(-10),
            Body:req.body["submit-request"].text[0]
          }
        };
        var method = mobileOptinController.mobieSingup(data, function (messageResponse, responseFromCallBack) {
          if (responseFromCallBack.statusCode == 200) {
            logData.mobileWrite("success----------"+messageResponse);
            sendResponse();
          } else if (messageResponse && responseFromCallBack.statusCode == 400) {
            var today = Math.floor(Date.now() / 1000);
            var phoneNumberStr = req.body["submit-request"].user[0].trim().slice(-10);
            if (responseFromCallBack.data.optInStatus && responseFromCallBack.data.merchant_id && responseFromCallBack.data.merchant_id != null && responseFromCallBack.data.optInStatus != false) {
              checkSMSLimit(responseFromCallBack.data.merchant_id, phoneNumberStr, messageResponse, responseFromCallBack.data.merData)
                .then(function (checkLimitResopnse) {
                  console.log("checkLimitResopnse------ ", checkLimitResopnse)
                  helper.twilioSentSms(phoneNumberStr, messageResponse).then(
                    function (Response) {
                      logData.mobileWrite("success----------"+messageResponse);
                      console.log("PuertoRicoResponse: success: ", Response);
                      helper.updateOptInLogs(responseFromCallBack.data.merchant_id, phoneNumberStr, messageResponse).then(function (res) {
                        sendResponse();
                      }, function (err) {
                        sendResponse();
                      });
                    },
                    function (reject) {
                      logData.mobileWrite("success----------"+messageResponse);
                      console.log("PuertoRicoResponse: reject: ", reject);
                      helper.updateOptInLogs(responseFromCallBack.data.merchant_id, phoneNumberStr, messageResponse).then(function (res) {
                        sendResponse();
                      }, function (err) {
                        sendResponse();
                      });
                    }
                  );
                }, function (err) {
                  console.log('sms count error----------- ', err);
                  logData.mobileWrite("success----------"+messageResponse);
                  sendResponse();
                });
            } else {
              helper.twilioSentSms(phoneNumberStr, messageResponse).then(function (sendsms) {
                logData.mobileWrite("success----------"+messageResponse);
                sendResponse();
              });
            }
          } else {
            logData.mobileWrite("success----------"+messageResponse);
            sendResponse();

          }
        });
      }
    } catch (error) {
      sendResponse();
    }
  })
}
/**
 * Check SMS limit
 * @param {*} merchant_id
 * @param {*} phone_number
 * @param {*} message
 * @param {*} mer_data
 */
function checkSMSLimit(merchant_id, phone_number, message, mer_data) {
  return new Promise(function (resolve, reject) {
    helper
      .getMerchantSMSCount(merchant_id, "monthly", "sms")
      .then(function (sms_sent) {
        if (mer_data.sms_limit <= sms_sent && mer_data.sms_unlimited != 1) {
          let upgradeTierData = { segmentNeedToAdd: (sms_sent + 1) , trigger : message };
          tierBillingScheduleInfo
            .updgardeTierWithOveragePrice(merchant_id, upgradeTierData)
            .then(
              function (res) {
                console.log("Sms sent Limit already reached and Tier Upgraded.");
                resolve(res);
              },
              function (err) {
                console.log(err);
                console.log("Sms sent Limit already reached and Tier not Upgraded.");
                reject(err);
              }
            );
        } else {
          resolve(sms_sent);
        }
      }, function (err) {
        console.log('sms count error----------- ', err);
        reject(err);
      });
  });
}
