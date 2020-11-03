const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const socketIo = require('socket.io');

const utils = require('./utils');

const app = express();
const port = 8080;

// let gameIds = [['hh','X'],['j','O']];
let gameIds = {
    'hh': {
        'X': true,
        'O': false,
    },
    'j': {
        'X': false,
        'O': true,
    }
};

app.use(bodyParser.json());

app.get('/b', function(req,res) {
    res.json({express: 'hello from server'});
    res.end();
});

app.post('/gen', function(req,res) {
    var connectionString = utils.getConnectionId(5);
    gameIds[connectionString] = {'X': true,'O': false};
    res.json({id: connectionString});
    res.end();
});

app.post('/checkGameId', function(req,res) {
    var gameId = gameIds[req.body.gameId];
    console.log(gameId);
    let player = false;
    if (gameId!==undefined) {
        if (!gameId['X']) {
            player = 'X';
            gameId['X'] = true;
        }
        else if (!gameId['O']) {
            player = 'O';
            gameId['O'] = true;
        }
        else {
            player = '';
        }
    }
    console.log(player);
    console.log(gameId);
    console.log(gameIds[req.body.gameId]);
    res.json({
        player: player,
    });
    res.end();
});
const server = http.createServer(app).listen(port,() => console.log(`Listening on port ${port}`));

const io = socketIo(server);

let interval;

io.on("connection", (socket) => {
    socket.on('subscribeToTimer', (interval) => {
        interval = setInterval(() => {
            socket.emit('timer',new Date());
        },interval);
    });

    socket.on('resetGame', (gameId) => {
        socket.emit('resetAllGame', (gameId));
    });

    socket.on('toggle', (gameId,toggle) => {
        socket.broadcast.emit('toggleButton', gameId,toggle);
        socket.emit('toggleButton', gameId,toggle);
        
    });

    socket.on('make-move', (gameId,player,move) => {
        socket.broadcast.emit('move-made',gameId,player,move);
    });

    //client joins a game and wants the current board state
    socket.on('get-board', (gameId) => {
        // ask others for board state
        socket.broadcast.emit('board-get',gameId);
    });

    // client with board response
    socket.on('got-board', (gameId,board,playerTurn) => {
        // tell first client what the board state is
        socket.broadcast.emit('board-got',gameId,board,playerTurn);
    });

    // client wants to reset
    socket.on('ask-reset', (gameId) => {
        // ask other client to reset
        socket.broadcast.emit('reset-ask',gameId);
    });

    // client accepts reset ask
    socket.on('reset-board', (gameId) => {
        // all clients will reset
        socket.broadcast.emit('board-reset',gameId);
        socket.emit('board-reset',gameId);
    });

    // client accepts reset ask
    socket.on('disconnect-client', (gameId,player) => {
        // all clients will reset
        socket.broadcast.emit('opponent-disconnect',gameId);

        gameIds[gameId][player] = false;
        if (gameIds[gameId]['X'] === false && gameIds[gameId]['O'] === false) {
            delete gameIds['gameId'];
        }

    });

    socket.on("disconnect",(gameId,player) => {
        clearInterval(interval);
        // if (player==='X') gameIds.splice(gameIds.indexOf(gameId),1);
        if (gameIds[gameId] !== undefined) {
            gameIds[gameId][player] = false;
            if (gameIds[gameId]['X'] === false && gameIds[gameId]['O'] === false) {
                delete gameIds['gameId'];
            }
        }
        
    });
    
});