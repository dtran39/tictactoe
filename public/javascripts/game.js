function Player(clientId,userName,wins,losses,stalemate,state,ai) {
        var obj = {id: clientId, state: state, computerai: ai,
                    wins: wins, losses: losses, stalemate: stalemate};
        obj.playerName = (userName === undefined) ? obj.id : userName;
        return obj;
}
    
function Game(size, playerList,id) {
    playerList.requester.icon="X";      this.playerX=playerList.requester;
    playerList.requestee.icon="O";      this.playerO= playerList.requestee;
    this.players=[this.playerX,this.playerO];
    this.currentPlayer=this.playerX;

    //Main Vars
    var GAME_CONNECTOR = "___";
    this.id= id != null ? id:this.playerX.id + GAME_CONNECTOR + this.playerO.id;

    var board = new Array(size); for (var i = 0; i < size; i++) board[i] = new Array(size).fill(0);
    this.board = board.slice(0);
    this.aiscore= board.slice(0);
    this.stats={x:{wins:0,losses:0,stale:0},o:{wins:0,losses:0,stale:0}};
    this.live=true;
    return this;
}

Game.prototype.startGame = function(io){
    this.players.forEach(function(player) {
        player.state="playing";
        io.emit('player_update',player);
    });
    io.in(this.id).emit('begin_game',this);
    io.in(this.playerX.id).emit('game_message',{message:"Game Started, You go First"});
    io.in(this.playerO.id).emit('game_message',{message:"Game Started, Other Player Thinking"});
}

Game.prototype.endGame = function(io, gameRegistrar) {
    this.players.forEach(function(player) {
        if (!player.computerai) {
            player.state="new";
            io.emit('player_update',player);
        }
    });

    this.cleanGame(gameRegistrar);
}

Game.prototype.cleanGame = function(gameRegistrar){
    for (var i=0;i<gameRegistrar.length;i++) {
        if (gameRegistrar[i].gameId==this.gameId){
            gameRegistrar.splice(i,1);
            break;
        }
    }
}

Game.prototype.completeTurn = function(player,location) {
    if (this.currentPlayer === player && player === this.playerX) {
        this.board[location[0]][location[1]]=this.playerX.id;
        this.currentPlayer=this.playerO;
    }else {
        this.board[location[0]][location[1]]=this.playerO.id;
        this.currentPlayer=this.playerX;
    }
}


Game.prototype.isStalemate = function() {
    if (gameDone(this.board).result=="stalemate") {
        if (this.live) {
            this.stats.x.stale++;
            this.stats.o.stale++;
            this.live=false;
        }
        return true;
    }
    return false;
}

Game.prototype.isWinner = function() {
    var results = gameDone(this.board);
    if (results.result=="winner") {
        if (this.live) {
            if (this.playerX.id==results.winner) {
                this.stats.x.wins++;
                this.stats.o.losses++;
            }else {
                this.stats.x.losses++;
                this.stats.o.wins++;
            }
            this.live=false;
        }
        return true;
    }
    return false;

};

function isOutOfBound(board, row, col) {
    var height = board.length, width = board[0].length;
    return (row < 0) || (row > height - 1) || (col < 0) || (col > width - 1);    
}
function hasWonInOneDir(board,row, col, verDir, horDir, connectionLength) {
    while(!isOutOfBound(board, row - verDir, col - horDir) && board[row - verDir][col - horDir] == board[row][col]) {
        row -= verDir;         col -= horDir;
    }
    var count = 1;
    while (!isOutOfBound(board, row + verDir, col + horDir) && board[row + verDir][col + horDir] == board[row][col]) {
        row += verDir; col += horDir;       count++;
    }
    return count >= connectionLength;               
}
function hasWonInAnyDir(board, row, col, connectionLength) {
    return  hasWonInOneDir(board, row, col, 1, 0, connectionLength)
        ||  hasWonInOneDir(board, row, col, 0, 1, connectionLength) 
        ||  hasWonInOneDir(board, row, col, 1, 1, connectionLength)
        ||  hasWonInOneDir(board, row, col, 1, -1, connectionLength);
}
function isTied(board, defaultValue) {
    for (var i = 0; i < board.length; i++)
        for (var j = 0; j < board[0].length; j++)
            if (board[i][j] == defaultValue)
                return false;
    return true;
}
var gameDone = function (board) {
    // Check for Winner, need to check very spot that has been marked (O (n ^ 2) -> need to mark the currently marked spot)
    for (var i = 0; i < board.length; i++)
        for (var j = 0; j < board[i].length; j++) {
            if (board[i][j] == 0) continue;
            if (hasWonInAnyDir(board, i, j, 3)) return {result:"winner", winner:board[i][j]};
        }
    //Check StaleMate
    if (isTied(board, 0)) return {result: "stalemate"};
    return {result:"live",winner:null};
}
//
module.exports.Game = Game;
module.exports.Player = Player;