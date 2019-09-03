"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_downgrade_requests = sequelize.define(
    "tap_downgrade_requests",
    {
      merchant_id: DataTypes.STRING,
      schedule_id: DataTypes.INTEGER,
      tier_id: DataTypes.INTEGER,
      requested_by_admin: {
        type: DataTypes.ENUM,
        values: ["1", "2"]
      },
      isdowngrade_used: {
        type: DataTypes.ENUM,
        values: ["0", "1"]
      },
      start_date: DataTypes.INTEGER,
      update_date: DataTypes.INTEGER
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_downgrade_requests;
};
