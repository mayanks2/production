var model = require("../../model");

module.exports = {
    checkTrainingMode: (merchant_id) => {
        try {
            return new Promise((resolve, reject) => {
                //check Merchant is in training mode or not
                model.tap_merchants.find({
                    where: {
                        merchant_id: merchant_id,
                        is_training : '1'
                    }
                }).then((getTrainingResponse) => {
                    if(getTrainingResponse){
                        // console.log("in training mode")
                        resolve(true)
                    }else{
                        // console.log("not in training mode")
                        resolve(false)
                    }
                })
            });
        } catch (error) {
            reject(error);
        }
    }
};
