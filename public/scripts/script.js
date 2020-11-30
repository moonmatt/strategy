var socket = io();

function removePlayer(username) {
  onlinePlayers.forEach((player, index) => {
      if(player == username){
        onlinePlayers.splice(index, 1);
        document.getElementById('playersNames').innerHTML = onlinePlayers
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
  document.getElementById('playersNames').innerHTML = onlinePlayers
})

socket.on('you-are-the-admin', () => {
  alert('you are the admin')
})

socket.on('you-joined', usersList => {
  onlinePlayers = usersList.names
  console.log('SONO ENTRATO')
  document.getElementById('playersNum').innerHTML = onlinePlayers.length
  document.getElementById('playersNames').innerHTML = onlinePlayers
})

// Join Room
socket.emit('join-room', ROOM_CODE, username) 