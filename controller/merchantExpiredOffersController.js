"use strict";
var model = require("../model");
var config = require("../config/config");
var textmessage = require("../language/textMessage");
var helpher = require("../controller/common/helper");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));

module.exports = {
  merchantExpiredOffers: function(req, res) {
    delete responseMsg.OK.message;
    var today = Math.floor(Date.now() / 1000);
    var Mid = req.params.merchant_id;
    if (!Mid) {
      responseMsg.RESPONSE400.message = "Missing mandatory fields.";
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    }

    model.tap_merchant_offers
      .findAll({
        where: {
          MerchantId: Mid,
          active: "false",
          deactivated_at: {
            $not: null
          }
        }
      })
      .then(function(data) {
        var rows = data.map(function(data) {
          return data.toJSON();
        });
        if (rows.length > 0) {
          var recursiveOffers = function(offer_index) {
            if (offer_index == rows.length) {
              responseMsg.OK.data = [];
              responseMsg.OK.data = rows;
              res.status(responseMsg.OK.statusCode).send(responseMsg.OK);
            } else {
              model.tap_coupons
                .findAll({
                  attributes: [
                    [
                      model.sequelize.fn("COUNT", model.sequelize.col("id")),
                      "coupons_sent"
                    ]
                  ],
                  where: { offerid: rows[offer_index].id, merchant_id: Mid }
                })
                .then(function(rows_data) {
                  var data = rows_data.map(function(rows_data) {
                    return rows_data.toJSON();
                  });
                  console.log("tap_coupons data", data);
                  rows[offer_index].coupons_sent = data[0].coupons_sent;
                  var sql_coupon_visits =
                    "SELECT COUNT(c.id) AS customer_visits FROM tap_coupons c JOIN tap_coupons_used cu ON c.id=cu.coupon_id WHERE c.offerid=:offerid AND c.merchant_id=:merchant_id";
                  var sql_coupon_visitsParam = {
                    offerid: rows[offer_index].id,
                    merchant_id: Mid
                  };
                  model.sequelize
                    .query(sql_coupon_visits, {
                      replacements: sql_coupon_visitsParam,
                      type: model.sequelize.QueryTypes.SELECT
                    })
                    .then(function(data) {
                      rows[offer_index].customer_visits =
                        data[0].customer_visits;
                      var sql_revenue =
                        "SELECT SUM(saleAmount) as total_revenue FROM tap_customer_orders WHERE offer_id=:offer_id AND merchant_id=:merchant_id";
                      console.log(sql_revenue);
                      var sql_revenueParam = {
                        offer_id: rows[offer_index].id,
                        merchant_id: Mid
                      };
                      model.sequelize
                        .query(sql_revenue, {
                          replacements: sql_revenueParam,
                          type: model.sequelize.QueryTypes.SELECT
                        })
                        .then(function(data) {
                          rows[offer_index].total_revenue = data[0]
                            .total_revenue
                            ? data[0].total_revenue
                            : 0;
                          recursiveOffers(++offer_index);
                        })
                        .catch(function(err) {
                          responseMsg.RESPONSE400.message = err;
                          res
                            .status(responseMsg.RESPONSE400.statusCode)
                            .send(responseMsg.RESPONSE400);
                        });
                    })
                    .catch(function(error) {
                      responseMsg.RESPONSE400.message = error;
                      res
                        .status(responseMsg.RESPONSE400.statusCode)
                        .send(responseMsg.RESPONSE400);
                    });
                })
                .catch(function(error) {
                  responseMsg.RESPONSE400.message = error;
                  res
                    .status(responseMsg.RESPONSE400.statusCode)
                    .send(responseMsg.RESPONSE400);
                });
            }
          };
          recursiveOffers(0);
        } else {
          responseMsg.RESPONSE400.message = "Data not found.";
          res
            .status(responseMsg.RESPONSE400.statusCode)
            .send(responseMsg.RESPONSE400);
        }
      })
      .catch(function(err) {
        responseMsg.RESPONSE400.message = err;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      });
  }
};
