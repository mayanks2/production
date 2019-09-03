"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_schedule_subscription = sequelize.define(
    "tap_schedule_subscription",
    {
      merchant_id: DataTypes.STRING,
      schedule_id: DataTypes.INTEGER,
      tier_id: DataTypes.INTEGER,
      minimum_tier_id: DataTypes.INTEGER,
      assigned_from: DataTypes.STRING,
      subscription_start_date: DataTypes.INTEGER,
      subscription_end_date: DataTypes.INTEGER,
      subscription_assign_date: DataTypes.INTEGER,
      update_date: DataTypes.INTEGER
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_schedule_subscription;
};
