'use strict';
module.exports = (sequelize, DataTypes) => {
    var tap_merchant_beacon = sequelize.define('tap_merchant_beacon', {
        merchant_id: DataTypes.STRING,
        beacon: DataTypes.TEXT
    }, {
        freezeTableName: true, // Model tableName will be the same as the model name
        timestamps: false
    });
 
    return tap_merchant_beacon;
};
