/**
 * Created by chandan on 08/31/2018
 */
var router = require("express").Router();
//var router = require('../config/routes');

var getVersionController = require("../controller/getVersionController");

// router.post("/", getVersionController.updateAppVersion);

router.get("/", getVersionController.getVersionControll);
module.exports = router;