"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var path = require('path');

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

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

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector, function (session) {
    var msg = session.message;
    if (msg.attachments && msg.attachments.length > 0) {
     // Echo back attachment
     var attachment = msg.attachments[0];
        session.send({
            text: "You sent:",
            attachments: [
                {
                    contentType: attachment.contentType,
                    contentUrl: attachment.contentUrl,
                    name: attachment.name
                }
            ]
        });
    } else {
        // Echo back users text
        session.send("You said: %s", session.message.text);
    }
});

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = connector.listen();
}
