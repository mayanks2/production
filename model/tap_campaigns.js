"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_campaigns = sequelize.define(
    "tap_campaigns",
    {
      campaign_type: DataTypes.STRING,
      campaign_promotion_type: DataTypes.STRING,
      campaign_code: DataTypes.STRING,
      gotu_data: DataTypes.TEXT,
      created: DataTypes.INTEGER,
      merchant_id: DataTypes.STRING,
      status: DataTypes.STRING,
      expiry_date: DataTypes.INTEGER,
      campaign_name: DataTypes.STRING,
      campaign_url: DataTypes.STRING,
      discount_ammount: DataTypes.STRING,
      discount_type: DataTypes.STRING,
      minimum_purchase: DataTypes.STRING,
      start_date: DataTypes.INTEGER,
      updated: DataTypes.INTEGER,
      campaign_lat: DataTypes.STRING,
      campaign_long: DataTypes.STRING,
      campaign_customer_range: DataTypes.STRING,
      notification_msg: DataTypes.STRING,
      days_to_expire: DataTypes.INTEGER,
      coupon_code: DataTypes.STRING,
      created_by: DataTypes.STRING,
      modify_by: DataTypes.STRING
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_campaigns;
};
