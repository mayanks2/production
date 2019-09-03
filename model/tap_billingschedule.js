"use strict";
module.exports = (sequelize, DataTypes) => {
    var tap_billingschedule = sequelize.define(
        "tap_billingschedule", {
            schedule_name: DataTypes.STRING,
            tier_count: DataTypes.INTEGER,
            isschedule_active: {
                type: DataTypes.ENUM,
                values: ["1", "0"]
            },
            start_date: DataTypes.STRING,
            created_by: DataTypes.STRING,
            update_date: DataTypes.STRING
        }, {
            freezeTableName: true, // Model tableName will be the same as the model name
            timestamps: false
        }
    );

    return tap_billingschedule;
};