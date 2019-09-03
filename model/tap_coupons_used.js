"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_coupons_used = sequelize.define(
    "tap_coupons_used",
    {
      coupon_id: DataTypes.BIGINT(20),
      used_by: DataTypes.BIGINT(20),
      used_at: DataTypes.INTEGER
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_coupons_used;
};
