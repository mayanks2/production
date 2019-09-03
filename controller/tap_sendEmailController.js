"use strict";
var model = require("../model");
var config = require("../config/config");
var helper = require("../controller/common/helper");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));
var emailContent = require("../language/emailContent");
const RES_MESSAGE = require("../language/errorMsg");

module.exports = {
  sendEmail: function (req, callback) {
    responseMsg.RESPONSE200.invokeData = {};
    responseMsg.RESPONSE200.message = RES_MESSAGE.SUCCESS_SEND_EMAIL;
    responseMsg.RESPONSE400.message = RES_MESSAGE.FAIL_SEND_EMAIL;
    var emails = req.emails;
    var message = req.message;
    var logstimestamp = req.timestamp;
    var email_subject = req.subject;
    var email_from = req.from;

    sendEmail(emails, message, logstimestamp, email_subject, email_from).then(
      function (response) {
        console.log("email------------------------->>>>>>>>>", response);
        responseMsg.RESPONSE200.invokeData = {};
        responseMsg.RESPONSE200.invokeData = response;
        callback(null, responseMsg.RESPONSE200);
      },
      function (error) {
        console.log("Email Error-----------------", error);
        responseMsg.RESPONSE400.error = error;
        callback(null, responseMsg.RESPONSE400);
      }
    );
  },
  sendBulkEmail: function (req, callback) {
    return new Promise(function (resolve, reject) {
    responseMsg.RESPONSE200.invokeData = {};
    responseMsg.RESPONSE200.message = RES_MESSAGE.SUCCESS_SEND_EMAIL;
    responseMsg.RESPONSE400.message = RES_MESSAGE.FAIL_SEND_EMAIL;
    var emails = req.emails;
    var message = req.message;
    var logstimestamp = req.timestamp;
    var email_subject = req.subject;
    var email_from = req.from;

    sendEmail(emails, message, logstimestamp, email_subject, email_from).then(
      function (response) {
        console.log("email------------------------->>>>>>>>>", response);
        responseMsg.RESPONSE200.invokeData = {};
        responseMsg.RESPONSE200.invokeData = response;
        resolve(responseMsg.RESPONSE200);
      },
      function (error) {
        console.log("Email Error-----------------", error);
        responseMsg.RESPONSE400.error = error;
        reject(responseMsg.RESPONSE400);
      }
    );
    });
  }
};
/**
 * Send Mail template
 * @param {*} subject
 * @param {*} body
 */
function set_mail_template(subject, body) {
  var template = emailContent.OPTIN_OFFER_MAIL.html;
  template = template.replace("%SUBJECT%", subject);
  template = template.replace("%BODY%", body);
  return template;
}

/**
 * send Email before check the limit and log this Email
 * @param {*} emails
 * @param {*} messageData
 * @param {*} logstimestamp
 * @param {*} email_subjects
 * @param {*} email_from
 */
function sendEmail(
  emails,
  messageData,
  logstimestamp,
  email_subjects,
  email_from
) {
  return new Promise(function (resolve, reject) {
    //resolve('Mail not sent due to invalid credentials');
    // above code just used for requirment of mail server
    var timestampEmailLog = logstimestamp || Math.floor(Date.now() / 1000);
    var email_subject =
      email_subjects !== "" ?
      email_subjects :
      emailContent.OPTIN_OFFER_MAIL.subject;
    var email_from = email_from || emailContent.OPTIN_OFFER_MAIL.from_mail;

    var mailparams = {
      Destination: {
        ToAddresses: Array.isArray(emails) ? emails : [emails]
      },
      Message: {
        Body: {
          Html: set_mail_template(email_subject, messageData)
        }
      },
      Subject: email_subject,
      Source: email_from
    };
    helper
      .sendEmailFromSales(
        mailparams.Destination.ToAddresses,
        mailparams.Subject,
        mailparams.Message.Body.Html,
        null,
        mailparams.Source
      )
      .then(
        function (Maildata) {
          console.log("Email Data..................", Maildata);
          resolve(Maildata);
        },
        function (error) {
          console.log("Email Data Error..................", error);
          reject(error);
        }
      ); // sns.publish
  }); // promise end;
}