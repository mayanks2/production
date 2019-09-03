'use strict';
module.exports = (sequelize, DataTypes) => {
    var tap_sentsms_nooffer = sequelize.define('tap_sentsms_nooffer', {
        customer_phone: DataTypes.TEXT,
        message: DataTypes.STRING(200),
        merchant_id: DataTypes.STRING(100),
        customer_name: DataTypes.STRING(200),
        customer_view_lastDay: DataTypes.INTEGER(11),
        customer_profile_type: DataTypes.STRING(50),
        random_customers: DataTypes.INTEGER(3),
        not_finished_profile: DataTypes.STRING(5),
        since_opte_in_date: DataTypes.INTEGER(11),
        coupen_available: DataTypes.INTEGER(11),
        last_purchase_start_date: DataTypes.INTEGER(11),
        last_purchase_end_date: DataTypes.INTEGER(11),
        ammount_spent: DataTypes.FLOAT,
        selectedNumber: DataTypes.TEXT,
        currentTime: DataTypes.DATE,
        operator: DataTypes.STRING(45),
        zipcode: DataTypes.TEXT,
        timezone: DataTypes.STRING(45),
        date_time_with_timezone: DataTypes.INTEGER(11),
        date_time: DataTypes.INTEGER(11),
        sent_status: DataTypes.ENUM('0', '1'),
        segmentCount: DataTypes.INTEGER,
        characterCount: DataTypes.INTEGER
    }, {
        freezeTableName: true, // Model tableName will be the same as the model name
        timestamps: false
    });

    return tap_sentsms_nooffer;
};