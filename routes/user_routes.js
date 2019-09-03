/**
 * Created by chandan on 09/04/2018
 */
const router = require('express').Router();
router.get(
    "/:user/chandan", (req, res) => {
        res.send('HEY! userschansah')
    });
module.exports = router;