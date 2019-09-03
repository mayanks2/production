"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_gotu_campaigns = sequelize.define(
    "tap_gotu_campaigns", {
      campaign_id: {
        type: DataTypes.BIGINT(20),
        autoIncrement: true,
        primaryKey: true
      },
      Min_Purchase: DataTypes.STRING,
      active: {
        type: DataTypes.ENUM,
        values: ["true", "false"]
      },
      campaign_code: DataTypes.STRING,
      discount_percentage: DataTypes.STRING,
      discount_unit: {
        type: DataTypes.ENUM,
        values: ["%", "$"]
      },
      expires: DataTypes.INTEGER,
      merchant_id: DataTypes.STRING,
      payload: DataTypes.TEXT,
      gotu_data: DataTypes.TEXT,
      created_at: DataTypes.INTEGER,
      type: {
        type: DataTypes.ENUM,
        values: ["gotu", "push"]
      },
      gotu_content_data: DataTypes.TEXT,
      campaign_promotion_type: DataTypes.STRING,
      campaign_name: DataTypes.STRING,
      campaign_lat: DataTypes.STRING,
      campaign_long: DataTypes.STRING,
      campaign_customer_range: DataTypes.STRING,
      notification_msg: DataTypes.STRING
    }, {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_gotu_campaigns;
};