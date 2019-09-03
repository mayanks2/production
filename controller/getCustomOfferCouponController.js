"use strict";
var model = require("../model");
var config = require("../config/config");
var textmessage = require("../language/textMessage");
var helpher = require("../controller/common/helper");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));
const moment_time = require("moment-timezone");
const moment = require("moment");
// var tapGenerateCoupon = require("../controller/tapGenerateCouponController");
var tapGenerateCoupon = require("../controller/tapGenerateCouponControllerEarn");
var async = require('async')

module.exports = {
  getCustomOfferCoupon: function (req, callback) {
    responseMsg.RESPONSE200.message = "Record Saved successfully.!";
    var today = Math.floor(Date.now() / 1000);
    var customer_id = req.customer_id;
    var merchant_id = req.merchant_id;
    var saleAmountInsert = req.saleAmount;
    if (merchant_id && customer_id && saleAmountInsert) {
      // check top spent offer exist aginst this customer
      Promise.all([
        getAllActiveOffers(merchant_id),
        getAvailableCoupons(customer_id, merchant_id)
      ]).then(
        function (getallId) {
          var activeOfferId = getallId[0];
          var customerAvailbleOffers = getallId[1];
          getMerchantId(activeOfferId, customerAvailbleOffers).then(
            function (aftercomopleteID) {
              aftercomopleteID =
                aftercomopleteID.length > 0 ? aftercomopleteID : 0;
              var query =
                "SELECT * FROM tap_merchant_offers WHERE MerchantId=:merchant_id AND Discount_Type='3' AND active='true' AND  Min_Purchase > 0 AND  start_date<=:today AND min_to_earn <= :saleAmountInsert AND id  IN(" +
                aftercomopleteID +
                ") ORDER BY  RAND()";
              var queryParam = {
                merchant_id: merchant_id,
                today: today,
                saleAmountInsert: saleAmountInsert
              };
              model.sequelize
                .query(query, {
                  replacements: queryParam,
                  type: model.sequelize.QueryTypes.SELECT
                })
                .then(function (offer_detail) {
                  if (offer_detail.length > 0) {
                    var numbercount = 1;
                    var totalOffer = offer_detail.length - 1;
                    console.log("totalllllllllllllllllllllllll" , offer_detail)
                    try {
                      async.eachSeries(offer_detail, function (offer_detail, callback2) {
                        var top_spent_offer = offer_detail;
                        var generate_coupon = false;
                        if (
                          top_spent_offer.time !== undefined &&
                          top_spent_offer.time_zone !== undefined
                        ) {
                          generate_coupon = helpher.check_coupon_time(
                            top_spent_offer.start_date,
                            top_spent_offer.time,
                            top_spent_offer.time_zone,
                            top_spent_offer.offer_id
                          );
                        } else {
                          var curnttime = moment().unix();
                          generate_coupon = helpher.check_coupon_time(
                            curnttime,
                            "12:00",
                            "UTC",
                            top_spent_offer.offer_id
                          );
                        }
                        console.log("generateeeeeeeeeeeeeeeeeee couponnnnnnnnnnnnnnn" , generate_coupon)
                        if (generate_coupon) {
                          console.log(
                            saleAmountInsert + ">=" + top_spent_offer.min_to_earn
                          );
                          if (
                            top_spent_offer.min_to_earn !== undefined &&
                            saleAmountInsert >= top_spent_offer.min_to_earn
                          ) {
                            // generate coupon and send using preferred contact method
                            getCustomerDetails(top_spent_offer, customer_id).then(
                              function (Alldetails) {
                                var customerInfo = Alldetails.customerdetails;
                                var offersdet = Alldetails.offerdetails;
                                send_coupon_to_customers(
                                  offersdet,
                                  customer_id
                                ).then(
                                  function (resolve) {
                                    if (resolve.length > 0) {
                                      console.log("customer lengthhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh" , resolve);
                                      var phonenumber = customerInfo[0].phoneNumber.toString();
                                      console.log("phonenumberrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr" , phonenumber)
                                      var PuertoRico = helpher.PuertoRico(
                                        phonenumber
                                      );
                                      console.log("PuertoRicooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo" , PuertoRico)
                                      var message_content =
                                        textmessage.giveCouponWithShortUrl.english;
                                      if (PuertoRico) {
                                        message_content =
                                          textmessage.giveCouponWithShortUrl.spanish;
                                      }
                                      console.log("message_contenttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttt" , message_content);
                                      tapGenerateCoupon.GenerateCoupon({
                                          offer_id: top_spent_offer.id,
                                          offer_type: top_spent_offer.Discount_Type,
                                          merchant_id: merchant_id,
                                          customer_id: customerInfo[0].id,
                                          message: message_content,
                                          mediaUrl: top_spent_offer.reward_text_media_image,
                                          msgType: top_spent_offer.reward_text_message_type,
                                          spanishmediaUrl: top_spent_offer.spanish_reward_text_media_image,
                                          spanishmsgType: top_spent_offer.spanish_reward_text_message_type
                                        },
                                        function (error, response) {
                                          console.log("err , rerssssssssssssssssssssssssssss" , error ,response)
                                          if (error) {
                                            console.log('Offer not sent from Tap Generate.');
                                            callback2();
                                          } else {
                                            if (response.statusCode == 200) {
                                              callback2();
                                            } else {
                                              console.log("not sent");
                                              callback2();
                                            }
                                          }
                                        }
                                      );
                                    } else {
                                      console.log(
                                        "No customer condition matched if condi"
                                      );
                                      // if (totalOffer == index) {
                                      //   console.log(
                                      //     "Offers details1 : " +
                                      //     totalOffer +
                                      //     "  == " +
                                      //     index
                                      //   );
                                      //  return callback(null, responseMsg.RESPONSE200);
                                      // }
                                      callback2();
                                    }
                                  },
                                  function (reject) {
                                    console.log(reject);
                                  }
                                );
                              },
                              function (error) {
                                responseMsg.RESPONSE400.message = error;
                                console.log("7777777777777777777777777777777" , error);
                              }
                            );
                          } else {
                            console.log(
                              "sale Amount is less than min purchase amount."
                            );
                          }
                        } else {
                          // callback(null, responseMsg.RESPONSE400);
                          console.log('generate couponnnnnnnnnnnnnnnnnnnnn falseeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
                        }
                      }, function(err){
                        console.log('iterating donneeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee111111111111111111111111' , err)
                        responseMsg.RESPONSE200.message =
                        "Offer sent successfully.";
                        callback(null,responseMsg.RESPONSE200);
                      });
                    } catch (error) {
                      console.log('33333333333333333333333333333333333333333333333333333333333333333333333' ,error)
                      return callback(null, responseMsg.RESPONSE400);
                    }

                  } else {
                    responseMsg.RESPONSE400.message =
                      "offer not found against the merchant and customers.";
                    return callback(null, responseMsg.RESPONSE400);
                  }
                })
                .catch(function (err) {
                  responseMsg.RESPONSE400.message = err;
                  return callback(null, responseMsg.RESPONSE400);
                });
            },
            function (error) {
              responseMsg.RESPONSE400.message = "Not found.";
              return callback(null, responseMsg.RESPONSE400);
            }
          );
        },
        function (error) {
          responseMsg.RESPONSE400.message =
            "offer not found against the merchant.";
          return callback(null, responseMsg.RESPONSE400);
        }
      );
    } else {
      responseMsg.RESPONSE400.message = "Not found.";
      return callback(null, responseMsg.RESPONSE400);
    }
  }
};
/**
 * get customer detail
 * @param {*} top_spent_offer
 * @param {*} customer_id
 */
function getCustomerDetails(top_spent_offer, customer_id) {
  var dataforcustMerchant = {
    offerdetails: top_spent_offer,
    customerdetails: []
  };
  return new Promise(function (resolve, reject) {
    var today = Math.floor(Date.now() / 1000);

    model.tap_customers
      .findAll({
        where: {
          id: customer_id
        }
      })
      .then(function (rows) {
        var data = rows.map(function (rows) {
          return rows.toJSON();
        });
        if (data.length > 0) {
          dataforcustMerchant.customerdetails = data;
          resolve(dataforcustMerchant);
        } else {
          reject("no data found");
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * Get merchant id
 * @param {*} activeOfferId
 * @param {*} customerAvailbleOffers
 */
function getMerchantId(activeOfferId, customerAvailbleOffers) {
  return new Promise(function (resolve, reject) {
    var active = activeOfferId.numbers.offId;
    var sentCount = activeOfferId.numbers.sentCount;
    var availble = customerAvailbleOffers.offfer_id;
    var availbleCount = customerAvailbleOffers.offfer_count;
    var forActiveRemove = [];
    for (var i = 0; i < active.length; i++) {
      var index = availble.indexOf(active[i]);
      var activeindex = active.indexOf(active[i]);
      if (index > -1 && availbleCount[index] >= sentCount[activeindex]) {
        var indexs = active.indexOf(active[i]);
        if (indexs > -1) {
          forActiveRemove.push(indexs);
        }
      }
    }
    for (var i = forActiveRemove.length - 1; i >= 0; i--) {
      active.splice(forActiveRemove[i], 1);
    }
    resolve(active);
  });
}
/**
 * Get all available coupons
 * @param {*} customer_id
 * @param {*} merchant_id
 */
function getAvailableCoupons(customer_id, merchant_id) {
  return new Promise(function (resolve, reject) {
    var today = Math.floor(Date.now() / 1000);
    var sql =
      "SELECT c.* , count(offerid) as count_offer FROM tap_coupons c  WHERE c.offer_type = 3  AND customer_id = :customer_id AND merchant_id = :merchant_id AND (c.expires >= :today OR c.expires='0')  Group by offerid";
    var sqlParam = {
      customer_id: customer_id,
      merchant_id: merchant_id,
      today: today
    };
    const cusData = {
      offfer_id: [],
      offfer_count: []
    };
    model.sequelize
      .query(sql, {
        replacements: sqlParam,
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function (data) {
        for (var i = 0; i < data.length; i++) {
          cusData.offfer_id.push(data[i].offerid);
          cusData.offfer_count.push(data[i].count_offer);
        }
        resolve(cusData);
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * Get all active offer for merchant
 * @param {*} merchant_id
 */
function getAllActiveOffers(merchant_id) {
  return new Promise(function (resolve, reject) {
    var today = Math.floor(Date.now() / 1000);
    model.tap_merchant_offers
      .findAll({
        where: {
          MerchantId: merchant_id,
          Discount_Type: "3",
          active: "true",
          start_date: {
            $lte: today
          }
        }
      })
      .then(function (data) {
        var offer_detail = data.map(function (data) {
          return data.toJSON();
        });
        const merData = {
          numbers: {
            offId: [],
            sentCount: []
          }
        };
        if (offer_detail.length) {
          var generate_coupon = false;
          for (var i = 0; i < offer_detail.length; i++) {
            generate_coupon = helpher.check_coupon_time(
              offer_detail[i].start_date,
              offer_detail[i].time,
              offer_detail[i].time_zone,
              offer_detail[i].offer_id
            );

            if (generate_coupon) {
              merData.numbers.offId.push(offer_detail[i].id);
              merData.numbers.sentCount.push(offer_detail[i].sent_count);
            }
          }
          resolve(merData);
        } else {
          resolve(merData);
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
/**
 * send ccoupons to customer
 * @param {*} offer
 * @param {*} customer_id
 */
function send_coupon_to_customers(offer, customer_id) {
  var sql,
    sql_count = "";
  var sqlParam = {};
  var sql_countParam = {};
  return new Promise(function (resolve, reject) {
    if (offer.customer_name !== null && offer.customer_name !== "") {
      sql =
        "Select cm.customer_id,cm.customer_phone,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.customer_id =:customer_id AND cm.merchant_id=:MerchantId AND CONCAT(cm.firstName, ' ', cm.lastName) LIKE :customer_name";
      sqlParam = {
        customer_id: customer_id,
        MerchantId: offer.MerchantId,
        customer_name: "%" + offer.customer_name + "%"
      };
    } else if (
      offer.last_visited !== null &&
      offer.last_visited != 0 &&
      offer.last_visited !== ""
    ) {
      var predate = moment()
        .subtract(offer.last_visited, "days")
        .format("YYYY-MM-DD");

      var fdate = moment(predate).unix();
      console.log(fdate);
      sql =
        "Select customer_id,customer_phone,merchant_id from tap_customers_merchant Where optin='1' AND customer_id =:customer_id AND merchant_id=:MerchantId AND last_visit_at >=:last_visit_at";
      sqlParam = {
        customer_id: customer_id,
        MerchantId: offer.MerchantId,
        last_visit_at: fdate
      };
    } else if (
      offer.customer_type !== null &&
      offer.customer_type !== "normal" &&
      offer.customer_type !== ""
    ) {
      sql =
        "Select customer_id,customer_phone,merchant_id from tap_customers_merchant Where optin='1' AND customer_id =:customer_id AND merchant_id=:MerchantId AND type=:customer_type";
      sqlParam = {
        customer_id: customer_id,
        MerchantId: offer.MerchantId,
        customer_type: offer.customer_type
      };
    } else if (
      offer.randomly_customers_per !== null &&
      offer.randomly_customers_per !== "" &&
      offer.randomly_customers_per != 0
    ) {
      sql_count =
        "Select count(*) as total from tap_customers_merchant Where optin='1' AND customer_id =:customer_id AND merchant_id=:MerchantId";
      sql =
        "Select cm.customer_id,cm.customer_phone,cm.merchant_id from tap_customers_merchant as cm Where cm.optin='1' AND cm.customer_id =:customer_id AND cm.merchant_id=:MerchantId Order By RAND() Limit 10";
      sql_countParam = {
        customer_id: customer_id,
        MerchantId: offer.MerchantId
      };
      sqlParam = {
        customer_id: customer_id,
        MerchantId: offer.MerchantId
      };
    } else if (offer.zipcode !== null && offer.zipcode !== "") {
      sql =
        "Select cm.customer_id,cm.customer_phone,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.customer_id =:customer_id AND cm.merchant_id=:MerchantId AND cm.zip IN ('" +
        JSON.parse(offer.zipcode).join("','") +
        "')";
      sqlParam = {
        customer_id: customer_id,
        MerchantId: offer.MerchantId
      };
    } else if (
      offer.days_optin !== null &&
      offer.days_optin !== "" &&
      offer.days_optin != 0
    ) {
      sql =
        "Select customer_id,customer_phone,merchant_id from tap_customers_merchant Where optin='1' AND customer_id =:customer_id AND merchant_id=:MerchantId AND optin_at>=:optin_at";
      sqlParam = {
        customer_id: customer_id,
        MerchantId: offer.MerchantId,
        optin_at: offer.days_optin
      };
    } else if (
      offer.coupons_available !== null &&
      offer.coupons_available !== "" &&
      offer.coupons_available != 0
    ) {
      sql =
        "Select cm.customer_id,cm.merchant_id,cm.customer_phone,Count(cm.id) as total_coupon  from tap_customers_merchant as cm Inner Join  tap_coupons as c ON (cm.customer_id=c.customer_id AND cm.merchant_id=c.merchant_id)   LEFT JOIN tap_coupons_used as cu ON c.id=cu.coupon_id Where cu.coupon_id IS  NULL AND cm.merchant_id=:MerchantId AND cm.customer_id =:customer_id AND cm.optin='1'  Group BY cm.customer_id,cm.merchant_id";
      sqlParam = {
        customer_id: customer_id,
        MerchantId: offer.MerchantId
      };
      if (offer.coupons_available == "1") {
        sql += "  Having Count(cm.id)>=1 and Count(cm.id)<=5";
      } else if (offer.coupons_available == "2") {
        sql += "  Having Count(cm.id)>=6 and Count(cm.id)<=10";
      } else if (offer.coupons_available == "3") {
        sql += "  Having Count(cm.id)>10";
      }
    } else if (
      offer.amount_spent !== null &&
      offer.amount_spent !== "" &&
      offer.amount_spent != 0 &&
      offer.amount_spent_sign !== null &&
      offer.amount_spent_sign !== ""
    ) {
      sql =
        "Select cm.customer_id,cm.customer_phone,cm.merchant_id,sum(co.saleAmount) as total_spent from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where cm.customer_id =:customer_id AND cm.merchant_id=:MerchantId group by customer_id,merchant_id";
      sqlParam = {
        customer_id: customer_id,
        MerchantId: offer.MerchantId
      };
      if (offer.amount_spent_sign == "less") {
        sql += "  Having sum(co.saleAmount)<:saleAmount";
        sqlParam.saleAmount = offer.amount_spent;
      } else if (offer.amount_spent_sign == "greater") {
        sql += "  Having sum(co.saleAmount)>:saleAmount";
        sqlParam.saleAmount = offer.amount_spent;
      } else if (offer.amount_spent_sign == "equal") {
        sql += "  Having sum(co.saleAmount)=:saleAmount";
        sqlParam.saleAmount = offer.amount_spent;
      }
    } else if (
      offer.bd_start_date !== null &&
      offer.bd_start_date !== "" &&
      offer.bd_start_date != 0 &&
      offer.bd_end_date !== null &&
      offer.bd_end_date !== "" &&
      offer.bd_end_date != 0
    ) {
      sql =
        "Select cm.customer_id,cm.merchant_id,cm.customer_phone from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where co.created_at>=:bd_start_date AND co.created_at<=:bd_start_date AND cm.customer_id =:customer_id AND cm.merchant_id=:MerchantId AND cm.optin='1' group by co.customer_id,co.merchant_id";
      sqlParam = {
        customer_id: customer_id,
        MerchantId: offer.MerchantId,
        bd_start_date: offer.bd_start_date
      };
    } else if (
      offer.unfinished_profile !== null &&
      offer.unfinished_profile == 1
    ) {
      sql =
        "Select cm.customer_id,cm.customer_phone,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.customer_id =:customer_id AND cm.merchant_id=:MerchantId AND cm.profile_completed='0' group by cm.customer_id,cm.merchant_id";
      sqlParam = {
        customer_id: customer_id,
        MerchantId: offer.MerchantId
      };
    }
    if (sql_count !== "") {
      console.log("count sms : " + sql_count);
      //for percentage of customers
      model.sequelize
        .query(sql_count, {
          replacements: sql_countParam,
          type: model.sequelize.QueryTypes.SELECT
        })
        .then(function (rows) {
          console.log(rows);
          if (rows.length > 0) {
            var total = rows[0].total;
            var limit = Math.floor(
              (total / 100) * offer.randomly_customers_per
            );
            limit = limit == 0 ? 1 : limit;
            sql =
              "Select cm.customer_id,cm.customer_phone,cm.merchant_id from tap_customers_merchant as cm Where cm.optin='1' AND cm.customer_id =:customer_id AND cm.merchant_id=:MerchantId Order By RAND() Limit " +
              limit;
            sqlParam = {
              customer_id: customer_id,
              MerchantId: offer.MerchantId
            };
            console.log(sql);
            model.sequelize
              .query(sql, {
                replacements: sqlParam,
                type: model.sequelize.QueryTypes.SELECT
              })
              .then(function (customers) {
                resolve(customers);
              })
              .catch(function (err) {
                reject(err);
              });
          } else {
            resolve(false);
          }
        })
        .catch(function (err) {
          reject(err);
        });
    } else {
      console.log(sql);
      model.sequelize
        .query(sql, {
          replacements: sqlParam,
          type: model.sequelize.QueryTypes.SELECT
        })
        .then(function (customers) {
          resolve(customers);
        })
        .catch(function (err) {
          reject(err);
        });
    }
  });
}
/**
 * get timestamp for days
 * @param {*} days
 */
function gettimestampForDays(days) {
  days = parseInt(days);
  var d = new Date();
  if (Number.isInteger(days)) {
    d.setDate(d.getDate() - days);
  } else {
    d.setDate(d.getDate() - 5);
  }
  return Math.floor(d.getTime() / 1000);
}