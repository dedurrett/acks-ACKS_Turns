//Written using pieces of:
//TurnManager script https://app.roll20.net/forum/post/744298/script-turn-manager
//TurnMarker1 script https://github.com/shdwjk/Roll20API/blob/master/TurnMarker1/TurnMarker1.js
//Using the script with ACKS:
//!SOC will start combat without anyone in the tracker. Reminder is posted to declare spells/withdrawls/retreats.
//Use Group Initative to roll and sort the tracker, then !TOT to highlight the token at the top of the list.
//!EOT to cycle through turns as usual
//When a new round is reached it does not forward through to the top of the list again. Reminder is posted to declare spells/withdrawls/retreats.
//Use Group Initative to roll and sort the tracker, then !TOT to highlight the token at the top of the list.
//And on and on, when combat is over, !EOC

var GmIdList = ["76"];                          // List of GM's (Used with RestrictGmEOT)
var TurnOrderAgent = TurnOrderAgent || {};
var tint_color_turn = '#FFFF00';				// Tint color for the current tokens turn
var tint_color_default = 'transparent';			// Default tint color
var Version = 0.1

// Turn Ordering functions; Always 321
var tosorts = { "abc": function(a,b){return a.pr.toString().localeCompare(b.pr.toString())},
                "cba":function(a,b){return b.pr.toString().localeCompare(a.pr.toString())},
                "123":function(a,b){return a.pr-b.pr},
                "321":function(a,b){return b.pr-a.pr}};

var TOSortFunc = function(turnOrder,ordering){
    turnOrder.sort(function(a,b){
        try{
            if (a.pr.toString().substring(0, 5) == "Round") return -1;
            else if(b.pr.toString().substring(0,5) == "Round") return 1;
            else return tosorts[ordering](a,b);
        }
        catch(e)
        {
            log(e);
            sendChat("TOSortFunc", "/w GM " + e);
        }
    });
    return turnOrder;
};

// Process Chat Messages
// SOT Start of Combat EOT End of Turn EOC End of Combat TOT Tint on Top
on("chat:message", function(msg) {
    // Exit if not an api command
    if (msg.type != "api") return;
    // Get the API Chat Command
    msg.who = msg.who.split(" ",1)[0];
    var command = msg.content.split(" ", 1);

    if(command == "!soc" && IsGM(msg.playerid)) StartCombat(msg);
    if (command == "!eot") EndTurn(msg.playerid,false);
    if(command == "!eoc" && IsGM(msg.playerid)) EndCombat();
    if(command == "!tot" && IsGM(msg.playerid)) TintOnTop();

});

// Process Turn Change callback
on("change:campaign:turnorder", function(obj) {
    TurnOrderAgent();
});

// Initialize the Turn Order using AutoRound Tracker with 321 ordering
function StartCombat(msg){
try{
    var cmd = msg.content.split(" ");                   			// tokenize command
    var to = Campaign().get("turnorder");
    var turn_order = JSON.parse(to);                    			// Parse the turn order information into JSON
	//var marker=getMarker();
    //if(turn_order.length == 0) return
    //turn_order = TOSortFunc(turn_order,"321");          			// Sort turn order
    sendChat("", "/desc ");
    sendChat("", "/direct <div style='width: 100%; color: #C8DE84; border: 1px solid #91bd09; background-color: #749a02; box-shadow: 0 0 15px #91bd09; display: block; text-align: center; font-size: 20px; padding: 5px 0; margin-bottom: 0.25em; font-family: Garamond;'>" + "Combat Begins" + "</div>");

	//if(turn_order[0].pr.toString().substring(0, 5) == "Round")	// initialize Round #
	//	turn_order[0].pr = "Round 0";
	//else{
        turn_order.unshift({
        id: "-1",
        pr: "Round 0",
        custom: "--Round--",
        });
	//}

    //Campaign().set("turnorder", JSON.stringify(turn_order));		// Send the turn order back to the tracker
    Campaign().set({turnorder: JSON.stringify(turn_order)});
    
    TurnOrderAgent();                                           	// Process the tracker now
}catch(e)
{
    log(e);
    sendChat("GM", "/w GM Error occured in StartCombat");
    sendChat("GM", "/w GM " + e);
    return;
}

};

// Processes a Turn Order callback
function TurnOrderAgent () {
try{
    if (!Campaign().get("turnorder")) return;
    var turn_order = JSON.parse(Campaign().get("turnorder"));
    if (!turn_order.length) return;
    if (typeof turn_order[0].pr == "string") {
        if (turn_order[0].pr.toString().substring(0, 5) == "Round") {
            var RoundTracker = turn_order[0].pr;
            var CurrentRound = parseInt(RoundTracker.toString().substring(5));
            turn_order[0].pr = "Round " + (CurrentRound + 1);
    		Campaign().set({turnorder: JSON.stringify(turn_order)});
    		sendChat("", "/desc ");
    		sendChat("", "/direct <div style='width: 100%; color: #C8DE84; border: 1px solid #91bd09; background-color: #749a02; box-shadow: 0 0 15px #91bd09; display: block; text-align: center; font-size: 20px; padding: 5px 0; margin-bottom: 0.25em; font-family: Garamond;'>" + turn_order[0].pr + "</div>");
            sendChat("", "/direct <div style='width: 100%; color: #C8DE84; border: 1px solid #91bd09; background-color: #749a02; box-shadow: 0 0 15px #91bd09; display: block; text-align: center; font-size: 20px; padding: 5px 0; margin-bottom: 0.25em; font-family: Garamond;'>" + "Declare if you intend to Cast a Spell, Make a Fighting Withdrawl, or Retreat." + "</div>");
            if(CurrentRound==0) sendChat("", "/direct <div style='width: 100%; color: #C8DE84; border: 1px solid #91bd09; background-color: #749a02; box-shadow: 0 0 15px #91bd09; display: block; text-align: center; font-size: 20px; padding: 5px 0; margin-bottom: 0.25em; font-family: Garamond;'>" + "Roll Initative." + "</div>");
    		if(CurrentRound>0) sendChat("", "/direct <div style='width: 100%; color: #C8DE84; border: 1px solid #91bd09; background-color: #749a02; box-shadow: 0 0 15px #91bd09; display: block; text-align: center; font-size: 20px; padding: 5px 0; margin-bottom: 0.25em; font-family: Garamond;'>" + "Reroll Initative." + "</div>");
            ResetTint();
        }
	}
    // Exit script if custom item on turn order tracker instead of a token...
	if (turn_order[0].id == -1) return;
	// Tint the token whose turn it is.
    var curr_tok = getObj("graphic", turn_order[0].id);
    ResetTint();
    curr_tok.set({'tint_color' : tint_color_turn});
}catch(e)
{
    log(e);
    sendChat("GM", "/w GM Error occured in TurnOrderAgent");
    sendChat("GM", "/w GM " + e);
    return;
}
};

function EndTurn(playerid, force){
try{
    var to = Campaign().get('turnorder');
    if (!to) return;                                							// Exit if the turn order tracker is not open
    var turn_order = JSON.parse(to);                							// Parse the turn order information into JSON
    if (!turn_order.length) return;                 							// Exit if there are no tokens on the tracker
    var turn = turn_order.shift();                  							// Grab the info for the top of initiative    
    var graphic = getObj("graphic", turn.id);       							// get the graphic obj for the current token
    if(force || EotRequestValid(playerid,graphic)){  							// if request is not valid send error
        // Request valid... Process
        turn_order.push({                                           			// Add the info to the bottom of initiative
            id: turn.id,
            pr: turn.pr,
            custom: turn.custom
        });

        //Campaign().set("turnorder", JSON.stringify(turn_order));    			// Send the turn order back to the tracker
        Campaign().set({turnorder: JSON.stringify(turn_order)});
        log(turn_order);
        TurnOrderAgent();
    }
    else{
        SendChatTo(playerid, "TurnAgent", "It's not your turn, silly");
        return;
    }
}catch(e)
{
    log(e);
    sendChat("GM", "/w GM Error occured in EndTurn");
    sendChat("GM", "/w GM " + e);
    return;
}
};

// Resets the Tint value of all tokens in the Turn Order to tint_color_default
function ResetTint(){
    if (!Campaign().get('turnorder')) return;                   // Exit if the turn order tracker is not open
    var turn_order = JSON.parse(Campaign().get('turnorder'));   // Parse the turn order information into JSON
    if (!turn_order.length) return;                             // Exit if there are no tokens on the tracker
    turn_order.forEach(function(entry){                         // Reset all tint colors for current turn order list
        try{
            if(entry.id != "-1"){
                var token = getObj("graphic", entry.id);
                if(token) token.set({'tint_color' : tint_color_default}); // Reset tint value to transparent
            }
        }catch(e)
        {
            log(e);
            sendChat("GM", "/w GM Error occured in ResetTint");
            sendChat("GM", "/w GM " + e);
            return;
        }
    });
};

//This should be called once EOT puts a new round at the top of the tracker, and initative has been rerolled.
function TintOnTop(){
try{
    if (!Campaign().get("turnorder")) return;
    var turn_order = JSON.parse(Campaign().get("turnorder"));
    if (!turn_order.length) return;
    if (turn_order[0].id == -1) return;

	// Tint the token whose turn it is.
    var curr_tok = getObj("graphic", turn_order[0].id);
    ResetTint();
    curr_tok.set({'tint_color' : tint_color_turn});
}catch(e)
{
    log(e);
    sendChat("GM", "/w GM Error occured in TintOnTop");
    sendChat("GM", "/w GM " + e);
    return;
}
};

// Ends combat clearing all tint values and removing all tokens from the turn order
function EndCombat(){
try{
    ResetTint();
    //Campaign().set("turnorder", "[]");    // Reset Tracker
    Campaign().set({turnorder: "[]"});
    sendChat("", "/desc ");
    sendChat("", "/direct <div style='width: 100%; color: #C8DE84; border: 1px solid #91bd09; background-color: #749a02; box-shadow: 0 0 15px #91bd09; display: block; text-align: center; font-size: 20px; padding: 5px 0; margin-bottom: 0.25em; font-family: Garamond;'>" + "End of Combat" + "</div>");
}catch(e)
{
    log(e);
    sendChat("GM", "/w GM Error occured in EndCombat");
    sendChat("GM", "/w GM " + e);
    return;
}
};

/// Returns true if the EOT Request is valid given the inputs.
/// restrictEot: true: only controlling players can request, false: allows all
/// restrictGmEOT: true: GMs must follow restrictEot rule, otherwise they are always valid
/// playerid: playerid of the requester
/// graphic: graphic object
function EotRequestValid(playerid, graphic){
    return  (IsGM(playerid)) ||       				// GM Override
            (IsControlledBy(graphic, playerid));   // controlling player
};


/********************************************************************
	Utility Functions
********************************************************************/
/// Returns the requesters player._d20userid value via chat
on("chat:message", function(msg) {
    // Exit if not an api command
    if (msg.type != "api") return;
    // Get the API Chat Command
    var command = msg.content.split(" ", 1);
    if (command == "!getmyid") SendChatTo(msg.playerid, "GetMyId", "UserId: " + getObj("player", msg.playerid).get("_d20userid"));
});

/// Send a whisper to a player using playerid
function SendChatTo(playerid, chatMsg){
    SendChatTo(playerid,"Script",chatMsg);
};

/// Send a whisper to a player using a playerid with a custom source
function SendChatTo(playerid, sendAs, chatMsg){
    var player = getObj("player", playerid);
    if(player) sendChat(sendAs, "/w " + player.get("_displayname").split(" ",1) + " " + chatMsg);
};

/// Returns -1 if the value is not in the array, otherwise the array index of the value
function ArraySearch(array, value){
    if(array.length <= 0) return -1;
    for(var i = 0; i < array.length; i++)    {
        if(array[i] == value) return i;
    }
    return -1;
}

/// Returns an array of playerids that control the graphic
/// First checks if token is a character
///     true: list of playerids that control the character
///     false: list of playerids that control the graphic e.g. graphic.controlledby
function GetControlledBy(graphic){
    var charId = graphic.get("represents");
    if(charId) return getObj("character", charId).get("controlledby").split(",");
    return graphic.get("controlledby").split(",");
};

/// Returns true if "all" or playerid is a controller for the specified graphic or
/// note: while the GM can control all, this does not return true for GM's playerid
///     unless GM is explicitly set or "all" is set
function IsControlledBy(graphic, playerid){
    var controllerIds = GetControlledBy(graphic);
    if(controllerIds.length <= 0) return false;
    for(var i = 0; i < controllerIds.length; i++)    {
        if(controllerIds[i] == playerid || controllerIds[i] == "all") return true;
    }
    return false;
};

/// Returns true if the given playerid is a GM
/// Uses the GmIdList global to determine if player is a GM
function IsGM(playerid){
    if(!GmIdList) return false;
    return ArraySearch(GmIdList, getObj("player", playerid).get("_d20userid")) >= 0;
};
