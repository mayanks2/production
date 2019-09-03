'use strict';
module.exports = (sequelize, DataTypes) => {
  var tap_appversion = sequelize.define('tap_appversion', {
    app_version_no: DataTypes.STRING,
    update_date: DataTypes.NOW,
    version_code: DataTypes.STRING,
    merchant_app_version_no: DataTypes.STRING,
    merchant_version_code: DataTypes.STRING,
  }, {
    freezeTableName: true, // Model tableName will be the same as the model name
    timestamps: false
  });
 
  return tap_appversion;
};

