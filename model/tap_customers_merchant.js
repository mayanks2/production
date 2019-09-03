"use strict";
module.exports = (sequelize, DataTypes) => {
  var tap_customers_merchant = sequelize.define(
    "tap_customers_merchant", {
      customer_phone: DataTypes.STRING,
      merchant_id: DataTypes.STRING,
      optin: {
        type: DataTypes.ENUM,
        values: ["1", "0"],
        defaultValue: "0"
      },
      customer_id: DataTypes.BIGINT(20),
      created_at: DataTypes.INTEGER,
      type: {
        type: DataTypes.ENUM,
        values: ["regular", "normal", "vip", "casual"],
        defaultValue: "regular"
      },
      clover_id: DataTypes.STRING,
      optin_at: DataTypes.INTEGER,
      updated_at: DataTypes.INTEGER,
      last_visit_at: DataTypes.INTEGER,
      firstName: DataTypes.STRING,
      lastName: DataTypes.STRING,
      emails: DataTypes.TEXT,
      birthDay: DataTypes.INTEGER,
      birthMonth: DataTypes.INTEGER,
      birthYear: DataTypes.INTEGER,
      full_dob: DataTypes.STRING,
      zip: DataTypes.STRING,
      prefContactMethod: DataTypes.INTEGER,
      gender: {
        type: DataTypes.ENUM,
        values: ["m", "f", "o"]
      },
      profile_completed: DataTypes.INTEGER,
      profile_reminder: DataTypes.INTEGER,
      notes: DataTypes.STRING,
      type_update_date: DataTypes.INTEGER
    }, {
      freezeTableName: true, // Model tableName will be the same as the model name
      timestamps: false
    }
  );

  return tap_customers_merchant;
};