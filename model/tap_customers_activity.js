"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_customers_activity = sequelize.define(
    "tap_customers_activity_log",
    {
      customer_number :  DataTypes.STRING,
      customer_id: DataTypes.STRING,
      merchant_id: DataTypes.STRING,
      subject:{
        type: DataTypes.ENUM,
        values: ['OPT-IN','OPT-OUT','STOP','HELP' , 'KEYWORD OPT-IN'] 
      },
      requested_from: {
        type: DataTypes.ENUM,
        values: ['Register Widget','Customer facing tablet','Customer Mobile'] 
      },
      device_data: DataTypes.STRING,
      time: DataTypes.INTEGER,
      message_sent : DataTypes.STRING,
      segments : DataTypes.INTEGER
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_customers_activity;
};
