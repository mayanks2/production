"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_merchant_optin_batch_sms = sequelize.define(
    "tap_merchant_optin_batch_sms",
    {
      merchant_id: DataTypes.STRING,
      customer_id: DataTypes.BIGINT(20),
      customer_phone: DataTypes.STRING,
      message: DataTypes.TEXT,
      optin_at: DataTypes.INTEGER,
      sms_type: DataTypes.INTEGER,
      sms_status: DataTypes.INTEGER,
      english_message_type: {
        type: DataTypes.ENUM,
        values: ["SMS", "MMS"]
      },
      english_media_file: DataTypes.STRING,
      spanish_message_type: {
        type: DataTypes.ENUM,
        values: ["SMS", "MMS"]
      },
      spanish_media_file: DataTypes.STRING,
      sms_segment: DataTypes.INTEGER,
      price: DataTypes.FLOAT,
      type: DataTypes.STRING,
      numMedia: DataTypes.INTEGER,
      res_data: DataTypes.TEXT,
      subject: DataTypes.STRING
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_merchant_optin_batch_sms;
};
