/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var TJBot = require('tjbot');
var config = require('./config');
var exec = require('child_process').exec;
var audioDir = __dirname + "/audio/";
var tellTheTime = function() {

    // obtain our credentials from config.js
    var credentials = config.credentials;

    // obtain user-specific config
    var WORKSPACEID = config.conversationWorkspaceId;

    // these are the hardware capabilities that TJ needs for this recipe
    var hardware = ['microphone', 'speaker'];

    // set up TJBot's configuration
    var tjConfig = {
        verboseLogging: true,
        robot: {
            name: 'Buddy',
            homophones: ['Buddy', 'Body', 'but they', 'but he', 'but the'],
            gender: 'male'
        }
    };

    // instantiate our TJBot!
    var tj = new TJBot(hardware, tjConfig, credentials);

    // current listening state
    var stopped = true;

    // Methods to communicate state change through speech
    var sayHello = function() {
      tj.speak("Hi everyone, I'm awake!");
    };

    var internalError = function(callback) {
      tj.speak("I'm not feeling too good, I'm going to shut down for a while.");
      return callback();
    };

    var stop = function(callback) {
      tj.speak("If you don't mind, I think I'll shut down for a while.");
      return callback();
    };

    var understood = function() {
      var create_audio = exec('aplay '+audioDir+'understood.wav', function (error, stdout, stderr) {
        if (error !== null) {
          console.log('exec error: ' + error);
        }
      });
    };

    return {
        "start": function() {

            micStopped = false;
            console.log(tj.configuration.robot.name +" is listening, you may speak now.");
            console.log("Try saying, \"" + tj.configuration.robot.name + ", what time is it in Tokyo?\"");
            
            sayHello();

            // listen for utterances with our attentionWord and send the result to
            // the Conversation service
            tj.listen(function(msg) {
                // check to see if they are talking to TJBot
                if (tj.configuration.robot.homophones.some(function(v) { return msg.toLowerCase().indexOf(v.toLowerCase()) >= 0; })) {
                    understood();
                    // remove our name from the message
                    var turn = msg.toLowerCase();

                    tj.configuration.robot.homophones.forEach(function(homophone) {
                        turn = turn.replace(homophone.toLowerCase(), "");
                    });

                    // send to the conversation service
                    tj.converse(WORKSPACEID, turn, function(response) {
                        console.log(response);
                        intent = null;
                        // If an intent was detected, log it out to the console.
                        if (response.object.intents.length > 0) {
                            console.log('Detected intent: #' + response.object.intents[0].intent);
                            intent = response.object.intents[0].intent;
                        }
                        
                        if (intent === "tellTheTime") {
                            responseString = "";
                            
                            // create Date object for current location
                            d = new Date();

                            // convert to msec
                            // add local time zone offset
                            // get UTC time in msec
                            utc = d.getTime();
                            nd = d;
                            console.log(response.object.output.text[0]);
                            if (response.object.output.context != undefined) {
                                dstHourSecs = 0;
                                if (response.object.output.context.dst === "1") {
                                    dstHourSecs = 3600;
                                }
                                offsetSecs = dstHourSecs + response.object.output.context.timezoneOffset;
                                offset = offsetSecs * 1000;
                                console.log(offset);
                                // create new Date object for different city
                                // using supplied offset
                                nd = new Date(utc + offset);
                                isoString = nd.toISOString();
                                time = isoString.substring(isoString.indexOf("T")+1, isoString.indexOf("."));
                                console.log(time);
                                responseString = response.object.output.text[0].replace("todays_date", time);
                            } else {
                                responseString = response.object.output.text[0].replace("todays_date", nd.toLocaleTimeString());
                            }
               
                            //Replace date token with Time string
                            response.object.output.text[0] = responseString;
                        }
                        // speak the result
                        tj.speak(response.object.output.text[0]);
                    });
                }
            });
        },
        "stop": function(callback) {
            if (!stopped) {
                stop(function() {
                    tj.stopListening();
                    stopped = true;
                    return callback();
                });
            }
        },
        "isStopped": function(callback) {
            return callback(stopped);
        }
    }
};

module.exports = tellTheTime;
