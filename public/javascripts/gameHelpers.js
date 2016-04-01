/*
Function for validating the Game is Stalemate, Winner or no Winner Yet!
 */
var ai = require("./AIPlayer.js");
function getGame(gameRegistrar, gameId) {
    for (var i = 0; i < gameRegistrar.length; i++) {
        if (gameRegistrar[i].id == gameId) {
            return gameRegistrar[i];
        }

    }
    console.error("Error: No Game Found for " + gameId );
    return null;
}
//Checks if a player is in a Game Room

function playerInRoom(roomID,socket) {
    var check=false;
    socket.rooms.forEach (function(room) {
        if (room === roomID) return check=true;
    });
    return check;
}
//Extract User Game details from Cookie
function extractParams(cookieParams,socketId) {
    //console.log(cookieParams);
    var gameParams;
    if (cookieParams === "") {
        return {
            userName:socketId,
            sessId:socketId,
            wins:0,
            losses:0,
            stalemates:0

        };
    }else {
        var parseStr = cookieParams.split("|");
        return {
            userName:parseStr[0],
            sessId:parseStr[1],
            wins:parseStr[2],
            losses:parseStr[3],
            stalemates:parseStr[4]
        };
    }
}
//Gets cookie data from Request and returns Cookie with name
function getCookieValue(request,cookie) {
    var list = {},
        rc = request.headers.cookie;
    var match="";
    rc && rc.split(';').forEach(function( cookie ) {

       var parts = cookie.split('=');

       if (parts[0].trim()=="tttGameParams") match = parts[1];
//        list[parts.shift().trim()] = unescape(parts.join('='));
    });

    return match;
}
//Gets a Player by Player.id
function getPlayer(playerList, playerId) {
    for (var i = 0; i < playerList.length; ++i) {
        if (playerList[i].id==playerId) {
           return playerList[i];
        }
    }
    console.error("Error: No Player Found for " + playerId);
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

function computerMove(gameRegistrar,io, gamePlaying,delay) {

    var player = gamePlaying.currentPlayer;

    var scores= ai.scoreBoard(gamePlaying.board,player.id);
    var maxScore =0;
    var r_move=0;
    var c_move=0;
    var scoreHold=new Array();
    for (var r=0;r<3;r++){
        for (var c=0;c<3;c++) {
            if (maxScore==scores[r][c]){
                scoreHold.push({r:r,c:c,score:scores[r][c]});
            }else if (maxScore<scores[r][c]) {
                scoreHold=new Array();
                maxScore=scores[r][c];
                scoreHold.push({r:r,c:c,score:scores[r][c]});
            }
        }
    }

    if (scoreHold.length>1) {
       var select= Math.floor(Math.random() * scoreHold.length-1) + 1;
       r_move=scoreHold[select].r;
       c_move=scoreHold[select].c;
    }else
    {
        r_move=scoreHold[0].r;
        c_move=scoreHold[0].c;
    }
    gamePlaying.aiscore=scores;
    gamePlaying.completeTurn(player,[r_move,c_move]);

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