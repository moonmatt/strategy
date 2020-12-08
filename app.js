const express = require('express')
const app = express();
const server = require('http').Server(app)
const io = require('socket.io')(server)
const fs = require('fs');
const randomWords = require('random-words');
const filter = require('./filter.js')(app);
const rateLimit = require("express-rate-limit");
const cron = require('node-cron');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const remove = require('lodash').remove;
const bodyParser = require('body-parser');
const request = require('request');
const { Socket } = require('dgram');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
const adapter = new FileSync('storage/db.json')
const db = low(adapter)

const userAgentProtection = require('block-useragent')(['*'], {
  attack: true
});

// Api Anti Spam 
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10 // limit each IP to 100 requests per windowMs,
});

app.use("/join", limiter);
app.use("/create", limiter);


// Database

// Set some defaults (required if your JSON file is empty)
db.defaults({
  rooms: [],
  users: [],
  match: []
}).write()

// const dbRooms = new Dataput('rooms');
// dbRooms.headers = ['ID', 'Code', 'Privacy', 'Users', 'Admin', 'Started'];
// dbRooms.autoIncrement = 'ID'

// const dbUsers = new Dataput('users');
// dbUsers.headers = ['ID', 'Code', 'Name', 'SocketId'];
// dbUsers.autoIncrement = 'ID'


// dbRooms.insert({
// 	ID: Dataput.AI, 
// 	Code: 'provola',
// 	Privacy: 'Public',
// 	Users: 0
// });

// Create Room, if it already exists, create a new one.
function createRoom() {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var charactersLength = characters.length;
  for (var i = 0; i < 5; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  let check = db.get('rooms').find({
    Code: result
  }).value()
  if (!check) { // if it does not exist create the room
    db.get('rooms').push({
      Code: result,
      Privacy: 'Public',
      Players: 0,
      Admin: '',
      Privacy: 'Public',
      Started: 0
    }).write()

    console.log('ROOM CREATED ' + result)
    return result // return the code
  } else { // if it already exists, repeat
    createRoom()
  }
}

app.set('view engine', 'ejs')
app.use(express.static('public'))

// Remove empty rooms
cron.schedule('* * * * *', () => {
  let query = db.get('rooms').filter({
    Players: 0
  }).value()
  query.forEach(result => {
    db.get('rooms').remove({
      Code: result.Code
    }).write()
    console.log('eliminato????')
  })
  // console.log('running a task every minute');
});

app.get('/', (req, res) => {
  res.render('template')
  // res.render('spa')
})
app.post('/', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send({
    result: true,
    output: fs.readFileSync('./views/homepage.ejs').toString(),
    matches: db.get('rooms').filter({
      Started: 0
    }).sortBy('Players').value().reverse().slice(0, 5)
  })
})

app.post('/create', (req, res) => {
  let roomCode = createRoom()
  res.setHeader('Content-Type', 'application/json');
  res.send({
    result: true,
    roomId: roomCode
  })
});

app.post('/join', (req, res) => {
  console.log('eccomi qua')
  console.log(req.body)
  if (!req.body.code) {
    res.send('non hai inserito un codice')
    return
  }

  let currentPlayers = db.get('rooms').find({
    'Code': req.body.code
  }).value()
  if (!currentPlayers) {
    console.log('ERRORE?')
    return
  }
  console.log('ECCOMI')
  console.log(currentPlayers)
  if (!currentPlayers) {
    res.setHeader('Content-Type', 'application/json');
    res.send({
      result: false,
      error: 'The room does not exist'
    })
  }

  if (currentPlayers.Players >= 6) {
    res.setHeader('Content-Type', 'application/json');
    res.send({
      result: false,
      error: 'The match is full'
    })
  }
  if (currentPlayers.Started == 1) {
    res.setHeader('Content-Type', 'application/json');
    res.send({
      result: false,
      error: 'The match already started'
    })
  }

  let code = req.body.code.toUpperCase()
  let query = db.get('rooms').find({
    "Code": code
  }).value()
  if (query) { // if the room exists  
    if (query.Players >= 6 || query == undefined) { // if the room is full
      res.setHeader('Content-Type', 'application/json');
      res.send({
        result: false,
        error: 'The room does not exist'
      })
    } else {
      let username = randomWords() + Math.floor(Math.random() * 10000); // the username of the new user

      // res.render('room', { roomCode: code, username: username})
      res.setHeader('Content-Type', 'application/json');
      res.send({
        result: true,
        roomId: code,
        username: username,
        output: fs.readFileSync('./views/room.ejs').toString(),
        css: ['/css/map.css']
      })
    }
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.send({
      result: false,
      error: 'The room does not exist'
    })
  }


})

// Socket

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => { // when user joins
    let query = db.get('rooms').find({
      Code: roomId,
      Started: 0
    }).value()
    console.log(query)
    if (!query) {
      console.log('errore')
      return
    }
    if (query.Players == 0) { // if there are no users, so you are the first
      console.log('the admin is: ' + userId)
      socket.emit("you-are-the-admin");
      // if you created the match you are the admin
      db.get('rooms').find({
        'Code': roomId
      }).assign({
        'Admin': userId
      }).write();
    }

    // Add the user to the list
    let ActualPlayers = query.Players + 1
    db.get('rooms').find({
      'Code': roomId
    }).assign({
      Players: ActualPlayers
    }).write();

    // add the user to the list of users in the room
    db.get('users').push({
      'Code': roomId,
      'Name': userId,
      'SocketId': ''
    }).write()

    console.log('sono arrivato qua')

    // Store socket id
    db.get('users').find({
      'Code': roomId,
      'Name': userId
    }).assign({
      'SocketId': socket.id
    }).write();

    // get the list of the users
    let usersNumber = db.get('rooms').find({
      "Code": roomId
    }).value()
    let usersNameList = db.get('users').filter({
      Code: roomId
    }).value()

    usersNameList = usersNameList.map(a => a.Name);
    let usersList = {
      number: usersNumber.Players,
      names: usersNameList
    }

    socket.to(roomId).broadcast.emit('user-connected', userId, usersList)

    console.log(usersList)

    socket.emit('you-joined', usersList)

    console.log('SOCKETID: ' + socket.id)

    let adminQuery = db.get('users').find({
      "Code": roomId
    }).value()
    if (adminQuery.Admin == userId) { // if the user is the admin
      console.log('messaggio mandato')
      socket.emit("you-are-the-admin");
    }

    socket.join(roomId)

    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
      console.log(userId + ' DISCONNECTED FROM ' + roomId)

      if(db.get('rooms').find({Code: roomId}).value().Started){ // if the match started

      }

      // remove the user from the table of the users 
      db.get('users').remove({
        Code: roomId,
        Name: userId
      }).write()

      // Remove 1 user from the total of online users
      let removePlayerQuery = db.get('rooms').find({
        'Code': roomId
      }).value()
      console.log('REMOVE')
      console.log(removePlayerQuery)
      let updatedPlayers = removePlayerQuery.Players - 1
      db.get('rooms').find({
        'Code': roomId
      }).assign({
        'Players': updatedPlayers
      }).write();
      // if there are no more users in the room, delete it
      if (updatedPlayers == 0) {
        db.get('rooms').remove({
          'Code': roomId
        }).write()
      } else { // if there are still users
        // UPDATE ADMIN
        let checkQuery = db.get('rooms').find({
          'Code': roomId
        }).value()
        if (checkQuery.Started) { // if the match started
          if (checkQuery.Admin == userId) { // if the user who left is the admin, remove it
            db.get('rooms').find({
              'Code': roomId
            }).assign({
              'Admin': ''
            }).write();
          }

          db.get('match').remove({ // delete the user from match
            'Code': roomId,
            'Player': userId
          }).write()

          if(db.get('match').filter({Code: roomId}).value().length == 1){ // if there is only 1 user left, he wins
            console.log('RIMASTO SOLO UN UTENTE')
            console.log(db.get('match').find({Code: roomId}).value())
            socket.to(roomId).emit('match-ended')
          }



        } else { // if it didn't start
          let checkQuery1 = db.get('rooms').find({
            'Code': roomId
          }).value()
          if (checkQuery1.Admin == userId) { // if the user who left is the admin, remove it
            // get the list of the users
            let updatedUsersNumber = db.get('rooms').find({
              "Code": roomId
            }).value()
            let updatedUsersNameList = db.get('users').filter({
              "Code": roomId
            }).value()[0].Name

            let newAdminSocket = db.get('users').find({
              Name: updatedUsersNameList,
              Code: roomId
            }).value().SocketId

            db.get('rooms').find({
              'Code': roomId
            }).assign({
              'Admin': updatedUsersNameList
            }).write();

            io.to(newAdminSocket).emit('you-are-the-admin')
          }
        }
      }

    })
    socket.on('start-match', () => {
      console.log('Iniziamo MATCH!')
      let currentAdmin = db.get('rooms').find({Code: roomId}).value().Admin // get the actual admin
      if (currentAdmin == userId) {
        let currentPlayers = db.get('rooms').find({
          Code: roomId
        }).value().Players
        if (currentPlayers >= 2) { // if there are 2 or more users
          console.log('OK SI PUO COMINCIARE')
          db.get('rooms').find({
            'Code': roomId
          }).assign({
            'Started': 1
          }).write(); // MAKE THE MATCH started
          db.get('rooms').find({
            'Code': roomId
          }).assign({
            'Admin': ''
          }).write(); // REMOVE THE ADMIN
          io.sockets.in(roomId).emit('match-started', roomId)
        } else {
          socket.emit('cannot-start')
        }
      }
    })

    socket.on('kick-player', (player) => {
      console.log('Kickiamo ' + player)
      let currentAdmin = db.get('rooms').find({
        Code: roomId
      }).value().Admin
      if (currentAdmin == userId) { // if i am the admin
        if (player != userId) {
          let playerToKick = db.get('users').find({
            Code: roomId,
            Name: player
          }).value()
          console.log(playerToKick)
          if (playerToKick) { // if the player is in the room
            io.to(playerToKick.SocketId).emit('you-got-kicked')
            console.log('he got kicked')
            socket.emit('you-kicked-him', player)
          }
        }
      }
    })

    socket.on('move-slot', (destination, userSocketId) => {
      console.log('MOVE!!! arrivato')
      const fixedSlot = db.get('match').find({
        SocketId: userSocketId,
        Code: roomId
      }).value().Slot
      const userInfo = db.get('match').find({
        SocketId: userSocketId,
        Code: roomId
      }).value()
      console.log('POSIZIONE: ' + userInfo.Slot + ' DESTINAZIONE: ' + destination)
      const clearance = (a, b) => {
        const letters = [...'abcdefghijklmnopqrstuvwxyz'];
        a = [letters.indexOf(a.substring(0, 1).toLowerCase()), Number(a.substring(1))];
        b = [letters.indexOf(b.substring(0, 1).toLowerCase()), Number(b.substring(1))];
        return Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1
      }
      if (clearance(userInfo.Slot, destination) && userInfo.Slot != destination) {
        console.log('ATTACCATO')
        if (userInfo.Movement && userInfo.Fight == 0) { // if you have a movement available
          console.log('YOU HAVE A MOVEMENT')
          const checkFight = db.get('match').find({Slot: destination,Code: roomId}).value()

          console.log(db.get('match').filter({Slot: destination, Code: roomId, Fight:1}).value().length)


          if (db.get('match').filter({Slot: destination, Code: roomId, Fight:1}).value().length) { // if there are users fighting
            
            socket.emit('message', 'You cannot move there, there are players fighting!')
            // send message
          
          } else if(checkFight){ // there are 2 players fighting
            console.log('THERE IS ANOTHER USER IN ' + destination + ' | ' + checkFight.Player)
            io.to(checkFight.SocketId).emit('start-fight', {Other: userInfo.Player, Attacking: 0, Slot: destination}) // he got attacked, so he is defending
            socket.emit('start-fight', {Other: checkFight.Player, Attacking: 1, Slot: destination, Previous: userInfo.Slot}) // you are the attacker

            
            for (var i in io.sockets.sockets) {
              if(i != checkFight.SocketId && i != userInfo.SocketId){
                console.log('manda socket')
                io.to(i).emit('global-fight', destination)
              }
            }


            db.get('match').find({ // update my user
              SocketId: userSocketId,
              Code: roomId
            }).assign({
              Slot: destination,
              Movement: 0,
              Fight: 1
            }).write()

            db.get('match').find({ // update other user
              SocketId: checkFight.SocketId,
              Code: roomId
            }).assign({
              Fight: 1
            }).write()            

          } else {
            db.get('match').find({
              SocketId: userSocketId,
              Code: roomId
            }).assign({
              Slot: destination,
              Movement: 0
            }).write()
            socket.emit('you-moved', {
              actualSlot: fixedSlot,
              destination: destination
            })
          }
        } else {
          console.log('you dont have a movement or you are in a fight')
        }
      }
    })


    // GAME

    app.post('/start', (req, res) => {
      const code = roomId
      const player = req.body.player
      if (!code || !player) {
        res.send({
          result: false
        })
      }
      if (db.get('rooms').find({Code: code}).value() && db.get('rooms').find({Code: code}).value().Started == 1) {
        // if it started
        let alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']

        function getRandomInt(min, max) {
          min = Math.ceil(min);
          max = Math.floor(max);
          return Math.floor(Math.random() * (max - min)) + min; //Il max è escluso e il min è incluso
        }
        const initialSlot = alphabet[getRandomInt(0, 9)] + '' + getRandomInt(0, 19)
        const troops = [{
          Type: 'Infantry',
          Attack: 50,
          Defense: 80
        }, {
          Type: 'Infantry',
          Attack: 50,
          Defense: 80
        }, {
          Type: 'Infantry',
          Attack: 50,
          Defense: 80
        }, {
          Type: 'Infantry',
          Attack: 50,
          Defense: 80
        }]
        const SocketId = db.get('users').find({
          Code: code,
          Name: player
        }).value().SocketId
        db.get('match').push({
          Code: code,
          Player: player,
          SocketId: SocketId,
          Slot: initialSlot,
          Troops: troops,
          Coins: 0,
          Movement: 1,
          Fight: 0
        }).write()

        console.log('OK CI SIAMO')
        const timer = ms => new Promise(resolve => {
          const start = Date.now();
          const delay = setInterval(() => {
            if (Date.now() - start >= ms) {
              resolve();
              clearInterval(delay);
            }
          })
        });

        const funzione = () => {
          if(db.get('match').find({Code: code, Player: player}).value()){
            console.log('30 sec ' + player)
            console.log(code, player)            
                const actualCoins = db.get('match').find({
                    Code: code,
                    Player: player
                }).value().Coins

                db.get('match').find({
                    Code: code,
                    Player: player
                }).assign({
                    Coins: actualCoins + 5,
                    Movement: 1
                }).write()

                timer(30000).then(funzione);
                io.to(SocketId).emit('update-coins', {Coins: actualCoins + 5})
          } else {
            socket.emit('error', 'ciaone questo errore')
            return
          }
        }
        funzione();

        res.setHeader('Content-Type', 'application/json');
        res.send({
          result: true,
          output: fs.readFileSync('./views/match.ejs').toString(),
          initialSlot: initialSlot,
          troops: troops
        })


      } else {
        res.send({
          result: false
        })
      }
    })

    // END GAME   



  })




})

// Online matches api

app.get('/debug/:code', (req, res) => {
  let query = db.get('rooms').find({
    'Code': req.params.code
  }).value()
  res.send(query)
})
app.get('/debug/second/:code', (req, res) => {
  let query = db.get('users').filter({
    Code: req.params.code
  }).value()
  res.send(query)
})
app.get('/debug/third/:username', (req, res) => {
  let query = db.get('users').filter({
    Name: req.params.username
  }).value()
  res.send(query)
})
app.get('/prova', (req, res) => {
  let query = db.get('rooms').value()
  res.send(query)
  console.log('arrivato')
})
app.get('/delete', (req, res) => {
  db.get('rooms').remove().write()
  db.get('users').remove().write()
  db.get('match').remove().write()
  console.log('cancellato')
  res.send('cancellato')
})
app.get('/chain/:code', (req, res) => {
  let query = db.get('match').filter({
    Code: req.params.code
  }).value()
  res.send(query)
})

server.listen(4444, () => {
  console.log('started')
  // let prova = db.get('rooms').find({Code: 'LTMYI'}).assign({Admin: 'provola'}).write();

  // console.log(prova)
})