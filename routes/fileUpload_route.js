"use strict";


/**
 * Created by chandan on 08/31/2018
 */
var router = require("express").Router();
var fileUpaodController = require('../controller/fileUploadController');
var twilioController = require('../controller/tap_twilioSMSController');
var express = require('express');
var multer = require('multer');
var path = require('path');
var upload = multer({
    dest: 'uploads/'
})
// var storage = multer.diskStorage({
//     destination: function (req, file, callback) {
//         callback(null, './uploads')
//     },
//     filename: function (req, file, callback) {
//         console.log(file);
//         callback(null, file.originalname.replace(path.extname(file.originalname), '') + '-' + Date.now() + path.extname(file.originalname))
//     }
// });

router.get('/galleryImages', fileUpaodController.getAllGalleryImage);
router.get('/getgalleryImagesById/:id', fileUpaodController.getAllGalleryImageById);
router.post('/gallery', fileUpaodController.uplodGalleryFile);
router.post('/twiliomsg', twilioController.twilioSMSSent);



module.exports = router;