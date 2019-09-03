"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_offer_activation = sequelize.define(
    "tap_offer_activation",
    {
      activate_at: DataTypes.INTEGER,
      offerid: DataTypes.INTEGER
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_offer_activation;
};
