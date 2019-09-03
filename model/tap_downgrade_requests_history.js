"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_downgrade_requests_history = sequelize.define(
    "tap_downgrade_requests_history",
    {
      merchant_id: DataTypes.STRING,
      schedule_id: DataTypes.INTEGER,
      tier_id: DataTypes.INTEGER,
      requested_by_admin: {
        type: DataTypes.ENUM,
        values: ["1", "2"]
      },
      request_date: DataTypes.INTEGER
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_downgrade_requests_history;
};
