"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_optin_log = sequelize.define(
    "tap_optin_log",
    {
      customer_id: DataTypes.INTEGER,
      merchant_id: DataTypes.STRING,
      optin: DataTypes.INTEGER,
      time: DataTypes.INTEGER
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_optin_log;
};
