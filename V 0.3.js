const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const TeamFortress2 = require('tf2');
 
const Prices = require('./prices.json');
const config = require('./config2.json');
 
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
        client.chatMessage(steamID, "Hello, you are conversating with the Beta version of the Jewdoria. It has a basic set of functions; it can accept friend requests and reply to messages. More content will be added later on. This is the one and only automated message the bot sends at the moment and if you reply the bot will send it again. We are in the starting phase and this is just a test version. In the full version the bot, it will be able to manage and accept trade offers, accept group invites and craft materials.");
    }

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