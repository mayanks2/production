'use strict';
module.exports = (sequelize, DataTypes) => {
  var tab_customers_visitlog = sequelize.define('tab_customers_visitlog', {
    customer_id: DataTypes.BIGINT(20),
    visit_date: DataTypes.INTEGER,
    merchant_id: DataTypes.STRING
  }, {
    freezeTableName: true, // Model tableName will be the same as the model name
    timestamps: false
  });
 
  return tab_customers_visitlog;
};
