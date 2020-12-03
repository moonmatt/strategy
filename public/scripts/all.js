// import { mapComponent }  from './map.js';
// import { scriptComponent }  from './script.js';

// console.log(mapComponent, scriptComponent)

// Create
function create(){
    fetch('https://angelicustodi.cf/create', {method: 'POST'}).then(async response => {
    const api = await response.json();

    if(api.result){

        join(api.roomId)

        // document.querySelector('main').innerHTML = api.output
        // document.getElementById('roomCode').innerHTML = api.roomId
        // document.getElementById('username').innerHTML = api.username
        // document.title = api.roomId + ' | Map Heroes'
        // let ROOM_CODE = api.roomId
        // let username = api.username
        // document.head.innerHTML = api.head
        // api.scripts.forEach(scriptSrc => {
        //     let script = document.createElement('script')
        //     script.src = scriptSrc
        //     script.setAttribute('defer', true)
        //     document.querySelector('test123').appendChild(script)
        // })
        // api.css.forEach(cssSrc => {
        //     let css = document.createElement('link')
        //     css.href = cssSrc
        //     css.setAttribute('rel', 'stylesheet')
        //     document.querySelector('test123').appendChild(css)
        // })

        // map script

        // mapComponent

        // game script

        // scriptComponent
        
    }

    });
}

async function join(externalCode){
    function checkCode(){
        if(externalCode){
            return externalCode
        } else {
            return document.getElementById('code').value
        }
    }
    let code = await checkCode()
    // let code = code1 || document.getElementById('code').value
    // let code = 
    console.log('SONO ARRIVATO QUA')
    fetch('https://angelicustodi.cf/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code: code
        }) 
    }).then(async response => {
    const api = await response.json();

    if(api.result){  
        document.querySelector('main').innerHTML = api.output
        document.getElementById('roomCode').innerHTML = api.roomId
        document.getElementById('username').innerHTML = api.username
        document.title = api.roomId + ' | Map Heroes'
        let ROOM_CODE = api.roomId
        let username = api.username
        // document.head.innerHTML = api.head
        // api.scripts.forEach(scriptSrc => {
        //     let script = document.createElement('script')
        //     script.src = scriptSrc
        //     script.setAttribute('defer', true)
        //     document.querySelector('test123').appendChild(script)
        // })
        api.css.forEach(cssSrc => {
            let css = document.createElement('link')
            css.href = cssSrc
            css.setAttribute('rel', 'stylesheet')
            document.querySelector('test123').appendChild(css)
        })
        // map script

        let map = document.getElementById('map')
        let width = map.offsetWidth
        let height = map.offsetHeight
        let xSquares = 20
        let ySquares = 10
        let alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
    
        let y
        for (y = 0; y < ySquares; y++){
            let i;
            let row = document.createElement('div')
            row.className = 'customRow'
            row.id = 'row' + y
            map.appendChild(row)
    
            for (i = 0; i < xSquares; i++) {
                let currentRow = document.getElementById('row' + y)
                let square = document.createElement('div')
                square.id = alphabet[y] + i
                square.className = 'square'
                square.style.width = Math.floor(width/xSquares) + 'px'
                square.style.height = Math.floor(width/xSquares) + 'px'
                currentRow.appendChild(square)
            } 
        }

        // // game script

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
    
        socket.on('match-started', (roomId) => {
            // alert(roomId)
            window.location.replace("/match/" + roomId);
        })
        // Join Room
        socket.emit('join-room', ROOM_CODE, username) 
    
    
    }

})
}

document.getElementById('clickCreate').onclick = create
document.getElementById('clickJoin').addEventListener("click", function(){ join() }); 