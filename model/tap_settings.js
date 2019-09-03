"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_settings = sequelize.define(
    "tap_settings", {
      url_genius_api_key: DataTypes.STRING,
      yext_api_key: DataTypes.STRING,
      negative_rating_limit: DataTypes.STRING,
      first_threshold_val: DataTypes.INTEGER,
      second_threshold_val: DataTypes.INTEGER,
      sms_notification_check: {
        type: DataTypes.ENUM,
        values: ["false", "true"]
      },
      email_notification_check: {
        type: DataTypes.ENUM,
        values: ["false", "true"]
      }
    }, {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_settings;
};