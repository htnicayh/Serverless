"use strict";

const uuid = require("uuid");
const AWS = require("aws-sdk");

AWS.config.setPromisesDependency(require("bluebird"));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.create = (event, context, callback) => {
  const requestBody = JSON.parse(event.body);
  const title = requestBody.title;
  const text = requestBody.text;

  if (typeof title !== "string" || typeof text !== "string") {
    console.error("Validation Failed");
    callback(new Error("Couldn't create note because of validation errors."));
    return;
  }

  createNote(noteInfo(title, text))
    .then((res) => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          message: `Successfully created note with text ${text}`,
          noteId: res.id,
        }),
      });
    })
    .catch((err) => {
      console.log(err);
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          message: `Unable to create note with text ${text}`,
        }),
      });
    });
};

module.exports.listNotes = (event, context, callback) => {
  var params = {
    TableName: process.env.TABLE,
    ProjectionExpression: "id, title",
  };

  console.log("Scanning Note table.");
  const onScan = (err, data) => {
    if (err) {
      console.log(
        "Scan failed to load data. Error JSON:",
        JSON.stringify(err, null, 2)
      );
      callback(err);
    } else {
      console.log("Scan succeeded.");
      return callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          notes: data.Items,
        }),
      });
    }
  };

  dynamoDb.scan(params, onScan);
};

module.exports.noteDetails = (event, context, callback) => {
  const params = {
    TableName: process.env.TABLE,
    Key: {
      id: event.pathParameters.id,
    },
  };

  dynamoDb
    .get(params)
    .promise()
    .then((result) => {
      const response = {
        statusCode: 200,
        body: JSON.stringify(result.Item),
      };
      callback(null, response);
    })
    .catch((error) => {
      console.error(error);
      callback(new Error("Couldn't fetch note."));
      return;
    });
};


const createNote = (note) => {
  console.log("Submitting note");
  const noteInfo = {
    TableName: process.env.TABLE,
    Item: note,
  };
  return dynamoDb
    .put(noteInfo)
    .promise()
    .then((res) => note);
};

const noteInfo = (title, text) => {
  const timestamp = new Date().getTime();
  return {
    id: uuid.v1(),
    title: title,
    text: text,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};
