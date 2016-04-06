/*
Function for validating the Game is Stalemate, Winner or no Winner Yet!
 */
var ai = require("./AIPlayer.js");
// Get game in game list

function getItemFromList(list, itemId) {
    for (var i = 0; i < list.length; i++)
        if (list[i].id == itemId) return list[i];
    return null;
}
function getGame(gameRegistrar, gameId) {
    game = getItemFromList(gameRegistrar, gameId);
    if (game == null) console.error("Error: No Game Found for " + gameId );
    return game;
}
//Gets a Player by Player.id
function getPlayer(playerList, playerId) {
    player = getItemFromList(playerList, playerId);
    if (player == null) console.error("Error: No Player Found for " + playerId);
    return player;
}

//Checks if a player is in a Game Room
function playerInRoom(roomID, socket) {
    var rooms = socket.rooms;
    for (var i = 0; i < rooms.length; i++) 
        if (rooms[i] === roomID) return true;
    return false;
}

//Extract User Game details from Cookie
function assignCookieParams(userName, sessId, wins, losses, stalemates) {
    return {
        userName: userName,  sessId:sessId,  wins:wins,  losses:losses,  stalemates:stalemates
    }
}
function extractParams(cookieParamStr, socketId) {
    if (cookieParamStr === "") return assignCookieParams(socketId, socketId, 0, 0, 0);
    var params = cookieParamStr.split("|");
    return assignCookieParams(params[0], params[1], params[2], params[3], params[4]);
}
//Gets cookie data from Request and returns Cookie with name
function getCookieValue(request,cookie) {
    var list = {};
    var rc = request.headers.cookie;
    var match="";
    rc && rc.split(';').forEach(function( cookie ) {
       var parts = cookie.split('=');
       if (parts[0].trim()=="tttGameParams") match = parts[1];
//        list[parts.shift().trim()] = unescape(parts.join('='));
    });
    return match;
}

//Removes any Games with Player.id.  Used when a Player exits.
function cleanGameByPlayer(gameRegistrar,playerId) {
    var GAME_CONNECTOR = "___";
    for (var i=0;i<gameRegistrar.length;i++) {
        var playerIds=gameRegistrar[i].id.split(GAME_CONNECTOR);
        if (playerIds[0]==playerId||playerIds[1]==playerId){
            gameRegistrar.splice(i,1);
        }
    }
}

function computerMove(size, gameRegistrar,io, gamePlaying,delay) {
    var player = gamePlaying.currentPlayer;
    var scores = ai.scoreBoard(gamePlaying.board,player.id);
    var maxScore = 0;
    var r_move = 0, c_move=0;
    var scoreHold = new Array();
    for (var r = 0; r < size; r++){
        for (var c = 0; c < size; c++) {
            if (maxScore == scores[r][c]){
                scoreHold.push({r:r,c:c,score:scores[r][c]});
            }else if (maxScore<scores[r][c]) {
                scoreHold=new Array();
                maxScore=scores[r][c];
                scoreHold.push({r:r,c:c,score:scores[r][c]});
            }
        }
    }
    // Score hold
    if (scoreHold.length>1) {
       var select = Math.floor(Math.random() * scoreHold.length-1) + 1;
       r_move=scoreHold[select].r;
       c_move=scoreHold[select].c;
    }else {
        r_move=scoreHold[0].r;
        c_move=scoreHold[0].c;
    }
    // Update score
    gamePlaying.aiscore=scores;
    gamePlaying.completeTurn(player,[r_move,c_move]);
    // Is end
    if (gamePlaying.isStalemate()) {
        io.in(gamePlaying.playerX.id).emit('stale_mate',gamePlaying);
        io.in(gamePlaying.playerX.id).emit('game_message',{message:"Stale Mate!"});
        getGame(gameRegistrar,gamePlaying.id).endGame(io, gameRegistrar);
    } else if (gamePlaying.isWinner()) {
        var gameCompleted={
            game:gamePlaying,
            winner:gamePlaying.playerO.id
        };
        io.in(gamePlaying.playerX.id).emit('game_won',gameCompleted);
        getGame(gameRegistrar,gamePlaying.id).endGame(io, gameRegistrar);
    }else {
        io.in(gamePlaying.playerX.id).emit('turn_played',gamePlaying);
    }
}

module.exports.getPlayer = getPlayer;
module.exports.getGame = getGame;
module.exports.playerInRoom = playerInRoom;
module.exports.extractParams = extractParams;
module.exports.getCookieValue = getCookieValue;
module.exports.cleanGameByPlayer = cleanGameByPlayer;
module.exports.computerMove = computerMove;