const express = require('express')
const app = express();
const server = require('http').Server(app)
const io = require('socket.io')(server)
const fs = require('fs');
const randomWords = require('random-words');
const rateLimit = require("express-rate-limit");
const cron = require('node-cron');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const bodyParser = require('body-parser');
var queue = require('express-queue');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
const adapter = new FileSync('storage/db.json')
const db = low(adapter)

const userAgentProtection = require('block-useragent')(['*'], {
  attack: true
});

// Using queue middleware
// app.use(queue({ activeLimit: 2, queuedLimit: -1 }));

// // Api Anti Spam 
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10 // limit each IP to 100 requests per windowMs,
});

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use("/join", limiter);
app.use("/create", limiter);


// Database

// Set some defaults (required if your JSON file is empty)
db.defaults({
  rooms: [],
  users: [],
  match: []
}).write()

// Create Room, if it already exists, create a new one.
function createRoom() {
  var result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // all characters that can be used
  const charactersLength = characters.length;
  for (var i = 0; i < 5; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  let check = db.get('rooms').find({Code: result}).value()
  if (!check) { // if it does not exist create the room
    db.get('rooms').push({
      Code: result,
      Privacy: 'Public',
      Players: 0,
      Admin: '',
      Privacy: 'Public',
      Started: 0,
      Users: []
    }).write()
    return result // return the code of the room
  } else { // if it already exists, repeat
    createRoom()
  }
}

// Remove empty rooms
cron.schedule('* * * * *', () => {
  let query = db.get('rooms').filter({ // get all rooms where there are 0 players
    Players: 0
  }).value()
  query.forEach(result => {
    db.get('rooms').remove({Code: result.Code}).write() // remove it
  })
});

app.get('/', (req, res) => {
  res.render('template')
})

// Homepage Post request

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

app.post('/join', async (req, res) => {
  const username = randomWords() + Math.floor(Math.random() * 10000)
  console.log('eccomi qua')
  if (!req.body.code) {
    res.send('You did not insert a code')
    return
  }

  let currentPlayers = db.get('rooms').find({
    'Code': req.body.code.toUpperCase()
  }).value()
  console.log(currentPlayers)
  if (!currentPlayers) { // if the room does not exist
    res.setHeader('Content-Type', 'application/json');
    res.send({
      result: false,
      error: 'The room does not exist'
    })
    return
  }
  if (currentPlayers.Players >= 6) {
    res.setHeader('Content-Type', 'application/json');
    res.send({
      result: false,
      error: 'The match is full'
    })
  } else {
    if (currentPlayers.Started == 1) {
      res.setHeader('Content-Type', 'application/json');
      res.send({
        result: false,
        error: 'The match already started'
      })
    }

    // Add the user to the list
    let ActualPlayers = db.get('rooms').find({Code: req.body.code.toUpperCase(), Started: 0}).value().Players + 1
    db.get('rooms').find({
      'Code': req.body.code.toUpperCase()
    }).assign({
      Players: ActualPlayers
    }).write();

    // CREATE MY USER WITHOUT THE SOCKET ID 

    let actualUsers = db.get('rooms').find({Code: req.body.code.toUpperCase(), Started: 0}).value().Users
    actualUsers.push({
      'Name': username,
      'SocketId': '',
      'Verified': 0
    })

    res.setHeader('Content-Type', 'application/json');
    res.send({
      result: true,
      roomId: req.body.code.toUpperCase(),
      username: username, // the username of the new user
      output: fs.readFileSync('./views/room.ejs').toString(),
      css: ['/css/map.css']
    })

  }
})

// Socket

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => { // when user joins
    const query = db.get('rooms').find({Code: roomId, Started: 0}).value()
    if (!query) {
      console.log('The room does not exist')
      return
    }

    // si connette per la prima volta
    const getIfVerifiedName = db.get('rooms').find({Code: roomId}).get('Users').find({Name: userId, Verified: 0}).value()
    // se esiste nel db ed e la prima volta, fallo entrare e metti verified
    if(getIfVerifiedName){
      db.get('rooms').find({Code: roomId}).get('Users').find({Name: userId, Verified: 0}).assign({
        SocketId: socket.id,
        Verified: 1
      }).write()
    } else {
      console.log('ERRORE NON PRESENTE NEL DB')
      return
    }

    if (query.Players == 1) { // if there are no users, you are the first
    
      // set the admin as your username
      db.get('rooms').find({
        'Code': roomId
      }).assign({
        'Admin': userId
      }).write();

      socket.emit('you-are-the-admin')

    }

    // get the list of the users
    let usersNumber = db.get('rooms').find({
      "Code": roomId
    }).value()

    usersNameList = usersNumber.Users.map(a => a.Name);
    let usersList = {
      number: usersNumber.Players,
      names: usersNameList
    }

    socket.to(roomId).broadcast.emit('user-connected', userId, usersList)

    socket.emit('you-joined', usersList)

    console.log('SOCKETID: ' + socket.id)

    socket.join(roomId)

    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
      socket.to(roomId).broadcast.emit('message', userId + ' has left')
      console.log(userId + ' DISCONNECTED FROM ' + roomId)

      // remove the user from the list of users
      let actualUsers = db.get('rooms').find({Code: roomId}).value().Users
      actualUsers = actualUsers.filter(item => item.Name !== userId)
      db.get('rooms').find({
        'Code': roomId
      }).assign({
        Users: actualUsers
      }).write();

      // Remove 1 user from the total of online users
      let removePlayerQuery = db.get('rooms').find({'Code': roomId}).value()
      console.log('REMOVE')
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
        if (checkQuery.Started) { // if the match has started
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

          if (db.get('match').filter({
              Code: roomId
            }).value().length == 1) { // if there is only 1 user left, he wins
            console.log('RIMASTO SOLO UN UTENTE')
            console.log(db.get('match').find({
              Code: roomId
            }).value())
            socket.to(roomId).emit('match-ended')
          }



        } else { // if it hasn't started
          let checkQuery1 = db.get('rooms').find({
            'Code': roomId
          }).value()
          if (checkQuery1.Admin == userId) { // if the user who has left is the admin, remove it
            // get the list of the users

            let newAdmin = db.get('rooms').find({'Code': roomId}).value().Users[0]

            db.get('rooms').find({
              'Code': roomId
            }).assign({
              'Admin': newAdmin.Name
            }).write();

            io.to(newAdmin.SocketId).emit('you-are-the-admin')
          }
        }
      }

    })
    socket.on('start-match', () => {
      console.log('Iniziamo MATCH!')
      let currentAdmin = db.get('rooms').find({Code: roomId}).value().Admin // get the actual admin
      if (currentAdmin == userId) {
        let currentPlayers = db.get('rooms').find({Code: roomId}).value().Players
        if (currentPlayers >= 2) { // if there are 2 or more users
          console.log('OK SI PUO COMINCIARE')
          db.get('rooms').find({'Code': roomId}).assign({'Started': 1}).write(); // MAKE THE MATCH started
          db.get('rooms').find({'Code': roomId}).assign({'Admin': ''}).write(); // REMOVE THE ADMIN
          let alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
          function getRandomInt(min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min)) + min; //Il max è escluso e il min è incluso
          }

          db.get('match').push({
            Code: roomId,
            CaptureSlot: alphabet[getRandomInt(0, 9)] + '' + getRandomInt(0, 19),
            Date: new Date(),
            Users: []
          }).write()

          io.sockets.in(roomId).emit('match-started', roomId)
        } else {
          socket.emit('message', 'There are not enough players to start')
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
          const playerToKick = db.get('rooms').find({Code: roomId}).value().Users.filter(item => item.Name == player)[0]
          console.log(playerToKick)
          if (playerToKick) { // if the player is in the room
            io.to(playerToKick.SocketId).emit('you-got-kicked')
            socket.emit('message', 'You have kicked ' + player)
          }
        }
      }
    })

    socket.on('move-slot', (destination, userSocketId) => {
      console.log('MOVE!!! arrivato')
      const fixedSlot = db.get('match').find({Code: roomId}).get('Users').find({SocketId: userSocketId}).value().Slot
      const userInfo = db.get('match').find({Code: roomId}).get('Users').find({SocketId: userSocketId}).value()
      const clearance = (a, b) => {
        const letters = [...'abcdefghijklmnopqrstuvwxyz'];
        a = [letters.indexOf(a.substring(0, 1).toLowerCase()), Number(a.substring(1))];
        b = [letters.indexOf(b.substring(0, 1).toLowerCase()), Number(b.substring(1))];
        return Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1
      }
      if (clearance(fixedSlot, destination) && fixedSlot != destination) {
        console.log('VICINO')
        if (userInfo.Movement && userInfo.Fight == 0) { // if you have a movement available
          console.log('ho un movimento')
          const checkFight = db.get('match').find({Code: roomId}).get('Users').find({Slot: destination}).value()

          if (db.get('match').find({Code: roomId}).get('Users').filter({Slot: destination, Fight: 1}).value().length) { // if there are users fighting

            socket.emit('message', 'You cannot move there, there are players fighting!')
            // send message
            console.log('there are users fighting there')

          } else if (checkFight) { // there are 2 players fighting
            console.log('THERE IS ANOTHER USER IN ' + destination + ' | ' + checkFight.Name)
            io.to(checkFight.SocketId).emit('start-fight', {
              Other: userInfo.Name,
              Attacking: 0,
              Slot: destination
            }) // he got attacked, so he is defending
            socket.emit('start-fight', {
              Other: checkFight.Name,
              Attacking: 1,
              Slot: destination,
              Previous: userInfo.Slot
            }) // you are the attacker

            db.get('match').find({Code: roomId}).get('Users').find({SocketId: userSocketId}).assign({Slot: destination, Movement: 0, Fight: 1}).write()
            // update my user
            // update other user
            db.get('match').find({Code: roomId}).get('Users').find({SocketId: checkFight.SocketId}).assign({Fight: 1}).write()

            // tell global fight 

            const allUsers = db.get('match').find({Code: roomId}).get('Users').value()
            console.log(allUsers)
            allUsers.forEach(singleUser => {
              if(singleUser.Name != userInfo.Name && singleUser.Name != checkFight.Name){
                io.to(singleUser.SocketId).emit('global-fight', destination)
              }
            })

          } else {
            db.get('match').find({Code: roomId}).get('Users').find({SocketId: userSocketId}).assign({Slot: destination, Movement: 0}).write()
            
            socket.emit('you-moved', {
              actualSlot: fixedSlot,
              destination: destination
            })
          }
        } else {
          socket.emit('message', 'You cannot move right now')
        }
      }
    })


    // GAME

    app.post('/start', (req, res) => {
      const code = req.body.code
      const player = req.body.player
      if (!code || !player) {
        res.send({
          result: false,
          message: 'THE CODE OR THE PLAYER IS NOT SET'
        })
      }
      if (db.get('match').find({Code: code}).value()) {

        let alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']

        function getRandomInt(min, max) {
          min = Math.ceil(min);
          max = Math.floor(max);
          return Math.floor(Math.random() * (max - min)) + min; //Il max è escluso e il min è incluso
        }

        var ID = function () {
          return '_' + Math.random().toString(36).substr(2, 9);
        };


        const initialSlot = alphabet[getRandomInt(0, 9)] + '' + getRandomInt(0, 19)
        const troops = [{
          Id: ID,
          Position: 0,
          Type: 'Infantry',
          Attack: 50,
          Defense: 80
        }, {
          Id: ID,
          Position: 1,
          Type: 'Infantry',
          Attack: 50,
          Defense: 80
        }, {
          Id: ID,
          Position: 2,
          Type: 'Infantry',
          Attack: 50,
          Defense: 80
        }, {
          Id: ID,
          Position: 3,
          Type: 'Infantry',
          Attack: 50,
          Defense: 80
        }]

        const SocketId = db.get('rooms').find({Code: code}).get('Users').find({Name: player}).value().SocketId

        // push the user infos

        let users = db.get('match').find({Code: code}).value().Users

        users.push({
          Name: player,
          SocketId: SocketId,
          Slot: initialSlot,
          Troops: troops,
          Coins: 0,
          Movement: 1,
          Fight: 0
        })

        db.get('match').find({
          Code: code
        }).assign({
          Users: users
        }).write()

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
          if (db.get('match').find({Code: code}).value().Users.filter(item => item.Name == player)[0]) {
            console.log('30 sec ' + player)
            console.log(code, player)
            const actualCoins = db.get('match').find({Code: code}).get('Users').find({Name: player}).value().Coins

            db.get('match').find({Code: code}).get('Users').find({ Name: player }).assign({Coins: actualCoins + 5, Movement: 1}).write()

            timer(30000).then(funzione);
            io.to(SocketId).emit('update-coins', {
              Coins: actualCoins + 5
            })
          } else {
            socket.emit('error', 'ciaone questo errore')
            return
          }
        }

        res.setHeader('Content-Type', 'application/json');
        res.send({
          result: true,
          output: fs.readFileSync('./views/match.ejs').toString(),
          initialSlot: initialSlot,
          troops: troops
        })

        funzione();

        // Start 10 minute countdown

        function countdown(minutes, seconds) {
          var element, endTime, hours, mins, msLeft, time;

          function twoDigits(n) {
            return (n <= 9 ? "0" + n : n);
          }

          function updateTimer() {
            msLeft = endTime - (+new Date);
            if (msLeft < 1000) {
              // When the time is over, finish the match
              

              // todo get winner


              // delete the match and room
              db.get('rooms').remove({
                'Code': code
              }).write()

              db.get('matches').remove({
                'Code': code
              }).write()

            } else {
              time = new Date(msLeft);
              hours = time.getUTCHours();
              mins = time.getUTCMinutes();
              setTimeout(updateTimer, time.getUTCMilliseconds() + 500);
            }
          }

          endTime = (+new Date) + 1000 * (60 * minutes + seconds) + 500;
          updateTimer();
        }




      } else {
        res.setHeader('Content-Type', 'application/json');
        res.send({
          result: false,
          message: 'The match did not start'
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