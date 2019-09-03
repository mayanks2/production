var model = require("../model");
var config = require("../config/config");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));
var helper = require("../controller/common/helper");
var tap_twilioSMSController = require("../controller/tap_twilioSMSController");
var trainingMode = require('../controller/common/checkTrainingMode')
var async = require("async");
const RES_MESSAGE = require("../language/errorMsg");
const tierBillingScheduleInfo = require('../controller/tierBillingScheduleInfo');
var timeZoneForTcpa = require('../controller/common/checkTimeBetween')

module.exports = {
    sendPendingBatchSMS: function () {
        return new Promise(function (resolve, reject) {
            responseMsg.OK.data = [];
            responseMsg.OK.otherDetails = [];
            responseMsg.OK.otherDetails.push({ Start: Math.floor(Date.now()) });
            console.log(responseMsg.OK);
            getmessageDetails().then(
                function (result) {
                    async.forEachOfSeries(
                        result,
                        (offer, index, messageCallback) => {
                            // for (let data in result) {
                            console.log("result data: " + JSON.stringify(offer));
                            var phonenumber = offer.customer_phone;
                            var merchant_id = offer.merchant_id;
                            timeZoneForTcpa.checkTimeVaildationForMessages(offer.timezone).then(function (checkTimeZone) {
                                if (merchant_id && checkTimeZone) {
                                    var PuertoRico = helper.PuertoRico(phonenumber);
                                    if (PuertoRico) {
                                        sendSMS(
                                            offer.id,
                                            merchant_id,
                                            phonenumber,
                                            offer.message,
                                            offer.tap_merchant,
                                            offer.offer,
                                            offer.offer_id,
                                            offer.segment_count
                                        ).then(
                                            function (sentResponse) {
                                                console.log("portico", sentResponse);
                                                messageCallback(null);
                                            },
                                            function (error) {
                                                console.log("portico errro", error);
                                                messageCallback(null);
                                            }
                                        );
                                    } else {
                                        console.log("merchant_id", merchant_id);
                                        sendSMS(
                                            offer.id,
                                            merchant_id,
                                            phonenumber,
                                            offer.message,
                                            offer.tap_merchant,
                                            offer.offer,
                                            offer.offer_id,
                                            offer.segment_count
                                        ).then(
                                            function (smsSend) {
                                                console.log("smsSend", smsSend);
                                                messageCallback(null);
                                            },
                                            function (error) {
                                                console.log("error", error);
                                                messageCallback(null);
                                            }
                                        );
                                    }
                                } else {
                                    console.log("Offer time-zone not satisfy condition or merchant id not exist")
                                    messageCallback(null);
                                }
                            }, function (err) { messageCallback(null); });
                        },
                        err => {
                            if (err) {
                                console.error("end loop : " + err);
                                responseMsg.ERROR.message = err;
                            }
                            resolve("All pending offer send successfully.");
                        }
                    );
                },
                function (error) {
                    resolve(error);
                }
            );
        });
    }
};
/**
 * Get All pending offer sms
 */
function getmessageDetails() {
    return new Promise(function (resolve, reject) {
        model.tap_pending_messages.belongsTo(model.tap_merchants, {
            foreignKey: "merchant_id",
            targetKey: "merchant_id"
        });
        model.tap_pending_messages
            .findAll({
                where: {
                    sent_status: "false",
                },
                include: [
                    {
                        attributes: [
                            "email",
                            "nick_name",
                            "sms_unlimited",
                            "sms_limit",
                            "sms_limit_perUser"
                        ],
                        model: model.tap_merchants
                    }
                ]
            })
            .then(function (data) {
                var result = data.map(function (data) {
                    return data.toJSON();
                });
                if (result.length > 0) {
                    console.log("batch SMS found.  : ", result);
                    resolve(result);
                } else {
                    console.log("No batch SMS found.");
                    reject("No batch SMS found.");
                }
            })
            .catch(function (err) {
                reject(err);
            });
    });
}
/**
 * send SMS PuertoRico number and US numbers
 * @param {*} id 
 * @param {*} merchant_id 
 * @param {*} customer_id 
 * @param {*} phone_number 
 * @param {*} message 
 * @param {*} merData 
 */
function sendSMS(id, merchant_id, phone_number, message, merData, subject, offer_id, segment_count) {
    return new Promise(async function (resolve, reject) {
        var checkTrainingStatus = await trainingMode.checkTrainingMode(merchant_id)
        helper
            .getMerchantSMSCount(merchant_id, "monthly", "sms")
            .then(function (smsSent) {
                console.log("merchant Data----------", merData);
                let upgradeTierData = { segmentNeedToAdd: (smsSent + segment_count), trigger: "pending offer sms" };
                if (merData.sms_limit < upgradeTierData.segmentNeedToAdd && merData.sms_unlimited != "1" && !checkTrainingStatus) {

                    tierBillingScheduleInfo
                        .updgardeTierWithOveragePrice(merchant_id, upgradeTierData)
                        .then(
                            function (res) {
                                console.log("Sms sent Limit already reached and Tier Upgraded.");
                                helper.getMerchantCustomerSMSCount(
                                    merchant_id,
                                    phone_number
                                ).then(
                                    function (consumed_count) {
                                        console.log("consume count---- ", consumed_count.consume);
                                        if (
                                            consumed_count.consume >=
                                            merData.sms_limit_perUser
                                        ) {
                                            // Update batch sms record in database
                                            var updateQuery =
                                                "UPDATE tap_pending_messages SET sent_status = 'true' WHERE id = :id";
                                            model.sequelize
                                                .query(updateQuery, {
                                                    replacements: {
                                                        id: id
                                                    },
                                                    type: model.sequelize.QueryTypes.UPDATE
                                                })
                                                .then(function (info) {
                                                    console.log(
                                                        "Sms sent limit against this customer already reached."
                                                    );
                                                    resolve(info);
                                                })
                                                .catch(function (err) {
                                                    console.log(err);
                                                    console.log("error in update");
                                                    resolve("error in update");
                                                });
                                        } else {
                                            sendBatchSMS(id, merchant_id, phone_number, message, subject, offer_id, segment_count).then(function (res) {
                                                resolve(res);
                                            }, function (err) {
                                                resolve(err);
                                            });
                                        }
                                    }, function (err) {
                                        resolve(err);
                                    });
                            },
                            function (err) {
                                console.log(err);
                                console.log("Sms sent Limit already reached and Tier not Upgraded.");
                                // Update batch sms record in database
                                var updateQuery =
                                    "UPDATE tap_pending_messages SET sent_status = 'true' WHERE id = :id";
                                model.sequelize
                                    .query(updateQuery, {
                                        replacements: {
                                            id: id
                                        },
                                        type: model.sequelize.QueryTypes.UPDATE
                                    })
                                    .then(function (info) {
                                        console.log(
                                            "Sms sent limit against this customer already reached."
                                        );
                                        resolve(info);
                                    })
                                    .catch(function (err) {
                                        console.log(err);
                                        console.log("error in update");
                                        resolve("error in update");
                                    });
                            }
                        );
                } else {
                    helper.getMerchantCustomerSMSCount(
                        merchant_id,
                        phone_number
                    ).then(
                        function (consumed_count) {
                            console.log("consume count---- ", consumed_count.consume);
                            if (
                                consumed_count.consume >=
                                merData.sms_limit_perUser
                            ) {
                                // Update batch sms record in database
                                var updateQuery =
                                    "UPDATE tap_pending_messages SET sent_status = 'true' WHERE id = :id";
                                model.sequelize
                                    .query(updateQuery, {
                                        replacements: {
                                            id: id
                                        },
                                        type: model.sequelize.QueryTypes.UPDATE
                                    })
                                    .then(function (info) {
                                        console.log(
                                            "Sms sent limit against this customer already reached."
                                        );
                                        resolve(info);
                                    })
                                    .catch(function (err) {
                                        console.log(err);
                                        console.log("error in update");
                                        resolve("error in update");
                                    });
                            } else {
                                sendBatchSMS(id, merchant_id, phone_number, message, subject, offer_id, segment_count).then(function (res) {
                                    resolve(res);
                                }, function (err) {
                                    resolve(err);
                                });
                            }
                        }, function (err) {
                            resolve(err);
                        });
                }
            }, function (err) {
                console.log('sms count error----------- ', err);
                resolve(err);
            });
    });
}
/**
 * Send batch SMS
 * @param {*} id
 * @param {*} merchant_id
 * @param {*} customer_id
 * @param {*} phone_number
 * @param {*} message
 */
function sendBatchSMS(id, merchant_id, phone_number, message, subject, offer_id, segment_count) {
    return new Promise(function (resolve, reject) {
        var today = Math.floor(Date.now() / 1000);
        var updateQuery =
            "UPDATE tap_pending_messages SET sent_status = 'true' WHERE id = :id";
        tap_twilioSMSController.twilioSMSSent(
            {
                phone: phone_number,
                message: message
            },
            function (err, sendsms) {
                if (err) {
                    model.sequelize
                        .query(updateQuery, {
                            replacements: {
                                id: id
                            },
                            type: model.sequelize.QueryTypes.UPDATE
                        })
                        .then(function (info) {
                            console.log("sms not sent and record updated");
                            resolve(success);
                        })
                        .catch(function (err) {
                            console.log(err);
                            console.log("error in update");
                            resolve("error in update");
                        });
                } else {
                    var updateParams = {
                        sent_status: "true"
                    };
                    let log_data = {
                        timestamp: parseInt(today),
                        merchant_id: merchant_id,
                        customer_phone: phone_number,
                        subject: subject,
                        message: sendsms.data.body,
                        sms_segment: segment_count,
                        price: sendsms.data.price,
                        type: "SMS",
                        numMedia: sendsms.data.numMedia,
                        res_data: JSON.stringify(sendsms.data),
                        offer_id: offer_id
                    };
                    if (sendsms.statusCode == 200) {
                        model.tap_pending_messages
                            .update(updateParams, {
                                where: {
                                    id: id
                                }
                            })
                            .then(function (info) {
                                console.log("sms sent and record updated");
                                message = sendsms.sent_sms;

                                Promise.all([
                                    helper.insertLogsSMS(log_data),
                                    helper.updateMerchantsSentSMS({
                                        sms_sent: log_data.sms_segment,
                                        merchant_id: merchant_id
                                    })
                                ]).then(
                                    function (success) {
                                        console.log("sms failed and log inserted");
                                        resolve(success);
                                    },
                                    function (fail) {
                                        console.log("sms send failed and log insert failed");
                                        resolve(fail);
                                    }
                                );
                            })
                            .catch(function (err) {
                                console.log(err);
                                console.log("error in update");
                                console.log("sms sent and record not updated");
                                resolve("error in update");
                            });
                    } else {
                        console.log("sms not sent---------------------------");
                        model.tap_merchant_optin_batch_sms
                            .update(updateParams, {
                                where: {
                                    id: id
                                }
                            })
                            .then(function (info) {
                                console.log("sms sent and record updated");
                                message = sendsms.sent_sms;
                                Promise.all([
                                    helper.insertFailedLogsSMS(log_data),
                                    helper.updateMerchantsSentSMS({
                                        sms_sent: log_data.sms_segment,
                                        merchant_id: merchant_id
                                    })
                                ]).then(
                                    function (success) {
                                        console.log("sms failed and log inserted");
                                        resolve(success);
                                    },
                                    function (fail) {
                                        console.log("sms send failed and log insert failed");
                                        resolve(fail);
                                    }
                                );
                            })
                            .catch(function (err) {
                                console.log(err);
                                console.log("error in update");
                                console.log("sms sent and record not updated");
                                resolve("error in update");
                            });
                    }
                }
            }
        );
    });
}
