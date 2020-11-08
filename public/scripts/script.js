var socket = io();

id = '_' + Math.random().toString(36).substr(2, 9);

socket.on('user-disconnected', userId => {
  alert('USER DISCONNECTED ' + userId)
})
socket.on('user-connected', userId => {
  alert('USER CONNECTED ' + userId)
})

socket.emit('join-room', ROOM_ID, id)