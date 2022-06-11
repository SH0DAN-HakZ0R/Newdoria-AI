const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const TeamFortress2 = require('tf2');
 
const Prices = require('./prices.json');
const config = require('./config.json');
 
const client = new SteamUser();
const tf2 = new TeamFortress2(client);
const community = new SteamCommunity();
const manager = new TradeOfferManager ({
    steam: client,
    community: community,
    language: 'en'
});
 
const logOnOptions = {
    accountName: config.username,
    password: config.password,

};
 
client.logOn(logOnOptions);
 
    console.log('succesfully logged on.');
    client.on('loggedOn', () => {
    client.setPersona(SteamUser.EPersonaState.Online);
    client.gamesPlayed([440]);
}); 


client.on("friendMessage", function(steamID, message) {
    if (message == "hi") {
        client.chatMessage(steamID, "Hello, this works.");
    }
    else {
        client.chatMessage(steamID, "Hello, my name is Newdoria and I am an automated bot made by my owner, Dread. Feel free to send me a trade offer. I trade items in team fortress 2. I will accept any offer if it profits me.");
    }

});
 
client.on('webSession', (sessionid, cookies) => {
    manager.setCookies(cookies);
    community.setCookies(cookies);
    community.startConfirmationChecker(20000, config.identitySecret);
});

 
manager.on('newOffer', function (offer) {
    console.log("New offer #" + offer.id + " from " + offer.partner.getSteam3RenderedID());
    offer.accept(function (err) {
        if (err) {
            console.log("Unable to accept offer: " + err.message);
            console.log("Cause: " + err.eresult);
            if (err.eresult == 28) {
                retryOffer(offer.id);
            }
        }
        else {
            steam.checkConfirmations(); 
            console.log("Offer accepted");
        }
    });
});

function retryOffer(id) {
    manager.getOffer(id, function (err,offer) {
        if (err) {
            console.log("Unable to get offer: " + err.message);
                console.log("Retrying to get.");
                setTimeout(function(){ 
                retryOffer(id);
                }, retryTime);
        }
        else {
            offer.accept(function (err) {
                if (err) {
                    console.log("Unable to accept offer: " + err.message);
                    if (err.eresult == 28) {
                        console.log("Retrying to accept.");
                        retryOffer(offer.id);
                    }
                }
                else {
                    steam.checkConfirmations();
                    console.log("Offer accepted");
                }
            });
        }
    });
}
 
var scrapAmt = 25;
var pollCraft = 30;
 
tf2.on('connectedToGC', function() {
    console.log("Connected to tf2 game server.");
});
 
tf2.on('backpackLoaded', function () {
    console.log("Loaded our backpack.");
});
 
function craftS(amtNeedScrap) {
    if (tf2.backpack == undefined) {
        console.log("unable to load backpack, can't craft.");
        return;
    } else {
        console.log("attempting to craft...");
        var amtOfScrap = 0;
        for (var i = 0; i <tf2.backpack.length; i++) {
            if (tf2.backpack[i].defIndex === 5000) {
                amtOfScrap++;
            }
        }
        for (i = 0; i <tf2.backpack.length; i++) {
            if (tf2.backpack[i].defIndex === 5002) {
                amtOfScrap +=9;
                let beep = new [Array]();
                beep.push(parseInt(tf2.backpack[i].id));
                tf2.craft(beep);
 
    } else if (tf2.backpack[i].defIndex === 5001) {
                amtOfScrap +=3;
                beep = new [Array]();
                beep.push(parseInt(tf2.backpack[i].id));
                tf2.craft(beep);
            }
            if (amtOfScrap >= amtNeedScrap) {
                break;
            }
        }
    }
}


 
tf2.on('craftingComplete', function(e) {
    console.log("Finished crafting.");
});
 
client.on('friendMessage#'+config.ownerID, function(steamID, message) {
    if (message == "craft") {
        craftS(scrapAmt);
        console.log("Recieved order to craft from admin.");
    } else {
        console.log("craft error.");
    }
});
 
setInterval(function() {
    craftS(scrapAmt);
}, 1000 * 60 * pollCraft); 

client.on('friendRelationship', function(sid, relationship) {
    if (relationship == SteamUser.EFriendRelationship.RequestRecipient) {
        console.log("We recieved a friend request from "+sid);
        client.addFriend(sid, function (err, name) {
            if (err) {
                console.log(err);
                return;
            }
            console.log("Accepted user with the name of "+name);
        });
    }
 
});
 
client.on('groupRelationship', function(sid, relationship) {
    if (relationship == SteamUser.EClanRelationship.Invited) {
        console.log("We were asked to join steam group #"+sid);
        client.respondToGroupInvite(sid, true);
    }
});
 
client.on('friendsList', function() {
    for (var sid in client.myFriends);
        var relationship = client.myFriends[sid];
        if (relationship == SteamUser.EFriendRelationship.RequestRecipient) {
        console.log("(offline) We recieved a friend request from "+sid);
        client.addFriend(sid, function (err, name) {
            if (err) {
                console.log(err);
                return;
            }
            console.log("(offline) Accepted user with the name of "+name);
        });
    }
});

client.on('groupList', function() {
    for (var sid in client.myGroups);
        var relationship = client.myGroups[sid];
        if (relationship == SteamUser.EClanRelationship.Invited) {
        console.log("(offline) We were asked to join steam group #"+sid);
        client.respondToGroupInvite(sid, true);
    }
});