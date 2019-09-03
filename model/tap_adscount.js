"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_adscount = sequelize.define(
    "tap_adscount",
    {
      ads_name: DataTypes.STRING,
      click_count: DataTypes.STRING,
      update_date: DataTypes.STRING
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_adscount;
};
