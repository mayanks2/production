'use strict';
var model = require('../model');
var config = require('../config/config');

const RESPONSE = {
	OK: {
		statusCode: 200,
		data:[]
	},
	ERROR: {
		statusCode: 404,
		message: "Something went wrong. Please try again."
	},
	ParamMissing: {
		statusCode: 404,
		message: "Missing mandatory fields."
	}
};

module.exports = {
    getGotuCampigns: function (req, res) {
        var merchant_id=req.params.merchant_id;
        if (!merchant_id) {
            res.send(JSON.stringify(RESPONSE.ParamMissing));
        }
        var sql = "SELECT * FROM tap_gotu_campaigns WHERE merchant_id=" + mysql.escape(merchant_id) + " AND type = 'gotu' AND active='true'";
        conn.query(sql, function (err, rows, fields) {
            if(!err){
                    RESPONSE.OK.data = rows;
                    res.send(RESPONSE.OK); 
            } else{
                RESPONSE.ERROR.message = err.message;
                res.send(JSON.stringify(RESPONSE.ERROR));
            }
        });
    }
};