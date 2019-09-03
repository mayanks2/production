'use strict';
module.exports = (sequelize, DataTypes) => {
  var Row = sequelize.define('Row', {
    username: DataTypes.STRING
  });
 
  return Row;
};
