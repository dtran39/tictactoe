/* Author: Joshua Remy
 Script to support the Tic Tac Toe Client side.

 */

//STATIC Deployment and Game Settings
var GAME_HOST = 'http://localhost:3000/';
var COMPUTER_PACE_MS=100;
var SHOW_SCORES=false, SIMULATION_RUN=false;

//Global variables that are necessary for the session.
var playerIcon="X",oppPlayerIcon="O",clientId;
var gameId = "";
var logViewShow=false;

var gameParams = {    userName:"",    wins:0,    losses:0,    sessId:"",    stalemates:0    };
$(document).ready(function () {

    var socket = io(GAME_HOST);
    socket.on('connect', function () {
        clientId = socket.io.engine.id;
        initializeGameParams();
        console.log("ID Assigned - " + clientId);

    });
    /**
     * Starts the game initializes the board and view by showing the grid, if necessary.
     *
     * Passed a Game object.
     */
    socket.on('begin_game', function (game) {
        gameId = game.id;
        //Prepare the board
        createNewBoardOnDOM(game.board, 500, 500);
        // Update board
        if (game.currentPlayer.id == clientId)      updateBoard(game.board, true,game.aiscore);
        else                                        updateBoard(game.board, false,game.aiscore);
        // Pointless animation
        $(".header").slideUp(250); $(".gameIconPanel").slideDown(500); $(".gameViewBox").slideDown(500);
        if (game.currentPlayer.computerai)             aiTurnPlay(game);        
    });

    /**
     * Main turn played and passed a game object.
     *
     * If AI player, the system will invoke the computer's turn.
     *
     */
    socket.on('turn_played', function (game) {
        if (game.currentPlayer.id == clientId) {
            updateBoard(game.board, true,game.aiscore);
            $('#gameMessage').empty().append('Your Turn Now!');
            if (game.currentPlayer.computerai) {
                setTimeout(function() {aiTurnPlay(game);},COMPUTER_PACE_MS);
            }
        } else {
            updateBoard(game.board, false,game.aiscore);
            $('#gameMessage').empty().append('Waiting for Other Player!');
        }
    });
    //Server message broadcast
    socket.on('server_message', function (data) {
        $('#receiver').append('<li>Message: ' + data + '</li>');
    });
    //Game message for general updates to game and logged.
    socket.on('game_message', function (data) {
        logEvent(data.message,true);
    });
    // Provides the avaialble games that are on the server.  After this call,
    // the system uses update player to add and update any other player information.
    socket.on('available_games', function (players) {
        $('#availGames').empty();
        logEvent("Available Games Loading",true);
        for (var i = 0; i < players.length; ++i) {
            if (players[i].id != clientId) {
                $('#availGames').append('<li id="player_' + players[i].id + '"></li>');
                if (players[i].state!="playing") {
                    addOpenGame(players[i]);
                } else {
                    $("#player_" + players[i].id).replaceWith('Game ' + players[i].state + ' for ' + players[i].playerName);
                }
            }
        }
        logEvent("Games Loaded...Choose One",true);
    });
    // Player updates from properties like name, state and it will update the display after player info changes.
    // States: new, left, pending, and playing.
    socket.on('player_update', function (player) {
        //$('#receiver').append('<li>Player Updated/Added: ' + data.id  + ' to ' + data.state + '</li>');
        //alert("Update for " +player.playerName + ":" +player.state);
        logEvent("Player " + player.playerName+ " Info Updated",false);
        if (player.id != clientId) {
            if (player.state == "new") {
                $('#availGames').append('<li id="player_' + player.id + '"></li>');
                addOpenGame(player);
                logEvent("New Player " + player.playerName,false);
            } else if (player.state == "left") {
                $("#player_" + player.id).remove();
                logEvent("Player " + player.playerName+ " Left Game",false);
            } else if (player.state == "pending") {
                $("#player_" + player.id).empty().append('Game Request Pending for ' + (player.playerName?player.playerName:player.id));
                logEvent("Player " + player.playerName+ " Pending Game Request",false);
            }
            else if (player.state == "playing") {
                $("#player_" + player.id).empty().append('Game Started with ' + (player.playerName?player.playerName:player.id));
                logEvent("Player " + player.playerName+ " Started a Game",false);
            }


        }
    });
    /**
     * Message listener for request to Join.  Player will see an update on the game list.
     *
     */
    socket.on("request_to_join", function (game) {

        if (game.playerO.id == clientId) {

            var req_id = game.id;
            $("#player_" + game.playerX.id).empty().append('Play Request by  ' + game.playerX.playerName + ' | <button id="' + req_id + '" >Join Game</button>');
            $('#' + req_id).bind('click', function () {
                var joinDetails = {
                    gameId: game.id
                };
                socket.emit('joinGame', joinDetails);
            });
        }

    });

    /**
     * Game Won by some player.  Function validates who won and displays the appropriate info.
     *
     *
     */
    socket.on('game_won', function (data) {

        updateBoard(data.game.board, false,data.game.aiscore);
        if (data.winner.id == clientId) {
            gameParams.wins++;
            $('#gameMessage').empty().append("<strong>You Won!</strong>");
        } else {
            gameParams.losses++;
            $('#gameMessage').empty().append("You Lost!");
        }

        saveParams();
        updateDisplay();

        if (SIMULATION_RUN) {
                var startDetails = {
                    requestID: clientId,
                    action: "Request Simulation Game"

                };
                setTimeout(function() {
                    socket.emit('requestSimulation', startDetails)
                },COMPUTER_PACE_MS
            );
        }


    });

    /**
     * Stalemate message and ending the game.
     *
     */
    socket.on('stale_mate', function (data) {
        gameParams.stalemates++;
        saveParams();
        updateBoard(data.board, false);
        updateDisplay();

        if (SIMULATION_RUN) {
            var startDetails = {
                requestID: clientId,
                action: "Request Simulation Game"

            };
            setTimeout(function() {
                    socket.emit('requestSimulation', startDetails)
                },COMPUTER_PACE_MS
            );
        }
    });
    //Log Event for Console and log view.
    function logEvent(event,display) {
        $('#archiveMessages').append("</br>").append(event);
        if (display) {
            $('#gameMessage').empty().append(event);
        }

    }

    /*
     Main Game Functions
     */

    /**
     * Initialize the main game parameters.  Sets up the buttons and various action a user can do.
     */
    function initializeGameParams(){
        var gameCookie = getCookie("tttGameParams");
        if (gameCookie!="") {
            getGameParams(gameCookie);              gameParams.sessId=clientId;
        } else        {
            gameParams.userName=clientId;           gameParams.sessId=clientId;
        }
        // Bind DOMS to click
        $('#updateName').bind("click", function () {
            var user = prompt("Add a Name","");
            if (user!=null) {
                gameParams.userName=user;
                saveParams();
                updateDisplay();
                socket.emit("updatePlayerName",{"name": user});
            }
        });
        $('#viewButton').bind("click", function () {
            if (!logViewShow){
                $('#archiveMessages').slideDown(500);
                $('#viewButton').empty().append("Close");
                logViewShow=true;
            }else
            {
                $('#archiveMessages').slideUp(500);
                $('#viewButton').empty().append("All Logs");
                logViewShow=false;
            }
        });
        $('#swapIcons').bind("click", function() {

            if (playerIcon=="X".trim()) {
                playerIcon="O";
                oppPlayerIcon="X";
            }else
            {
                playerIcon="X";
                oppPlayerIcon="O";
            }
            $("#myIcon").empty().append(playerIcon);
            $("#oppIcon").empty().append(oppPlayerIcon);
        });
        $('#playComputer').bind("click",function(){
            var startDetails = {
                requestID: clientId,
                action: "Request Computer Game"
            };
            socket.emit('requestComputerGame', startDetails);
        });
        $('#computerSimulation').bind("click",function(){
            var startDetails = {
                requestID: clientId,
                action: "Request Simulation Game"
            };
            socket.emit('requestSimulation', startDetails);
            SIMULATION_RUN=true;
        });
        saveParams();
        updateDisplay();
    }

    // AI turn playing, which will return complete the full turn.
    function aiTurnPlay(game) {
        var board = game.board, numRow = board.length, numCol = board[0].length;
        var row = Math.floor(Math.random() * numRow - 1) + 1;
        var col = Math.floor(Math.random() * numCol - 1) + 1;
        console.log(height + " " + width);
        var playerInfo = {"gameId": game.id, "player": game.currentPlayer.id, "action": {"row": row, "quad": col}};
        socket.emit('playTurn', playerInfo);
    }
    function aiTurnPlayOriginal(game) {
        var player = game.currentPlayer;
        var scores = scoreBoard(game.board, player.id);
        var maxScore = 0, r_move = 0, c_move = 0;
        var board = game.board, numRow = board.length, numCol = board[0].length;
        var scoreHold=[];
        for (var r = 0;r < numRow; r++){
            for (var c = 0; c< numCol; c++) {
                if (maxScore==scores[r][c]){
                    scoreHold.push({r:r,c:c,score:scores[r][c]});
                }else if (maxScore<scores[r][c]) {
                    scoreHold=[];
                    maxScore=scores[r][c];
                    scoreHold.push({r:r,c:c,score:scores[r][c]});
                }
            }
        }
        if (scoreHold.length>1) {
            var select= Math.floor(Math.random() * scoreHold.length-1) + 1;
            r_move=scoreHold[select].r;
            c_move=scoreHold[select].c;
        }else {
            r_move=scoreHold[0].r;
            c_move=scoreHold[0].c;
        }
        var playerInfo = {"gameId": game.id, "player": player.id, "action": {"row": r_move, "quad": c_move}};
        socket.emit('playTurn', playerInfo);
    }
 /*
 Cookie Code
     * Save Params to cookie.
     */
    function saveParams() {
        var cookieStr=gameParams.userName+"|"+gameParams.sessId+"|"+gameParams.wins
                        +"|"+gameParams.losses+"|"+gameParams.stalemates;
        setCookie("tttGameParams",cookieStr,3);
    }
    //Get the Game Params from the Cookie.

    function getGameParams(cookieParams) {
        var parseStr = cookieParams.split("|");
        gameParams.userName=parseStr[0];
        gameParams.sessId=parseStr[1];
        gameParams.wins=parseStr[2];
        gameParams.losses=parseStr[3];
        gameParams.stalemates=parseStr[4];

    }

    // Set the cookie id
    function setCookie(cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
        var expires = "expires=" + d.toGMTString();
        document.cookie = cname + "=" + cvalue + "; " + expires;
    }
    //Get the Cookie from the a specif cookie name.
    function getCookie(cname) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1);
            if (c.indexOf(name) != -1) return c.substring(name.length, c.length);
        }
        return "";
    }


/*
Display code
 */

    /**
     * Request a Game with another person.
     *
     * @param player
     */
    function addOpenGame(player) {
        $("#player_" + player.id).empty()
            .append('Game Open: ' + player.playerName + ' | <button id="' + player.id + '">Request Game</button>');
        $('#' + player.id).bind('click', function () {
            var startDetails = {
                requestID: clientId,
                openPlayerID: player.id,
                action: "Request Game"

            };
            socket.emit('requestGame', startDetails);
        });
    }
    //Helper Functions

    /**
     * Update the Board based on Board passed and if the board open squares should be activated for user.
     * The Scores uses the Global SCORES... Var to show or not show the scores.
     */
    function updateBoard(board, activate,scores) {

        var newScores = scoreBoard(board,clientId);
        var numRow = board.length, numCol = board[0].length;
        for (var r = 0; r < numRow; ++r) {
            for (var c = 0; c < numCol; ++c) {
                var cellindex = "#cell" + r + "_" + c;
                if (board[r][c] == 0 && activate) {
                    $(cellindex).empty();
                    if (SHOW_SCORES) {
                        $(cellindex).append("<span class='scoreText'>"+newScores[r][c]+"/" +scores[r][c] + "</span>");
                    }
                    if (!SIMULATION_RUN) {
                        $(cellindex).bind('mouseenter mouseleave', selectionSetup(cellindex));
                    }

                    $(cellindex).bind('click', playSetup(socket, gameId, clientId,r, c));

                } else if (board[r][c] == 0 && !activate) {
                    $(cellindex).empty();
                    if (!SIMULATION_RUN&&!SHOW_SCORES) {
                        $(cellindex).append("<span class='scoreText'>"+newScores[r][c]+"/" +scores[r][c] + "</span>");
                    }
                    $(cellindex).unbind();
                }
                else if (board[r][c] != 0) {
                    $(cellindex).unbind();
                    if (board[r][c] == clientId) {

                        $(cellindex).empty().append(playerIcon);
                    } else {

                        $(cellindex).empty().append(oppPlayerIcon);
                    }
                }
            }
        }
    }

});