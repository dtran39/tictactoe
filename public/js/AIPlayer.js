function scoreBoard(board,player_id) {
    //console.log("Starting Scoring");
    var height = board.length, width = board[0].length;
    var newBoard = new Array(height); for (var i = 0; i < height; i++) newBoard[i] = new Array(width).fill(0);
    var scores = newBoard.slice(0);
    for (var r = 0; r < height; r++) {
        for (var c = 0;c < width; c++) {
            if (board[r][c]==0) {
                if (r==1||c==1) {
                    scores[r][c]=tallyCenterAxis(board,r,c,player_id);
                }else {
                    var r_inc = r==0?1:-1;
                    var c_inc = c==0?1:-1;

                    var scoreCard = tallyLinearAxis(board,r,c,r_inc,0,player_id);
                    scoreCard = scoreCard + tallyLinearAxis(board,r,c,r_inc,c_inc,player_id);
                    scoreCard = scoreCard + tallyLinearAxis(board,r,c,0,c_inc,player_id);
                    scores[r][c]=scoreCard;

                }
            } else {
                scores[r][c]=-10;
            }
        }
    }
    return scores;
}
function tallyCenterAxis(board,r,c,player_id) {

    var scoreVal=0;
    if (r==1&&c==1) {
        scoreVal = scoreVal + score(board[1][0],board[1][2],player_id);
        scoreVal = scoreVal + score(board[0][0],board[2][2],player_id);
        scoreVal = scoreVal + score(board[2][0],board[0][2],player_id);
        scoreVal = scoreVal + score(board[0][1],board[2][1],player_id);
    }else if (r!=1&&c==1) {
        scoreVal = scoreVal + score(board[r][0],board[r][2],player_id);
        scoreVal = scoreVal + tallyLinearAxis(board,r,c,r==0?1:-1,0,player_id);

    }else if (r==1&&c!=1) {
        scoreVal = scoreVal + score(board[0][c],board[2][c],player_id);
        scoreVal = scoreVal + tallyLinearAxis(board,r,c,0,c==0?1:-1,player_id);

    }
    return scoreVal;
}

function tallyLinearAxis(board,r,c,r_inc,c_inc,player_id) {
    var lastId;
    var first=true;

    if (r_inc!=0&&c_inc!=0){
        return score(board[r+r_inc][c+c_inc],board[r+r_inc*2][c+c_inc*2],player_id);
    } else {
        if (r_inc!=0){
            return score(board[r+r_inc][c],board[r+r_inc*2][c],player_id);
        }else{
            return score(board[r][c+c_inc],board[r][c+c_inc*2],player_id);
        }
    }
}
function score(adj,end,player_id){
    if (adj==player_id&&end==player_id) return 60+30;
    if (adj!=player_id&&adj!=0&&end!=player_id&&end!=0) return 40+40;
    if (adj==0&&end==0) return 15;
    if (adj==player_id&&end==0) return 20;
    if (adj==0&&end==player_id) return 20;
    return 0;
}