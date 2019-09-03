"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_billing_notification_log = sequelize.define(
    "tap_billing_notification_log",
    {
      merchant_id: DataTypes.STRING,
      billing_event: DataTypes.STRING,
      notification_type: {
        type: DataTypes.ENUM,
        values: ["SMS", "EMAIL"]
      },
      notification_status: DataTypes.INTEGER,
      notification_time: DataTypes.INTEGER
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_billing_notification_log;
};
