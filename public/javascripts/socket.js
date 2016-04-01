var message = function(data){
        io.emit('server_message',data);
}
var disconnect = function(){

}
module.exports.message = message;