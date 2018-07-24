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
      'display': '青菜',
      'calorie': 75
   },
   '便當': {
      'display': '便當',
      'calorie': 705
   },
   '港式叉燒': {
      'display': '港式叉燒',
      'calorie': 392
   },
   '滷排骨': {
      'display': '滷排骨',
      'calorie': 131
   },
   '炸排骨': {
      'display': '炸排骨',
      'calorie': 88
   },
   '炸雞腿': {
      'display': '炸雞腿',
      'calorie': 246
   },
   '烤雞腿': {
      'display': '烤雞腿',
      'calorie': 101
   },
   '荷包蛋': {
      'display': '荷包蛋',
      'calorie': 91
   },
   '蛋': {
      'display': '蛋',
      'calorie': 85
   },
   '豆乾': {
      'display': '豆乾',
      'calorie': 88
   },
   '魚排': {
      'display': '魚排',
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

// const PredictImage = "https://southcentralus.api.cognitive.microsoft.com/customvision/v2.0/Prediction/436679fe-5a12-4c17-a882-36b3eaeee242/image?iterationId=8ebb899f-779d-4d8f-8d17-3f72d4d6b22e"
// const predictionKey = "9462f12ddd784b11be961574cc96de8e"


if (predictionKey == null) {
    console.log("please set custom vision key")
    console.log("$export PREDICITON_KEY=${key}")
    return;
}

var imageDetection = async (session, name, url) => {

    // session.send({
    //     text: await imageDetection(attachment.contentUrl, null),
    //     attachments: [
    //         {
    //             contentType: attachment.contentType,
    //             contentUrl: attachment.contentUrl,
    //             name: attachment.name
    //         }
    //     ]
    // });

    var headers = {
        'Prediction-Key': predictionKey,
        'Content-Type': 'application/octet-stream'
    }

    request.get(url).pipe(
        request.post({ url: PredictImage, headers: headers }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var info = JSON.parse(body);
                console.log(info);
                processDetectionInfo(session, info);
            }
            else {
                console.log(response.statusCode)
            }
        })
    )
}

var calculateCalorie = (predictions) => {
   var ret = {
      'tags': [],
      'totalCalorie': 0
   };
   var tmpCalorie = 0;
   var hasBoxTag = false;

   for (var prediction of predictions) {
      if (prediction.tagName in foodTable) {
         if (0.15 > parseFloat(prediction.probability)) {
            continue;
         }

         ret.tags.push(
            foodTable[prediction.tagName].display
         );

         tmpCalorie += foodTable[prediction.tagName].calorie;
         if (prediction.tagName == boxTagName) {
            hasBoxTag = true;
         }
      }
   }

   if (tmpCalorie < foodTable[boxTagName].calorie) {
      tmpCalorie = foodTable[boxTagName].calorie;
   }

   ret.totalCalorie = tmpCalorie;
   return ret;
}

var processDetectionInfo = (session, result) => {
   var foods = []
   var calculateResult = calculateCalorie(result.predictions);
   session.send("我看到了 " + calculateResult.tags.join() + ", 總共 " + calculateResult.totalCalorie + "大卡");
}

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector, function (session) {
    var msg = session.message;
    if (msg.attachments && msg.attachments.length > 0) {
        // Echo back attachment
        var attachment = msg.attachments[0];
        imageDetection(session, attachment.name, attachment.contentUrl)
    } else {
        if (msg.text.includes("show")) {
            session.send("You said: %s", session.message.text);
        }   
    }
});

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
