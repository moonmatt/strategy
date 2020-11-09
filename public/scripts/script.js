var socket = io();

function removeA(arr) {
  var what, a = arguments, L = a.length, ax;
  while (L > 1 && arr.length) {
      what = a[--L];
      while ((ax= arr.indexOf(what)) !== -1) {
          arr.splice(ax, 1);
      }
  }
  return arr;
}

let onlinePlayers = []

socket.on('user-disconnected', userId => {
  console.log('USER DISCONNECTED ' + userId)
  document.getElementById('playersNum').innerHTML = document.getElementById('playersNum').innerHTML - 1
  removeA(onlinePlayers, userId);
  document.getElementById('playersNames').innerHTML = onlinePlayers
})
socket.on('user-connected', (userId, usersList) => {
  console.log('USER CONNECTED ' + userId)
  onlinePlayers = usersList.names
  document.getElementById('playersNum').innerHTML = usersList.number
  document.getElementById('playersNames').innerHTML = onlinePlayers
})

socket.emit('join-room', ROOM_CODE, username)