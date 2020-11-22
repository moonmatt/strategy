const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const Dataput = require('dataput');
const randomWords = require('random-words');
const { Console } = require('console');

// Database

const dbRooms = new Dataput('rooms');
dbRooms.headers = ['ID', 'Code', 'Privacy', 'Users', 'Admin', 'Started'];
dbRooms.autoIncrement = 'ID'

const dbUsers = new Dataput('users');
dbUsers.headers = ['ID', 'Code', 'Name', 'SocketId'];
dbUsers.autoIncrement = 'ID'


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

  let check = dbRooms.query({Code: result})
  if(check.output.length == 0){ // if it does not exist create the room
    dbRooms.insert({
      ID: Dataput.AI, 
      Code: result,
      Privacy: 'Public',
      Users: 0
    });
    console.log('ROOM CREATED ' + result)
    return result // return the code
  } else { // if it already exists, repeat
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
  console.log(query.output[0][3])
  if(query.output[0][3] >= 6){ // if the room does not exist or it is full
    res.redirect('/?The-match-is-full')
    return
  } else {
    let username = randomWords() + Math.floor(Math.random() * 10000); // the username of the new user
    
    if(query.output[0][3] == 0){
      console.log('the admin is: ' + username)
      // if you created the match you are the admin
      dbRooms.updateRow({
        Code: req.params.room
      }, {
        Admin: username
      });
    }

    // Add the user to the list
    dbRooms.updateRow({
      Code: req.params.room
    }, {
      Users: query.output[0][3] + 1
    });

    // add the user to the list of users in the room
    dbUsers.insert({
      ID: Dataput.AI, 
      Code: req.params.room,
      Name: username
    })

      // get the list of the users
      let usersNameList = dbUsers.query({Code: req.params.room}).output
      usersNameList = usersNameList.map(a => a[2]);

    res.render('room', { roomCode: req.params.room, username: username, usersNames: usersNameList})
  }
})
app.get('/create', (req, res) => {
  let roomCode = createRoom()
  res.redirect('/game/' + roomCode)
})

// Socket

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {

    // Store socket id
    dbUsers.updateRow({
      Code: roomId,
      Name: userId
    }, {
      SocketId: socket.id
    });

    console.log('SOCKETID: ' + socket.id)

    let adminQuery = dbRooms.query({Code: roomId, Admin: userId})
    if(adminQuery.output != ''){ // if the user is the admin
      console.log('messaggio mandato')
      socket.emit("you-are-the-admin");
    }

    console.log(userId + ' JOINED ' + roomId)
    socket.join(roomId)

    // get the list of the users
    let usersNumber = dbRooms.query({Code: roomId})
    let usersNameList = dbUsers.query({Code: roomId}).output
    usersNameList = usersNameList.map(a => a[2]);
    let usersList = {
      number: usersNumber.output[0][3],
      names: usersNameList
    }

    socket.to(roomId).broadcast.emit('user-connected', userId, usersList)

    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
      console.log(userId + ' DISCONNECTED FROM ' + roomId)

      // remove the user from the table of the users 
      dbUsers.delete({
        Code: roomId,
        Name: userId
      });

      // Remove 1 user from the total of online users
      let query = dbRooms.query({Code: roomId})
      if(query.output != ''){
        dbRooms.updateRow({
            Code: roomId
          }, {
            Users: query.output[0][3] - 1
          });
          // if there are no more users in the room, delete it
          if(query.output[0][3] -1 == 0){
            dbRooms.delete({
                Code: roomId
              });
          } else { // if there are still users
            // UPDATE ADMIN
            let checkQuery = dbRooms.query({Code: roomId})
            console.log(checkQuery)
            if(checkQuery.output[0][5]){ // if the match started
              if(checkQuery.output[0][4] == userId){ // if the user who left is the admin, remove it
                dbRooms.updateRow({
                  Code: roomId
                }, {
                  Admin: ''
                });
              }
            } else { // if it didn't start
              let checkQuery = dbRooms.query({Code: roomId})
              if(checkQuery.output[0][4] == userId){ // if the user who left is the admin, remove it
                // get the list of the users
                let updatedUsersNumber = dbRooms.query({Code: roomId})
                let updatedUsersNameList = dbUsers.query({Code: roomId})
                updatedUsersNameList = updatedUsersNameList.output.map(a => a[2]);
                let updatedUsersList = {
                  number: updatedUsersNumber.output[0][3],
                  names: updatedUsersNameList,
                }

                let newAdminSocket = dbUsers.query({Name: updatedUsersList.names[0], Code: roomId}).output[0][3]

                dbRooms.updateRow({
                  Code: roomId
                }, {
                  Admin: updatedUsersList.names[0]
                });

                io.to(newAdminSocket).emit('you-are-the-admin')
                console.log('the new admin is: ' + newAdminSocket + ' - ' + updatedUsersList.names[0])
              }
            }
          }
      }

    })
  })
})

// Online matches api

app.get('/matches', (req, res) => {
  let query = dbRooms.query({Privacy: 'Public'}).output.reverse()
  let result = []
  query.forEach(output => result.push({
    Code: output[1],
    Status: output[2],
    Players: output[3],
    Admin: output[4],
    Started: output[5]
  }))
  res.send(result)
})

server.listen(4444)