"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_customer_orders = sequelize.define(
    "tap_customer_orders",
    {
      created_at: DataTypes.INTEGER,
      customer_id: DataTypes.BIGINT(20),
      merchant_id: DataTypes.STRING,
      orderID: DataTypes.STRING,
      saleAmount: DataTypes.DOUBLE(10, 2),
      discount: DataTypes.FLOAT(5, 2),
      coupon_id: DataTypes.BIGINT(20),
      offer_id: DataTypes.BIGINT(20),
      offer_type: DataTypes.INTEGER,
      gotu: DataTypes.INTEGER,
      qr_campaign_id: DataTypes.INTEGER
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_customer_orders;
};
