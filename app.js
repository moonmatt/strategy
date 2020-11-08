const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const Dataput = require('dataput');
const randomWords = require('random-words');

// Database

const dbRooms = new Dataput('rooms');
dbRooms.headers = ['ID', 'Code', 'Privacy', 'Users'];
dbRooms.autoIncrement = 'ID'

// dbRooms.insert({
// 	ID: Dataput.AI, 
// 	Code: 'provola',
// 	Privacy: 'Public',
// 	Users: 0
// });

// Create room id
function createRoom() {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var charactersLength = characters.length;
  for ( var i = 0; i < 5; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  let check = dbRooms.query({Code: result})
  if(check.output.length == 0){ // if it is empty create room
    dbRooms.insert({
      ID: Dataput.AI, 
      Code: result,
      Privacy: 'Public',
      Users: 0
    });
    return result
  } else {
    createRoom()
    console.log('gia esistente')
  }
}

app.set('view engine', 'ejs')
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.render('homepage')
})

app.get('/game/:room', (req, res) => {
  let query = dbRooms.query({Code: req.params.room})
  if(query.output.length == 0 || query.output.Users == 6){ // if the room does not exist or it is full
    res.redirect('/')
  }
  let username = randomWords()
  
  // Add the user to the list
  dbRooms.updateRow({
    Code: req.params.room
  }, {
    Users: query.output[0][3] + 1
  });

  res.render('room', { roomCode: req.params.room })
})
app.get('/create', (req, res) => {
  let roomCode = createRoom()
  console.log(roomCode)
  res.redirect('/game/' + roomCode)
})

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId)
    socket.to(roomId).broadcast.emit('user-connected', userId)

    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })
})

server.listen(4444)