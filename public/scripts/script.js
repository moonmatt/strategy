
var socket = io();

function kickPlayer(player){
    console.log(player)
}

function createAlert(message, type){
    let alertsList = document.getElementById('alerts')
    let node = document.createElement('div')
    node.innerHTML = message
    node.className += 'alert alert-dismissible fade show alert-' + type
    node.role = 'alert'
    alertsList.appendChild(node)
    let node1 = document.createElement('button')
    node1.className = 'close'
    node.appendChild(node1)
    let node2 = document.createElement('span')
    node2.innerHTML = '&times;'
    node2.setAttribute('data-dismiss', 'alert')
    node1.appendChild(node2)
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
  createAlert('You are the Admin!', 'success')
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
socket.on('you-kicked-him', (player) => {
    createAlert('You kicked ' + player, 'success')
})
// Join Room
socket.emit('join-room', ROOM_CODE, username) 