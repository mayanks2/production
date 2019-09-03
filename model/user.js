'use strict';
module.exports = (sequelize, DataTypes) => {
  var tap_users = sequelize.define('tap_users', {
    created_at: DataTypes.INTEGER,
    email: DataTypes.STRING,
    name: DataTypes.STRING,
    role: DataTypes.TEXT,
    updated_at: DataTypes.INTEGER
  }, {
    freezeTableName: false, // Model tableName will be the same as the model name
    timestamps: false
  });
 
  return tap_users;
};
