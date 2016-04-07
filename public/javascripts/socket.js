var ai = require("./AIPlayer.js");
var gameModule = require("./game.js"), Game = gameModule.Game, Player = gameModule.Player;
var gameHelpers = require("./gameHelpers.js");
var gameDone = gameHelpers.gameDone, getGame = gameHelpers.getGame, playerInRoom = gameHelpers.playerInRoom, 
    extractParams = gameHelpers.extractParams, getCookieValue = gameHelpers.getCookieValue, getPlayer = gameHelpers.getPlayer,
    cleanGameByPlayer = gameHelpers.cleanGameByPlayer, computerMove = gameHelpers.computerMove;
var globalHeight = 5, globalWidth = 5;

function requestGame(gameRegistrar,playerList, io, socket){
    return  function(data){
        //Create a New Game for Request
        var players = {
            requester:getPlayer(playerList, data.requestID),
            requestee:getPlayer(playerList, data.openPlayerID)
        };
        var game = new Game(globalHeight, globalWidth, players);
        gameRegistrar.push(game);
        game.players.forEach(function(player) {
            player.state="pending";
        });
        function sendRequest() {
            io.emit("player_update",game.playerX);
            io.in(game.playerO.id).emit('request_to_join', game);
            io.emit("player_update",game.playerO);
        }
        /*
        Send Request to other Player, after checking if client already has a game.
         */
        if (playerInRoom(game.id,socket)) {
                sendRequest();
        }else {
            socket.join(game.id, function() {
                sendRequest();
            });
        }

    };
}
function requestComputerGame(playerList, gameRegistrar, io) {
    return function(data){
        //Create Computer Player
        var aiPlayer = new Player(data.requestID+"_AI","Computer",0,0,0,"playing",true);
        //Create a New Game for Request
        getPlayer(playerList, data.requestID).computerai=false;
        var players = {
            requester:getPlayer(playerList, data.requestID),
            requestee:aiPlayer
        };

        var game = new Game(globalHeight, globalWidth, players,data.requestID);
        game.state="live";
        gameRegistrar.push(game);
        game.players.forEach(function(player) {
            player.state="playing";
        });
        function sendRequest(gamePlaying) {
            io.emit("player_update",gamePlaying.playerX);
            gamePlaying.startGame(io);
        }

        sendRequest(game);


    };
}
function requestSimulation(gameRegistrar,playerList, io){
    return function(data){
        //Create Computer Player
        var aiPlayer = new Player(data.requestID+"_AI","Computer",0,0,0,"playing",true);
        //Create a New Game for Request
        getPlayer(playerList, data.requestID).computerai=true;
        var players = {
            requester:getPlayer(playerList, data.requestID),
            requestee:aiPlayer
        };

        var game = new Game(globalHeight, globalWidth, players,data.requestID);
        game.state="SIMULATION_RUN";
        gameRegistrar.push(game);
        game.players.forEach(function(player) {
            player.state="playing";
        });

        function sendRequest(gamePlaying) {
            io.emit("player_update",gamePlaying.playerX);
            gamePlaying.startGame(io);
        }

        sendRequest(game);

    }
}

function updatePlayerName(io, playerList, socket) {
    return function(nameData) {
        var player = getPlayer(playerList, socket.id);
        player.playerName = nameData.name;
        io.emit('player_update',player);

    };
}
function emitMessage(io) {
	return function(data){
        io.emit('server_message',data);
    };
}
function joinGame(gameRegistrar, socket, io) {
	return function(data){
        var gamePlaying = getGame(gameRegistrar,data.gameId);
        gamePlaying.state="live";

        if (playerInRoom(gamePlaying.id,socket)) {
            gamePlaying.startGame(io);
        }else {
            socket.join(gamePlaying.id, function() {
                gamePlaying.startGame(io);
            });

        }
    }
}


function playTurn(gameRegistrar, playerList, io, socket){
	return function(data){
        var gameId=data.gameId;
        var gamePlaying = getGame(gameRegistrar,gameId);
        if (data.player!==socket.id) console.error("Something is Up!");

        gamePlaying.completeTurn(getPlayer(playerList, data.player),[data.action.row,data.action.quad]);

        if (gamePlaying.isStalemate()) {

            io.in(gameId).emit('stale_mate',gamePlaying);
            io.in(gameId).emit('game_message',{message:"Stale Mate!"});
            getGame(gameRegistrar,data.gameId).endGame(io, gameRegistrar);
        } else if (gamePlaying.isWinner()) {

            var gameCompleted={
                game:gamePlaying,
                winner:getPlayer(playerList, socket.id)
            };
            io.in(gameId).emit('game_won',gameCompleted);
            getGame(gameRegistrar,gameId).endGame(io, gameRegistrar);
        }else {
            io.in(gameId).emit('turn_played',gamePlaying);
            if (gamePlaying.currentPlayer.computerai) {
                setTimeout(function() {
                    computerMove(gameRegistrar,io, gamePlaying)},100);
            }
        }
    };
}
function disconnect(gameRegistrar, playerList, io, socket){
	return function(){
        var playerDelete;
        cleanGameByPlayer(gameRegistrar,socket.id);
        for (var i=0;i<playerList.length;++i) {
            if (playerList[i].id==socket.id) {
                playerDelete=playerList[i];
                playerList.splice(i,1);
            }
        }
        playerDelete.playing=false;
        playerDelete.state="left";
        io.emit('player_update',playerDelete);
    };
}
function setupPlayerAndConnection(playerList, io,socket) {
    //Cookie Process for Name - Ignore Session Id since it most likely is Stale
    var cookieStr = getCookieValue(socket.request, "tttGameParams");
    //Load Game Params from Cookie
    var gameParams = extractParams(cookieStr, socket.id);
    //Set Player
    var player = new Player(socket.id, gameParams.userName, gameParams.wins, gameParams.losses, gameParams.stalemate, "new", false);
    playerList.push(player);
    socket.emit('available_games', playerList);
    io.emit('player_update', player);
}

module.exports.emitMessage = emitMessage;
module.exports.updatePlayerName = updatePlayerName;
module.exports.requestComputerGame = requestComputerGame;
module.exports.joinGame = joinGame;
module.exports.requestGame = requestGame;
module.exports.requestSimulation = requestSimulation;
module.exports.playTurn = playTurn;
module.exports.disconnect = disconnect;
module.exports.setupPlayerAndConnection = setupPlayerAndConnection;