"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_merchant_offers = sequelize.define(
    "tap_merchant_offers", {
      Data: DataTypes.TEXT,
      MerchantId: DataTypes.STRING,
      Discount_Percentage: DataTypes.FLOAT(5, 2),
      Discount_Type: DataTypes.INTEGER,
      Min_Purchase: DataTypes.DOUBLE(11, 4),
      active: {
        type: DataTypes.ENUM,
        values: ["true", "false"]
      },
      created_at: DataTypes.INTEGER,
      segmentCountEnglish: DataTypes.INTEGER,
      characterCountEnglish: DataTypes.INTEGER,
      segmentCountSpanish: DataTypes.INTEGER,
      characterCountSpanish : DataTypes.INTEGER,
      deactivated_at: DataTypes.INTEGER,
      description: DataTypes.TEXT,
      discount_name: DataTypes.STRING,
      global_owner_id: DataTypes.STRING,
      min_to_earn: DataTypes.FLOAT(10, 4),
      start_date: DataTypes.INTEGER,
      end_date: DataTypes.INTEGER,
      terms: DataTypes.TEXT,
      discount_unit: {
        type: DataTypes.ENUM,
        values: ["%", "$"]
      },
      expires: DataTypes.INTEGER,
      reward_text: DataTypes.TEXT,
      spanish_reward_text: DataTypes.TEXT,
      before_profile_complete_reward_text: DataTypes.TEXT,
      before_profile_complete_spanish_reward_text: DataTypes.TEXT,
      background_color: DataTypes.STRING,
      body_color: DataTypes.STRING,
      button_color: DataTypes.STRING,
      Referrer_Discount_Amount: DataTypes.STRING,
      coupon_image: DataTypes.STRING,
      background_image: DataTypes.STRING,
      title_color: DataTypes.STRING,
      description_color: DataTypes.STRING,
      terms_color: DataTypes.STRING,
      time_zone: DataTypes.STRING,
      time: DataTypes.STRING,
      send_date: DataTypes.INTEGER,
      zipcode: DataTypes.STRING,
      last_visited: DataTypes.INTEGER,
      customer_type: {
        type: DataTypes.ENUM,
        values: ["normal", "regular", "vip", "casual"]
      },
      randomly_customers_per: DataTypes.BIGINT(20),
      coupons_available: DataTypes.BIGINT(20),
      unfinished_profile: DataTypes.INTEGER,
      customer_name: DataTypes.STRING,
      days_optin: DataTypes.INTEGER,
      last_purchase: DataTypes.INTEGER,
      amount_spent: DataTypes.DOUBLE(11, 4),
      amount_spent_sign: DataTypes.STRING,
      amount_spent_end: DataTypes.INTEGER,
      bd_start_date: DataTypes.INTEGER,
      bd_end_date: DataTypes.INTEGER,
      as_start_date: DataTypes.INTEGER,
      as_end_date: DataTypes.INTEGER,
      spending_period: DataTypes.STRING,
      is_sent: DataTypes.INTEGER,
      is_recurring: DataTypes.INTEGER,
      sent_count: DataTypes.INTEGER,
      reward_text_message_type: {
        type: DataTypes.ENUM,
        values: ["SMS", "MMS"]
      },
      reward_text_media_id: DataTypes.INTEGER,
      reward_text_media_image: DataTypes.STRING,
      before_profile_complete_reward_text_message_type: {
        type: DataTypes.ENUM,
        values: ["SMS", "MMS"]
      },
      before_profile_complete_reward_text_media_id: DataTypes.INTEGER,
      before_profile_complete_reward_text_media_image: DataTypes.STRING,
      spanish_reward_text_message_type: {
        type: DataTypes.ENUM,
        values: ["SMS", "MMS"]
      },
      spanish_reward_text_media_id: DataTypes.INTEGER,
      spanish_reward_text_media_image: DataTypes.STRING,
      before_profile_complete_spanish_reward_text_message_type: {
        type: DataTypes.ENUM,
        values: ["SMS", "MMS"]
      },
      before_profile_complete_spanish_reward_text_media_id: DataTypes.INTEGER,
      before_profile_complete_spanish_reward_text_media_image: DataTypes.STRING,
      coupon_header: DataTypes.STRING,
      coupon_short_url: DataTypes.STRING,
      offer_coupon_guid: DataTypes.STRING
    }, {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_merchant_offers;
};