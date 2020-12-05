function changeTheme(type){
    const themeSwitch = document.getElementById('theme');
    if(type == 'light'){
        const root = document.documentElement.style
        root.setProperty('--secondary', '#d15175')
        root.setProperty('--light', '#000')
        root.setProperty('--dark', '#fff')
        root.setProperty('--panel', '#1F1F1F')
        root.setProperty('--bg', '#141414')
        root.setProperty('--shadow', 'rgba(207, 209, 221, 0.062)')
        themeSwitch.innerHTML = '<i class="gg-sun"></i>'
        themeSwitch.setAttribute('theme', 'light')
        document.cookie = "themeCookie = light;secure;SameSite=lax";
    } else {
        const root = document.documentElement.style
        root.setProperty('--secondary', '#DB0A40')
        root.setProperty('--light', '#fff')
        root.setProperty('--dark', '#000')
        root.setProperty('--panel', '#fff')
        root.setProperty('--bg', '#fff')
        root.setProperty('--shadow', 'rgba(25.000000409781933, 32.00000189244747, 56.000000461936, 0.10000000149011612)')
        themeSwitch.innerHTML = '<i class="gg-moon"></i>'
        themeSwitch.setAttribute('theme', 'dark')
        document.cookie = "themeCookie = dark;secure;SameSite=lax";
    }
}

function getCookie(cookiename) {
  // Get name followed by anything except a semicolon
  var cookiestring=RegExp(cookiename+"=[^;]+").exec(document.cookie);
  // Return everything after the equal sign, or an empty string if the cookie name not found
  return decodeURIComponent(!!cookiestring ? cookiestring.toString().replace(/^[^=]+./,"") : "");
}
console.log(getCookie('themeCookie'))
if(getCookie('themeCookie') == 'light'){
    changeTheme('light')
} else if(getCookie('themeCookie') == 'dark') {
    changeTheme('dark')
}

var allcookies = document.cookie;
console.log(allcookies)

fetch('https://angelicustodi.cf/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
}).then(async response => {
    const api = await response.json();

    if (api.result) {
        document.querySelector('main').innerHTML = api.output
        console.log(api.matches)
        api.matches.forEach(match => { // top matches
            const matchesDom = document.getElementById('matches')
            const matchDom = document.createElement('div')
            matchDom.className += 'match hover'
            const codeDom = document.createElement('div')
            codeDom.className += 'code'
            codeDom.innerHTML = match.Code
            const playersDom = document.createElement('div')
            playersDom.className += 'players'
            playersDom.innerHTML += match.Players + '/6'
            const joinDom = document.createElement('div')
            joinDom.className += 'join pointer'
            joinDom.innerHTML += 'JOIN'
            joinDom.onclick = function() {
                join(match.Code)
            }
            matchesDom.appendChild(matchDom)
            matchDom.appendChild(codeDom)
            matchDom.appendChild(playersDom)
            matchDom.appendChild(joinDom)
        })
        transition.perform()

        // Create
        function create() {
            fetch('https://angelicustodi.cf/create', {
                method: 'POST'
            }).then(async response => {
                const api = await response.json();
                if (api.result) {
                    join(api.roomId)
                }
            });
        }

        async function join(externalCode) {
            function checkCode() {
                if (externalCode) {
                    return externalCode
                } else {
                    return document.getElementById('inputJoin').value
                }
            }
            let code = await checkCode()
            if (code.length != 5) {
                return
            }
            let body = {
                code: code
            }
            fetch('https://angelicustodi.cf/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }).then(async response => {
                const api = await response.json();

                if (api.result) {

                    document.querySelector('main').innerHTML = api.output
                    transition.perform()
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

                    function createAlert(message, type) {
                        let alertsList = document.getElementById('alerts')
                        let node = document.createElement('div')
                        node.id = Math.floor(Math.random() * 100000000)
                        node.innerHTML = message
                        node.className += 'alert hover'
                        alertsList.appendChild(node)
                        setTimeout(function() {
                            node.style.display = 'none'
                        }, 4000)
                    }

                    function playerButtons(players) {
                        players.forEach(player => {
                            let node = document.createElement("div");
                            node.className += 'match hover'
                            node.style = 'grid-template-columns: 70% 25%;'
                            let userCode = document.createElement('div')
                            userCode.innerHTML = player
                            userCode.className += 'code'
                            document.getElementById('playersNames').appendChild(node);
                            node.appendChild(userCode)
                            if (player != username) { // if it is NOT me
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
                            if (player == username) {
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

                        startButton.onclick = function() {
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

                    function leave() {
                        console.log('uscito')
                        socket.disconnect()
                        var head = document.getElementsByTagName('head')[0];
                        var script = document.createElement('script');
                        script.src = './scripts/all.js?cachebuster=' + new Date().getTime();
                        head.appendChild(script);
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
        document.getElementById('inputJoin').addEventListener("input", function(e) {
            if (e.target.value.length == 5) {
                join()
            }
        });
        document.querySelectorAll('input[data-length]').forEach(input =>
            input.addEventListener('keypress', function(e) {
                if (this.value.length >= this.getAttribute('data-length')) e.preventDefault()
            })
        )

        document.getElementById('theme').onclick = function(){
            console.log('ECCO CLICKATO')
            const themeSwitch = document.getElementById('theme');
            changeTheme(themeSwitch.getAttribute('theme') === 'light' ? 'dark' : 'light');

        }
    }
})