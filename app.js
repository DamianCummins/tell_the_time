"use strict";

var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var path = require("path");

var tellTheTime = require("./tellTheTime.js")();

var port = process.env.VCAP_APP_PORT || process.env.PORT || 3000;

var router = express.Router();

tellTheTime.start();

app.use(bodyParser.urlencoded({"extended": true}));
app.use(bodyParser.json());

router.use(function(req, res, next) {
   console.log(new Date().toUTCString() + " LOG Router request " + req.method + " " + req.originalUrl);
   next();
});

router.get("/", function(req, res) {
   res.sendFile(path.join(__dirname + "/index.html"));
});

router.route("/status")
   .get(function(req, res) {
      tellTheTime.isMicStopped(function(status) {
          if (status) {
              res.json({'message':'SNOOZING'});
          } else {
              res.json({'message':'AWAKE'});
          }
      });
   });


router.route("/pause")
   .post(function(req, res) {
      tellTheTime.pause(function(err) {
         if (!err) {
            res.json({'message':'SNOOZING'});
         }
      });
   });

router.route("/resume")
   .post(function(req, res) {
      tellTheTime.start();
      tellTheTime.isMicStopped(function(status) {
          if (status) {
              res.json({'message':'SNOOZING'});
          } else {
              res.json({'message':'AWAKE'});
          }
      });
   });

app.use("/tjbot", router);

app.use(function(req, res, next) {
   res.status(404);
   console.error("ERROR: Page not found");
   res.json({"code": 404, "message": "Page not found."});
});

app.listen(port, function() {
   console.log("TJBot monitor app listening on port "+port+"!");
});
