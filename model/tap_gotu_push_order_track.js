"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_gotu_push_order_track = sequelize.define(
    "tap_gotu_push_order_track",
    {
      merchant_id: DataTypes.STRING,
      campaign_code: DataTypes.STRING,
      campaign_type: DataTypes.STRING,
      total_purchase: DataTypes.STRING,
      update_date: DataTypes.STRING
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_gotu_push_order_track;
};
