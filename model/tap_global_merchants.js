'use strict';
module.exports = (sequelize, DataTypes) => {
    var tap_global_merchants = sequelize.define('tap_global_merchants', {
        merchant_id: DataTypes.STRING,
        email: DataTypes.STRING,
    }, {
        freezeTableName: true, // Model tableName will be the same as the model name
        timestamps: false
    });

    return tap_global_merchants;
};