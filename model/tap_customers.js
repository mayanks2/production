"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_customers = sequelize.define(
    "tap_customers",
    {
      phoneNumber: DataTypes.STRING,
      short_code: DataTypes.STRING,
      created_at: DataTypes.INTEGER,
      last_visit_at: DataTypes.INTEGER,
      prefContactMethod: DataTypes.INTEGER,
      type: {
        type: DataTypes.ENUM,
        values: ["normal", "casual", "regular", "vip"]
      },
      couponsHold: {
        type: DataTypes.ENUM,
        values: ["true", "false"]
      },
      total_discount: DataTypes.DOUBLE(20, 5),
      total_orders: DataTypes.INTEGER(11),
      total_purchase: DataTypes.DOUBLE(20, 5),
      updated_at: DataTypes.INTEGER,
      full_dob: DataTypes.DATE,
      lastName: DataTypes.STRING,
      birthDay: DataTypes.INTEGER,
      birthMonth: DataTypes.INTEGER,
      birthYear: DataTypes.INTEGER,
      emails: DataTypes.TEXT,
      firstName: DataTypes.STRING,
      social_ids: DataTypes.TEXT,
      zip: DataTypes.STRING,
      refferedByID: DataTypes.INTEGER,
      initialReferral: DataTypes.STRING,
      cognito_id: DataTypes.STRING,
      gender: {
        type: DataTypes.ENUM,
        values: ["m", "f"]
      },
      profile_completed: DataTypes.BOOLEAN,
      last_notified: DataTypes.INTEGER
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_customers;
};
