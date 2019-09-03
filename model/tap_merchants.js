"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_merchants = sequelize.define(
    "tap_merchants", {
      merchant_id: DataTypes.STRING,
      active: {
        type: DataTypes.ENUM,
        values: ["true", "false"]
      },
      base_url: DataTypes.TEXT,
      created_at: DataTypes.INTEGER,
      dba: DataTypes.STRING,
      email: DataTypes.STRING,
      email_limit: DataTypes.INTEGER,
      email_limit_perUser: DataTypes.INTEGER,
      email_sent: DataTypes.INTEGER,
      estimote: DataTypes.INTEGER,
      frequency: {
        type: DataTypes.ENUM,
        values: ["W", "M", "Y", "D"]
      },
      goal: DataTypes.INTEGER,
      index: DataTypes.INTEGER,
      keyword: DataTypes.TEXT,
      owner_id: DataTypes.STRING,
      pushy: DataTypes.STRING,
      sms_limit: DataTypes.INTEGER,
      sms_unlimited: DataTypes.INTEGER,
      first_threshold_notified: {
        type: DataTypes.ENUM,
        values: ["false", "true"]
      },
      second_threshold_notified: {
        type: DataTypes.ENUM,
        values: ["false", "true"]
      },
      sms_limit_perUser: DataTypes.INTEGER,
      sms_sent: DataTypes.INTEGER,
      sms_sent_training : DataTypes.INTEGER,
      clover_mid: DataTypes.STRING,
      token: DataTypes.STRING,
      package_name: DataTypes.STRING,
      yext: DataTypes.TEXT,
      text: DataTypes.TEXT,
      yext_location_id: DataTypes.STRING,
      updated_at: DataTypes.INTEGER,
      data_new: DataTypes.TEXT,
      old_data: DataTypes.TEXT,
      request_time: DataTypes.INTEGER,
      first_name: DataTypes.STRING,
      last_name: DataTypes.STRING,
      city: DataTypes.STRING,
      state: DataTypes.STRING,
      country: DataTypes.STRING,
      phoneNumber: DataTypes.STRING,
      zip: DataTypes.STRING,
      address1: DataTypes.STRING(512),
      address2: DataTypes.STRING(512),
      address3: DataTypes.STRING(512),
      gotu_id: DataTypes.STRING(100),
      promotional_url: DataTypes.STRING,
      pin: DataTypes.STRING(50),
      push_active: DataTypes.INTEGER,
      push_url: DataTypes.STRING,
      banktech_user_id: DataTypes.STRING(50),
      banktech_user_name: DataTypes.STRING(50),
      banktech_password: DataTypes.STRING(50),
      merchant_password: DataTypes.STRING(250),
      register_type: {
        type: DataTypes.ENUM,
        values: ["0", "1"]
      },
      registered_status: DataTypes.INTEGER,
      merchant_permission: DataTypes.STRING(45),
      login_token: DataTypes.TEXT,
      taptext_status: DataTypes.STRING(45),
      nick_name: DataTypes.STRING(100),
      logo_url: DataTypes.STRING(200),
      merchant_type: DataTypes.STRING(50),
      sms_limit_notification_sent: DataTypes.STRING,
      push_originalurl: DataTypes.STRING,
      widget_status: DataTypes.STRING,
      performance: {
        type: DataTypes.ENUM,
        values: ["false", "true"]
      },
      yext_user_id: DataTypes.STRING,
      timezone: DataTypes.STRING,
      secondary_phone: DataTypes.STRING,
      secondary_email: DataTypes.STRING,
      yext_user_creation_process: DataTypes.INTEGER,
      sms_notification_check: {
        type: DataTypes.ENUM,
        values: ["false", "true"]
      },
      is_training: {
        type: DataTypes.ENUM,
        values: ["0", "1"]
      },
      email_notification_check: {
        type: DataTypes.ENUM,
        values: ["false", "true"]
      },
      tier_billing_notification_language: {
        type: DataTypes.ENUM,
        values: ["English", "Spanish"]
      },
      exceed_limit_notification_sent: DataTypes.INTEGER,
      last_exceed_limit_notification_sent_time: DataTypes.INTEGER
    }, {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_merchants;
};