"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_qrcode_used = sequelize.define(
    "tap_qrcode_used",
    {
      used_by: DataTypes.INTEGER,
      merchant_id: DataTypes.STRING,
      used_on: DataTypes.INTEGER,
      qrcode: DataTypes.STRING,
      code_type: DataTypes.STRING,
      campaign_id: DataTypes.STRING
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_qrcode_used;
};
