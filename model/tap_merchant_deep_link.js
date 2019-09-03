"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_merchant_deep_link = sequelize.define(
    "tap_merchant_deep_link",
    {
      merchant_id: DataTypes.STRING,
      google_location_id: DataTypes.STRING,
      facebook_page_name: DataTypes.STRING,
      facebook_deep_link_id: DataTypes.STRING,
      facebook_deep_link: DataTypes.STRING,
      only_facebook_deep_link_id: DataTypes.STRING,
      only_facebook_deep_link: DataTypes.STRING,
      google_deep_link_id: DataTypes.STRING,
      google_deep_link: DataTypes.STRING,
      yelp_deep_link_id: DataTypes.STRING,
      yelp_deep_link: DataTypes.STRING,
      yelp_business_id: DataTypes.STRING,
      yelp_google_deep_link_id: DataTypes.STRING,
      yelp_google_deep_link: DataTypes.STRING,
      trip_advisor_link: DataTypes.TEXT,
      trip_advisor_deep_link_id: DataTypes.STRING,
      trip_advisor_deep_link: DataTypes.STRING,
      trip_advisor_google_deep_link_id: DataTypes.STRING,
      trip_advisor_google_deep_link: DataTypes.STRING,
      deep_link_priority: DataTypes.INTEGER,
      positive_messages: DataTypes.TEXT,
      negative_messages: DataTypes.TEXT,
      positive_auto_reply_status: DataTypes.INTEGER,
      negative_auto_reply_status: DataTypes.INTEGER,
      rating_limit: DataTypes.INTEGER,
      review_generation_process_status: DataTypes.INTEGER,
      review_generation_process_activation_date_time: DataTypes.INTEGER,
      sms_delay_time: DataTypes.INTEGER,
      last_yext_fetch_review_time: DataTypes.INTEGER,
      positive_mail_notification: DataTypes.INTEGER,
      positive_last_mail_notification_time: DataTypes.INTEGER,
      negative_mail_notification: DataTypes.INTEGER,
      negative_last_mail_notification_time: DataTypes.INTEGER,
      generic_short_url: DataTypes.STRING,
      created_at: DataTypes.INTEGER,
      updated_at: DataTypes.INTEGER,
      last_response_time: DataTypes.INTEGER
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_merchant_deep_link;
};
