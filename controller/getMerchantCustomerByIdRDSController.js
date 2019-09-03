"use strict";
var model = require("../model");
var config = require("../config/config");
const moment_time = require("moment-timezone");
const moment = require("moment");
var helpher = require("../controller/common/helper");
const async = require("async");
var _ = require("underscore");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));
var dont_show_in_wallet = [4, 5];

module.exports = {
  getMerchantCustomerByIdRDS: function(req, callback) {
    responseMsg.RESPONSE200.invokeData = {};
    var MID = req.id;
    var customer_id = req.customerId;
    var dec_customer_id = customer_id;
    var expand = req.expand ? req.expand : "";
    var byPhone = req.byPhone ? req.byPhone : "";
    var expandPunches = req.expandPunches ? req.expandPunches : "";
    var expandAvailableCoupons = req.expandAvailableCoupons
      ? req.expandAvailableCoupons
      : "";
    if (!customer_id && !MID) {
      responseMsg.RESPONSE400.message = "Missing mandatory fields.";
      callback(null, JSON.stringify(responseMsg.RESPONSE400));
    }

    var sql =
      "SELECT * FROM tap_customers_merchant WHERE merchant_id=:merchant_id";
    var customer_merchant_data_params = {
      merchant_id: MID
    };
    if (byPhone == "true") {
      sql += " AND customer_phone=:customer_phone";
      customer_merchant_data_params.customer_phone = customer_id;
    } else {
      sql += " AND customer_id=:customer_id";
      customer_merchant_data_params.customer_id = customer_id;
    }
    model.sequelize
      .query(sql, {
        replacements: customer_merchant_data_params,
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(
        function(customer_merchant_data) {
          if (customer_merchant_data.length > 0) {
            var sql = "SELECT * FROM tap_customers WHERE ";
            var tap_customers_params = {};
            if (byPhone == "true") {
              sql += "phoneNumber=:phoneNumber";
              tap_customers_params.phoneNumber = customer_id;
            } else {
              sql += "id=:id";
              tap_customers_params.id = customer_id;
            }
            model.sequelize
              .query(sql, {
                replacements: tap_customers_params,
                type: model.sequelize.QueryTypes.SELECT
              })
              .then(
                function(data) {
                  if (data.length > 0) {
                    if (parseInt(data[0].optin) === 0) {
                      data[0].tos_url =
                        "https://z3263aap1d.execute-api.us-west-2.amazonaws.com/prod/customers/" +
                        dec_customer_id +
                        "/tos";
                    }
                    if (expandPunches == "true") {
                      getPunches(data[0].id, MID).then(
                        function(punchinfo) {
                          responseMsg.RESPONSE200["customerProfile"] = data[0];
                          if (customer_merchant_data.length > 0) {
                            responseMsg.RESPONSE200["customerProfile"][
                              "merchants"
                            ] = customer_merchant_data[0];
                            console.log(
                              "getPunches.............. : ",
                              customer_merchant_data[0]
                            );
                          }
                          //  return callback(null,punchinfo);
                          if (punchinfo.punches !== undefined) {
                            responseMsg.RESPONSE200["punches"] =
                              punchinfo.punches;
                          } else {
                            responseMsg.RESPONSE200["punches"] = 0;
                          }

                          if (punchinfo.punchinfo !== undefined) {
                            responseMsg.RESPONSE200["punchinfo"] =
                              punchinfo.punchinfo;
                          }
                          if (expandAvailableCoupons == "true") {
                            //Get Merchant Offers
                            getMerchantCoupons(
                              MID,
                              data[0].id,
                              customer_merchant_data[0].type
                            ).then(
                              function(merchant_offer) {
                                responseMsg.RESPONSE200[
                                  "MerchantOffers"
                                ] = merchant_offer;
                                getAvailableCouponsCount(data[0].id, MID).then(
                                  function(couponCount) {
                                    console.log(couponCount);
                                    if (merchant_offer.length == 0) {
                                      responseMsg.RESPONSE200[
                                        "MerchantOffers"
                                      ] = merchant_offer;
                                    }

                                    async.forEachOfSeries(merchant_offer, function (offer, i, callback) {
                                      if (
                                        offer.Discount_Type === 3
                                      ) {
                                        var merData = offer;
                                        send_coupon_to_customers(
                                          merData,
                                          data[0].id,
                                          offer
                                        ).then(function(merchant_customer) {
                                          merchantCouponactivityrecordbycutsomer(
                                            merchant_offer,
                                            merchant_customer.merStatus,
                                            merchant_customer.merchatfulldetails
                                          ).then(function(finalmerchant_offer) {
                                            var filtered = _.where(
                                              couponCount,
                                              {
                                                offerid:
                                                  merchant_customer
                                                    .merchatfulldetails.id
                                              }
                                            );
                                            if (filtered.length > 0) {
                                              if (
                                                filtered[0].count_offer >=
                                                merchant_customer
                                                  .merchatfulldetails.sent_count
                                              ) {
                                                finalmerchant_offer = _.without(
                                                  finalmerchant_offer,
                                                  _.findWhere(
                                                    finalmerchant_offer,
                                                    {
                                                      id:
                                                        merchant_customer
                                                          .merchatfulldetails.id
                                                    }
                                                  )
                                                );
                                              }
                                            }
                                            merchant_offer = finalmerchant_offer;
                                            callback();
                                          });
                                        });
                                      } else {
                                        callback();
                                      }
                                    }, (error) => {
                                      if (error) {
                                        console.log(error);
                                      }
                                      responseMsg.RESPONSE200[
                                        "MerchantOffers"
                                      ] = merchant_offer;
                                      console.log("custom offer check done-------------------------------------");
                                      // New Changes for perform async operation
                                      getAvailableCoupons(data[0].id, MID).then(
                                        function(coupon_items) {
                                          if (coupon_items.length > 0) {
                                            responseMsg.RESPONSE200[
                                              "availableCoupons"
                                            ] = coupon_items;
                                          } else {
                                            responseMsg.RESPONSE200[
                                              "availableCoupons"
                                            ] = [];
                                          }
                                          if (byPhone == "true") {
                                            updateCustomer(
                                              data[0].phoneNumber,
                                              true
                                            ).then(
                                              function(customer_info) {
                                                responseMsg.RESPONSE200[
                                                  "customerProfile"
                                                ]["couponsHold"] = true;
                                                //get available coupon info
                                                if (coupon_items.length > 0) {
                                                  var getCouponInfo = function(
                                                    index
                                                  ) {
                                                    if (
                                                      index >= coupon_items.length
                                                    ) {
                                                      responseMsg.RESPONSE200[
                                                        "availableCoupons"
                                                      ] = coupon_items;
                                                      callback(
                                                        null,
                                                        responseMsg.RESPONSE200
                                                      );
                                                    } else {
                                                      if (
                                                        coupon_items[index]
                                                          .offerid !== undefined
                                                      ) {
                                                        new GetCouponInfo(
                                                          coupon_items[
                                                            index
                                                          ].offerid
                                                        ).then(
                                                          function(coupon_info) {
                                                            coupon_items[index][
                                                              "coupon_info"
                                                            ] = coupon_info;
                                                            getCouponInfo(
                                                              index + 1
                                                            );
                                                          },
                                                          function(error) {
                                                            //console.log("error" + error);
                                                            coupon_items[index][
                                                              "coupon_info"
                                                            ] = {};
                                                            getCouponInfo(
                                                              index + 1
                                                            );
                                                          }
                                                        );
                                                      } else {
                                                        //console.log("undefined");
                                                        coupon_items[index][
                                                          "coupon_info"
                                                        ] = {};
                                                        getCouponInfo(index + 1);
                                                      }
                                                      coupon_items[
                                                        index
                                                      ].coupon_id =
                                                        coupon_items[index].id;
                                                    }
                                                  };
                                                  getCouponInfo(0);
                                                } else {
                                                  callback(
                                                    null,
                                                    responseMsg.RESPONSE200
                                                  );
                                                }
                                              },
                                              function(error) {
                                                console.log(
                                                  ".......................................................................................................................12"
                                                );
                                                responseMsg.RESPONSE400.message = error;
                                                callback(
                                                  null,
                                                  JSON.stringify(
                                                    responseMsg.RESPONSE400
                                                  )
                                                );
                                              }
                                            );
                                          } else {
                                            //available coupons
                                            //get coupon info
                                            if (coupon_items.length > 0) {
                                              var getCouponInfo = function(
                                                index
                                              ) {
                                                if (
                                                  index >= coupon_items.length
                                                ) {
                                                  responseMsg.RESPONSE200[
                                                    "availableCoupons"
                                                  ] = coupon_items;
                                                  callback(
                                                    null,
                                                    responseMsg.RESPONSE200
                                                  );
                                                } else {
                                                  if (
                                                    coupon_items[index]
                                                      .offerid !== undefined
                                                  ) {
                                                    new GetCouponInfo(
                                                      coupon_items[index].offerid
                                                    ).then(
                                                      function(coupon_info) {
                                                        coupon_items[index][
                                                          "coupon_info"
                                                        ] = coupon_info;
                                                        getCouponInfo(index + 1);
                                                      },
                                                      function(error) {
                                                        coupon_items[index][
                                                          "coupon_info"
                                                        ] = {};
                                                        getCouponInfo(index + 1);
                                                      }
                                                    );
                                                  } else {
                                                    coupon_items[index][
                                                      "coupon_info"
                                                    ] = {};
                                                    getCouponInfo(index + 1);
                                                  }
                                                  coupon_items[index].coupon_id =
                                                    coupon_items[index].id;
                                                }
                                              };
                                              getCouponInfo(0);
                                            } else {
                                              callback(
                                                null,
                                                responseMsg.RESPONSE200
                                              );
                                            }
                                          }
                                        },
                                        function(reject) {
                                          console.log(
                                            ".......................................................................................................................13"
                                          );
                                          responseMsg.RESPONSE400.message = reject;
                                          callback(
                                            null,
                                            JSON.stringify(
                                              responseMsg.RESPONSE400
                                            )
                                          );
                                        }
                                      );
                                    });
                                  
                                  }
                                );
                                responseMsg.RESPONSE400[
                                  "MerchantOffers"
                                ] = merchant_offer;
                              },
                              function(reject) {
                                console.log(
                                  ".......................................................................................................................2"
                                );
                                responseMsg.RESPONSE400.message = reject;
                                callback(
                                  null,
                                  JSON.stringify(responseMsg.RESPONSE400)
                                );
                              }
                            );
                          } else {
                            callback(null, responseMsg.RESPONSE200);
                          }
                        },
                        function(reject) {
                          console.log(
                            ".......................................................................................................................3"
                          );
                          responseMsg.RESPONSE400.message = reject;
                          callback(
                            null,
                            JSON.stringify(responseMsg.RESPONSE400)
                          );
                        }
                      );
                    } else if (expand == "punchcard") {
                      responseMsg.RESPONSE200.invokeData = [];
                      var sql =
                        "SELECT * FROM tap_customer_punchcards WHERE merchant_id=:merchant_id AND customer_id=:customer_id";
                      model.sequelize
                        .query(sql, {
                          replacements: {
                            customer_id: data[0].id,
                            merchant_id: MID
                          },
                          type: model.sequelize.QueryTypes.SELECT
                        })
                        .then(function(punchdata) {
                          if (punchdata.length > 0) {
                            responseMsg.RESPONSE200.invokeData = data;
                            if (customer_merchant_data.length > 0) {
                              responseMsg.RESPONSE200.invokeData[0][
                                "merchants"
                              ] = customer_merchant_data[0];
                            }
                            responseMsg.RESPONSE200.invokeData[0]["punchinfo"] =
                              punchdata[0];
                            callback(null, responseMsg.RESPONSE200);
                          } else {
                            responseMsg.RESPONSE200.invokeData = data;
                            callback(null, responseMsg.RESPONSE200);
                          }
                        })
                        .catch(function(puncherror) {
                          console.log(
                            ".......................................................................................................................4"
                          );
                          responseMsg.RESPONSE400.message = puncherror.message;
                          callback(
                            null,
                            JSON.stringify(responseMsg.RESPONSE400)
                          );
                        });
                    } else if (
                      expand == "coupons" ||
                      expandAvailableCoupons == "true"
                    ) {
                      responseMsg.RESPONSE200.invokeData = [];
                      var today = Math.floor(Date.now() / 1000);
                      var sql =
                        "SELECT c.* FROM tap_coupons c LEFT JOIN tap_coupons_used cu ON c.id=cu.coupon_id WHERE cu.id IS NULL AND customer_id=:customer_id AND merchant_id=:merchant_id AND (c.expires>=:today OR c.expires='0')";
                      model.sequelize
                        .query(sql, {
                          replacements: {
                            customer_id: data[0].id,
                            merchant_id: MID,
                            today: today
                          },
                          type: model.sequelize.QueryTypes.SELECT
                        })
                        .then(function(coupondata) {
                          if (coupondata.length > 0) {
                            responseMsg.RESPONSE200.invokeData = data;
                            if (customer_merchant_data.length > 0) {
                              responseMsg.RESPONSE200.invokeData[0][
                                "merchants"
                              ] = customer_merchant_data[0];
                            }
                            responseMsg.RESPONSE200.invokeData[0][
                              "coupons"
                            ] = coupondata;
                            callback(null, responseMsg.RESPONSE200);
                          } else {
                            responseMsg.RESPONSE200.invokeData = data;
                            responseMsg.RESPONSE200.invokeData[0][
                              "coupons"
                            ] = [];
                            callback(null, responseMsg.RESPONSE200);
                          }
                        })
                        .catch(function(couponerror) {
                          console.log(
                            ".......................................................................................................................5"
                          );
                          responseMsg.RESPONSE400.message = couponerror.message;
                          callback(
                            null,
                            JSON.stringify(responseMsg.RESPONSE400)
                          );
                        });
                    } else {
                      delete responseMsg.RESPONSE200["availableCoupons"];
                      delete responseMsg.RESPONSE200["customerProfile"];
                      delete responseMsg.RESPONSE200["punches"];
                      responseMsg.RESPONSE200.invokeData = [];
                      responseMsg.RESPONSE200.invokeData = data;
                      if (customer_merchant_data.length > 0) {
                        responseMsg.RESPONSE200.invokeData[0]["merchants"] =
                          customer_merchant_data[0];
                      }
                      callback(null, responseMsg.RESPONSE200);
                    }
                  } else {
                    console.log(
                      ".......................................................................................................................15"
                    );
                    responseMsg.RESPONSE400.message =
                      "Sorry! Record not found.";
                    callback(null, responseMsg.RESPONSE400);
                  }
                },
                function(err) {
                  console.log(
                    ".......................................................................................................................6"
                  );
                  responseMsg.RESPONSE400.message = err;
                  callback(JSON.stringify(responseMsg.RESPONSE400));
                }
              );
          } else {
            console.log(
              ".......................................................................................................................17"
            );
            responseMsg.RESPONSE400.message = "Sorry! Record not found.";
            callback(null, responseMsg.RESPONSE400);
          }
        },
        function(err) {
          console.log(
            ".......................................................................................................................7"
          );
          responseMsg.RESPONSE400.message = err.message;
          callback(null, JSON.stringify(responseMsg.RESPONSE400));
        }
      );
  }
};
/**
 * get merchant coupons activity records by customer
 * @param {*} merchant_offer
 * @param {*} merchant_customer
 * @param {*} merData
 */
function merchantCouponactivityrecordbycutsomer(
  merchant_offer,
  merchant_customer,
  merData
) {
  return new Promise(function(resolve, reject) {
    if (!merchant_customer) {
      merchant_offer = _.without(
        merchant_offer,
        _.findWhere(merchant_offer, {
          id: merData.id
        })
      );
      resolve(merchant_offer);
    } else {
      resolve(merchant_offer);
    }
  });
}
/**
 * Get random string
 * @param {*} length
 */
function randomString(length) {
  var result = "";
  var chars = "0123456789";
  for (var i = length; i > 0; --i)
    result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}
/**
 * Get punches for customer
 * @param {*} customer_id
 * @param {*} merchant_id
 */
function getPunches(customer_id, merchant_id) {
  return new Promise(function(resolve, reject) {
    var sql =
      "SELECT punches FROM tap_customer_punchcards WHERE customer_id=:customer_id AND merchant_id=:merchant_id";
    model.sequelize
      .query(sql, {
        replacements: {
          customer_id: customer_id,
          merchant_id: merchant_id
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function(punch_count) {
        var today = Math.floor(Date.now() / 1000);
        var sql =
          "SELECT * FROM tap_merchant_offers WHERE MerchantId=:merchant_id AND Discount_Type IN('10', '11', '12') AND (active = 'true')";
        model.sequelize
          .query(sql, {
            replacements: {
              merchant_id: merchant_id
            },
            type: model.sequelize.QueryTypes.SELECT
          })
          .then(function(data) {
            var result = {
              Item: {}
            };
            console.log(
              "Punch Data.....................................",
              JSON.stringify(data)
            );
            if (data[0] != null) {
              result.Item["punchinfo"] = {
                count: data.length,
                data: [data[0]]
              };
            } else {
              result.Item["punchinfo"] = {
                count: data.length,
                data: []
              };
            }
            if (punch_count[0] !== undefined) {
              result.Item["punches"] =
                punch_count[0].punches !== undefined
                  ? punch_count[0].punches
                  : 0;
            } else {
              result.Item["punches"] = 0;
            }
            resolve(result.Item);
          })
          .catch(function(err) {
            reject(err);
          });
      })
      .catch(function(err) {
        reject(err);
      });
  });
}
/**
 * Get available coupons count
 * @param {*} customer_id
 * @param {*} merchant_id
 */
function getAvailableCouponsCount(customer_id, merchant_id) {
  var today = Math.floor(Date.now() / 1000);
  return new Promise(function(resolve, reject) {
    var sql =
      "SELECT c.* , count(offerid) as count_offer FROM tap_coupons c WHERE c.offer_type = 3 AND customer_id= :customer_id AND merchant_id=:merchant_id AND (c.expires>=1524054447 OR c.expires='0')  Group by offerid";
    model.sequelize
      .query(sql, {
        replacements: {
          customer_id: customer_id,
          merchant_id: merchant_id
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function(data) {
        resolve(data);
      })
      .catch(function(err) {
        reject(err);
      });
  });
}
/**
 * Get available coupons
 * @param {*} customer_id
 * @param {*} merchant_id
 */
function getAvailableCoupons(customer_id, merchant_id) {
  var today = Math.floor(Date.now() / 1000);
  return new Promise(function(resolve, reject) {
    var sql =
      "SELECT * FROM tap_coupons WHERE id NOT IN (SELECT coupon_id FROM tap_coupons_used WHERE used_by = :customer_id) AND customer_id = :customer_id AND merchant_id=:merchant_id AND (expires>=:today OR expires='0')";
    model.sequelize
      .query(sql, {
        replacements: {
          customer_id: customer_id,
          merchant_id: merchant_id,
          today: today
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function(data) {
        resolve(data);
      })
      .catch(function(err) {
        reject(err);
      });
  });
}
/**
 * Get merchant coupons
 * @param {*} Mid
 * @param {*} customer_id
 * @param {*} cust_type
 */
function getMerchantCoupons(Mid, customer_id, cust_type) {
  console.log("cust_type=====" + cust_type);
  var today = Math.floor(Date.now() / 1000);
  return new Promise(function(resolve, reject) {
    var skip_offers = [0, 4, 1, 2, 14];
    //var skip_offers = [4];
    var skip_offers_sql =
      "SELECT DISTINCT(offer_type) as offerid FROM tap_coupons WHERE customer_id=:customer_id AND merchant_id=:merchant_id AND offer_type IN(" +
      dont_show_in_wallet.join() +
      ");";
    console.log(skip_offers_sql);
    model.sequelize
      .query(skip_offers_sql, {
        replacements: {
          customer_id: customer_id,
          merchant_id: Mid
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function(offers) {
        if (offers.length > 0) {
          for (var i = 0; i < offers.length; i++) {
            skip_offers.push(offers[i].offerid);
          }
        }
        console.log("remove offer....");
        console.log("remove offer....");
        if (cust_type == "casual") {
          skip_offers.push(7);
        } else if (cust_type == "regular") {
          skip_offers.push(7, 8);
        } else if (cust_type == "vip") {
          skip_offers.push(7, 8, 9);
        }

        geetingID(Mid).then(function(merOfferId) {
          var sql =
            "SELECT id,Data,Discount_Percentage,Discount_Type,MerchantId,Min_Purchase,active,created_at,deactivated_at,description,discount_name,global_owner_id,min_to_earn,start_date,end_date,terms,discount_unit,expires,reward_text,spanish_reward_text,before_profile_complete_reward_text,before_profile_complete_spanish_reward_text,background_color,body_color,button_color,Referrer_Discount_Amount,coupon_image,background_image,title_color,description_color,terms_color,time_zone,time,send_date,zipcode,last_visited,customer_type,randomly_customers_per,coupons_available,unfinished_profile,customer_name,days_optin,last_purchase,amount_spent,amount_spent_sign,amount_spent_end,bd_start_date,bd_end_date,as_start_date,as_end_date,spending_period,is_sent,is_recurring,sent_count,coupon_header FROM tap_merchant_offers WHERE MerchantId=:MerchantId AND (active = 'true') and start_date<=:today";
          var sqlParams = {
            MerchantId: Mid,
            today: today
          };
          if (skip_offers.length > 0) {
            sql += " AND Discount_Type NOT IN(" + skip_offers.join() + ")";
          }
          if (merOfferId.length > 0) {
            sql += " AND id NOT IN(" + merOfferId + ")";
          }
          console.log("NEW DOing Query " + sql);
          model.sequelize
            .query(sql, {
              replacements: sqlParams,
              type: model.sequelize.QueryTypes.SELECT
            })
            .then(function(data) {
              resolve(data);
            })
            .catch(function(err) {
              reject(err);
            });
        });
      })
      .catch(function(err) {
        var sql =
          "SELECT id,Data,Discount_Percentage,Discount_Type,MerchantId,Min_Purchase,active,created_at,deactivated_at,description,discount_name,global_owner_id,min_to_earn,start_date,end_date,terms,discount_unit,expires,reward_text,spanish_reward_text,before_profile_complete_reward_text,before_profile_complete_spanish_reward_text,background_color,body_color,button_color,Referrer_Discount_Amount,coupon_image,background_image,title_color,description_color,terms_color,time_zone,time,send_date,zipcode,last_visited,customer_type,randomly_customers_per,coupons_available,unfinished_profile,customer_name,days_optin,last_purchase,amount_spent,amount_spent_sign,amount_spent_end,bd_start_date,bd_end_date,as_start_date,as_end_date,spending_period,is_sent,is_recurring,sent_count,coupon_header FROM tap_merchant_offers WHERE MerchantId=:merchant_id AND (active = 'true')";
        //console.log(sql);
        model.sequelize
          .query(sql, {
            replacements: {
              merchant_id: Mid
            },
            type: model.sequelize.QueryTypes.SELECT
          })
          .then(function(data) {
            resolve(data);
          })
          .catch(function(err) {
            reject(err);
          });
      });
  });
}
/**
 * Select merchant offers
 * @param {*} merchant_id
 */
function selectMerchantoffers(merchant_id) {
  //console.log("select merchant...");
  var today = Math.floor(Date.now() / 1000);
  var Mid = merchant_id;
  return new Promise(function(resolve, reject) {
    var sql =
      "SELECT id,time_zone, time, start_date  FROM tap_merchant_offers WHERE  MerchantId=:merchant_id AND (active = 'true') and start_date<=:today";
    model.sequelize
      .query(sql, {
        replacements: {
          merchant_id: Mid,
          today: today
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function(rows) {
        if (rows.length > 0) {
          resolve(rows);
        } else {
          resolve("no_records");
        }
      })
      .catch(function(err) {
        resolve("no_records");
      });
  });
}
/**
 * get offer ids
 * @param {*} merchant_id
 */
function geetingID(merchant_id) {
  return new Promise(function(resolve, reject) {
    selectMerchantoffers(merchant_id).then(
      function(allMerchantOffers) {
        var count_length = allMerchantOffers.length;
        var count = 0;
        var nonActiveOffer = [];
        if (allMerchantOffers == "no_records") {
          resolve(nonActiveOffer);
        } else {
          async.eachLimit(
            allMerchantOffers,
            allMerchantOffers.length,
            function(allMerchantOffers, recallback) {
              count++;
              if (
                allMerchantOffers.time_zone != null &&
                allMerchantOffers.time != null
              ) {
                var timeIsreached = helpher.check_coupon_time(
                  allMerchantOffers.start_date,
                  allMerchantOffers.time,
                  allMerchantOffers.time_zone,
                  allMerchantOffers.id
                );
                if (timeIsreached == true) {
                  console.log("dont_create array");
                } else {
                  nonActiveOffer.push(allMerchantOffers.id);
                }
              }
              if (count_length == count) {
                resolve(nonActiveOffer);
              }
            },
            function(err, data) {
              if (err) {
                console.log(err);
              }
            }
          );
        }
      },
      function(error) {
        console.log(error);
      }
    );
  });
}
/**
 * Update customer
 * @param {*} phone
 * @param {*} couponsHold
 */
function updateCustomer(phone, couponsHold) {
  return new Promise(function(resolve, reject) {
    var sql =
      "UPDATE tap_customers SET couponsHold=:couponsHold WHERE phoneNumber=:phoneNumber";
    model.sequelize
      .query(sql, {
        replacements: {
          couponsHold: couponsHold,
          phoneNumber: phone
        },
        type: model.sequelize.QueryTypes.UPDATE
      })
      .then(function(result) {
        var sql = "SELECT * FROM tap_customers WHERE phoneNumber=:phoneNumber";
        model.sequelize
          .query(sql, {
            replacements: {
              phoneNumber: phone
            },
            type: model.sequelize.QueryTypes.SELECT
          })
          .then(function(result) {
            resolve(result[0]);
          })
          .catch(function(err) {
            reject(err);
          });
      })
      .catch(function(err) {
        reject(err);
      });
  });
}
/**
 * Get coupon info
 * @param {*} id
 */
function GetCouponInfo(id) {
  return new Promise(function(resolve, reject) {
    var sql =
      "SELECT id,Data,Discount_Percentage,Discount_Type,MerchantId,Min_Purchase,active,created_at,deactivated_at,description,discount_name,global_owner_id,min_to_earn,start_date,end_date,terms,discount_unit,expires,reward_text,spanish_reward_text,before_profile_complete_reward_text,before_profile_complete_spanish_reward_text,background_color,body_color,button_color,Referrer_Discount_Amount,coupon_image,background_image,title_color,description_color,terms_color,time_zone,time,send_date,zipcode,last_visited,customer_type,randomly_customers_per,coupons_available,unfinished_profile,customer_name,days_optin,last_purchase,amount_spent,amount_spent_sign,amount_spent_end,bd_start_date,bd_end_date,as_start_date,as_end_date,spending_period,is_sent,is_recurring,sent_count,coupon_header from tap_merchant_offers WHERE id=:id";
    model.sequelize
      .query(sql, {
        replacements: {
          id: id
        },
        type: model.sequelize.QueryTypes.SELECT
      })
      .then(function(data) {
        if (data.length > 0) {
          resolve(data[0]);
        } else {
          reject("No record found.");
        }
      })
      .catch(function(err) {
        reject(err);
      });
  });
}
/**
 * Send coupon to customer
 * @param {*} offer
 * @param {*} customer_id
 * @param {*} merdetails
 */
function send_coupon_to_customers(offer, customer_id, merdetails) {
  var merDataStatus = {
    merStatus: false,
    merchatfulldetails: merdetails
  };

  var sql,
    sql_count = "";
  var sql_countParams = {};
  var sqlParams = {};
  return new Promise(function(resolve, reject) {
    if (offer.customer_name !== null && offer.customer_name !== "") {
      sql =
        "Select cm.customer_id,cm.customer_phone,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.customer_id =:customer_id AND cm.merchant_id=:merchant_id AND CONCAT(cm.firstName, ' ', cm.lastName) LIKE :concat";
      sqlParams.customer_id = customer_id;
      sqlParams.merchant_id = offer.MerchantId;
      sqlParams.concat = "%" + offer.customer_name + "%";
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
      // console.log(moment().subtract(offer.last_visited, "days").format("DD-MM-YYYY"));
      sql =
        "Select customer_id,customer_phone,merchant_id from tap_customers_merchant Where optin='1' AND customer_id =:customer_id AND merchant_id=:merchant_id AND last_visit_at >=:fdate";
      //  console.log('visited log=>'+offer.last_visited+'----' + predate);
      console.log(sql);
      sqlParams.customer_id = customer_id;
      sqlParams.merchant_id = offer.MerchantId;
      sqlParams.fdate = fdate;
    } else if (
      offer.customer_type !== null &&
      offer.customer_type !== "normal" &&
      offer.customer_type !== ""
    ) {
      sql =
        "Select customer_id,customer_phone,merchant_id from tap_customers_merchant Where optin='1' AND customer_id =:customer_id AND merchant_id=:merchant_id AND type=:customer_type";
      sqlParams.customer_id = customer_id;
      sqlParams.merchant_id = offer.MerchantId;
      sqlParams.customer_type = offer.customer_type;
    } else if (
      offer.randomly_customers_per !== null &&
      offer.randomly_customers_per !== "" &&
      offer.randomly_customers_per != 0
    ) {
      sql_count =
        "Select count(*) as total from tap_customers_merchant Where optin='1' AND customer_id =:customer_id AND merchant_id=:merchant_id";
      //limit=parseInt(ceil(((count/100)*offer.randomly_customers_per)))
      sql =
        "Select cm.customer_id,cm.customer_phone,cm.merchant_id from tap_customers_merchant as cm Where cm.optin='1' AND cm.customer_id =:customer_id AND cm.merchant_id=:merchant_id Order By RAND() Limit 10";
      sql_countParams.customer_id = customer_id;
      sql_countParams.merchant_id = offer.MerchantId;
      sqlParams.customer_id = customer_id;
      sqlParams.merchant_id = offer.MerchantId;
    } else if (offer.zipcode !== null && offer.zipcode !== "") {
      sql =
        "Select cm.customer_id,cm.customer_phone,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.customer_id =:customer_id AND cm.merchant_id=:merchant_id AND cm.zip IN ('" +
        JSON.parse(offer.zipcode).join("','") +
        "')";
      sqlParams.customer_id = customer_id;
      sqlParams.merchant_id = offer.MerchantId;
    } else if (
      offer.days_optin !== null &&
      offer.days_optin !== "" &&
      offer.days_optin != 0
    ) {
      sql =
        "Select customer_id,customer_phone,merchant_id from tap_customers_merchant Where optin='1' AND customer_id =:customer_id AND merchant_id=:merchant_id AND optin_at>=:days_optin";
      sqlParams.customer_id = customer_id;
      sqlParams.merchant_id = offer.MerchantId;
      sqlParams.days_optin = offer.days_optin;
    } else if (
      offer.coupons_available !== null &&
      offer.coupons_available !== "" &&
      offer.coupons_available != 0
    ) {
      sql =
        "Select cm.customer_id,cm.merchant_id,cm.customer_phone,Count(cm.id) as total_coupon  from tap_customers_merchant as cm Inner Join  tap_coupons as c ON (cm.customer_id=c.customer_id AND cm.merchant_id=c.merchant_id)   LEFT JOIN tap_coupons_used as cu ON c.id=cu.coupon_id Where cu.coupon_id IS  NULL AND cm.merchant_id=:merchant_id AND cm.customer_id =:customer_id AND cm.optin='1'  Group BY cm.customer_id,cm.merchant_id";
      sqlParams.customer_id = customer_id;
      sqlParams.merchant_id = offer.MerchantId;
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
        "Select cm.customer_id,cm.customer_phone,cm.merchant_id,sum(co.saleAmount) as total_spent from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where cm.customer_id =:customer_id AND cm.merchant_id=:merchant_id group by customer_id,merchant_id";
      sqlParams.customer_id = customer_id;
      sqlParams.merchant_id = offer.MerchantId;
      if (offer.amount_spent_sign == "less") {
        sql += "  Having sum(co.saleAmount)<:amount_spent";
        sqlParams.amount_spent = offer.amount_spent;
      } else if (offer.amount_spent_sign == "greater") {
        sql += "  Having sum(co.saleAmount)>:amount_spent";
        sqlParams.amount_spent = offer.amount_spent;
      } else if (offer.amount_spent_sign == "equal") {
        sql += "  Having sum(co.saleAmount)=:amount_spent";
        sqlParams.amount_spent = offer.amount_spent;
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
        "Select cm.customer_id,cm.merchant_id,cm.customer_phone from tap_customers_merchant as cm INNER JOIN tap_customer_orders as co ON (cm.merchant_id=co.merchant_id AND cm.customer_id=co.customer_id) Where co.created_at>=:bd_start_date AND co.created_at<=:bd_start_date AND cm.customer_id =:customer_id AND cm.merchant_id=:merchant_id AND cm.optin='1' group by co.customer_id,co.merchant_id";
      sqlParams.customer_id = customer_id;
      sqlParams.merchant_id = offer.MerchantId;
      sqlParams.bd_start_date = offer.bd_start_date;
    } else if (
      offer.unfinished_profile !== null &&
      offer.unfinished_profile == 1
    ) {
      sql =
        "Select cm.customer_id,cm.customer_phone,cm.merchant_id from tap_customers_merchant as cm INNER Join tap_customers as c ON cm.customer_id=c.id Where cm.optin='1' AND cm.customer_id =:customer_id AND cm.merchant_id=:merchant_id AND cm.profile_completed='0'  group by cm.customer_id,cm.merchant_id";
      sqlParams.customer_id = customer_id;
      sqlParams.merchant_id = offer.MerchantId;
    }
    if (sql_count !== "") {
      model.sequelize
        .query(sql_count, {
          replacements: sql_countParams,
          type: model.sequelize.QueryTypes.SELECT
        })
        .then(function(rows) {
          if (rows.length > 0) {
            var total = rows[0].total;
            var limit = Math.floor(
              (total / 100) * offer.randomly_customers_per
            );
            limit = limit == 0 ? 1 : limit;
            sql =
              "Select cm.customer_id,cm.customer_phone,cm.merchant_id from tap_customers_merchant as cm Where cm.optin='1' AND cm.customer_id =:customer_id AND cm.merchant_id=:merchant_id Order By RAND() Limit " +
              limit;
            var sqlParams = {};
            sqlParams.customer_id = customer_id;
            sqlParams.merchant_id = offer.MerchantId;
            model.sequelize
              .query(sql, {
                replacements: sqlParams,
                type: model.sequelize.QueryTypes.SELECT
              })
              .then(function(customers) {
                if (customers.length > 0) {
                  merDataStatus.merStatus = true;
                  resolve(merDataStatus);
                } else {
                  merDataStatus.merStatus = false;
                  resolve(merDataStatus);
                }
              })
              .catch(function(err) {
                reject(err);
              });
          } else {
            merDataStatus.merStatus = false;
            resolve(merDataStatus);
          }
        })
        .catch(function(err) {
          reject(err);
        });
    } else {
      model.sequelize
        .query(sql, {
          replacements: sqlParams,
          type: model.sequelize.QueryTypes.SELECT
        })
        .then(function(customers) {
          if (customers.length > 0) {
            merDataStatus.merStatus = true;
            resolve(merDataStatus);
          } else {
            merDataStatus.merStatus = false;
            resolve(merDataStatus);
          }
        })
        .catch(function(err) {
          reject(err);
        });
    }
  });
}
/**
 * Get timestamp for days
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
