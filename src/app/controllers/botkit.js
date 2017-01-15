//CONFIG===============================================
if (!process.env.APIAI) {
    console.log('Error: Specify apiai in environment');
    process.exit(1);
}

if (!process.env.MONGODB_URI) {
    console.log('Error: Specify MONGODB_URI in environment');
    process.exit(1);
}

if (!process.env.SLACK_ID || !process.env.SLACK_SECRET || !process.env.PORT) {
    console.log('Error: Specify SLACK_ID SLACK_SECRET and PORT in environment');
    process.exit(1);
}

/* Uses the slack button feature to offer a real time bot to multiple teams */
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost/botkit_express_demo'
const botkit_mongo_storage = require('../../config/botkit_mongo_storage')({mongoUri: mongoUri})

const Botkit = require('botkit');
const apiai = require('botkit-middleware-apiai')({
    token: process.env.APIAI,
});

const controller = Botkit.slackbot({
  storage: botkit_mongo_storage,
})
console.log(apiai);
controller.middleware.receive.use(apiai.receive);
exports.controller = controller

//CONNECTION FUNCTIONS=====================================================
exports.connect = function(team_config){
  const bot = controller.spawn(team_config);
  controller.trigger('create_bot', [bot, team_config]);
}

// just a simple way to make sure we don't
// connect to the RTM twice for the same team
const _bots = {};

function trackBot(bot) {
  _bots[bot.config.token] = bot;
}

controller.on('create_bot',function(bot,team) {

  if (_bots[bot.config.token]) {
    // already online! do nothing.
    console.log("already online! do nothing.")
  }
  else {
    bot.startRTM(function(err) {

      if (!err) {
        trackBot(bot);

        console.log("RTM ok")

        controller.saveTeam(team, function(err, id) {
          if (err) {
            console.log("Error saving team")
          }
          else {
            console.log("Team " + team.name + " saved")
          }
        })
      }

      else{
        console.log("RTM failed")
      }

      bot.startPrivateConversation({user: team.createdBy},function(err,convo) {
        if (err) {
          console.log(err);
        } else {
          convo.say('I am a bot that has just joined your team');
          convo.say('You must now /invite me to a channel so that I can be of use!');
        }
      });

    });
  }
});

//REACTIONS TO EVENTS==========================================================

// Handle events related to the websocket connection to Slack
controller.on('rtm_open',function(bot) {
  console.log('** The RTM api just connected!');
});

controller.on('rtm_close',function(bot) {
  console.log('** The RTM api just closed');
  // you may want to attempt to re-open
});

//DIALOG ======================================================================
/* note this uses example middlewares defined above */
controller.hears(['hello'], 'direct_message, direct_mention, mention', apiai.hears, function(bot, message) {
    console.log(JSON.stringify(message));
    console.log('hello');
    bot.reply(message, 'Hello!');
});

controller.hears('hello','direct_message',function(bot,message) {
  bot.reply(message,'Hello!');
});

controller.hears('^stop','direct_message',function(bot,message) {
  bot.reply(message,'Goodbye');
  bot.rtm.close();
});

controller.on('direct_message,mention,direct_mention',function(bot,message) {
  bot.api.reactions.add({
    timestamp: message.ts,
    channel: message.channel,
    name: 'robot_face',
  },function(err) {
    if (err) { console.log(err) }
    bot.reply(message,'I heard you loud and clear boss.');
  });
});

controller.storage.teams.all(function(err,teams) {

  console.log(teams)

  if (err) {
    throw new Error(err);
  }

  // connect all teams with bots up to slack!
  for (const t  in teams) {
    if (teams[t].bot) {
      const bot = controller.spawn(teams[t]).startRTM(function(err) {
        if (err) {
          console.log('Error connecting bot to Slack:',err);
        } else {
          trackBot(bot);
        }
      });
    }
  }

});
