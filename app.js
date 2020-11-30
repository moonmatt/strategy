const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const randomWords = require('random-words');
const rateLimit = require("express-rate-limit");
const cron = require('node-cron');
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync');
const { remove } = require('lodash');
const bodyParser = require('body-parser');
const request = require('request');
const userAgentProtection = require('block-useragent')(['iphone', 'anon', 'ipod', 'mobile', 'ipod'], {
	options: { methods: '*', dir: '/', action: '/', from: ['CORS'] }
});
const fs = require('fs')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const adapter = new FileSync('storage/db.json')
const db = low(adapter)

// Api Anti Spam 
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5 // limit each IP to 100 requests per windowMs,
});

app.use("/join", limiter);
app.use("/create", limiter);


// Database

// Set some defaults (required if your JSON file is empty)
db.defaults({ rooms: [], users: [] }).write()

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
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var charactersLength = characters.length;
  for ( var i = 0; i < 5; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  let check = db.get('rooms').find({Code: result}).value()
  if(!check){ // if it does not exist create the room
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
  let query = db.get('rooms').filter({Players: 0}).value()
  query.forEach(result => {
    db.get('rooms').remove({ Code: result.Code }).write()
    console.log('eliminato????')
  })
  console.log('running a task every minute');
});

app.get('/', (req, res) => {
    res.render('homepage')
})

app.post('/create', (req, res) => {
    console.log(req.body.createCaptcha)

        let roomCode = createRoom()
        let username = randomWords() + Math.floor(Math.random() * 10000); // the username of the new user
        res.render('room', { roomCode: roomCode, username: username})


    // })
});

app.post('/join', (req,res) => {

    if(!req.body.code){
        res.send('non hai inserito un codice')
        return
    }

    let currentPlayers = db.get('rooms').find({'Code': req.body.code}).value().Players
    console.log('ECCOMI')
    console.log(currentPlayers)
    if(currentPlayers >= 6){
        res.redirect('/')
        console.log('vai affancul')
        return
    }

        console.log('captcha eseguito correttamente')
        // create room
        let code = req.body.code
        let query = db.get('rooms').find({"Code": code}).value()
        if(query){ // if the room exists  
          if(query.Players >= 6 || query == undefined){ // if the room is full
            res.redirect('/?The-match-is-full')
            return
          } else {
            let username = randomWords() + Math.floor(Math.random() * 10000); // the username of the new user
      
            res.render('room', { roomCode: code, username: username})
          }
        } else {
          res.redirect('/')
        }


    // })
})

// Socket

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => { // when you click join game
    let query = db.get('rooms').find({Code: roomId}).value() 
    console.log(query) 
    if(query.Players == 0){ // if there are no users, so you are the first
      console.log('the admin is: ' + userId)
      socket.emit("you-are-the-admin");
      // if you created the match you are the admin
      db.get('rooms').find({'Code': roomId}).assign({'Admin': userId}).write();
    }

    // Add the user to the list
    let ActualPlayers = query.Players + 1
    db.get('rooms').find({'Code': roomId}).assign({ Players: ActualPlayers }).write();

    // add the user to the list of users in the room
    db.get('users').push({
      'Code': roomId,
      'Name': userId,
      'SocketId': '' 
    }).write()

    console.log('sono arrivato qua')

    // Store socket id
    db.get('users').find({'Code': roomId, 'Name': userId}).assign({'SocketId': socket.id}).write();

    // get the list of the users
    let usersNumber = db.get('rooms').find({"Code": roomId}).value()  
    let usersNameList = db.get('users').filter({Code: roomId}).value()

    usersNameList = usersNameList.map(a => a.Name);
    let usersList = {
      number: usersNumber.Players,
      names: usersNameList
    }

    socket.to(roomId).broadcast.emit('user-connected', userId, usersList)

    console.log(usersList)

    socket.emit('you-joined', usersList)

    console.log('SOCKETID: ' + socket.id)

    let adminQuery = db.get('users').find({"Code": roomId}).value()  
    if(adminQuery.Admin == userId){ // if the user is the admin
      console.log('messaggio mandato')
      socket.emit("you-are-the-admin");
    }

    socket.join(roomId)

    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
      console.log(userId + ' DISCONNECTED FROM ' + roomId)

      // remove the user from the table of the users 
      db.get('users').remove({ Code: roomId, Name: userId }).write()

      // Remove 1 user from the total of online users
      let removePlayerQuery = db.get('rooms').find({'Code': roomId}).value()
      console.log('REMOVE')
      console.log(removePlayerQuery)
      let updatedPlayers = removePlayerQuery.Players - 1 
      db.get('rooms').find({'Code': roomId}).assign({'Players': updatedPlayers}).write();
        // if there are no more users in the room, delete it
        if(updatedPlayers == 0){
          db.get('rooms').remove({ 'Code': roomId }).write()
        } else { // if there are still users
          // UPDATE ADMIN
          let checkQuery = db.get('rooms').find({'Code': roomId}).value()
          if(checkQuery.Started){ // if the match started
            if(checkQuery.Admin == userId){ // if the user who left is the admin, remove it
              db.get('rooms').find({'Code': roomId}).assign({'Admin': ''}).write();
            }
          } else { // if it didn't start
            let checkQuery1 = db.get('rooms').find({'Code': roomId}).value()
            if(checkQuery1.Admin == userId){ // if the user who left is the admin, remove it
              // get the list of the users
              let updatedUsersNumber = db.get('rooms').find({"Code": roomId}).value()  
              let updatedUsersNameList = db.get('users').filter({"Code": roomId}).value()[0].Name  

              let newAdminSocket = db.get('users').find({Name: updatedUsersNameList, Code: roomId}).value().SocketId

              db.get('rooms').find({'Code': roomId}).assign({'Admin': updatedUsersNameList}).write();

              io.to(newAdminSocket).emit('you-are-the-admin')
              console.log('the new admin is: ' + newAdminSocket + ' - ' + updatedUsersNameList)
            }
          }
        }

    })
  })
})

// Online matches api

app.get('/debug/:code', (req, res) => {
  let query = db.get('rooms').find({'Code': req.params.code}).value()
  res.send(query)
})
app.get('/debug/second/:code', (req, res) => {
  let query = db.get('users').filter({Code: req.params.code}).value()
  res.send(query)
})
app.get('/debug/third/:username', (req, res) => {
  let query = db.get('users').filter({Name: req.params.username}).value()
  res.send(query)
})
app.get('/prova', (req, res) => {
  let query = db.get('rooms').value()
  res.send(query)
  console.log('arrivato')
})
app.get('/delete', (req, res) => {
  db.get('rooms').remove().write()
  console.log('cancellato')
  res.send('cancellato')
})


server.listen(4444, () => {
  // console.log('started')
  // let prova = db.get('rooms').find({Code: 'LTMYI'}).assign({Admin: 'provola'}).write();

  // console.log(prova)
})

app.use(userAgentProtection);
