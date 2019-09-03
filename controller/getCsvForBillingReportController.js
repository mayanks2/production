var model = require("../model");
var async = require('async')
var fs = require('fs');
var path = require('path');
var tierBillingSchedule = require('./tierBillingSchedule')


const responseMsg = require("../language/resMessage");
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
    path: 'out.csv',
    header: [
        { id: 'nick_name', title: 'DBA NAME' },
        { id: 'schedule_name', title: 'Schedule Name' },
        { id: 'current_tier', title: 'Current Tier' },
        { id: 'new_tier', title: 'New Tier' },
        { id: 'segment_count', title: 'Segment Count' },
        { id: 'overage_charge', title: 'Overage Charge' },
        { id: 'current_monthly_subscription', title: 'Current Monthly Subscription' },
        { id: 'new_monthly_subscription', title: 'New Monthly Subscription' },
        { id: 'billing_event', title: 'Billing Event' },
        { id: 'date_trigger', title: 'Date Triggered' },
    ]
});

module.exports = {
    getCsv: (async (req, res) => {
        try {
            // call the file required
            var filterdData = req.body.filterData;
            var whereCondition = {
                active: "true"
            };
            var billingWhereCondition = {};
            if (filterdData["search"]["value"]) {
                whereCondition["$or"] = [
                    {
                        merchant_id: {
                            $like: "%" + filterdData["search"]["value"] + "%"
                        }
                    },
                    {
                        dba: {
                            $like: "%" + filterdData["search"]["value"] + "%"
                        }
                    },
                    {
                        email: {
                            $like: "%" + filterdData["search"]["value"] + "%"
                        }
                    },
                    {
                        phoneNumber: {
                            $like: "%" + filterdData["search"]["value"] + "%"
                        }
                    }
                ];
            }
            if (filterdData["start_date"] && filterdData["end_date"]) {
                billingWhereCondition.date_triggered = {
                    $gte: filterdData["start_date"],
                    $lte: filterdData["end_date"]
                };
            }
            var start = parseInt(filterdData["start"]); //Paging first record indicator.

            model.tap_billing_report.belongsTo(model.tap_merchants, {
                foreignKey: "merchant_id",
                targetKey: "merchant_id"
            });
            model.tap_billing_report.belongsTo(model.tap_billingschedule, {
                foreignKey: "schedule_id",
                targetKey: "id"
            });

            var outputData = {};
            outputData.totalRecords = 0;
            model.tap_billing_report
                .findAll({
                    attributes: [
                        [
                            model.sequelize.fn(
                                "COUNT",
                                model.sequelize.col("tap_billing_report.id")
                            ),
                            "totalRecords"
                        ]
                    ],
                    where: billingWhereCondition,
                    include: {
                        attributes: ["dba"],
                        model: model.tap_merchants,
                        where: whereCondition
                    }
                })
                .then(function (data) {
                    var totalRecordData = data.map(function (data) {
                        return data.toJSON();
                    });
                    if (totalRecordData[0].totalRecords) {
                        outputData.totalRecords = totalRecordData[0].totalRecords;
                        model.tap_billing_report
                            .findAll({
                                attributes: [
                                    "merchant_id",
                                    "schedule_id",
                                    "segment_count",
                                    "overage_charge",
                                    "current_monthly_subscription",
                                    "new_monthly_subscription",
                                    "billing_event",
                                    "date_triggered",
                                    "event_completion_date",
                                    [
                                        model.sequelize.literal(
                                            "(SELECT tier_number FROM tap_schedule_tier_information WHERE tap_schedule_tier_information.id = tap_billing_report.current_tier)"
                                        ),
                                        "current_tier"
                                    ],
                                    [
                                        model.sequelize.literal(
                                            "(SELECT tier_number FROM tap_schedule_tier_information WHERE tap_schedule_tier_information.id = tap_billing_report.new_tier)"
                                        ),
                                        "new_tier"
                                    ]
                                ],
                                where: billingWhereCondition,
                                include: [
                                    {
                                        attributes: ["nick_name"],
                                        model: model.tap_merchants,
                                        where: whereCondition
                                    },
                                    {
                                        attributes: ["schedule_name"],
                                        model: model.tap_billingschedule
                                    }
                                ],
                                order: [["date_triggered", "DESC"]],
                                offset: start
                            })
                            .then(async function (data) {
                                let newData = [];
                                var paginationData = data.map(function (data) {
                                    return data.toJSON();
                                });
                                async.forEachSeries(paginationData, function (dataToEdit, customerCallback) {
                                    newData.push({
                                        merchant_id: dataToEdit.merchant_id,
                                        schedule_id: dataToEdit.schedule_id,
                                        segment_count: dataToEdit.segment_count,
                                        overage_charge: dataToEdit.overage_charge,
                                        current_monthly_subscription: dataToEdit.current_monthly_subscription,
                                        new_monthly_subscription: dataToEdit.new_monthly_subscription,
                                        billing_event: dataToEdit.billing_event,
                                        date_triggered: dataToEdit.date_triggered,
                                        event_completion_date: dataToEdit.event_completion_date,
                                        current_tier: dataToEdit.current_tier,
                                        new_tier: dataToEdit.new_tier,
                                        nick_name: dataToEdit.tap_merchant.nick_name,
                                        schedule_name: dataToEdit.tap_billingschedule.schedule_name
                                    })
                                    customerCallback()
                                }, async function (err) {
                                    var deleteFileCheck = await deleteFile();
                                    csvWriter
                                        .writeRecords(newData)
                                        .then(() => {
                                            var filePath = path.join(__dirname, '../out.csv');
                                            res.setHeader('Content-disposition', 'attachment; filename=out.csv');
                                            res.set('Content-Type', 'text/csv');
                                            return res.download(filePath);
                                        });
                                })
                            })
                            .catch(function (err) {
                                responseMsg.RESPONSE400.message = err.message;
                                return res
                                    .status(responseMsg.RESPONSE400.statusCode)
                                    .send(responseMsg.RESPONSE400);
                            });
                    } else {
                        return res
                            .status(responseMsg.RESPONSE400.statusCode)
                            .send(responseMsg.RESPONSE400);
                    }
                })
                .catch(function (err) {
                    responseMsg.RESPONSE400.message = err.message;
                    return res
                        .status(responseMsg.RESPONSE400.statusCode)
                        .send(responseMsg.RESPONSE400);
                });
        } catch (error) {
            responseMsg.RESPONSE400.message = error.message;
            return res
                .status(responseMsg.RESPONSE400.statusCode)
                .send(responseMsg.RESPONSE400);
        }
    })
}

/**
 * Delete File
 */
function deleteFile() {
    return new Promise(function (resolve, reject) {
        var filePathForDelete = path.join(__dirname, '../out.csv');
        fs.unlink(filePathForDelete, function (error) {
            if (error) {
                resolve(true);
            }
            resolve(true);
        });
    });
}