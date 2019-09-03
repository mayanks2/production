/**
 * Created by chandan on 09/04/2018
 */
"use strict";
var model = require("../model");
var config = require("../config/config");
var responseMsg = JSON.parse(JSON.stringify(require("../language/resMessage")));
var commonFunction = require("../controller/common");
var invokeFunction = require("../controller/invoked");

module.exports = {
  // merchant current active coupon by merchant id
  tap_getUsersRDS: function (req, res) {
    model.tap_merchant_offers
      .findAll({
        where: {
          MerchantId: merchant_id,
          active: "true"
        }
      })
      .then(function (result) {
        responseMsg.RESPONSE200.data = result;
        res
          .status(responseMsg.RESPONSE200.statusCode)
          .send(responseMsg.RESPONSE200);
      })
      .catch(function (err) {
        responseMsg.RESPONSE400.message = err;
        res
          .status(responseMsg.RESPONSE400.statusCode)
          .send(responseMsg.RESPONSE400);
      });
  },
  /**
   *
   * 
   * @param {*} req
   * @param {*} res
   */
  tap_getUserByEmailRDS: function (req, res) {
    const RESPONSE = {
      OK: {
        statusCode: 200,
        message: "User found successfully.!"
      },
      ERROR: {
        statusCode: 404,
        message: "User not found."
      },
      ParamMissing: {
        statusCode: 404,
        message: "Email is required."
      }
    };
    var email = req.params.user_email;
    console.log("email=====>", email);
    if (!email || email.indexOf('@') == -1) {
      responseMsg.RESPONSE400.message = "Email is required.";
      res
        .status(responseMsg.RESPONSE400.statusCode)
        .send(responseMsg.RESPONSE400);
    }
    module.exports.getUserByEmail(email).then(function (user) {
      console.log("getUserByEmail ...111", user);
      invokeFunction.encryptDecrypt(
        user.id,
        "user",
        "encrypt"
      ).then(function (user_id) {
        console.log("inside then...");
        user.id = user_id.id;
        RESPONSE.OK.data = [];
        RESPONSE.OK.data = user;
        res
          .status(RESPONSE.OK.statusCode)
          .send(RESPONSE.OK);
      }, function (error) {
        console.log("inside then...error1", error);
        RESPONSE.ERROR.message = error;
        res
          .status(RESPONSE.ERROR.statusCode)
          .send(RESPONSE.ERROR);
      });
    }, function (failFound) {
      console.log("inside then...error2");
      RESPONSE.ERROR.message = "User not found";
      res
        .status(RESPONSE.ERROR.statusCode)
        .send(RESPONSE.ERROR);
    });
  },

  /**
   *
   * Used for get thr user from user table using email id
   * @param {*} email
   * @returns
   */
  getUserByEmail: function (email) {
    return new Promise(function (resolve, reject) {
      model.tap_users
        .findAll({
          where: {
            email: email.toLowerCase(),
          }
        })
        .then(function (data) {
          if (data.length > 0) {
            resolve(data[0].dataValues);
          } else {
            reject("User not found");
            console.log("getUserByEmail error121   User not found");
          }
        })
        .catch(function (err) {
          console.log("getUserByEmail error121");
          reject(err);
        });
    });
  },
  /**
   *
   * Used for create the User..
   * @param {*} req
   * @param {*} res
   */
  tap_createUserRDS: function (req, res) {
    const RESPONSE = {
      OK: {
        statusCode: 200,
        message: "User are created successfully.!",
      },
      EXIST: {
        statusCode: 404,
        message: "Not allowed",
      },
      Duplicate: {
        statusCode: 400,
        message: "Email already Exist."
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
    var email = req.body.email;
    var name = req.body.name;
    var role = req.body.role;

    if (!email || !name || !role) {
      res
        .status(RESPONSE.ParamMissing.statusCode)
        .send(RESPONSE.ParamMissing);
    }
    module.exports.findUserByEmail(email).then(function (userData) {

      if (userData.length) {
        //update user if role is client else email already exist
        if (userData[0].role == "client") {
          // update
          var params = {};
          params.id = userData[0].id;
          params.email = email;
          params.name = name;
          params.role = role;
          module.exports.updateUser(params).then(function (updateResponse) {
            RESPONSE.OK.data = [];
            RESPONSE.OK.data = updateResponse;
            res
              .status(RESPONSE.OK.statusCode)
              .send(RESPONSE.OK);
          }, function (failResponse) {
            RESPONSE.ERROR.message = "fail update user";
            RESPONSE.ERROR.error = failResponse;
            res
              .status(RESPONSE.ERROR.statusCode)
              .send(RESPONSE.ERROR);
          });
        } else {
          // error for email already exist
          RESPONSE.ERROR.message = "Email already exist.";
          res
            .status(RESPONSE.ERROR.statusCode)
            .send(RESPONSE.ERROR);
        }
      } else {
        // insert new
        module.exports.insertUser(email, name, role).then(function (insertSuccess) {

          req.body.id = insertSuccess;
          RESPONSE.OK.data = [];
          RESPONSE.OK.data = req.body;
          res
            .status(RESPONSE.OK.statusCode)
            .send(RESPONSE.OK);
        }, function (failInsert) {
          RESPONSE.ERROR.message = "fail insert user";
          RESPONSE.ERROR.error = failInsert;
          res
            .status(RESPONSE.ERROR.statusCode)
            .send(RESPONSE.ERROR);

        });
      }
    }, function (error) {
      RESPONSE.ERROR.error = error;
      res
        .status(RESPONSE.ERROR.statusCode)
        .send(RESPONSE.ERROR);

    });
  },
  /**
   *
   *
   * @param {*} email
   * @param {*} name
   * @param {*} role
   * @returns
   */
  insertUser: function (email, name, role) {
    return new Promise(function (resolve, reject) {
      var today = Math.floor(Date.now() / 1000);
      var params = {
        TableName: 'tap_users',
        Item: {
          "name": name.toLowerCase(),
          "email": email.toLowerCase(),
          "role": role.toLowerCase(),
          "created_at": today,
          "updated_at": today
        }
      };
      model.tap_users.create(params.Item).then(function (info) {
        console.log("info.id==========>", info.id);
        resolve(info.id);
      }).catch(function (err) {
        console.log("in error.....", err);
        reject(err);
      });
    });

  },

  /**
   *
   *
   * @param {*} email
   * @returns
   */
  findUserByEmail: function (email) {
    return new Promise(function (resolve, reject) {
      model.tap_users
        .findAll({
          where: {
            email: email.toLowerCase()
          }
        })
        .then(function (data) {
          if (data.length > 0) {
            resolve(data);
          } else {
            resolve([]);
          }
        })
        .catch(function (err) {
          reject(err);
        });
    });
  },

  /**
   *
   *
   * @param {*} params
   * @returns
   */
  updateUser: function (params) {
    return new Promise(function (resolve, reject) {
      var today = Math.floor(Date.now() / 1000);
      var query = "UPDATE tap_users SET updated_at=:updated_at";

      if (params.email !== undefined) {
        query += ", email=:email";
      }
      if (params.name !== undefined) {
        query += ", name=:name";
      }
      if (params.role !== undefined) {
        query += ", role=:role";
      }

      query += " WHERE id=:id";
      console.log(query);
      model.sequelize.query(query, {
        replacements: {
          updated_at: today,
          email: params.params.email.toLowerCase(),
          name: params.name.toLowerCase(),
          role: params.role.toLowerCase(),
          id: params.id
        },
        type: model.sequelize.QueryTypes.UPDATE
      }).then(function (data) {
        model.tap_users
          .findAll({
            where: {
              id: params.id
            }
          })
          .then(function (data2) {
            if (data2.length > 0) {
              resolve(data2[0]);
            } else {
              reject("User not found.");
            }
          })
          .catch(function (err) {
            reject(err);
          });
      }).catch(function (err) {
        console.log(err);
        reject(err);
      });
    });
  },
};