'use strict';
module.exports = (sequelize, DataTypes) => {
    var tap_failed_sms = sequelize.define('tap_failed_sms', {
        timestamp: DataTypes.INTEGER,
        customer_phone: DataTypes.STRING(50),
        merchant_id: DataTypes.STRING(100),
        message: DataTypes.TEXT,
        subject: DataTypes.STRING,
        sms_segment: DataTypes.INTEGER(2),
        price: DataTypes.FLOAT,
        type: DataTypes.STRING(45),
        numMedia: DataTypes.INTEGER(5),
        res_data: DataTypes.TEXT,
        offer_id: DataTypes.INTEGER(15),
    }, {
        freezeTableName: true, // Model tableName will be the same as the model name
        timestamps: false
    });

    return tap_failed_sms;
};