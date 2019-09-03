'use strict';
module.exports = (sequelize, DataTypes) => {
    var tap_customers_typeslog = sequelize.define('tap_customers_typeslog', {
        customer_id: DataTypes.BIGINT(20),
        merchant_id: DataTypes.STRING,
        customer_type: {
            type: DataTypes.ENUM,
            values: ['normal', 'regular', 'casual', 'vip']
          },
        created_at: DataTypes.BIGINT(20),
    }, {
        freezeTableName: true, // Model tableName will be the same as the model name
        timestamps: false
    });
 
    return tap_customers_typeslog;
};
