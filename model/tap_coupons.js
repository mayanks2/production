'use strict';
module.exports = (sequelize, DataTypes) => {
  var tap_coupons = sequelize.define('tap_coupons', {
    customer_id: DataTypes.BIGINT(20),
    merchant_id: DataTypes.STRING,
    expires: DataTypes.BIGINT(20),
    offer_type: DataTypes.INTEGER,
    offerid: DataTypes.BIGINT(20),
    coupon_uuid: DataTypes.STRING,
    coupon_type: {
      type: DataTypes.ENUM,
      values: ['ReferralOwner', 'Referred', 'Referral', 'Other']
    },
    data: DataTypes.TEXT,
    minPurchase: DataTypes.INTEGER,
    created_at: DataTypes.BIGINT(20),
  }, {
    freezeTableName: true, // Model tableName will be the same as the model name
    timestamps: false
  });

  return tap_coupons;
};