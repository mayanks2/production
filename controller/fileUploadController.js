"use strict";
var router = require("express").Router();
var model = require('../model');
var express = require('express');
var multer = require('multer');
var path = require('path');
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));

var storage = multer.diskStorage({

    destination: function (req, file, callback) {
        console.log('File Name', file);
        callback(null, './uploads')
    },
    filename: function (req, file, callback) {
        const mainFileName = file.originalname.replace(path.extname(file.originalname), '') + '-' + Date.now() + path.extname(file.originalname);
        var imagelog = {
            Item: {
                image: mainFileName,
                created_at: Math.floor(Date.now() / 1000)
            }
        };
        model.tap_image_gallery.create(imagelog.Item).then(function (result) {
                callback(null, mainFileName);
            })
            .catch(function (err) {
                callback(err);
            });

    }
});

module.exports = {
    getAllGalleryImage: function (req, res) {
        model.tap_image_gallery.findAll({
            order: model.sequelize.literal('created_at DESC')
        }).then(
            function (rows) {
                if (rows.length >= 0) {
                    responseMsg.RESPONSE200.data = rows;
                    responseMsg.RESPONSE200.message = 'All Images.';
                    res
                        .status(responseMsg.RESPONSE200.statusCode)
                        .send(responseMsg.RESPONSE200);
                } else {
                    res
                        .status(responseMsg.RESPONSE400.statusCode)
                        .send(responseMsg.RESPONSE400);
                }
            },
            function (err) {
                res
                    .status(responseMsg.RESPONSE400.statusCode)
                    .send(responseMsg.RESPONSE400);
            }
        );
    },
    getAllGalleryImageById: function (req, res) {
        const row_id = req.params.id;
        model.tap_image_gallery.findAll({
            where: {
                id: row_id
            }
        }).then(
            function (rows) {
                if (rows.length >= 0) {
                    responseMsg.RESPONSE200.data = rows;
                    responseMsg.RESPONSE200.message = 'All Images.';
                    res
                        .status(responseMsg.RESPONSE200.statusCode)
                        .send(responseMsg.RESPONSE200);
                } else {
                    res
                        .status(responseMsg.RESPONSE400.statusCode)
                        .send(responseMsg.RESPONSE400);
                }
            },
            function (err) {
                res
                    .status(responseMsg.RESPONSE400.statusCode)
                    .send(responseMsg.RESPONSE400);
            }
        );
    },
    uplodGalleryFile: function (req, res) {
        var upload = multer({
            storage: storage,
            limits: {
                fileSize: 500000
            },
            fileFilter: function (req, file, callback) {
                var ext = path.extname(file.originalname)
                if (ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg' && ext !== '.bmp') {
                    return callback('Only images are allowed', null)
                }
                callback(null, true);
            }
        }).single('pre_defined')
        upload(req, res, function (err, data) {
            if (err) {
                if (err.message) {
                    responseMsg.RESPONSE400.message = err.message;
                } else {
                    responseMsg.RESPONSE400.message = err;
                }
                res
                    .status(responseMsg.RESPONSE400.statusCode)
                    .send(responseMsg.RESPONSE400);
            } else {
                responseMsg.OK.message = 'Image successfully uploaded';
                res
                    .status(responseMsg.OK.statusCode)
                    .send(responseMsg.OK);
            }
        });
    }
}
// router.post('/gallery', function (req, res) {});