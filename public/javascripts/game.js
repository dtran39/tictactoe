function Player(clientId,userName,wins,losses,stalemate,state,ai) {
        var obj = {id: clientId, state: state, computerai: ai,
                    wins: wins, losses: losses, stalemate: stalemate};
        obj.playerName = (userName === undefined) ? obj.id : userName;
        return obj;
}
    
function Game(playerList,id) {
    playerList.requester.icon="X";      this.playerX=playerList.requester;
    playerList.requestee.icon="O";      this.playerO= playerList.requestee;
    this.players=[this.playerX,this.playerO];
    this.currentPlayer=this.playerX;

    //Main Vars
    var GAME_CONNECTOR = "___";
    this.id= id != null ? id:this.playerX.id + GAME_CONNECTOR + this.playerO.id;
    this.board=[[0,0,0],[0,0,0],[0,0,0]];
    this.aiscore=[[0,0,0],[0,0,0],[0,0,0]];
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
            }else
            {
                this.stats.x.losses++;
                this.stats.o.wins++;
            }
            this.live=false;
        }


        return true;
    }
    return false;

};

Game.prototype.whoWon = function() {
   if (!this.winner) return null;
   var wonBy = gameDone(this.board).winner;
   return (wonBy == this.playerX.id) ? this.playerX : this.playerO;
};
var gameDone = function (board) {
    //Check for Winner

    for (var i=0;i<3;i++) {
        var lastSquare=0;
        for (var q=0;q<3;q++) {
            if (q==0) {
                if (board[i][q]==0) break;
                lastSquare=board[i][q];
            } else
            {
                if (board[i][q]==0||lastSquare!=board[i][q]) break;
                lastSquare=board[i][q];
            }
            if (q==2) return {result:"winner",winner:board[i][q]};
        }

    }

    for (var i=0;i<3;i++) {
        var lastSquare=0;
        for (var q=0;q<3;q++) {
            if (q==0) {
                if (board[q][i]==0) break;
                lastSquare=board[q][i];
            } else
            {
                if (board[q][i]==0||lastSquare!=board[q][i]) break;
                lastSquare=board[q][i];
            }
            if (q==2) return {result:"winner",winner:board[q][i]};
        }

    }

    if (board[0][0]!=0&&(board[0][0]==board[1][1]&&board[2][2]==board[1][1])) {
        return  {result:"winner",winner:board[0][0]};
    }

    //Check for ways to win
    if (board[0][2]!=0&&board[0][2]==board[1][1]&&board[2][0]==board[1][1]) {
        return  {result:"winner",winner:board[1][1]};
    }

    //Check StaleMate
    var mate=true;
    for (var i=0;i<3;i++) {

        for (var q=0;q<3;q++) {
            if (board[i][q]==0) mate=false;
        }

    }
    if (mate) {
        return {result:"stalemate"};
    }

    return {result:"live",winner:null};
}
//
module.exports.Game = Game;
module.exports.Player = Player;