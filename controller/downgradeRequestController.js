var model = require("../model");
var reMessage = require('../language/resMessage');

module.exports = {

    downgradeMethod: ((data) => {
        return new Promise((resolve, reject) => {
            try {
                model.tap_downgrade_requests.create({
                        merchant_id: data.merchant_id,
                        schedule_id: data.schedule_id,
                        tier_id: data.tier_id,
                        user_Email: data.user_email,
                        requested_by_admin: data.requested_by_admin,
                        isdowngrade_used: data.isdowngrade_used,
                        start_date: data.start_date,
                        update_date: data.update_date
                    })
                    .then((response) => {
                        resolve({status : true ,  data : response})
                    })
                    .catch((err) => {
                        reject(err)
                    });
            } catch (error) {
                reject(error)
            }
        })

    })
}