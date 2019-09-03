"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_merchant_image_gallery = sequelize.define(
    "tap_merchant_image_gallery",
    {
      merchant_id: DataTypes.STRING,
      image: DataTypes.STRING,
      created_at: DataTypes.INTEGER,
      image_from: {
        type: DataTypes.ENUM,
        values: ["PRE", "MERC"]
      }
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_merchant_image_gallery;
};
