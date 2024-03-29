//Code by: https://github.com/HerrEurobeat/ 
//If you are here, you are wrong. Open config.json and configure everything there!


module.exports.run = async (logOnOptions, loginindex) => {
  const SteamUser = require('steam-user');
  const SteamCommunity = require('steamcommunity');
  const SteamID = require('steamid');
  var updater = require('../updater.js')
  var controller = require("./controller.js")
  const config = require('../config.json');
  const extdata = require('./data.json');
  var lastcomment = require("./lastcomment.json")
  var fs = require("fs");
  const d = function d() { return new Date(); }
  var logger = controller.logger

  const bot = new SteamUser();
  const community = new SteamCommunity();
  var commentedrecently = false; //global cooldown for the comment command

  var thisbot = `Bot ${loginindex}`
  if (config.mode === 2 && loginindex === 0) var thisbot = "Main"

  var configgroup64id = config.yourgroup64id

  /* ------------ Login & Events: ------------ */
  var loggedininterval = setInterval(() => { //set an interval to check if previous acc is logged on
    if(controller.accisloggedin === true) {
      bot.logOn(logOnOptions) 
      controller.accisloggedin = false; //set to false again
      clearInterval(loggedininterval) //stop interval
    }
  }, 250);

  bot.on('steamGuard', function(domain, callback) {
    var steamGuardInputStart = d();
    if (config.skipSteamGuard === true) {
      if (loginindex > 1) {
        controller.accisloggedin = true; //set to true to log next account in
        updater.skippedaccounts.push(loginindex)
        return;
      } else {
        logger("Even with skipSteamGuard enabled, the first account always has to be logged in.", true)
      } }

    if (loginindex == 0) {
      process.stdout.write(`[${logOnOptions.accountName}] Steam Guard Code: `)
    } else {
      process.stdout.write(`[${logOnOptions.accountName}] Steam Guard Code (press ENTER to skip account): `)
    }
    var stdin = process.openStdin();

    stdin.addListener('data', text => {
      var code = text.toString().trim()
      if (code == "") {
        if (loginindex == 0) {
          logger("The first account always has to be logged in!\nPlease restart and provide a steamGuard code!", true) 
        } else {
          controller.accisloggedin = true; //set to true to log next account in
          updater.skippedaccounts.push(loginindex) }
      } else {
        callback(code) }
      stdin.pause() //stop reading
      controller.steamGuardInputTimeFunc(d() - steamGuardInputStart)
    })
  });

  bot.on('loggedOn', () => { //this account is now logged on
    controller.accisloggedin = true; //set to true to log next account in
    bot.setPersona(config.status); //set online status
    if (config.mode === 1) { //individual mode
      bot.gamesPlayed(config.playinggames); //set game for all bots in mode 1
    } else if (config.mode === 2) { //connected mode
      if (loginindex === 0) bot.gamesPlayed(config.playinggames);; //set game only for the "leader" bot in mode 2
    }

    controller.communityobject[loginindex] = community //export this community instance to the communityobject to access it from controller.js
    controller.botobject[loginindex] = bot //export this bot instance to the botobject to access it from controller.js
  });

  bot.on("webSession", (sessionID, cookies) => { //get websession (log in to chat)
    community.setCookies(cookies); //set cookies (otherwise the bot is unable to comment)

    //Accept offline group & friend invites
    for (let i = 0; i < Object.keys(bot.myFriends).length; i++) { //Credit: https://dev.doctormckay.com/topic/1694-accept-friend-request-sent-in-offline/  
      if (!lastcomment[Object.keys(bot.myFriends)[i] + loginindex]) { //always check if user is on lastcomment to avoid errors
        lastcomment[Object.keys(bot.myFriends)[i] + loginindex] = {
          time: Date.now() - (config.commentcooldown * 60000),
          bot: bot.steamID.accountid } }

        if (bot.myFriends[Object.keys(bot.myFriends)[i]] == 2) {
            bot.addFriend(Object.keys(bot.myFriends)[i]);
            logger(`[${thisbot}] Added user while I was offline! User: ` + Object.keys(bot.myFriends)[i])
            bot.chatMessage(String(Object.keys(bot.myFriends)[i]), 'Hello there! Thanks for adding me!\nRequest a free comment with !comment\nType !help for more info!')

            lastcomment[Object.keys(bot.myFriends)[i] + loginindex] = { //add user to lastcomment file in order to also unfriend him when he never used !comment
              time: Date.now() - (config.commentcooldown * 60000), //subtract unfriendtime to enable comment usage immediately
              bot: bot.steamID.accountid }
            if (configgroup64id.length > 1 && Object.keys(bot.myGroups).includes(configgroup64id)) bot.inviteToGroup(Object.keys(bot.myFriends)[i], new SteamID(configgroup64id)); //invite the user to your group
        }

        if (i + 1 === Object.keys(bot.myFriends).length) { //check for last iteration
          fs.writeFile("./src/lastcomment.json", JSON.stringify(lastcomment, null, 4), err => {
            if (err) logger(`[${thisbot}] add user to lastcomment.json error: ${err}`) }) } }

    for (let i = 0; i < Object.keys(bot.myGroups).length; i++) {
      if (bot.myGroups[Object.keys(bot.myGroups)[i]] == 2) {
        if (config.acceptgroupinvites !== true) { //check if group accept is false
          if (config.botsgroupid.length < 1) return; 
          if (Object.keys(bot.myGroups)[i] !== config.botsgroupid) { return; }} //check if group id is bot group           
        bot.respondToGroupInvite(Object.keys(bot.myGroups)[i], true)
        logger(`[${thisbot}] Accepted group invite while I was offline: ` + Object.keys(bot.myGroups)[i])
    }}
  });

  /* ------------ Message interactions: ------------ */
  bot.on('friendMessage', function(steamID, message) {
    var lastcommentsteamID = new SteamID(steamID.getSteam3RenderedID()).getSteamID64() + loginindex
    if (config.logcommandusage) logger(`[${thisbot}] Friend message from ${new SteamID(steamID.getSteam3RenderedID()).getSteamID64()}: ${message}`); //log message

    if (loginindex === 0 || config.mode === 1) { //check if this is the main bot or if mode 1 is set
      var cont = message.slice("!").split(" ");
      var args = cont.slice(1);
      switch(cont[0].toLowerCase()) {
        case '!help':
          var ownercheck = config.ownerid.includes(new SteamID(steamID.getSteam3RenderedID()).getSteamID64())
          if (ownercheck) {
            if (Object.keys(controller.communityobject).length > 1) var commenttext = `Type '!comment number_of_comments profileid' for X many comments (max ${Object.keys(controller.communityobject).length})). Provide a profile id to comment on a specific profile.`
              else var commenttext = `Type '!comment 1 profileid'. Provide a profile id to comment on a specific profile.`
          } else {
            if (Object.keys(controller.communityobject).length > 1) var commenttext = `Type '!comment number_of_comments' for X many comments (max ${Object.keys(controller.communityobject).length})).`
              else var commenttext = `Type '!comment' for a comment on your profile!` }

          if (ownercheck) var resetcooldowntext = `\nType '!resetcooldown' to clear your cooldown.`; else var resetcooldowntext = "";
          if (ownercheck) var unfriendtext = `\nType '!unfriend profileid' to unfriend this user from the bot.`; else var unfriendtext = "";
          if (ownercheck) var restarttext = `\nType '!restart' to restart the bot.`; else var restarttext = "";
          if (ownercheck) var evaltext = `\nType '!eval javascript code' to run javascript code from the steam chat.`; else var evaltext = "";
          if (config.yourgroup.length > 1) var yourgrouptext = "\nJoin my '!group!'"; else var yourgrouptext = "";
          bot.chatMessage(steamID, `
            ${commenttext}
            Type '!ping' for a pong!
            Type '!info' to get a few informations about the bot and you.${resetcooldowntext}${unfriendtext}
            Type '!about' for credit (botcreator).
            Type '!owner' to check out my owner's profile!${evaltext}${restarttext}
            ${yourgrouptext}
          `)
          break;
        case '!comment':
          if (updater.activeupdate == true) return bot.chatMessage(steamID, "The bot is currently waiting for the last requested comment to be finished in order to download an update!\nPlease wait a moment and try again.");
          if (config.allowcommentcmdusage === false && !config.ownerid.includes(new SteamID(steamID.getSteam3RenderedID()).getSteamID64())) return bot.chatMessage(steamID, "The bot owner set this command to owners only.\nType !owner to get information who the owner is.\nType !about to get a link to the bot creator.") 

          //Define command usage for each user's priviliges
          var ownercheck = config.ownerid.includes(new SteamID(steamID.getSteam3RenderedID()).getSteamID64())
          if (ownercheck) {
            if (Object.keys(controller.communityobject).length > 1) var commentcmdusage = `'!comment number_of_comments profileid' for X many comments (max ${Object.keys(controller.communityobject).length})). Provide a profile id to comment on a specific profile.`
              else var commentcmdusage = `'!comment 1 profileid'. Provide a profile id to comment on a specific profile.`
          } else {
            if (Object.keys(controller.communityobject).length > 1) var commentcmdusage = `'!comment number_of_comments' for X many comments (max ${Object.keys(controller.communityobject).length})).`
              else var commentcmdusage = `'!comment' for a comment on your profile!` }

          /* --------- Start checking for privileges, cooldowns and prevent possible errors before commenting --------- */
          if (config.commentcooldown !== 0) { //is the cooldown enabled?        
            if (!lastcomment[lastcommentsteamID]) { //user is somehow not in lastcomment.json? oh god not again... write user to lastcomment.json to avoid errors
              logger(`Missing user (${new SteamID(steamID.getSteam3RenderedID()).getSteamID64()}) from lastcomment.json! Writing to prevent error...`)

              lastcomment[new SteamID(steamID.getSteam3RenderedID()).getSteamID64() + loginindex] = {
                time: Date.now() - (config.commentcooldown * 60000), //subtract unfriendtime to enable comment usage immediately
                bot: bot.steamID.accountid }
              fs.writeFile("./src/lastcomment.json", JSON.stringify(lastcomment, null, 4), err => {
                if (err) logger(`[${thisbot}] delete user from lastcomment.json error: ${err}`) }) }

            if ((Date.now() - lastcomment[lastcommentsteamID].time) < (config.commentcooldown * 60000)) { //check if user has cooldown applied
              var remainingcooldown = Math.abs(((Date.now() - lastcomment[lastcommentsteamID].time) / 1000) - (config.commentcooldown * 60))
              var remainingcooldownunit = "seconds"
              if (remainingcooldown > 120) { var remainingcooldown = remainingcooldown / 60; var remainingcooldownunit = "minutes" }
              if (remainingcooldown > 120) { var remainingcooldown = remainingcooldown / 60; var remainingcooldownunit = "hours" }

              bot.chatMessage(steamID, `You requested a comment in the last ${config.commentcooldown} minutes. Please wait the remaining ${controller.round(remainingcooldown, 2)} ${remainingcooldownunit}.`) //send error message
              return; }
            } else {
              if (controller.activecommentprocess.indexOf(String(new SteamID(steamID.getSteam3RenderedID()).getSteamID64())) !== -1) {
                return bot.chatMessage(steamID, "You are currently recieving previously requested comments. Please wait for them to be completed.") }}

          if (config.globalcommentcooldown !== 0) { //is the cooldown enabled?
            if (commentedrecently === true) { 
              bot.chatMessage(steamID, `Someone else requested a comment in the last ${config.globalcommentcooldown}ms. Please wait a moment.`) //send error message
              return; }}

          //save steamID of comment requesting user so that messages are being send to the requesting user and not to the reciever if a profileid has been provided
          var requesterSteamID = new SteamID(steamID.getSteam3RenderedID()).getSteamID64()

          if (args[0] !== undefined) {
            if (isNaN(args[0])) { //isn't a number?
              return bot.chatMessage(steamID, `This is not a valid number!\nCommand usage: ${commentcmdusage}`) }
            if (args[0] > Object.keys(controller.communityobject).length) { //number is too big?
              return bot.chatMessage(steamID, `You can request max. ${Object.keys(controller.communityobject).length} comments.\nCommand usage: ${commentcmdusage}`) }
            var numberofcomments = args[0]

            //Code by: https://github.com/HerrEurobeat/ 

            if (args[1] !== undefined) {
              if (config.ownerid.includes(new SteamID(steamID.getSteam3RenderedID()).getSteamID64()) || args[1] == new SteamID(steamID.getSteam3RenderedID()).getSteamID64()) { //check if user is a bot owner or if he provided his own profile id
                if (isNaN(args[1])) return bot.chatMessage(steamID, `This is not a valid profileid! A profile id must look like this: 76561198260031749\nCommand usage: ${commentcmdusage}`)
                if (new SteamID(args[1]).isValid() === false) return bot.chatMessage(steamID, `This is not a valid profileid! A profile id must look like this: 76561198260031749\nCommand usage: ${commentcmdusage}`)

                steamID.accountid = parseInt(new SteamID(args[1]).accountid) //edit accountid value of steamID parameter of friendMessage event and replace requester's accountid with the new one
              } else {
                bot.chatMessage(steamID, "Specifying a profileid is only allowed for bot owners.\nIf you are a bot owner, make sure you added your ownerid to the config.json.")
                return; }} }

          if (config.mode === 2) {
            if (numberofcomments === undefined) { //no number given? ask again
              if (Object.keys(controller.botobject).length === 1) { var numberofcomments = 1 } else { //if only one account is active, set 1 automatically
                bot.chatMessage(requesterSteamID, `Please specify how many comments out of ${Object.keys(controller.communityobject).length} you would like to request.\nCommand usage: ${commentcmdusage}`)
                return;
              }}
          } else {
            var numberofcomments = 1 }

          community.getSteamUser(bot.steamID, (err, user) => { //check if acc is limited and if yes if the reciever is on friendlist
            if (err) { return logger(`[${thisbot}] comment check acc is limited and friend error: ${err}`) }
            if (user.isLimitedAccount && !Object.keys(bot.myFriends).includes(new SteamID(steamID.getSteam3RenderedID()).getSteamID64())) return bot.chatMessage(requesterSteamID, "You/The recieving profile must first send me a friend request, otherwise I'm unable to comment!")})
          community.getSteamUser(steamID, (err, user) => { //check if profile is private
            if (err) { return logger(`[${thisbot}] comment check for private account error: ${err}`) }
            if (user.privacyState !== "public") return bot.chatMessage(steamID, "Your/the recieving profile seems to be private. Please edit your/the privacy settings on your/the recieving profile and try again!") });


          /* --------- Actually start the commenting process --------- */
          var randomstring = arr => arr[Math.floor(Math.random() * arr.length)]; 
          var comment = randomstring(controller.quotes); //get random quote

          community.postUserComment(steamID, comment, (error) => { //post comment
            if(error) { bot.chatMessage(requesterSteamID, `Oops, an error occured! Details: \n[${thisbot}] postUserComment error: ${error}\nPlease try again in a moment!`); logger(`[${thisbot}] postUserComment error: ${error}`); return; }

            logger(`[${thisbot}] ${numberofcomments} Comment(s) requested. Comment on ${new SteamID(steamID.getSteam3RenderedID()).getSteamID64()}: ${comment}`)
            if (numberofcomments == 1) bot.chatMessage(requesterSteamID, 'Okay I commented on your/the recieving profile! If you are a nice person then leave a +rep on my profile!')
              else {
                var waittime = ((numberofcomments - 1) * config.commentdelay) / 1000 //calculate estimated wait time if mode is 2 (first comment is instant -> remove 1 from numberofcomments)
                var waittimeunit = "seconds"
                if (waittime > 120) { var waittime = waittime / 60; var waittimeunit = "minutes" }
                if (waittime > 120) { var waittime = waittime / 60; var waittimeunit = "hours" }
                bot.chatMessage(requesterSteamID, `Estimated wait time for ${numberofcomments} comments: ${Number(Math.round(waittime+'e'+3)+'e-'+3)} ${waittimeunit}.`)

                controller.commenteverywhere(steamID, numberofcomments, requesterSteamID) //Let all other accounts comment if mode 2 is activated
              }

            if (config.globalcommentcooldown !== 0) {
              commentedrecently = true;
              setTimeout(() => { //global cooldown
                commentedrecently = false;
              }, config.globalcommentcooldown) }

            if (controller.botobject[i].myFriends[requesterSteamID] === 3) {
              lastcomment[requesterSteamID + loginindex] = {
                time: Date.now(),
                bot: bot.steamID.accountid }
              fs.writeFile("./src/lastcomment.json", JSON.stringify(lastcomment, null, 4), err => {
                if (err) logger(`[${thisbot}] delete user from lastcomment.json error: ${err}`) }) } })

          //This was the critical part of this bot. Let's carry on and hope that everything holds together.
          break;
        case '!ping':
          bot.chatMessage(steamID, 'Pong!')
          break;
        case '!info':
          bot.chatMessage(steamID, `3urobeat's Comment Bot [Version ${extdata.version}] (More info: !about)\nUptime: ${Number(Math.round(((new Date() - controller.bootstart) / 3600000)+'e'+2)+'e-'+2)} hours\nAccounts logged in: ${Object.keys(controller.communityobject).length}\n\nYour steam id: ${new SteamID(steamID.getSteam3RenderedID()).getSteamID64()}\nYour last comment request: ${new Date(lastcomment[lastcommentsteamID].time)}`)
          break;
        case '!owner':
          if (config.owner.length < 1) return bot.chatMessage(steamID, "I don't know that command. Type !help for more info.\n(Bot Owner didn't include link to him/herself.)")
          bot.chatMessage(steamID, "Check my owner's profile: " + config.owner)
          break;
        case '!group':
          if (config.yourgroup.length < 1 && configgroup64id.length < 1) return bot.chatMessage(steamID, "I don't know that command. Type !help for more info.") //no group info at all? stop.
          if (configgroup64id.length > 1 && Object.keys(bot.myGroups).includes(configgroup64id)) { bot.inviteToGroup(steamID, configgroup64id); bot.chatMessage(steamID, "I send you an invite! Thanks for joining!"); return; } //id? send invite and stop
          bot.chatMessage(steamID, "Join my group here: " + config.yourgroup) //seems like no id has been saved but an url. Send the user the url
          break;
        case '!resetcooldown':
          if (!config.ownerid.includes(new SteamID(steamID.getSteam3RenderedID()).getSteamID64())) return bot.chatMessage(steamID, "This command is only available for the botowner.\nIf you are the botowner, make sure you added your ownerid to the config.json.")
          if (config.commentcooldown === 0) { //is the cooldown enabled?
            return bot.chatMessage(steamID, "The cooldown is disabled in the config!") }
          if ((Date.now() - lastcomment[lastcommentsteamID].time) < (config.commentcooldown * 60000)) { //check if user has cooldown applied
            lastcomment[lastcommentsteamID].time = Date.now() - (config.commentcooldown * 60000)
            fs.writeFile("./src/lastcomment.json", JSON.stringify(lastcomment, null, 4), err => {
              if (err) logger(`[${thisbot}] remove user from lastcomment.json error: ${err}`) })
            bot.chatMessage(steamID, "Your cooldown has been cleared.") } else {
              bot.chatMessage(steamID, "There is no cooldown for you applied.") }
          break;
        case '!about':
          if (config.owner.length > 1) var ownertext = config.owner; else var ownertext = "anonymous (no owner link provided)";
          bot.chatMessage(steamID, `This bot was created by 3urobeat.\nGitHub: https://github.com/HerrEurobeat/steam-comment-service-bot \nSteam: https://steamcommunity.com/id/3urobeat \nIf you like my work, any donation would be appreciated! https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=VAVVKE4L962H6 \n\nDisclaimer: I (the developer) am not responsible and cannot be held liable for any action the operator/user of this bot uses it for.\nThis instance of the bot is used and operated by: ${ownertext}`)
          break;
        case '!unfriend':
          if (!config.ownerid.includes(new SteamID(steamID.getSteam3RenderedID()).getSteamID64())) return bot.chatMessage(steamID, "This command is only available for the botowner.\nIf you are the botowner, make sure you added your ownerid to the config.json.")
          if (isNaN(args[0])) return bot.chatMessage(steamID, "This is not a valid profileid! A profile id must look like this: 76561198260031749")
            if (new SteamID(args[0]).isValid() === false) return bot.chatMessage(steamID, "This is not a valid profileid! A profile id must look like this: 76561198260031749")
          Object.keys(controller.botobject).forEach((i) => {
            if (controller.botobject[i].myFriends[new SteamID(args[0])] === 3) { //check if provided user is really a friend
              controller.botobject[i].removeFriend(new SteamID(args[0])) }})
          bot.chatMessage(steamID, `Removed friend ${args[0]} from all bots.`)
          break;
        case '!restart':
          if (!config.ownerid.includes(new SteamID(steamID.getSteam3RenderedID()).getSteamID64())) return bot.chatMessage(steamID, "This command is only available for the botowner.\nIf you are the botowner, make sure you added your ownerid to the config.json.")
          bot.chatMessage(steamID, 'Restarting...')
          require('../start.js').restart(updater.skippedaccounts)
          break;
        case '!eval':
          if (config.enableevalcmd !== true) return bot.chatMessage(steamID, "The eval command has been turned off!")
          if (!config.ownerid.includes(new SteamID(steamID.getSteam3RenderedID()).getSteamID64())) return bot.chatMessage(steamID, "This command is only available for the botowner.\nIf you are the botowner, make sure you added your ownerid to the config.json.")
          const clean = text => {
            if (typeof(text) === "string") return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
              else return text; }

            try {
              const code = args.join(" ");
              if (code.includes('logininfo')) return bot.chatMessage(steamID, "Your code includes 'logininfo'. In order to protect passwords this is not allowed.") //not 100% save but should be at least some protection (only owners can use this cmd)
              let evaled = eval(code);
              if (typeof evaled !== "string")
              evaled = require("util").inspect(evaled);
      
              bot.chatMessage(steamID, `Code executed. Result:\n\n${clean(evaled)}`)
            } catch (err) {
              bot.chatMessage(steamID, `Error:\n${clean(err)}`);                                                                                                                                                                                                                                                                                                                  //Hi I'm a comment that serves no purpose
              return; }
          break;
        default: //cmd not recognized
          bot.chatMessage(steamID, "I don't know that command. Type !help for more info.") }
    } else {
      if (config.mode === 2) { //redirect the user to the main bot if mode 2 is running and this bot is not the main bot
        switch(message.toLowerCase()) {
          case '!about':
            if (config.owner.length > 1) var ownertext = config.owner; else var ownertext = "anonymous (no owner link provided)";
            bot.chatMessage(steamID, `This bot was created by 3urobeat.\nGitHub: https://github.com/HerrEurobeat/steam-comment-service-bot \nSteam: https://steamcommunity.com/id/3urobeat \nDisclaimer: I (the developer) am not responsible and cannot be held liable for any action the operator/user of this bot uses it for.\n\nThis instance of the bot is used and operated by: ${ownertext}`)
            break;
          default:
            bot.chatMessage(steamID, `This is one account running in a bot cluster.\nPlease add the main bot (Profile ID: ${new SteamID(controller.botobject[0].steamID.getSteam3RenderedID()).getSteamID64()}) and send him a !help message.\nIf you want to check out what this is about, type: !about`)
        }}  
      }
  });

  //Accept Friend & Group requests/invites
  bot.on('friendRelationship', (steamID, relationship) => {
    if (relationship === 2) {
      bot.addFriend(steamID);
      logger(`[${thisbot}] Added User: ` + new SteamID(steamID.getSteam3RenderedID()).getSteamID64())
      if (loginindex === 0 || config.mode === 1) {
        bot.chatMessage(steamID, 'Hello there! Thanks for adding me!\nRequest a free comment with !comment\nType !help for more info!') }
      if (configgroup64id.length > 1 && Object.keys(bot.myGroups).includes(configgroup64id)) bot.inviteToGroup(steamID, new SteamID(configgroup64id)); //invite the user to your group

      lastcomment[new SteamID(steamID.getSteam3RenderedID()).getSteamID64() + loginindex] = { //add user to lastcomment file in order to also unfriend him when he never used !comment
        time: Date.now() - (config.commentcooldown * 60000), //subtract unfriendtime to enable comment usage immediately
        bot: bot.steamID.accountid }
      fs.writeFile("./src/lastcomment.json", JSON.stringify(lastcomment, null, 4), err => {
        if (err) logger(`[${thisbot}] delete user from lastcomment.json error: ${err}`) })
    }
  });

  bot.on('groupRelationship', (steamID, relationship) => {
    if (relationship === 2) {
      if (config.acceptgroupinvites !== true) { //check if group accept is false
        if (config.botsgroupid.length < 1) return; 
        if (new SteamID(steamID.getSteam3RenderedID()).getSteamID64() !== config.botsgroupid) { return; }} //check if group id is bot group  

      bot.respondToGroupInvite(steamID, true)
      logger(`[${thisbot}] Accepted group invite: ` + new SteamID(steamID.getSteam3RenderedID()).getSteamID64())
    }
  });

  module.exports={
    bot
  }
}

//Code by: https://github.com/HerrEurobeat/ 