"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_billing_report = sequelize.define(
    "tap_billing_report",
    {
      merchant_id: DataTypes.STRING,
      schedule_id: DataTypes.INTEGER,
      current_tier: DataTypes.INTEGER,
      new_tier: DataTypes.INTEGER,
      segment_count: DataTypes.INTEGER,
      overage_charge: DataTypes.DECIMAL,
      current_monthly_subscription: DataTypes.DECIMAL,
      new_monthly_subscription: DataTypes.DECIMAL,
      date_triggered: DataTypes.INTEGER,
      billing_event: DataTypes.STRING,
      billing_amount: DataTypes.DECIMAL,
      event_completion_date: DataTypes.INTEGER
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_billing_report;
};
