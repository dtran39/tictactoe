function createNewBoardOnDOM(board, boardHeight, boardWidth) {
    var numRow = board.length, numCol = board[0].length;        
    $('#mainBoard').empty();
    for (var r = 0; r < numRow; r++) {
            $tr = $('<tr>');
            for (var c = 0; c < numCol; c++) {
                $cell = $('<td>');
                $cell.attr("id","cell" + r + "_" + c);
                $tr.append($cell);
            }
        $("#mainBoard").append($tr);            
    }
    var cellHeight = Math.floor(boardHeight / numRow), cellWidth = Math.floor(boardWidth / numCol),
    fontSize = Math.min(cellWidth, cellHeight) * 80 / 100;
    $('#mainBoard').css({'height': boardHeight + 'px', 'width': boardWidth + 'px'});
    $('td').css({'height': cellHeight + 'px', 'width': cellWidth + 'px', 'font-size': fontSize + 'px'});
}
//Update Display with Player info.

function updateDisplay(){
    $("#playerName").empty().append("Player: " + gameParams.userName);
    $("#wins").empty().append(gameParams.wins);
    $("#losses").empty().append(gameParams.losses);
    $("#ties").empty().append(gameParams.stalemates);

}
function selectionSetup(selection) { return function () {  showSelection(selection);} }
function showSelection(selection) { $(selection).toggleClass("selecting"); }


//Intermediate function for pass thru...
function playSetup(socket, gameId, clientId, row, quad) { 
	return function () {            
		playTurn(socket, gameId, clientId, row, quad);        
	}
}
//Play client turn and update the row.
function playTurn(socket, gameId, clientId, row, quad) {
    var playerInfo = {"gameId": gameId, "player": clientId, "action": {"row": row, "quad": quad}};
    $("#cell" + row + "_" + quad).toggleClass("selecting");
    socket.emit('playTurn', playerInfo);
}