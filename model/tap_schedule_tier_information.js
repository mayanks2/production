"use strict";
module.exports = (sequelize, DataTypes) => {
    var tap_schedule_tier_information = sequelize.define(
        "tap_schedule_tier_information", {
            schedule_id: DataTypes.INTEGER,
            subscription_lower_bound_seg_count: DataTypes.INTEGER,
            subscription_upper_bound_seg_count: DataTypes.INTEGER,
            tier_number: DataTypes.INTEGER,
            subscribed_price: DataTypes.DECIMAL,
            overage_price: DataTypes.DECIMAL,
            tier_start_date: DataTypes.STRING,
            tier_end_date: DataTypes.STRING,
            update_date: DataTypes.STRING
        }, {
            freezeTableName: true, // Model tableName will be the same as the model name
            timestamps: false
        }
    );

    return tap_schedule_tier_information;
};