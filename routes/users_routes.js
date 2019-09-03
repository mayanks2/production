'use strict';
/**
 * Created by chandan on 08/31/2018
 */
var router = require('express').Router();
var UsersController = require("../controller/usersController");

router.get("/search/:user_email/", UsersController.tap_getUserByEmailRDS);
router.post("/", UsersController.tap_createUserRDS);

module.exports = router;