"use strict";
var fs = require('fs');
var csv = require('fast-csv');

var fs = require('fs');
var workspace = JSON.parse(fs.readFileSync('tellTheTime_workspace.json', 'utf8'));

var stream = fs.createReadStream("timezones.csv");

var entityValues = [];

var dialogNodeCounter = 0;

var dialogs = [];



var csvStream = csv()
    .on("data", function(data){
        var zone = data[0];
        var zoneTokens = zone.split("/");
        var city = zoneTokens[zoneTokens.length -1].replace("_", " ");

        var entityValue = {
            value: city,
            synonyms: [],
            metadata: null
        };

        entityValues.push(entityValue);

        if (city.indexOf(" ") > -1) {
            city = "(" + city + ")";
        }
        var offset = parseFloat(data[1]);
        var dst = data[2];
        var dialogResponse = {
            "type":"response_condition",
            "go_to":null,
            "output":{
                "text":{
                   "values":[
                      "The time in @city is todays_date"
                   ],
                   "selection_policy":"sequential"
                },
                "context":{
                   "timezoneOffset": offset,
                   "dst": dst
                }
            },
            "parent":"Tell the Time",
            "context":null,
            "metadata":null,
            "conditions":" @city:"+city,
            "description":null,
            "dialog_node":"dialog_node_" + dialogNodeCounter,
            "previous_sibling":"dialog_node_" + (dialogNodeCounter - 1)
        };
        if(dialogNodeCounter === 0) {
            dialogResponse["previous_sibling"] = "node_3_1490294223086";
        }
        dialogNodeCounter++;
        dialogs.push(dialogResponse);

        console.log(data);
        console.log(JSON.stringify(entityValue));
        console.log(JSON.stringify(dialogResponse));

    })
    .on("end", function(){
         console.log("done");
         console.log(dialogs.length);
         console.log(entityValues.length);
         workspace.entities[0].values = workspace.entities[0].values.concat(entityValues);
         workspace.dialog_nodes = workspace.dialog_nodes.concat(dialogs);
        fs.writeFileSync('tellTheTime_workspace_new.json', JSON.stringify(workspace, null, 3));
    });
stream.pipe(csvStream);
