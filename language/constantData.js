'use strict';
var config = require("../config/config");
var environment = config.app.environmentURL;
module.exports = {
  //twilio setup
  ACCOUNTSID: "ACbbfa5abc0f58bbb5a8a731df226e0a8f",
  AUTHTOKEN: "f2661610765efa06a6e5aea674150007",
  SHORTCODE: "71958",
  TERLINK: "https://tpl.news/cr3va",
  //end twilio setup
  IMAGE_LINK:
    environment + "dashboard.taplocalmarketing.com/nodeServer/uploads/",
  DEFAULT_IMAGE: 'mmsimage.png',
  MERCHANT_ACTIVITY_DAYS: 20,
  MERCHANT_COUPON_DAYS: 30,
  MERCHANT_CUSTOMER_DAYS: 10,
  MERCHANT_30_DAYS_OFFERS: 30,
  MERCHANT_60_DAYS_OFFERS: 60,
  MERCHANT_90_DAYS_OFFERS: 90,
  MERCHANT_DAYS_EMAIL_NOTIFICATION: 14,
  MERCHANT_DAYS_EMAIL_NOTIFICATION_TIME: '16:00',
  TIERED_BILLING_EVENTS: {
    MERCHANT_UPGRADE: 'Merchant Upgrade',
    MERCHANT_DOWNGRADE: 'Merchant Downgrade Request',
    AUTOMATIC_DOWNGRADE: 'Cycle Change Downgrade / Schedule Change',
    SUPER_USER_UPGRADE: 'Super User Upgrade',
    SUPER_USER_DOWNGRADE: 'Super User Downgrade Request',
    SUPER_USER_SCHEDULE_CHANGE_REQUEST: 'Super User Schedule Change Request',
    AUTOMATIC_BILLING_CYCLE_UPDATE: 'Automatic Billing Cycle Update',
    SUPER_USER_FIRST_TIME_ASSIGN: 'Super User First Time Assign Schedule Tier',
    UPGRADE_TIER_ON_SMS_LIMIT_EXCEEDED: 'Upgraded Tier On SMS limit Exceeded',
    TRAINING_MODE: 'Training Mode',
    TRAINING_TO_ACTIVE_SCHEDULE: 'Training to Active Schedule',
    PRICE_SCHEDULE_CHANGE: 'Price Schedule Change',
    TRAINING_MODE_OFF: "Training Mode Turn Off"
  },
  BILLING_MAIL:
    config.app.BILLING_MAIL,
  BILLING_MOBILE_NUMBER: config.app.BILLING_MOBILE_NUMBER,
  BILLING_ACCOUNT_MANAGER_MAIL: config.app.BILLING_ACCOUNT_MANAGER_MAIL,
};
