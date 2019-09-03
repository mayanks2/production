"use strict";
module.exports = {
  RESPONSE200: {
    statusCode: 200,
    message: "Success",
    data: ""
  },
  OK: {
    statusCode: 200,
    message: "Data Succesfully Updated."
  },
  RESPONSE400: {
    statusCode: 400,
    message: "Missing mandatory fields."
  },
  RESPONSE404: {
    statusCode: 404,
    message: "Data not Found."
  },
  RESPONSE403: {
    statusCode: 403,
    message: "Data not Found."
  },
  RESPONSE500: {
    statusCode: 500,
    message: "Internal Server Error"
  },
  NotAllowed: {
    statusCode: 404,
    message: "No Record Found."
  },
  loginSuccess: {
    statusCode: 200,
    message: "Success",
    offerdata: {}
  },
  DuplicateEntry: {
    statusCode: 400,
    message: "Record already found"
  },
  coupon_used: {
    statusCode: 200,
    offrer_type: 8,
    message: "Customer already used this coupon."
  },
  offer_not_found: {
    statusCode: 200,
    offrer_type: 0,
    message: "offer not found."
  },
  coupon_not_used: {
    statusCode: 200,
    offrer_type: 0,
    message: "Customer can use this coupon."
  },
  URL_NOT_FOUND: {
    statusCode: 404,
    message: "URL not Found."
  },
  CUSTOMERROR: {
    statusCode: 400,
    message: ""
  },
  SCHEDULE_CHNAGED: {
    statusCode: 201,
    message: ""
  },
  RESPONSE201: {
    statusCode: 201,
    message: "Success",
    data: ""
  }
};
