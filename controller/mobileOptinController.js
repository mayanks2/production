"use strict";
const constantData = require("../language/constantData"),
  textMsg = require("../language/textMessage"),
  model = require("../model"),
  config = require("../config/config"),
  tapGenerateCoupon = require("../controller/tapGenerateCouponController"),
  resMessage = require("../language/resMessage"),
  xml = require("xml");
const common = require("../language/constantData");
const tierBillingScheduleInfo = require('../controller/tierBillingScheduleInfo');
var helper = require("../controller/common/helper");
const accountSid = constantData.ACCOUNTSID; //'ACbbfa5abc0f58bbb5a8a731df226e0a8f';
const authToken = constantData.AUTHTOKEN; //'f2661610765efa06a6e5aea674150007';
const fromNumber = constantData.SHORTCODE;
const https = require("https");
const async = require("async");
const request = require("request");
const getUrls = require("get-urls");
const splitter = require("split-sms");
const fortermlink = constantData.TERLINK;
module.exports = {
  textmessagemobileSignup: function (req, res) {
    module.exports.mobieSingup(req, function (error, reData) {
      console.log("req message", reData);
      res.set("Content-Type", "text/xml");
      res.send(
        xml(
          {
            Response: [
              {
                Message: [
                  {
                    _attr: {
                      from: fromNumber
                    }
                  },
                  {
                    Body: reData
                  }
                ]
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
    });
  },

  mobieSingup: function (req, callback) {
    console.log(req.body)
    var phoneNumberStr = req.body.From;
    var Body = req.body.Body;
    phoneNumberStr = phoneNumberStr.replace(/\+/g, "");
    console.log(phoneNumberStr)
    var phoneNumberInt = parseInt(phoneNumberStr);
    var isPuertoRico = helper.PuertoRico(phoneNumberInt);
    console.log("issssssssssssssssssssssss" , isPuertoRico)
    var template_optin = "";
    // below section  used for ?
    if (phoneNumberStr === null || Body === null) {
      //event.data.From
      return new PuertoRicoResponse(
        isPuertoRico,
        callback,
        "missing",
        phoneNumberInt,
        ""
      );
    }
    // End below Section

    var body_content = Body.toLowerCase().trim();
    var body_keyword,
      merchant_keyword = "";

    // checking if merchant id is sent or not... pattern for sending merchant is that there is space after "in" or "stop" and then merchant id is typed. Example "in 11111"
    var space_index = body_content.indexOf(" "); // Gets the first index where a space occours
    console.log("body_content------ ", body_content);
    if (space_index > 0) {
      if (body_content == "stop all") {
        body_keyword = body_content;
      } else {
        body_keyword = body_content.substr(0, space_index); // Gets the first part
        merchant_keyword = body_content.substr(space_index + 1);
      }
    } else {
      body_keyword = body_content;
    }

    if (isPuertoRico) {
      template_optin = textMsg.OptInSMS.spanish;
    } else {
      template_optin = textMsg.OptInSMS.english;
    }
    console.log("body_keyword------ ", body_keyword);
    if (
      body_keyword !== "" ||
      body_keyword == "stop all" ||
      body_keyword == "out" ||
      body_keyword == "stop" ||
      body_keyword == "unsubscribe" ||
      body_keyword == "cancel" ||
      body_keyword == "end" ||
      body_keyword == "quit" ||
      body_keyword == "in" ||
      body_keyword == "hlp" ||
      body_keyword == "help"
    ) {
      var tos_message = "";
      if (merchant_keyword == "all") {
        body_keyword = "stop all";
      }
      switch (body_keyword) {
        case "stop all":
          getcustomerDetaislbyPhonenumber(phoneNumberStr).then(
            function (resolve) {
              if (resolve.length == 1) {
                console.log("enter 1");
                tos_message = textMsg.AllOptOut.english;
                if (isPuertoRico) {
                  tos_message = textMsg.AllOptOut.spanish;
                }
                updateCustomeroptout(resolve[0].id , phoneNumberStr , tos_message).then(
                  function (updateresponse) {
                    tos_message = textMsg.AllOptOut.english;
                    if (isPuertoRico) {
                      tos_message = textMsg.AllOptOut.spanish;
                    }
                    return new PuertoRicoResponse(
                      isPuertoRico,
                      callback,
                      tos_message,
                      phoneNumberInt
                    );
                  },
                  function (error) {
                    console.log("enter 4");
                    tos_message = textMsg.helpText.english;
                    if (isPuertoRico) {
                      tos_message = textMsg.helpText.spanish;
                    }
                    return new PuertoRicoResponse(
                      isPuertoRico,
                      callback,
                      tos_message,
                      phoneNumberInt
                    );
                  }
                );
              } else {
                console.log("enter 2");
                tos_message = textMsg.helpText.english;
                if (isPuertoRico) {
                  tos_message = textMsg.helpText.spanish;
                }
                return new PuertoRicoResponse(
                  isPuertoRico,
                  callback,
                  tos_message,
                  phoneNumberInt
                );
              }
            },
            function (error) {
              console.log("enter 3");
              tos_message = textMsg.helpText.english;
              if (isPuertoRico) {
                tos_message = textMsg.helpText.spanish;
              }
              return new PuertoRicoResponse(
                isPuertoRico,
                callback,
                tos_message,
                phoneNumberInt
              );
            }
          );
          break;
        case "stop":
        console.log("stop case" , body_keyword !== "" && merchant_keyword !== "")
          if (body_keyword !== "" && merchant_keyword !== "") {
            Promise.all([
              getcustomerDetaislbyPhonenumber(phoneNumberStr),
              getMerchantByKeyword(merchant_keyword)
            ]).then(
              function (resolve) {
                var customerdetails = resolve[0];
                var merchantDetails = resolve[1];
                console.log("customerdetails" , customerdetails , "merchantDetails" , merchantDetails)
                if (
                  customerdetails.length == 1 &&
                  merchantDetails.length == 1
                ) {
                  console.log("enter 1");
                  optoutwithmerchant(
                    customerdetails[0].id,
                    merchantDetails[0].merchant_id
                  ).then(
                    async function (updateresponse) {
                      tos_message = textMsg.merchantOptOut.english.replace(
                        "%DBA%",
                        merchantDetails[0].nick_name
                      );
                      if (isPuertoRico) {
                        tos_message = textMsg.merchantOptOut.spanish.replace(
                          "%DBA%",
                          merchantDetails[0].nick_name
                        );
                      }
                      let getLength = splitter.split(tos_message);
                      let getSegments = getLength.parts.length;
                      var updateLogStop = await updateStopLog(phoneNumberStr , customerdetails[0].id, merchantDetails[0].merchant_id , tos_message , getSegments);
                      
                      return new PuertoRicoResponse(
                        isPuertoRico,
                        callback,
                        tos_message,
                        phoneNumberInt
                      );
                    },
                    function (error) {
                      tos_message = textMsg.invalidText.english;
                      if (isPuertoRico) {
                        tos_message = textMsg.invalidText.spanish;
                      }
                      return new PuertoRicoResponse(
                        isPuertoRico,
                        callback,
                        tos_message,
                        phoneNumberInt
                      );
                    }
                  );
                } else {
                  console.log("enter 2");
                  tos_message = textMsg.invalidText.english;
                  if (isPuertoRico) {
                    tos_message = textMsg.invalidText.spanish;
                  }
                  return new PuertoRicoResponse(
                    isPuertoRico,
                    callback,
                    tos_message,
                    phoneNumberInt
                  );
                }
              },
              function (error) {
                tos_message = textMsg.invalidText.english;
                if (isPuertoRico) {
                  tos_message = textMsg.invalidText.spanish;
                }
                return new PuertoRicoResponse(
                  isPuertoRico,
                  callback,
                  tos_message,
                  phoneNumberInt
                );
              }
            );
          } else {
            getCustomerMerchantsByPhone(phoneNumberStr).then(
              function (customerData) {
                console.log(customerData)
                var multiMsg = `You have opted in for below merchants. Please text \n`;
                if (isPuertoRico) {
                  multiMsg = `Ud se a registrado con los siguientes comercios. Por favor envie \n`;
                }
                if (customerData.length > 1) {
                  let merchant_id;
                  let customer_id;
                  async.forEachSeries(customerData, function (merchantCustomer, customerCallback) {
                    merchant_id = merchant_id ? merchant_id + " , " +merchantCustomer.merchant_id : merchantCustomer.merchant_id;
                    customer_id = customer_id ? customer_id + " , " +merchantCustomer.customer_id : merchantCustomer.customer_id ;
                    console.log(merchant_id , customer_id)
                    customerCallback();
                  },async function(err){
                    console.log('run code here')
                    for (var i = 0; i < customerData.length; i++) {
                      multiMsg += `"STOP ${customerData[i].keyword}" to stop ${
                        customerData[i].dba
                        } \n`;
                      if (isPuertoRico) {
                        multiMsg += `"STOP ${
                          customerData[i].keyword
                          }" para no de ${customerData[i].dba}\n`;
                      }
                    }
                    tos_message = multiMsg + `"STOP ALL" to stop all merchant.`;
                    if (isPuertoRico) {
                      tos_message =
                        multiMsg + `"STOP ALL" para suspenderlos todos.`;
                    }
                    let getLength = splitter.split(tos_message);
                    let getSegments = getLength.parts.length;
                    var updateLogHelp = await updateStopLog(customerData[0].customer_phone , customer_id , merchant_id , tos_message , getSegments);
                    return new PuertoRicoResponse(
                      isPuertoRico,
                      callback,
                      tos_message,
                      phoneNumberInt
                    );
                  })

                } else {
                  updateMerchantOptin(
                    phoneNumberInt,
                    customerData[0].merchant_id,
                    0
                  ).then(
                    async function (successOptin) {
                      console.log("successOptin", successOptin);
                      tos_message = textMsg.merchantOptOut.english.replace(
                        "%DBA%",
                        customerData[0].nick_name
                      );
                      if (isPuertoRico) {
                        tos_message = textMsg.merchantOptOut.spanish.replace(
                          "%DBA%",
                          customerData[0].nick_name
                        );
                      }
                      let getLength = splitter.split(tos_message);
                      let getSegments = getLength.parts.length;
                      var updateLogHelp = await updateStopLog(customerData[0].customer_phone , merchantCustomer.customer_id ,  customerData[0].merchant_id , tos_message , getSegments);
                      return new PuertoRicoResponse(
                        isPuertoRico,
                        callback,
                        tos_message,
                        phoneNumberInt
                      );
                    },
                    function (failOptin) {
                      console.log("failOptin" , failOptin)
                      tos_message = textMsg.helpText.english;
                      if (isPuertoRico) {
                        tos_message = textMsg.helpText.spanish;
                      }
                      return new PuertoRicoResponse(
                        isPuertoRico,
                        callback,
                        tos_message,
                        phoneNumberInt
                      );
                    }
                  );
                }
              },
              function (error) {
                console.log("error" , error)
                tos_message = textMsg.helpText.english;
                if (isPuertoRico) {
                  tos_message = textMsg.helpText.spanish;
                }
                return new PuertoRicoResponse(
                  isPuertoRico,
                  callback,
                  tos_message,
                  phoneNumberInt
                );
              }
            );
          }
          break;
        case "help":
          getCustomerMerchantsByPhone(phoneNumberStr).then(
            async function (customerdata) {
              if (customerdata.length == 1) {
                console.log(JSON.stringify(customerdata));
                tos_message = textMsg.merchantHelpText.english.replace(
                  "%DBA%",
                  customerdata[0].nick_name
                );
                if (isPuertoRico) {
                  tos_message = textMsg.merchantHelpText.spanish.replace(
                    "%DBA%",
                    customerdata[0].nick_name
                  );
                }
                let getLength = splitter.split(tos_message);
                let getSegments = getLength.parts.length;
                var updateLogHelp = await updateHelpLog(customerdata[0].customer_phone , customerdata[0].customer_id , customerdata[0].merchant_id , tos_message , getSegments);
                return new PuertoRicoResponse(
                  isPuertoRico,
                  callback,
                  tos_message,
                  phoneNumberInt
                );
              } else {
                let merchant_id;
                let customer_id;
                async.forEachSeries(customerdata, function (merchantCustomer, customerCallback) {
                   merchant_id = merchant_id ? merchant_id + " , " +merchantCustomer.merchant_id : merchantCustomer.merchant_id;
                   customer_id = customer_id ? customer_id + " , " +merchantCustomer.customer_id : merchantCustomer.customer_id ;
                   console.log(merchant_id , customer_id)
                   customerCallback();
                }, async function(err){
                     console.log('send from here', isPuertoRico)
                     tos_message = textMsg.helpText.english;
                     if (isPuertoRico) {
                       tos_message = textMsg.helpText.spanish;
                     }
                     let getLength = splitter.split(tos_message);
                     let getSegments = getLength.parts.length;
                     var updateLogHelp = await updateHelpLog(customerdata[0].customer_phone , customer_id , merchant_id , tos_message , getSegments);
                     return new PuertoRicoResponse(
                      isPuertoRico,
                      callback,
                      tos_message,
                      phoneNumberInt
                    );
                })
              }
            },
            async function (error) {
              tos_message = textMsg.helpText.english;
              if (isPuertoRico) {
                tos_message = textMsg.helpText.spanish;
              }
              let getLength = splitter.split(tos_message);
              let getSegments = getLength.parts.length;
              var updateLogHelp = await updateHelpLog(phoneNumberInt , "Not Available" , "Not Available" , tos_message , getSegments);
              return new PuertoRicoResponse(
                isPuertoRico,
                callback,
                tos_message,
                phoneNumberInt
              );
            }
          );
          break;
        default:
          if (body_keyword !== "") {
            new OptInKeyword(phoneNumberInt, body_keyword, template_optin).then(
               async function (mer_data) {
                var dbaReplace = template_optin.replace(
                  "%DBA%",
                  mer_data.nick_name
                );
                var termLink = dbaReplace.replace(
                  "%TERMS_LINK%",
                  config.app.TERMS_LINK
                );
                var tos_message_term = termLink.replace(
                  "%FREQUENCY%",
                  mer_data.sms_limit_perUser
                );
                let getLength = splitter.split(tos_message_term);
                let getSegments = getLength.parts.length;
                console.log("mer_datamer_datamer_datamer_datamer_datamer_datamer_datamer_data" , mer_data)
                var saveKeywordOptinlogs= await updateOptinOptoutLog(phoneNumberInt , mer_data.customer.customer_id ,  mer_data.merchant_id , tos_message_term , getSegments )
                var invoke_payload = {
                  offer_type: "5",
                  merchant_id: mer_data.merchant_id
                };
                completeYourprofileActivestatus(mer_data.merchant_id, 5).then(
                  function (offerResponse) {
                    if (
                      "customer" in mer_data &&
                      mer_data.customer.profile_completed != 1
                    ) {
                      var successOptin = mer_data.customer;
                      if (
                        offerResponse.statusCode == 200 &&
                        offerResponse.notfound == 1
                      ) {
                        var offer_message =
                          textMsg.compeleteProfileWithReward.english;
                        if (isPuertoRico) {
                          offer_message =
                            textMsg.compeleteProfileWithReward.spanish;
                        }
                        offer_message = offer_message.replace(
                          "%DBA%",
                          mer_data.nick_name
                        );
                        offer_message = offer_message.replace(
                          "%LINK%",
                          config.app.complete_profile_link +
                          "complete_profile.php?id=" +
                          successOptin.customer_id +
                          "&mid=" +
                          successOptin.merchant_id
                        );
                        merchant_offer_detail(
                          successOptin.merchant_id,
                          "5"
                        ).then(
                          function (offer_detail) {
                            console.log(
                              "here...............................................",
                              offer_detail[0].reward_text
                            );
                            offer_message = offer_message.replace(
                              "%REWARD_TEXT%",
                              offer_detail[0].reward_text !== null
                                ? helper.decodeHTMLEntities(
                                  offer_detail[0].reward_text
                                )
                                : ""
                            );

                            if (offer_detail[0].spanish_reward_text) {
                              offer_message = offer_message.replace(
                                "%SPANISH_REWARD_TEXT%",
                                helper.decodeHTMLEntities(
                                  offer_detail[0].spanish_reward_text
                                )
                              );
                            } else {
                              offer_message = offer_message.replace(
                                "%SPANISH_REWARD_TEXT%",
                                offer_detail[0].reward_text !== null
                                  ? helper.decodeHTMLEntities(
                                    offer_detail[0].reward_text
                                  )
                                  : ""
                              );
                            }
                            delayCheckStatusSMS(
                              successOptin.merchant_id,
                              successOptin.customer_id,
                              mer_data.customer.customer_phone,
                              offer_message,
                              "Complete your profile with coupon"
                            ).then(
                              function (delay_sms) {
                                console.log("delay sms 1", delay_sms);
                                return new PuertoRicoResponse(
                                  isPuertoRico,
                                  callback,
                                  tos_message_term,
                                  phoneNumberInt,
                                  mer_data.merchant_id,
                                  mer_data,
                                  true
                                );
                              },
                              function (error) {
                                return new PuertoRicoResponse(
                                  isPuertoRico,
                                  callback,
                                  tos_message_term,
                                  phoneNumberInt,
                                  mer_data.merchant_id,
                                  mer_data,
                                  true
                                );
                              }
                            );
                          },
                          function (err) {
                            return new PuertoRicoResponse(
                              isPuertoRico,
                              callback,
                              tos_message_term,
                              phoneNumberInt,
                              mer_data.merchant_id,
                              mer_data,
                              true
                            );
                          }
                        );
                      } else {
                        var tos_message_profiles =
                          textMsg.compeleteProfileOnlySignup.english;
                        if (isPuertoRico) {
                          tos_message_profiles =
                            textMsg.compeleteProfileOnlySignup.spanish;
                        }
                        var message_profile = tos_message_profiles.replace(
                          "%CUSTOMER_ID%",
                          successOptin.customer_id
                        );
                        message_profile = message_profile.replace(
                          "%MERCHANT_ID%",
                          successOptin.merchant_id
                        );
                        message_profile = message_profile.replace(
                          "%DBA%",
                          mer_data.nick_name
                        );
                        delayCheckStatusSMS(
                          successOptin.merchant_id,
                          successOptin.customer_id,
                          mer_data.customer.customer_phone,
                          message_profile,
                          "Complete your profile without coupon"
                        ).then(
                          function (delay_sms) {
                      console.log("ooooooooooooooooooooooooooooooooooo" , mer_data.merchant_id)
                      
                            return new PuertoRicoResponse(
                              isPuertoRico,
                              callback,
                              tos_message_term,
                              phoneNumberInt,
                              mer_data.merchant_id,
                              mer_data,
                              true
                            );
                          },
                          function (error) {
                      console.log("ggggggggggggggggggggggggggggg")
                      
                            return new PuertoRicoResponse(
                              isPuertoRico,
                              callback,
                              tos_message_term,
                              phoneNumberInt,
                              mer_data.merchant_id,
                              mer_data,
                              true
                            );
                          }
                        );
                      }
                    } else {
                      return new PuertoRicoResponse(
                        isPuertoRico,
                        callback,
                        tos_message_term,
                        phoneNumberInt,
                        mer_data.merchant_id,
                        mer_data,
                        true
                      );
                    }
                  },
                  function (error) {
                    console.log("in error");
                    var today = Math.floor(Date.now() / 1000);
                    return new PuertoRicoResponse(
                      isPuertoRico,
                      callback,
                      tos_message_term,
                      phoneNumberInt,
                      mer_data.merchant_id,
                      mer_data,
                      true
                    );
                  }
                );
              },
              function (error) {
                console.log("errorerrorerrorerrorerrorerrorerrorerrorerrorerrorerrorerrorerrorerror" , error)
                var tos_message = textMsg.invalidText.english;
                if (isPuertoRico) {
                  tos_message = textMsg.invalidText.spanish;
                }
                return new PuertoRicoResponse(
                  isPuertoRico,
                  callback,
                  tos_message,
                  phoneNumberInt,
                  null,
                  {},
                  false
                );
              }
            );
          }
      }
    }
  }
};
//optin customer with keyword
function OptInKeyword(phoneNumberInt, keyword, template_optin) {
  return new Promise(function (resolve, reject) {
    getMerchantByKeyword(keyword).then(
      function (merchant_info) {
        if (merchant_info.length > 0) {
          async.eachLimit(
            merchant_info,
            merchant_info.length,
            function (merchant, merchantCallback) {
              updateMerchantOptin(
                phoneNumberInt,
                merchant.merchant_id,
                "1"
              ).then(
                function (successOptin) {
                  // if optin exist then it means new record is entered.. so signup offer need to be sent..

                  merchant_info[0].customer = successOptin;
                  console.log("merchant_info", merchant_info[0].customer);

                  if (successOptin.optin && !successOptin.isupdated) {
                    merchant_info[0].customer = successOptin;
                    template_optin = template_optin.replace(
                      "%LINK%",
                      `${
                      config.app.TERLINK
                      } Policies, Terms and Conditions. %PROFILE%`
                    );
                    template_optin = template_optin.replace(
                      "%PROFILE%",
                      `Click ${
                      config.app.complete_profile_link
                      }complete_profile.php?id=${
                      successOptin.customer_id
                      }&amp;mid=${
                      successOptin.merchant_id
                      } to complete you profile.`
                    );

                    tapGenerateCoupon.GenerateCoupon(
                      {
                        offer_type: "4",
                        merchant_id: successOptin.merchant_id,
                        customer_id: successOptin.customer_id,
                        message: template_optin
                      },
                      function (error, data) {
                        merchantCallback(null, true);
                      }
                    );
                  } else {
                    merchantCallback(null, true);
                  }
                },
                function (failOptin) {
                  console.log(failOptin);
                  merchantCallback(null, true);
                }
              );
            },
            function (error) {
              resolve(merchant_info[0]);
            }
          );
        } else {
          reject("Sorry merchant not found.");
        }
      },
      function (rejected) {
        reject(rejected);
      }
    );
  });
}

//optin with customers

function updateMerchantOptin(phoneNumber, merchant_id, optin) {
  return new Promise(function (resolve, reject) {
    var today = Math.floor(Date.now() / 1000);
    var updateparams = {
      TableName: "tap_customers_merchant",
      Key: {
        customer_phone: phoneNumber.toString(),
        merchant_id: merchant_id
      },
      Item: {
        updated_at: parseInt(today)
      }
    };
    if (optin !== null) {
      updateparams.Item.optin = optin;
      updateparams.Item.optin_at = parseInt(Math.floor(Date.now() / 1000));
    }

    var query =
      "UPDATE " +
      updateparams.TableName +
      " SET " +
      Object.keys(updateparams.Item)
        .map(function (x) {
          return (
            "`" +
            x +
            "`='" +
            (updateparams.Item[x] != null ? updateparams.Item[x] : "") +
            "'"
          );
        })
        .join(",") +
      " WHERE " +
      Object.keys(updateparams.Key)
        .map(function (x) {
          return (
            "`" +
            x +
            "`='" +
            (updateparams.Key[x] != null ? updateparams.Key[x] : "") +
            "'"
          );
        })
        .join(" AND ");

    model.sequelize
      .query(query)
      .spread((results, metadata) => {
        console.log(
          "update customer merchant========================",
          metadata
        );
        if (metadata.affectedRows > 0) {
          console.log("check --------------1");
          var selcquery =
            "SELECT customer_id, profile_completed,optin,customer_phone,merchant_id,created_at,optin_at,customer_id,type FROM tap_customers_merchant where customer_phone= $phoneNumber AND merchant_id = $merchant_id";
          model.sequelize
            .query(selcquery, {
              bind: {
                phoneNumber: phoneNumber,
                merchant_id: merchant_id
              },
              type: model.sequelize.QueryTypes.SELECT
            })
            .then(function (custdata) {
              // custdata[0].isupdated = true;
              // updateOptinOptoutLog(
              //   custdata[0].customer_id,
              //   merchant_id,
              //   optin
              // ).then(
              //   function (logupdated) {
              //     resolve(custdata[0]);
              //   },
              //   function (logError) {
              //     reject(logError);
              //   }
              // );
                resolve(custdata[0]);
              
            })
            .catch(function (err) {
              reject(err);
            });
        } else {
          console.log("check --------------2");
          // need to insert new record in 'tap_customers_merchant' but lets check user exist in tap_customer or not
          var sqlQuery = `SELECT * FROM tap_customers WHERE phoneNumber = $phoneNumber`;
          model.sequelize
            .query(sqlQuery, {
              bind: {
                phoneNumber: phoneNumber
              },
              type: model.sequelize.QueryTypes.SELECT
            })
            .then(function (rows) {
              if (rows.length > 0) {
                // user exist.. lets insert in 'tap_customers_merchant'
                var insertparams = {
                  TableName: "tap_customers_merchant",
                  Item: {
                    customer_phone: phoneNumber.toString(),
                    merchant_id: merchant_id,
                    created_at: Math.floor(Date.now() / 1000),
                    optin: optin,
                    optin_at: Math.floor(Date.now() / 1000),
                    customer_id: rows[0].id,
                    type: "normal"
                  }
                };

                model.tap_customers_merchant
                  .create(insertparams.Item)
                  .then(function (result) {
                    // updateOptinOptoutLog(rows[0].id, merchant_id, optin).then(
                    //   function (logupdated) {
                    //     resolve(insertparams.Item);
                    //   },
                    //   function (logError) {
                    //     reject(logError);
                    //   }
                    // );
                    resolve(insertparams.Item);
                    
                  })
                  .catch(function (err) {
                    reject(err);
                  });
              } else {
                // user not exist. First create and then insert in 'tap_customers_merchant'
                GenerateShortCode().then(
                  function (short_code) {
                    var insertparams = {
                      TableName: "tap_customers",
                      Item: {
                        phoneNumber: parseInt(phoneNumber),
                        prefContactMethod: 0,
                        created_at: Math.floor(Date.now() / 1000),
                        type: "normal",
                        short_code: short_code
                      }
                    };
                    model.tap_customers
                      .create(insertparams.Item)
                      .then(function (result) {
                        var insertparamsmerchant = {
                          TableName: "tap_customers_merchant",
                          Item: {
                            customer_phone: phoneNumber.toString(),
                            merchant_id: merchant_id,
                            created_at: Math.floor(Date.now() / 1000),
                            optin: optin,
                            optin_at: Math.floor(Date.now() / 1000),
                            customer_id: result.id,
                            type: "normal"
                          }
                        };
                        model.tap_customers_merchant
                          .create(insertparamsmerchant.Item)
                          .then(function (result) {
                            resolve(insertparamsmerchant.Item);
                          })
                          .catch(function (err) {
                            reject(err);
                          });
                      })
                      .catch(function (err) {
                        reject(err);
                      });
                  },
                  function (error) {
                    reject(error);
                  }
                );
              }
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

// get customer merchant by id
function getCustomerMerchantsByPhone(customer_phone) {
  return new Promise(function (resolve, reject) {
    var query =
      "SELECT cm.*,m.dba,m.nick_name,m.keyword FROM tap_customers_merchant as cm INNER JOIN tap_merchants as m ON cm.merchant_id=m.merchant_id WHERE m.taptext_status='true' AND optin= '1' AND customer_phone= :customer_phone";

    model.sequelize
      .query(query, {
        replacements: {
          customer_phone: customer_phone
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function (rows) {
        if (rows.length > 0) {
          resolve(rows);
        } else {
          reject("No Customer Found.");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
// generate Short Code
function GenerateShortCode() {
  return new Promise(function (resolve, reject) {
    var short_code = randomString(8, "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    resolve(short_code);
  });
}
/**
 * Generate Random String
 * @param {*} length 
 * @param {*} input 
 */
function randomString(length, input) {
  var result = '';
  var chars = (typeof input !== 'undefined') ? input : '0123456789';
  for (var i = length; i > 0; --i)
      result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}
// opt out with merchant
function optoutwithmerchant(custid, merchant) {
  return new Promise(function (resolve, reject) {
    var query =
      "UPDATE tap_customers_merchant SET optin = '0' WHERE merchant_id = $merchant_id  AND customer_id= $customer_id ";

    model.sequelize
      .query(query, {
        bind: {
          customer_id: custid,
          merchant_id: merchant
        }
      })
      .spread((results, metadata) => {
        if (metadata.affectedRows > 0) resolve(results);
        else reject("No Customer Found.");
      })
      .catch(function (err) {
        reject(err);
      });
  });
}

function getMerchantByKeyword(keyword) {
  return new Promise(function (resolve, reject) {
    var sql =
      "SELECT * FROM tap_merchants WHERE taptext_status ='true' AND keyword= $keyword";

    model.sequelize
      .query(sql, {
        bind: {
          keyword: keyword
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function (rows) {
        if (rows.length > 0) {
          resolve(rows);
        } else {
          reject("No Merchant Found.");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}

function updateCustomeroptout(custid , phone_number , message) {
  var logMaintan = [];
  return new Promise(function (resolve, reject) {
    // for insert all merchant optout log
    console.log("customer ID--------", custid);
    var getAllAttchedMerchantData =
      "Select merchant_id, customer_id from tap_customers_merchant where optin = '1' and customer_id =:customer_id";
    var sqlCustomersParms = {
      customer_id: custid
    };
    model.sequelize
      .query(getAllAttchedMerchantData, {
        replacements: sqlCustomersParms,
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function (customerResult) {
        if (customerResult.length > 0) {
          console.log(customerResult)
          customerResult.map(function (customerResults, index) {
            let optin = "0";
            console.log(customerResults.customer_id);
            console.log(customerResults.merchant_id);
            console.log(optin);
            console.log(Math.floor(Date.now() / 1000));
            let getLength = splitter.split(message);
            let getSegments = getLength.parts.length;
            var customerData = {
              customer_number : phone_number,
              customer_id:customerResults.customer_id,
              merchant_id:customerResults.merchant_id,
              subject:"OPT-OUT",
              segments : getSegments,
              requested_from : "Customer Mobile",
              message_sent : message,
              time:Math.floor(Date.now() / 1000)
            }
            logMaintan.push(customerData);
          });
          console.log("log data for custoemr optin", logMaintan);
          //optout with all merchant
          var query =
            "UPDATE tap_customers_merchant SET optin = '0' WHERE  customer_id =:customer_id";
          model.sequelize
            .query(query, {
              replacements: sqlCustomersParms,
              type: model.sequelize.QueryTypes.UPDATE
            })
            .then(metadata => {
              console.log("logMaintan--------",logMaintan);
              model.tap_customers_activity
                .bulkCreate(logMaintan)
                .then(function (info) {
                  resolve(true);
                })
                .catch(function (err) {
                  reject(err);
                });
            })
            .catch(function (err) {
              reject(err);
            });
        } else {
          reject("No optin customer Customer Found");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}

function getcustomerDetaislbyPhonenumber(customer_phone) {
  return new Promise(function (resolve, reject) {
    var query =
      "SELECT id, phoneNumber from tap_customers WHERE  phoneNumber= :phoneNumberStr";
    model.sequelize
      .query(query, {
        replacements: {
          phoneNumberStr: customer_phone
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function (rows) {
        if (rows.length > 0) {
          resolve(rows);
        } else {
          resolve("No Customer Found.");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}

//get complete your offer
function completeYourprofileActivestatus(merchant_id, offer_type) {
  return new Promise(function (resolve, reject) {
    merchant_offer_detail(merchant_id, offer_type).then(
      function (data) {
        if (data.length) {
          var offer_info = data[0];

          var coupon_detail = {
            merchant_id: merchant_id,
            offerid: offer_info.id,
            offer_type: offer_info.Discount_Type,
            created_at: Math.floor(Date.now() / 1000),
            expires: offer_info.expires
          };
          if (offer_info.expires != "0") {
            var expires = gettimestampForDays(offer_info.expires);
            if (expires) {
              coupon_detail["expires"] = expires;
            }
          }
          resMessage.RESPONSE200.data = coupon_detail;
          resMessage.RESPONSE200.notfound = 1;
          resolve(resMessage.RESPONSE200);
        } else {
          resMessage.RESPONSE200.data = [];
          resMessage.RESPONSE200.notfound = 0;
          resolve(resMessage.RESPONSE200);
        }
      },
      function (error) {
        resMessage.RESPONSE400.message = error;
        resolve(resMessage.RESPONSE400);
      }
    );
  });
}

function merchant_offer_detail(merchant_id, offer_type) {
  var offer_id = "";
  var today = Math.floor(Date.now() / 1000);
  var query =
    "Select * from tap_merchant_offers Where active='true'  AND start_date<= $today AND Discount_Type= $offer_type AND MerchantId=$merchant_id";
  if (offer_id !== "") {
    query += " AND id= $offer_id";
  }
  return new Promise(function (resolve, reject) {
    model.sequelize
      .query(query, {
        bind: {
          offer_id: offer_id,
          today: today,
          offer_type: offer_type,
          merchant_id: merchant_id
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function (rows) {
        if (rows.length > 0) {
          resolve(rows);
        } else {
          reject([]);
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}

// extracting data from query string...
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
/**
 * 
 * @param {*} is_puertoRico 
 * @param {*} callback 
 * @param {*} response 
 * @param {*} number 
 * @param {*} merchant_id 
 * @param {*} merData 
 * @param {*} optInStatus 
 */
function PuertoRicoResponse(
  is_puertoRico,
  callback,
  response,
  number,
  merchant_id = null,
  merData = {},
  optInStatus
) {
  shorturlmaking(response).then(
    function (response) {
      if (is_puertoRico) {
        response = response.replace("&amp;", "&");
        var PuertoRico = helper.PuertoRico(number);
        helper.LookupUsedForPuertoRico(number, PuertoRico).then(
          function (carrierResponse) {
            if (carrierResponse) {
              if (optInStatus && merchant_id && merchant_id != null && optInStatus != false) {
                // Send SMS to Claro Number
                checkSMSLimit(merchant_id, number, response, merData)
                  .then(function (checkLimitResopnse) {
                    console.log("checkLimitResopnse----1------ ", checkLimitResopnse)
                    new PuertoRicoSMS(number, response, merchant_id).then(
                      function (Response) {
                        helper.updateOptInLogs(merchant_id, number, response).then(function (res) {
                          console.log("PuertoRicoResponse: success......1: ", Response);
                          return callback(response, resMessage.RESPONSE200);
                        }, function (err) {
                          console.log("PuertoRicoResponse: success......2: ", Response);
                          return callback(response, resMessage.RESPONSE200);
                        });
                      },
                      function (reject) {
                        resMessage.RESPONSE200.message = reject;
                        console.log("PuertoRicoResponse: reject: ", reject);
                        return callback(response, resMessage.RESPONSE200);
                      }
                    );
                  }, function (err) {
                    console.log('sms count error----------- ', err);
                    return callback(response, resMessage.RESPONSE200);
                  });
              } else {
                new PuertoRicoSMS(number, response, merchant_id).then(
                  function (Response) {
                    console.log("PuertoRicoResponse: success: ", Response);
                    return callback(response, resMessage.RESPONSE200);
                  },
                  function (reject) {
                    resMessage.RESPONSE200.message = reject;
                    console.log("PuertoRicoResponse: reject: ", reject);
                    return callback(response, resMessage.RESPONSE200);
                  }
                );
              }
            } else {
              resMessage.RESPONSE400.data = {};
              resMessage.RESPONSE400.data.merchant_id = merchant_id;
              resMessage.RESPONSE400.data.merData = merData;
              resMessage.RESPONSE400.data.optInStatus = optInStatus;
              return callback(response, resMessage.RESPONSE400);
            }
          });

      } else {
        response = response.replace("&amp;", "&");
        if (optInStatus && merchant_id && merchant_id != null && optInStatus != false) {
          checkSMSLimit(merchant_id, number, response, merData)
            .then(function (checkLimitResopnse) {
              console.log("checkLimitResopnse------ ", checkLimitResopnse)
              helper.updateOptInLogs(merchant_id, number, response).then(function (res) {
                return callback(null, response);
              }, function (err) {
                return callback(null, "");
              });
            }, function (err) {
              console.log('sms count error----------- ', err);
              return callback(null, "");
            });
        } else {
          return callback(null, response);
        }
      }
    },
    function (error) {
      console.log(error)
      return callback(null, error);
    }
  );
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
          let upgradeTierData = { segmentNeedToAdd: (sms_sent + 1) , trigger : "mobile optin controller" };
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
/**
 * 
 * @param {*} to 
 * @param {*} body 
 * @param {*} merchant_id 
 */
function PuertoRicoSMS(to, body, merchant_id) {
  return new Promise(function (resolve, reject) {
    helper.mobisaSentSms(to, body).then(
      function (myData) {
        resolve(myData);
      },
      function (error) {
        reject(error);
      }
    );
  });
}

function gettimestampForDays(days) {
  days = parseInt(days);
  var d = new Date();
  if (Number.isInteger(days)) {
    d.setDate(d.getDate() + days);
    return Math.floor(d.getTime() / 1000);
  } else {
    return false;
  }
}

function shorturlmaking(message) {
  return new Promise(function (resolve, reject) {
    var no_of_urls = 0;
    var all_ulrs = getUrls(message);
    all_ulrs.forEach(function (element) {
      no_of_urls++;
    }, this);
    if (no_of_urls == 0) {
      resolve(message);
    } else if (no_of_urls > 0) {
      var count_url_no = 0;
      all_ulrs.forEach(function (element) {
        if (
          element == config.app.TERMS_LINK.replace(/\/$/, "") ||
          element == config.app.TERMS_LINK
        ) {
          count_url_no++;
          message = message.replace(element, "https://tpl.news/cr3va");
          if (count_url_no == no_of_urls) {
            resolve(message);
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
            function (error, response, body) {
              count_url_no++;
              // console.log(count_url_no);
              var link = JSON.parse(body);
              // console.log("Link", link);
              if (
                link.destination == config.app.TERMS_LINK.replace(/\/$/, "")
              ) {
                message = message.replace(element, fortermlink);
              }
              message = message.replace(element, "https://" + link.shortUrl);
              if (count_url_no == no_of_urls) {
                resolve(message);
              }
            }
          );
        }
      }, this);
    } else {
      reject("rejct data");
    }
  });
}

/**
 * This function use for check review geration status and save Profile Complete SMS in tap_merchant_optin_batch_sms table
 * @param {*} merchant_id
 * @param {*} customer_id
 * @param {*} phoneNumber
 * @param {*} message
 */
function delayCheckStatusSMS(merchant_id, customer_id, phoneNumber, message, subject = null) {
  return new Promise(function (resolve, reject) {
    console.log("merchant_id: " + merchant_id);
    console.log("customer_id: " + customer_id);
    console.log("phoneNumber: " + phoneNumber);
    console.log("message: " + message);
    model.tap_merchant_deep_link
      .findAll({
        attributes: ["id"],
        where: {
          merchant_id: merchant_id,
          review_generation_process_status: "1"
        }
      })
      .then(function (result) {
        console.log("result : " + JSON.stringify(result));
        if (result.length > 0) {
          console.log("only check");
          resolve(0);
        } else {
          //   resolve(1);
          var insertparams = {
            merchant_id: merchant_id,
            customer_id: customer_id,
            customer_phone: phoneNumber,
            message: message,
            optin_at: Math.floor(Date.now() / 1000),
            sms_type: "2",
            sms_status: "0",
            subject: subject
          };
          model.tap_merchant_optin_batch_sms
            .create(insertparams)
            .then(function (info) {
              resolve(1);
            })
            .catch(function (err) {
              reject("Data inserted error complete profile : " + err);
            });
        }
      })
      .catch(function (err) {
        reject("delay SMS error: " + err);
      });
  });
}
/**
 * Log optin
 * @param {*} customer
 * @param {*} merchant_id
 * @param {*} optin
 */
function updateOptinOptoutLog(phone ,customer, merchant_id, message , getSegments) {
  console.log("Tap optin log maintain");
  return new Promise(function (resolve, reject) {
    var logsparams = {
      TableName: "tap_customers_activity",
      Item: {
        customer_number : phone,
        merchant_id: merchant_id,
        customer_id: customer,
        subject : 'KEYWORD OPT-IN',
        requested_from : "Customer Mobile",
        device_data : "Not Available",
        message_sent : message ,
        segments : 1 ,
        time: Math.floor(Date.now() / 1000)
      }
    };
    model.tap_customers_activity
      .create(logsparams.Item)
      .then(function (info) {
        resolve(true);
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
function updateHelpLog(customer_phone , customer, merchant_id , message , segments) {
  console.log("Tap optin log maintain");
  return new Promise(function (resolve, reject) {
    var logsparams = {
      TableName: "tap_customers_activity",
      Item: {
        customer_number : customer_phone,
        merchant_id: merchant_id,
        customer_id: customer,
        subject : 'HELP',
        requested_from : "Customer Mobile",
        device_data : null,
        message_sent : message ,
        segments : segments,
        time: Math.floor(Date.now() / 1000)
      }
    };
    model.tap_customers_activity
      .create(logsparams.Item)
      .then(function (info) {
        resolve(true);
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
function updateStopLog(customer_phone , customer, merchant_id , message , getSegments) {
  console.log("Tap optin log maintain");
  return new Promise(function (resolve, reject) {
    var logsparams = {
      TableName: "tap_customers_activity",
      Item: {
        customer_number : customer_phone,
        merchant_id: merchant_id,
        customer_id: customer,
        subject : 'STOP',
        requested_from : "Customer Mobile",
        device_data : null,
        time: Math.floor(Date.now() / 1000),
        message_sent : message,
        segments : getSegments
      }
    };
    model.tap_customers_activity
      .create(logsparams.Item)
      .then(function (info) {
        resolve(true);
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
