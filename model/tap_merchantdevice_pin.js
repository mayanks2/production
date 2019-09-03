"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_merchantdevice_pin = sequelize.define(
    "tap_merchantdevice_pin", {
      merchant_id: DataTypes.STRING,
      client_ip: DataTypes.STRING,
      device_uuid: DataTypes.STRING,
      pin: DataTypes.STRING,
      pin: DataTypes.STRING,
      created_date: DataTypes.STRING,
      unique_id: DataTypes.STRING,
      expire_on: DataTypes.STRING,
      is_used: DataTypes.TINYINT(2),
      pin_released: DataTypes.TINYINT(2),
      expired: DataTypes.TINYINT(2),
    }, {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_merchantdevice_pin;
};