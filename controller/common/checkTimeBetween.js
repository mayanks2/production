const momentTimezone = require('moment-timezone');

module.exports = {
  checkTimeVaildationForMessages: function(timezone) {
    return new Promise((resolve, reject) => {
      try {
        var checkTime = momentTimezone().tz(timezone).format('HH');
        if ((parseInt(checkTime) >= 8 ) && (parseInt(checkTime) <= 21)) {
          return resolve(true);
        } else {
          return resolve(false);
        }
      } catch (error) {
        return reject(error);
      }
    });
  }
};
