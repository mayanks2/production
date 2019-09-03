"use strict";
var model = require("../model");
var config = require("../config/config");
var constant = require("../language/constantData");
var accountSid = constant.ACCOUNTSID;
var authToken = constant.AUTHTOKEN;
var fromNumber = constant.SHORTCODE;
// const accountSid = "ACc53796b0ce9a4abbee57f4c51b13d37e";
// const authToken = "2faaf46f058b127a02564313e78d40e9";
// const fromNumber = "+15005550006";
var https = require("https");
var async = require("async");
var request = require("request");
var getUrls = require("get-urls");
var splitter = require("split-sms");
var helper = require("../controller/common/helper");
var queryString = require("querystring");
// Load the module
var to_json = require("xmljson").to_json;
var fortermlink = constant.TERLINK;
var imagelink = constant.IMAGE_LINK;
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));
module.exports = {
  twilioSMSSent: function(req, callback) {
    var phone = req.phone;
    var message = helper.replaceUCSCharcter(req.message);
    var type = req.msgType;
    var media = imagelink + req.mediaURL;
    var spanishmediaUrl = req.spanishmediaUrl;
    var spanishmsgType = req.spanishmsgType;
    var spanishmedia = imagelink + spanishmediaUrl;
    var PuertoRico = helper.PuertoRico(phone);

    if (!phone.startsWith("1")) {
      phone = `${phone}`;
    } else {
      phone = `${req.phone}`;
    }
    helper.LookupUsedForPuertoRico(phone, PuertoRico).then(
      function(PuertoRico) {
        if (PuertoRico) {
          new sendMsgbyMobisa(
            phone,
            message,
            spanishmsgType,
            spanishmedia,
            callback
          );
        } else {
          new sendMsgbyTwilio(phone, message, type, media, callback);
        }
      },
      function(error) {
        callback(error);
      }
    );
  },
  twilioSMS: function(req, callback) {
    var phone = req.phone;
    responseMsg.RESPONSE200.message = "SMS send successfully";
    responseMsg.RESPONSE400.message = "Fail to send SMS, please try later";
    var merchant_region = req.merchant_region ? req.merchant_region : "US"; //country of merchant....
    if (!phone.startsWith("1")) {
      phone = `${phone}`;
    } else {
      phone = `${req.phone}`;
    }

    var message = helper.replaceUCSCharcter(req.message);
    var type = req.msgType;
    var media = imagelink + req.mediaURL;
    var spanishmediaUrl = req.spanishmediaUrl;
    var spanishmsgType = req.spanishmsgType;
    var spanishmedia = imagelink + spanishmediaUrl;

    console.log("message", message);
    var PuertoRico = helper.PuertoRico(phone);
    var no_of_urls = 0; //(message.split("https").length-1);
    var all_ulrs = getUrls(message);
    all_ulrs.forEach(function(element) {
      no_of_urls++;
    }, this);

    if (no_of_urls == 0) {
      helper.LookupUsedForPuertoRico(phone, PuertoRico).then(
        function(PuertoRico) {
          if (PuertoRico) {
            new sendMsgbyMobisa(
              phone,
              message,
              spanishmsgType,
              spanishmedia,
              callback
            );
          } else {
            new sendMsgbyTwilio(phone, message, type, media, callback);
          }
        },
        function(error) {
          callback(error);
        }
      );
    } else {
      var count_url_no = 0;
      all_ulrs.forEach(function(element) {
        if (
          element == config.app.TERMS_LINK.replace(/\/$/, "") ||
          element == config.app.TERMS_LINK
        ) {
          count_url_no++;
          message = message.replace(element, "https://tpl.news/cr3va");
          console.log("message section for term : ", message);
          if (count_url_no == no_of_urls) {
            console.log("send message successfully with term......" + message);
            helper.LookupUsedForPuertoRico(phone, PuertoRico).then(
              function(PuertoRico) {
                if (PuertoRico) {
                  new sendMsgbyMobisa(
                    phone,
                    message,
                    spanishmsgType,
                    spanishmedia,
                    callback
                  );
                } else {
                  new sendMsgbyTwilio(phone, message, type, media, callback);
                }
              },
              function(error) {
                callback(error);
              }
            );
          }
        } else {
          request(
            {
              uri: "https://api.rebrandly.com/v1/links",
              method: "POST",
              body: JSON.stringify({
                destination: element,
                domain: {
                  fullName: "tpl.news"
                }
              }),
              headers: {
                "Content-Type": "application/json",
                apikey: "4055fe0fd8704dfcb526f6e0222b82ed"
              }
            },
            function(error, response, body) {
              count_url_no++;
              console.log(count_url_no);
              var link = JSON.parse(body);
              console.log("Link", link);
              if (
                link.destination == config.app.TERMS_LINK.replace(/\/$/, "")
              ) {
                message = message.replace(element, fortermlink);
                console.log("in sms content", message);
              } else {
              }
              message = message.replace(element, "https://" + link.shortUrl);
              console.log("msg_with_short_url=" + message);

              console.log(count_url_no + "=================" + no_of_urls);
              if (count_url_no == no_of_urls) {
                console.log("send message successfully......" + message);
                helper.LookupUsedForPuertoRico(phone, PuertoRico).then(
                  function(PuertoRico) {
                    if (PuertoRico) {
                      new sendMsgbyMobisa(
                        phone,
                        message,
                        spanishmsgType,
                        spanishmedia,
                        callback
                      );
                    } else {
                      new sendMsgbyTwilio(
                        phone,
                        message,
                        type,
                        media,
                        callback
                      );
                    }
                  },
                  function(error) {
                    callback(error);
                  }
                );
              }
            }
          );
        }
      }, this);
    }
  }
};

function sendMsgbyTwilio(phone, message, type, media, callback) {
  helper.twilioSentSms(phone, message, type, media).then(
    resMessage => {
      responseMsg.RESPONSE200.message = "Message Sent Succesfully";
      responseMsg.RESPONSE200.data = resMessage;
      responseMsg.RESPONSE200.data.SmsType = type;
      return callback(null, responseMsg.RESPONSE200);
    },
    error => {
      responseMsg.RESPONSE400.message = error;
      responseMsg.RESPONSE400.data = error;
      responseMsg.RESPONSE400.data.body = message;
      responseMsg.RESPONSE400.data.numSegments = splitter.split(
        message
      ).parts.length;
      responseMsg.RESPONSE400.data.price = null;
      responseMsg.RESPONSE400.data.numMedia = null;
      responseMsg.RESPONSE400.data.SmsType = type;
      return callback(null, responseMsg.RESPONSE400);
    }
  );
}

function sendMsgbyMobisa(phone, message, type, media, callback) {
  helper.mobisaSentSms(phone, message, type, media).then(
    resMessage => {
      responseMsg.RESPONSE200.message = "Message Sent Succesfully";
      responseMsg.RESPONSE200.data = resMessage;
      responseMsg.RESPONSE200.data.body = message;
      responseMsg.RESPONSE200.data.numSegments = splitter.split(
        message
      ).parts.length;
      responseMsg.RESPONSE200.data.price = null;
      responseMsg.RESPONSE200.data.numMedia = null;
      responseMsg.RESPONSE200.data.SmsType = type;

      return callback(null, responseMsg.RESPONSE200);
    },
    error => {
      responseMsg.RESPONSE400.message = error;
      responseMsg.RESPONSE400.data = error;
      responseMsg.RESPONSE400.data.body = message;
      responseMsg.RESPONSE400.data.numSegments = splitter.split(
        message
      ).parts.length;
      responseMsg.RESPONSE400.data.price = null;
      responseMsg.RESPONSE400.data.numMedia = null;
      responseMsg.RESPONSE400.data.SmsType = type;
      return callback(null, responseMsg.RESPONSE400);
    }
  );
}

/**
 * Send SMS with check
 * @param {*} to
 * @param {*} body
 * @param {*} merchant_region
 * @param {*} PuertoRico
 * @param {*} completedCallback
 */
function sendSMSwithCheck(
  to,
  body,
  merchant_region,
  PuertoRico,
  completedCallback
) {
  if (PuertoRico == true) {
    console.log("using twilio lookup");
    console.log(
      "Phone " +
        to +
        "message" +
        body +
        "acctid" +
        accountSid +
        "authToken" +
        authToken
    );
    // Setup the HTTP request
    var req = https.get(
      "https://" +
        accountSid +
        ":" +
        authToken +
        "@lookups.twilio.com/v1/PhoneNumbers/" +
        to +
        "?Type=carrier",
      res => {
        let data = "";
        // A chunk of data has been recieved.
        res.on("data", chunk => {
          data += chunk;
        });
        res.on("end", () => {
          var resData = JSON.parse(data);
          console.log(resData);
          if (resData.status == 404) {
            responseMsg.RESPONSE400.message = resData.message;
            return completedCallback(null, responseMsg.RESPONSE400);
          } else {
            if (
              resData.carrier.type === "mobile" ||
              resData.carrier.type === "landline"
            ) {
              if (
                resData.carrier.name === "CLARO Puerto Rico" ||
                resData.carrier.name ===
                  "PR Wireless Inc dba Open Mobile - SVR/2" ||
                resData.country_code == "VI" ||
                resData.carrier.type == "landline"
              ) {
                console.log("From PuertoRicoSMS Response data ");
                console.log(resData);
                new PuertoRicoSMS(to, body, completedCallback);
              } else {
                console.log("From Twilio  Response data");
                console.log(resData);
                new SendSMS(to, body, completedCallback);
              }
            } else {
              responseMsg.RESPONSE400.message =
                "Fail to send SMS on Landline number";
              return completedCallback(null, responseMsg.RESPONSE400);
            }
          }
        });
      }
    );

    // Handler for HTTP request errors.
    req.on("error", function(e) {
      console.error("HTTP error: " + e.message);

      responseMsg.RESPONSE400.message = e.message;
      return completedCallback(null, responseMsg.RESPONSE400);
    });
  } else {
    console.log("not using twilio lookup...............");
    new SendSMS(to, body, completedCallback);
  }
}
/**
 * Send SMS
 * @param {*} to
 * @param {*} body
 * @param {*} completedCallback
 */
function SendSMS(to, body, completedCallback) {
  // The SMS message to send
  var message = {
    To: to,
    From: fromNumber,
    Body: body
  };
  // return new Promise(function(resolve,reject){
  var messageString = queryString.stringify(message);

  // Options and headers for the HTTP request
  var options = {
    host: "api.twilio.com",
    port: 8443,
    path: "/2010-04-01/Accounts/" + accountSid + "/Messages.json",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(messageString),
      Authorization:
        "Basic " + new Buffer(accountSid + ":" + authToken).toString("base64")
    }
  };

  // Setup the HTTP request
  var req = https.request(options, function(res) {
    res.setEncoding("utf-8");

    // Collect response data as it comes back.
    var responseString = "";
    res.on("data", function(data) {
      responseString += data;
    });

    // Log the responce received from Twilio.
    // Or could use JSON.parse(responseString) here to get at individual properties.
    res.on("end", function(e) {
      console.log("Twilio Response: " + responseString);
      responseString = JSON.parse(responseString);
      if (responseString["message"] !== undefined) {
        responseMsg.RESPONSE400.message = responseString["message"];
        return completedCallback(null, responseMsg.RESPONSE400);
      } else {
        responseMsg.RESPONSE200.path = "From Twilio SMS";
        responseMsg.RESPONSE200.sent_sms = body;
        return completedCallback(null, responseMsg.RESPONSE200);
      }
    });
  });

  // Handler for HTTP request errors.
  req.on("error", function(e) {
    console.error("HTTP error: " + e.message);

    responseMsg.RESPONSE400.message = e.message;
    return completedCallback(null, responseMsg.RESPONSE400);
  });

  // Send the HTTP request to the Twilio API.
  // Log the message we are sending to Twilio.
  console.log("Twilio API call: " + messageString);
  req.write(messageString);
  req.end();
  // });
}
/**
 * Send SMS for PuertoRico
 * @param {*} to
 * @param {*} body
 * @param {*} callback
 */
function PuertoRicoSMS(to, body, callback) {
  console.log("PuertoRicoSMS sms=>");

  var messageString =
    '<?xml version="1.0" encoding="ISO-8859-1"?><push-request><def-code>1019</def-code><password>b@nktech2017</password><application>71958</application><user>' +
    to +
    "</user><text>" +
    body +
    "</text></push-request>";

  // Options and headers for the HTTP request
  var options = {
    host: "dinama.com",
    //port: 443,
    path: "/smsApplications/campaigns/dinama/xmlInterfacePR.jsp",
    method: "POST",
    headers: {
      "Content-Type": "text/xml",
      "Content-Length": Buffer.byteLength(messageString)
    }
  };

  // Setup the HTTP request
  var req = https.request(options, function(res) {
    //res.setEncoding('utf-8');

    // Collect response data as it comes back.
    var responseString = "";
    res.on("data", function(data) {
      responseString += data;
    });

    // Log the responce received from Twilio.
    // Or could use JSON.parse(responseString) here to get at individual properties.
    res.on("end", function() {
      to_json(responseString, function(error, data) {
        console.log("Mobisa Response Data " + JSON.stringify(data));
        if (data["push-response"].status == 0) {
          responseMsg.RESPONSE200.path = "From Mobisa SMS";
          responseMsg.RESPONSE200.sent_sms = body;
          return callback(null, responseMsg.RESPONSE200);
        } else {
          return callback(null, responseMsg.RESPONSE400);
        }
      });
    });
  });

  // Handler for HTTP request errors.
  req.on("error", function(e) {
    console.log("Error Message :" + e.message);
    responseMsg.RESPONSE400.message = e.message;
    return callback(null, responseMsg.RESPONSE400);
  });

  // Send the HTTP request to the dinama API.
  // Log the message we are sending to dinama.
  console.log("PuertoRicoSMS: " + messageString);
  req.write(messageString);
  req.end();
}
