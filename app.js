
var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
//app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}
app.get('/', routes.index);
http = http.createServer(app);
// module and methods
var ai = require("./public/javascripts/AIPlayer.js");
var gameHelpers = require("./public/javascripts/gameHelpers.js");
var gameModule = require("./public/javascripts/game.js"), Game = gameModule.Game, Player = gameModule.Player;
var gameDone = gameHelpers.gameDone, getGame = gameHelpers.getGame, playerInRoom = gameHelpers.playerInRoom, 
    extractParams = gameHelpers.extractParams, getCookieValue = gameHelpers.getCookieValue, getPlayer = gameHelpers.getPlayer,
    cleanGameByPlayer = gameHelpers.cleanGameByPlayer, computerMove = gameHelpers.computerMove;
// Global vars
var io = require('socket.io')(http);
var gameRegistrar=new Array();
var playerList = new Array();

/*
 Setup pSocket IO Connection
 - All message listeners are defined in this function.
 */



//Start Up Listener

http.listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});
io.on('connection', function(socket){


    setupPlayerAndConnection(socket);

    //Generic Message for All to See from Clients
    socket.on('message', function(data){
        io.emit('server_message',data);
    });

    //Request a Game
    socket.on('requestGame', function(data){

        //Create a New Game for Request
        var players = {requester:getPlayer(playerList, data.requestID),requestee:getPlayer(playerList, data.openPlayerID)};

        var game = new Game(players);
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
        }else
        {

            socket.join(game.id, function() {
                sendRequest();
            });
        }


    });

    //Request a Game
    socket.on('requestComputerGame', function(data){

        //Create Computer Player
        var aiPlayer = new Player(data.requestID+"_AI","Computer",0,0,0,"playing",true);

        //Create a New Game for Request
        getPlayer(playerList, data.requestID).computerai=false;
        var players = {requester:getPlayer(playerList, data.requestID),requestee:aiPlayer};

        var game = new Game(players,data.requestID);
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


    });

    socket.on('requestSimulation', function(data){

        //Create Computer Player
        var aiPlayer = new Player(data.requestID+"_AI","Computer",0,0,0,"playing",true);

        //Create a New Game for Request
        getPlayer(playerList, data.requestID).computerai=true;
        var players = {requester:getPlayer(playerList, data.requestID),requestee:aiPlayer};

        var game = new Game(players,data.requestID);
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

    });

    // Updates a Players name for display across clients
    socket.on('updatePlayerName',function(nameData) {

        var player = getPlayer(playerList, socket.id);
        player.playerName=nameData.name;

        io.emit('player_update',player);

    });

    //Join A Game Response for a Game Request
    socket.on('joinGame', function(data){

        var gamePlaying = getGame(gameRegistrar,data.gameId);
        gamePlaying.state="live";

        if (playerInRoom(gamePlaying.id,socket)) {
            gamePlaying.startGame(io);
        }else
        {

            socket.join(gamePlaying.id, function() {
                gamePlaying.startGame(io);
            });

        }
    });



    // Play a turn as a Player
    socket.on('playTurn', function(data){

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
        }else
        {
            io.in(gameId).emit('turn_played',gamePlaying);
            if (gamePlaying.currentPlayer.computerai) {
                setTimeout(function() {
                    computerMove(gameRegistrar,io, gamePlaying)},100);

            }

        }

    });

    //On Disconnect, we remove the Player and Games they are registered in...
    socket.on('disconnect', function(){

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
    });
});
function setupPlayerAndConnection(socket) {
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
