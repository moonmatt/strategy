fetch('https://angelicustodi.cf/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
}).then(async response => {
    const api = await response.json();

    if(api.result){  
        document.querySelector('main').innerHTML = api.output

// Create
function create(){
    fetch('https://angelicustodi.cf/create', {method: 'POST'}).then(async response => {
    const api = await response.json();
        if(api.result){
            join(api.roomId) 
        }
    });
}

async function join(externalCode){
    function checkCode(){
        if(externalCode){
            return externalCode
        } else {
            return document.getElementById('inputJoin').value
        }
    }
    let code = await checkCode()
    if(code.length != 5){return}
    let body = {
        code: code
    }
    fetch('https://angelicustodi.cf/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).then(async response => {
    const api = await response.json();

    if(api.result){  

        document.querySelector('main').innerHTML = api.output
        document.getElementById('roomCode').innerHTML = api.roomId
        document.getElementById('username').innerHTML = api.username
        document.title = api.roomId + ' | Map Heroes'
        let ROOM_CODE = api.roomId
        let username = api.username
        api.css.forEach(cssSrc => {
            let css = document.createElement('link')
            css.href = cssSrc
            css.setAttribute('rel', 'stylesheet')
            document.querySelector('test123').appendChild(css)
        })

        // map script

        // let map = document.getElementById('map')
        // let width = map.offsetWidth
        // let xSquares = 20
        // let ySquares = 10
        // let alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
    
        // let y
        // for (y = 0; y < ySquares; y++){
        //     let i;
        //     let row = document.createElement('div')
        //     row.className = 'customRow'
        //     row.id = 'row' + y
        //     map.appendChild(row)
    
        //     for (i = 0; i < xSquares; i++) {
        //         let currentRow = document.getElementById('row' + y)
        //         let square = document.createElement('div')
        //         square.id = alphabet[y] + i
        //         square.className = 'square'
        //         square.style.width = Math.floor(width/xSquares) + 'px'
        //         square.style.height = Math.floor(width/xSquares) + 'px'
        //         currentRow.appendChild(square)
        //     } 
        // }

        // game script

        const socket = io();
    
        function createAlert(message, type){
            let alertsList = document.getElementById('alerts')
            let node = document.createElement('div')
            node.id = Math.floor(Math.random() * 100000000)
            node.innerHTML = message
            node.className += 'alert hover'
            alertsList.appendChild(node)
            setTimeout(function(){
                node.style.display = 'none'
            }, 4000)
        }
    
        function playerButtons(players){
            players.forEach(player => {
                let node = document.createElement("div");  
                    node.className += 'match hover'
                    node.style = 'grid-template-columns: 70% 25%;'
                    let userCode = document.createElement('div')
                    userCode.innerHTML = player
                    userCode.className += 'code'
                    document.getElementById('playersNames').appendChild(node); 
                    node.appendChild(userCode)
                    if(player != username){ // if it is NOT me
                        let kickButton = document.createElement('div')
                        kickButton.className += 'join pointer'
                        kickButton.innerHTML = 'KICK'
                        kickButton.onclick = function() {
                            console.log('kick = ' + player)
                            socket.emit('kick-player', player)
                        };
                        node.appendChild(kickButton)
                    }
                    // if(player == username){ // if it is me
                    //     // node.className += "btn btn-outline-success btn-sm kickButton  " + player;
                    //     return
                    // } else {
                    //     node.className += "btn btn-outline-danger btn-sm kickButton  " + player;
                    // }
            })
        }
    
        function removePlayer(username) {
        onlinePlayers.forEach((player, index) => {
            if(player == username){
                onlinePlayers.splice(index, 1);
                document.getElementById('playersNames').innerHTML = ''
                playerButtons(onlinePlayers)
                document.getElementById('playersNum').innerHTML = onlinePlayers.length + ' /6'
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
        document.getElementById('playersNum').innerHTML = onlinePlayers.length + '/6'
        document.getElementById('playersNames').innerHTML = ''
        playerButtons(onlinePlayers)
    
        })
    
        socket.on('you-are-the-admin', () => {
            createAlert('You are the Admin!', 'success')
            document.getElementById('adminTitle').innerHTML = 'You are the Admin'
            let startButton = document.getElementById('start')
            startButton.style.display = 'block'
            
            startButton.onclick = function(){
                console.log('ECCOMI INIZIA IL MATCH')
                socket.emit('start-match')
            };
    
        })

        socket.on('cannot-start', (roomId) => {
            createAlert('There are not enough players!')
        })
    
        socket.on('you-joined', usersList => {
        onlinePlayers = usersList.names
        console.log('SONO ENTRATO')
        document.getElementById('playersNum').innerHTML = onlinePlayers.length + '/6'
        playerButtons(onlinePlayers)
        // document.getElementById(username).classList.remove('btn-outline-danger');
        // document.getElementById(username).className += ' btn-outline-success';
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
    
        function setClipboard(value) {
            var tempInput = document.createElement("input");
            tempInput.style = "position: absolute; left: -1000px; top: -1000px";
            tempInput.value = value;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand("copy");
            document.body.removeChild(tempInput);
        }

        document.getElementById('roomCode').addEventListener('click', function() {
            setClipboard(api.roomId)
            createAlert('You have copied the Code!')
        })
        function leave(){
            console.log('uscito')
            socket.disconnect()
            fetch('https://angelicustodi.cf/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }).then(async response => {
                const api = await response.json();
        
                if(api.result){  
                    document.querySelector('main').innerHTML = api.output
                } else {
                    window.location.replace("/");
                }
            })
        }
        document.getElementById('leave').addEventListener('click', function() {
            leave()
        })
    } else {
        console.log(api.error)
    }

})
}

document.getElementById('clickCreate').onclick = create
document.getElementById('inputJoin').addEventListener("input", function(e){
    if(e.target.value.length == 5){
        join()
    }
 }); 
 document.querySelectorAll('input[data-length]').forEach(input =>
    input.addEventListener('keypress', function(e){
   if(this.value.length >= this.getAttribute('data-length')) e.preventDefault()
   })
  )


    } else {
        window.location.replace("/");
    }
})



