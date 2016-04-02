
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
var socketModule = require("./public/javascripts/socket.js");
var ai = require("./public/javascripts/AIPlayer.js");
var gameModule = require("./public/javascripts/game.js"), Game = gameModule.Game, Player = gameModule.Player;
var gameHelpers = require("./public/javascripts/gameHelpers.js");
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
    socketModule.setupPlayerAndConnection(playerList, io,socket);
    // setupPlayerAndConnection(socket);
    //Generic Message for All to See from Clients
    socket.on('message', socketModule.emitMessage());
    //Request a Game
    socket.on('requestGame', socketModule.requestGame(gameRegistrar,playerList, io, socket));
    //Request a Game with Computer
    socket.on('requestComputerGame', socketModule.requestComputerGame(playerList, gameRegistrar,io));
    // Request a simulation game between two computers
    socket.on('requestSimulation', socketModule.requestSimulation(gameRegistrar,playerList, io));
    // Updates a Players name for display across clients
    socket.on('updatePlayerName', socketModule.updatePlayerName(io, playerList, socket));
    //Join A Game Response for a Game Request
    socket.on('joinGame', socketModule.joinGame(gameRegistrar, socket, io));
    // Play a turn as a Player
    socket.on('playTurn', socketModule.playTurn(gameRegistrar, playerList, io, socket));
    //On Disconnect, we remove the Player and Games they are registered in...
    socket.on('disconnect', socketModule.disconnect(gameRegistrar, playerList, io, socket));
});
