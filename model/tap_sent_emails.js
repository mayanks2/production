'use strict';
module.exports = (sequelize, DataTypes) => {
  var tap_sent_emails = sequelize.define('tap_sent_emails', {
    timestamp: DataTypes.INTEGER,
    merchant_id: DataTypes.STRING(100),
    customer_phone: DataTypes.STRING(50),
    from: DataTypes.STRING(200),
    message: DataTypes.TEXT,
    subject: DataTypes.TEXT,
    to: DataTypes.TEXT,
    ip_address: DataTypes.STRING(50),
    open_at: DataTypes.INTEGER(11),
    sms_segment: DataTypes.INTEGER(2)
  }, {
    freezeTableName: true, // Model tableName will be the same as the model name
    timestamps: false
  });
 
  return tap_sent_emails;
};
