"use strict";
const model = require("../model");
const timestamp = require("unix-timestamp");
const textmessage = require("../language/textMessage");
const helpher = require("../controller/common/helper");
const responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));
// const tapGenerateCoupon = require("../controller/tapGenerateCouponController");
const tapGenerateCoupon = require("../controller/generateCouponController");
const tap_twilioSMSController = require('../controller/tap_twilioSMSController');
const moment = require('moment');
const async = require('async');

module.exports = {
    completeYourProfileReminder: function (req, res) {
        return new Promise(function (resolve, reject) {
            getMerchantCustomersHavingCompleteProfileOffer().then((merchantCustomers) => {
                console.log(merchantCustomers);
                //resolve(merchantCustomer);
                async.eachSeries(merchantCustomers, (merchantCustomer, Callback) => {

                    getMerchantofferdetails(merchantCustomer.merchant_id).then((merdetails) => {
                        let offerActivated = false;
                        if (merdetails.Discount_Type) {
                            offerActivated = (merdetails.active == 'true') ? true : false;
                        }
                        let PuertoRico = helpher.PuertoRico(merchantCustomer.phoneNumber.toString());
                        let msg_template = '';
                        if (offerActivated) {
                            msg_template = textmessage.giveCouponWithShortUrl.english;
                            if (PuertoRico) {
                                msg_template = textmessage.giveCouponWithShortUrl.spanish;
                            }
                            tapGenerateCoupon.GenerateCoupon({
                                    offer_type: merdetails.Discount_Type,
                                    merchant_id: merdetails.MerchantId,
                                    customer_id: merchantCustomer.customer_id,
                                    message: msg_template,
                                },
                                function (error, response) {
                                    if (error) {
                                        Callback();
                                    } else {
                                        if (response.statusCode == 200) {
                                            updatecustomers(merdetails.MerchantId, merchantCustomer.customer_id).then((updatedCustomer) => {
                                                Callback();
                                            }, (error) => {
                                                Callback();
                                            })

                                        } else {
                                            Callback();
                                        }
                                    }
                                }
                            );
                        } else {
                            msg_template = textmessage.compeleteProfileOnly.english;
                            if (PuertoRico) {
                                msg_template = textmessage.compeleteProfileOnly.spanish;
                            }
                            tap_twilioSMSController.twilioSMSSent({
                                    phone: merchantCustomer.phoneNumber,
                                    message: msg_template
                                },
                                function (err, sendsms) {
                                    if (err) {
                                        console.log(err);
                                        Callback();
                                    } else {
                                        Callback();
                                    }
                                }
                            );
                        }
                    }, (error) => {
                        console.log(error);
                        Callback();
                    })
                }, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve('All Coupon have been sent successfully.');
                    }
                })
            }, (error) => {
                console.log(error);
                reject(error);
            });
        })
    }
}


let getMerchantCustomersHavingCompleteProfileOffer = () => {
    let dayscheck = moment().subtract(30, "days").unix();
    return new Promise(function (resolve, reject) {
        let updateQuery = `update tap_customers_merchant SET profile_reminder = created_at WHERE profile_reminder = 0 `;
        model.sequelize.query(updateQuery).spread((results, metadatas) => {
            //resolve(metadatas);
            let getcustomerDetails =
                `SELECT cm.customer_id as cid, c.prefContactMethod,cm.customer_id,cm.created_at, cm.profile_reminder, cm.emails,cm.optin,cm.profile_completed,cm.merchant_id,cm.customer_phone as phoneNumber ,m.nick_name 
                 FROM  tap_customers_merchant as cm 
                 LEFT JOIN tap_merchants m ON m.merchant_id = cm.merchant_id 
                 LEFT JOIN tap_customers c ON c.id = cm.customer_id 
                 where cm.profile_completed='0' 
                 AND cm.profile_reminder <= :dayscheck GROUP  BY cm.merchant_id,cm.customer_phone`;
            model.sequelize
                .query(getcustomerDetails, {
                    replacements: {
                        dayscheck: dayscheck
                    },
                    type: model.sequelize.QueryTypes.SELECT
                })
                .then(function (customers) {
                    if (customers.length > 0) {
                        resolve(customers);
                    } else {
                        reject("No record found");
                    }
                })
                .catch(function (err) {
                    reject(err);
                });

            // Results will be an empty array and metadata will contain the number of affected rows.
        }).catch(function (err) {
            reject(err);
        });
    });
}
let getMerchantofferdetails = (merchant_id) => {
    return new Promise(function (resolve, reject) {
        let selectMerchantOffer = `Select MerchantId, active, before_profile_complete_reward_text, 
        before_profile_complete_spanish_reward_text, Discount_Type FROM 
        tap_merchant_offers WHERE MerchantId = :merchant_id AND  active ='true' AND Discount_type='5'`;
        model.sequelize
            .query(selectMerchantOffer, {
                replacements: {
                    merchant_id: merchant_id
                },
                type: model.sequelize.QueryTypes.SELECT
            })
            .then(function (merchantDetails) {
                if (merchantDetails.length > 0) {
                    resolve(merchantDetails[0]);
                } else {
                    reject("No record found");
                }
            })
            .catch(function (err) {
                reject(err);
            });
    });
}
let updatecustomers = (merchant_id, customer_id) => {
    let today = Math.floor(Date.now() / 1000);
    return new Promise(function (resolve, reject) {
        let customerupdateQuery = `UPDATE tap_customers_merchant set profile_reminder = ${today} where merchant_id = '${merchant_id}' AND customer_id = ${customer_id}`;
        model.sequelize.query(customerupdateQuery).spread((results, metadatas) => {
                resolve(metadatas);
            })
            .catch(function (err) {
                reject(err);
            });
    });
}
let decodeHTMLEntities = (text) => {
    var entities = [
        ['amp', '&'],
        ['apos', '\''],
        ['#x27', '\''],
        ['#x2F', '/'],
        ['#39', '\''],
        ['#47', '/'],
        ['lt', '<'],
        ['gt', '>'],
        ['nbsp', ' '],
        ['quot', '"']
    ];
    for (var i = 0, max = entities.length; i < max; ++i) {
        text = text.replace(new RegExp('&' + entities[i][0] + ';', 'g'), entities[i][1]);
    }
    return text;
}