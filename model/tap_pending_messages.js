"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_pending_messages = sequelize.define(
    "tap_pending_messages",
    {
      merchant_id :  DataTypes.STRING,
      customer_phone: DataTypes.STRING,
      message: DataTypes.STRING,
      timezone : DataTypes.STRING,
      sent_status:{
        type: DataTypes.ENUM,
        values: ['true','false'] 
      },
      date: DataTypes.INTEGER,
      segment_count: DataTypes.INTEGER,
      offer : DataTypes.STRING,
      offer_id : DataTypes.STRING
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_pending_messages;
};

