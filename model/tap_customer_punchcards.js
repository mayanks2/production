"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_customer_punchcards = sequelize.define(
    "tap_customer_punchcards",
    {
      customer_id: DataTypes.BIGINT(20),
      merchant_id: DataTypes.STRING,
      punches: DataTypes.INTEGER
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_customer_punchcards;
};
