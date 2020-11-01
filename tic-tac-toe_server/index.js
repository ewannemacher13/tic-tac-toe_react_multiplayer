const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const socketIo = require('socket.io');

const utils = require('./utils');

const app = express();
const port = 8080;

let gameIds = ['hh','j'];

app.use(bodyParser.json());

app.get('/b', function(req,res) {
    res.json({express: 'hello from server'});
    // res.json({msg: 'hello?'});
    res.end();
});

app.post('/gen', function(req,res) {
    var connectionString = utils.getConnectionId(5);
    // var connectionString = 'hherg';
    gameIds.push(connectionString);
    res.json({id: connectionString});
    // res.json({msg: 'hello?'});
    res.end();
});

app.post('/checkGameId', function(req,res) {
    console.log(`checking id: ${req.body.gameId}`);
    res.json({isValidGame: gameIds.includes(req.body.gameId)});
    res.end();
});

// app.listen(port,() => console.log(`Listening on port ${port}`));

// http.createServer({}, app).listen(8080,function() {
//     console.log(`Server started on port ${8080}`);
// });

const server = http.createServer(app).listen(port,() => console.log(`Listening on port ${port}`));

const io = socketIo(server);

// let interval;

// io.on("connection", (socket) => {
//     console.log('client connect');
//     if (interval) {
//         clearInterval(interval);
//     }
//     interval = setInterval(() => getApiAndEmit(socket), 1000);
//     socket.on("disconnect", () => {
//         console.log("Client disconnect");
//         clearInterval(interval);
//     });
// });

let interval;

io.on("connection", (socket) => {
    console.log('client connect');
    socket.on('subscribeToTimer', (interval) => {
        interval = setInterval(() => {
            socket.emit('timer',new Date());
        },interval);
    });

    socket.on('resetGame', (gameId) => {
        socket.emit('resetAllGame', (gameId));
    });

    socket.on('toggle', (gameId,toggle) => {
        console.log(`toggle: ${toggle}`);
        socket.broadcast.emit('toggleButton', gameId,toggle);
        socket.emit('toggleButton', gameId,toggle);
        
    });

    socket.on('make-move', (gameId,player,move) => {
        console.log(`${gameId}: ${player}: ${move}`);
        socket.broadcast.emit('move-made',gameId,player,move);
        // socket.emit('toggleButton',toggle);
    });

    //client joins a game and wants the current board state
    socket.on('get-board', (gameId) => {
        console.log(`get board: ${gameId}`);
        // ask others for board state
        socket.broadcast.emit('board-get',gameId);
        // socket.emit('toggleButton',toggle);
    });

    // client with board response
    socket.on('got-board', (gameId,board,playerTurn) => {
        console.log(`${gameId} state: ${board}`);
        // tell first client what the board state is
        socket.broadcast.emit('board-got',gameId,board,playerTurn);
        // socket.emit('toggleButton',toggle);
    });

    // client wants to reset
    socket.on('ask-reset', (gameId) => {
        console.log(`${gameId}: ask reset`);
        // ask other client to reset
        socket.broadcast.emit('reset-ask',gameId);
    });

    // client accepts reset ask
    socket.on('reset-board', (gameId) => {
        console.log(`${gameId}: reset`);
        // all clients will reset
        socket.broadcast.emit('board-reset',gameId);
        socket.emit('board-reset',gameId);
    });

    // client accepts reset ask
    socket.on('disconnect-client', (gameId) => {
        console.log(`${gameId}: disconnect`);
        // all clients will reset
        socket.broadcast.emit('opponent-disconnect',gameId);
    });

    socket.on("disconnect",(gameId,player) => {
        console.log("client disconnect");
        clearInterval(interval);
        if (player==='X') gameIds.splice(gameIds.indexOf(gameId),1);
    });
    
});


// const getApiAndEmit = socket => {
//     const response = new Date();

//     socket.emit("FromAPI",response);
// }
