"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var path = require('path');
var request = require('request');

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var boxTagName = '便當';
var foodTable = {
   '青菜': {
      'display': 'vegetables',
      'calorie': 75
   },
   '便當': {
      'display': 'boxed meal',
      'calorie': 705
   },
   '港式叉燒': {
      'display': 'Hong Kong-style pork roast',
      'calorie': 392
   },
   '滷排骨': {
      'display': 'braised pork ribs',
      'calorie': 131
   },
   '炸排骨': {
      'display': 'fried ribs',
      'calorie': 88
   },
   '炸雞腿': {
      'display': 'fried chicken',
      'calorie': 246
   },
   '烤雞腿': {
      'display': 'roast chicken',
      'calorie': 101
   },
   '荷包蛋': {
      'display': 'poached egg',
      'calorie': 91
   },
   '蛋': {
      'display': 'Egg',
      'calorie': 85
   },
   '豆乾': {
      'display': 'dried bean',
      'calorie': 88
   },
   '魚排': {
      'display': 'fish steak',
      'calorie': 75
   }
};

var tableName = 'botdata';
// var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
// var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

var bot = new builder.UniversalBot(connector);
bot.localePath(path.join(__dirname, './locale'));
// bot.set('storage', tableStorage);

const PredictImageUrl = "https://southcentralus.api.cognitive.microsoft.com/customvision/v2.0/Prediction/14f16d27-19d8-46fa-9516-d1f0d7865813/url?iterationId=9e2ff709-26b4-461d-8d53-f841ff3b289a"
const PredictImage = "https://southcentralus.api.cognitive.microsoft.com/customvision/v2.0/Prediction/14f16d27-19d8-46fa-9516-d1f0d7865813/image?iterationId=9e2ff709-26b4-461d-8d53-f841ff3b289a"
const predictionKey = process.env['PREDICITON_KEY']

if (predictionKey == null) {
    console.log("please set custom vision key")
    console.log("$export PREDICITON_KEY=${key}")
    //return;
}

var imageDetection = function(session, name, url) {

    var myPromise = new Promise(function(resolve, reject){
        session.send(url)
        
        var headers = {
            'Prediction-Key': predictionKey,
            'Content-Type': 'application/octet-stream'
        }

        request
        .get(url)
        .on('response', function(response) {
            session.send("response") // 200
            session.send(response) // 200
          })
        .on('error', function(err) {
            session.send(err)
          })
        .pipe(
            request.post({ url: PredictImage, headers: headers }, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var info = JSON.parse(body);
                    console.log(info);
                    processDetectionInfo(session, info);
                    resolve()
                }
                else {
                    session.send("response.statusCode")
                    session.send(response.statusCode);
                    console.log(response.statusCode)
                }
            })
        )
    })
    Promise.all([myPromise]).then(function() {
        session.send("done")
    })
    session.send("here")
    
}

var calculateCalorie = function(predictions) {
   var ret = {
      'tags': [],
      'totalCalorie': 0
   };
   var tmpCalorie = 0;
   var hasBoxTag = false;
   var tmpTable = {};

   for (var prediction of predictions) {
      if (prediction.tagName in foodTable) {
         if (0.15 > parseFloat(prediction.probability)) {
            continue;
         }

         if (prediction.tagName == boxTagName) {
            hasBoxTag = true;
         }

         if (prediction.tagName in tmpTable ||
               prediction.tagName == boxTagName) {
            continue;
         }

         ret.tags.push(
            foodTable[prediction.tagName].display
         );
         tmpTable[prediction.tagName] = true;
         tmpCalorie += foodTable[prediction.tagName].calorie;

      }
   }

   if (tmpCalorie < foodTable[boxTagName].calorie) {
      tmpCalorie = foodTable[boxTagName].calorie;
   }

   ret.totalCalorie = tmpCalorie;
   return ret;
}

var processDetectionInfo = function(session, result) {
    session.send("processDetectionInfo")
   var foods = []
   var calculateResult = calculateCalorie(result.predictions);
   session.send("I found foods " + calculateResult.tags.join(',') + ", total calories are " + calculateResult.totalCalorie);
}

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector, function (session) {
    var msg = session.message;
    if (msg.attachments && msg.attachments.length > 0) {
        // Echo back attachment
        session.beginDialog('calculate');
        
    } else {
        if (msg.text.includes("show")) {
            session.send("Please see the report");
            session.send("https://msit.powerbi.com/groups/d6578846-f8f7-4467-af3d-d2577a0d790f/reports/c50bf3de-1d6c-4a31-91f6-010b6e80d6f4/ReportSection?filter=user_pf~2Fu_id%20eq%20'5'");
        }   
    }
});

bot.dialog('calculate', [
    function (session, args, next) {
        var msg = session.message;
        var attachment = msg.attachments[0];
        imageDetection(session, attachment.name, attachment.contentUrl)
    },
]);


if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function () {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());
} else {
    module.exports = connector.listen();
}
