var socket = io();

socket.on('user-disconnected', userId => {
  console.log('USER DISCONNECTED ' + userId)
})
socket.on('user-connected', userId => {
  console.log('USER CONNECTED ' + userId)
})

socket.emit('join-room', ROOM_CODE, username)