var socket = io();

function kickPlayer(player){
    console.log(player)
}

function playerButtons(players){
    players.forEach(player => {
        let node = document.createElement("div");  
        node.innerHTML = player
        node.id = player
        if(player == username){
            node.className += "btn btn-outline-success btn-sm kickButton  " + player;
        } else {
            node.className += "btn btn-outline-danger btn-sm kickButton  " + player;
        }
        node.onclick = function() {
            console.log('kick = ' + player)
            socket.emit('kick-player', player)
        };
        document.getElementById('playersNames').appendChild(node); 
      })
}

function removePlayer(username) {
  onlinePlayers.forEach((player, index) => {
      if(player == username){
        onlinePlayers.splice(index, 1);
        document.getElementById('playersNames').innerHTML = ''
        playerButtons(onlinePlayers)
        document.getElementById('playersNum').innerHTML = onlinePlayers.length
      }
  })      
}

let onlinePlayers = []

socket.on('user-disconnected', userId => {
  console.log('USER DISCONNECTED ' + userId)
  removePlayer(userId)
})
socket.on('user-connected', (userId, usersList) => {
  console.log('USER CONNECTED ' + userId)
  onlinePlayers = usersList.names
  document.getElementById('playersNum').innerHTML = onlinePlayers.length
  document.getElementById('playersNames').innerHTML = ''
  playerButtons(onlinePlayers)

})

socket.on('you-are-the-admin', () => {
  alert('you are the admin')
  let startButton = document.getElementById('start')
  startButton.style.display = ''
 
  startButton.onclick = function(){
      console.log('ECCOMI INIZIA IL MATCH')
      socket.emit('start-match')
  };

})

socket.on('you-joined', usersList => {
  onlinePlayers = usersList.names
  console.log('SONO ENTRATO')
  document.getElementById('playersNum').innerHTML = onlinePlayers.length
  playerButtons(onlinePlayers)
  document.getElementById(username).classList.remove('btn-outline-danger');
  document.getElementById(username).className += ' btn-outline-success';
})

socket.on('you-got-kicked', () => {
    console.log('SONO STATO KICKATO :(')
    window.location.replace("/");
})
// Join Room
socket.emit('join-room', ROOM_CODE, username) 