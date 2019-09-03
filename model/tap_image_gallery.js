'use strict';
module.exports = (sequelize, DataTypes) => {
    var tap_image_gallery = sequelize.define('tap_image_gallery', {
        image: DataTypes.STRING,
        created_at: DataTypes.INTEGER,
    }, {
        freezeTableName: true, // Model tableName will be the same as the model name
        timestamps: false
    });

    return tap_image_gallery;
};