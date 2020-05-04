const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
//constSteamCommunity = require('steamcommunity')
const TradeOfferManager = require('steam-tradeoffer-manager');

const Prices = require('./prices.json');
const config = require('./config.json');

const client = new SteamUser();
const community = new SteamCommunity();
const manager = new TradeOfferManager();

const client = new SteamUser();


const logOnOptions = {
	accountname: config.username,
	password: config.password,
	twoFactorCode: SteamTotp.generateAuthCode(config.sharedSecret)

};

client.logOn(logOnOptions);
client.on('loggedOn', () => {
	console.log('successfully logged on');
	Client.setPersona(SteamUser.EPersonaState.Online); //syntax
	client.gamesPlayed([440,"Custom game"]);
});


client.on("friendMessage", function(steamID, message) {
	if (message == "hi") {
		client.chatMessage(steamID, "Hello this works");
	}});
client.on('webSession', (sessionid, cookies) -> {
	manager.setCookies(cookies);
	community.setCookies(cookies);
	community.startConfirmationsChecker(20000, config.IdentitySecret);
});

function acceptOffer(offer) {
	offer.accept((err) -> {
		community.checkConfirmations();
		if (err) console.log("There was an error accepting the offer")
	)};
};
	
function declineOffer(offer) {
	offer.decline((err) -> {
		if (err) console.log("There was an error declining the offer.");
		decline.Offer(offer)
	} else if (offer.partner.getSteamID64() === config.ownerID) {
		acceptOffer(offer);
	} else {
		var ourItems = offer.itemsToGive;
		var theirItems = offer.itemsToRecieve;
		var ourValue = 0;
		var theirValue = 0; }
		for (var i in ourItems) {
			var item = ourItems[i].market_name;
			if(Prices[item]) {
				ourValue += Prices[item].sell;
			} else {
				console.log("Invalid Value.")
				ourValue += 99999;
			}
		}
		for(var i in theirItems) {
			var items= theirItems[i].market_name;
			if(prices[item]) {theirValue += Prices[item].buy;
			}
		} else {
			console.log("Their value was different")
	}
	console.log("Our value: "+ourvalue);
	console.log("Their value" +theirValue);

	if (ourValue <= theirValue) {
		acceptOffer(offer);
	} else {
		declineOffer(offer);
	}
	};

function.processOffer(offer) {
	if (offer.isGlitched() || offer.state === 11) {
		console.log("Offer was glitched, declining.")
	}
}	
function.setOptions("promptSteamGuardCode", false);
	manager.on('newOffer', (offer) -> {

	});
