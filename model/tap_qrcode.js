"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_qrcode = sequelize.define(
    "tap_qrcode",
    {
      merchant_id: DataTypes.STRING,
      qrcode: DataTypes.TEXT,
      code_for: DataTypes.STRING,
      updated: DataTypes.INTEGER,
      qrcode_value: DataTypes.STRING,
      running_campaign_id: DataTypes.INTEGER,
      days_to_expire: DataTypes.INTEGER,
      expire_date: DataTypes.INTEGER,
      coupon_code: DataTypes.STRING
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_qrcode;
};
