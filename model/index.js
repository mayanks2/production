"use strict";

var fs = require("fs");
var path = require("path");
var Sequelize = require("sequelize");
var basename = path.basename(__filename);
var config = require("../config/config");
var db = {};

if (config.use_env_variable) {
  var sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  var sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js"
    );
  })
  .forEach(file => {
    var model = sequelize["import"](path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

//asign all module.
db.tap_appversion = require("./tap_appversion")(sequelize, Sequelize);
db.tap_merchants = require("./tap_merchants")(sequelize, Sequelize);
db.tap_users = require("./user")(sequelize, Sequelize);
db.tap_coupons = require("./tap_coupons")(sequelize, Sequelize);
db.tap_sent_sms = require("./tap_sent_sms")(sequelize, Sequelize);
db.tap_failed_sms = require("./tap_failed_sms")(sequelize, Sequelize);
db.tap_sent_emails = require("./tap_sent_emails")(sequelize, Sequelize);
db.tap_customers_merchant = require("./tap_customers_merchant")(
  sequelize,
  Sequelize
);
db.tap_merchant_offers = require("./tap_merchant_offers")(sequelize, Sequelize);
db.tap_merchant_deep_link = require("./tap_merchant_deep_link")(
  sequelize,
  Sequelize
);
db.tap_merchant_optin_batch_sms = require("./tap_merchant_optin_batch_sms")(
  sequelize,
  Sequelize
);
db.tap_customers = require("./tap_customers")(sequelize, Sequelize);
db.tab_customers_visitlog = require("./tab_customers_visitlog")(
  sequelize,
  Sequelize
);
db.tap_merchant_beacon = require("./tap_merchant_beacon")(sequelize, Sequelize);
db.tap_merchantdevice_pin = require("./tap_merchantdevice_pin")(
  sequelize,
  Sequelize
);
db.tap_customers_typeslog = require("./tap_customers_typeslog")(
  sequelize,
  Sequelize
);
db.tap_gotu_campaigns = require("./tap_gotu_campaigns")(sequelize, Sequelize);
db.tap_customer_punchcards = require("./tap_customer_punchcards")(
  sequelize,
  Sequelize
);
db.tap_customer_orders = require("./tap_customer_orders")(sequelize, Sequelize);
db.tap_coupons_used = require("./tap_coupons_used")(sequelize, Sequelize);
db.tap_qrcode_used = require("./tap_qrcode_used")(sequelize, Sequelize);
db.tap_qrcode = require("./tap_qrcode")(sequelize, Sequelize);
db.tap_campaigns = require("./tap_campaigns")(sequelize, Sequelize);
db.tap_gotu_push_order_track = require("./tap_gotu_push_order_track")(
  sequelize,
  Sequelize
);
db.tap_adscount = require("./tap_adscount")(sequelize, Sequelize);
db.tap_global_merchants = require("./tap_global_merchants")(
  sequelize,
  Sequelize
);
db.tap_merchant_image_gallery = require("./tap_merchant_image_gallery")(
  sequelize,
  Sequelize
);
db.tap_offer_activation = require("./tap_offer_activation")(
  sequelize,
  Sequelize
);
db.tap_billing_report = require("./tap_billing_report")(sequelize, Sequelize);
db.tap_settings = require("./tap_settings")(sequelize, Sequelize);
//Downgrade Requests
db.tap_downgrade_requests = require("./tap_downgrade_requests")(
  sequelize,
  Sequelize
);
// Optin Log
db.tap_optin_log = require("./tap_optin_log")(sequelize, Sequelize);
//Downgrade Requests History
db.tap_downgrade_requests_history = require("./tap_downgrade_requests_history")(
  sequelize,
  Sequelize
);
// Notitification Log
db.tap_billing_notification_log = require("./tap_billing_notification_log")(
  sequelize,
  Sequelize
);
db.tap_customers_activity = require("./tap_customers_activity")(sequelize, Sequelize);
db.tap_pending_messages = require("./tap_pending_messages")(sequelize, Sequelize);

module.exports = db;
