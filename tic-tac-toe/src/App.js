import logo from './logo.svg';
import './App.css';
import React from 'react'
import openSocket from "socket.io-client";
const socket = openSocket();

function determineWinner(boardState) {
  // will come in ['X','O',null,null....]
  // win states: 3 same horizontal, 3 same vertical, 3 same diagonal
  
  // 0 1 2
  // 3 4 5
  // 6 7 8

  const winStates = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (let i = 0; i < winStates.length; i++) {
    const [a,b,c] = winStates[i];
    if (boardState[a] &&boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
      return boardState[a];
    }
  }
  return null;
}

function isDraw(boardState) {
  for (let i = 0; i < boardState.length; i++) {
    if (boardState === null) {
      return false;
    }
  }
}

function subToMove(cb) {
  socket.on('move-made', (gameId,player,move) => {
    cb(null,gameId,player,move);
  });
}

function subToRequestGameState(cb) {
  socket.on('board-get', (gameId) => {
    cb(null,gameId);
  });
}

function subToReturnGameState(cb) {
  socket.on('board-got', (gameId,board,playerTurn) => {
    cb(null,gameId,board,playerTurn);
  });
}

function subToResetAsk(cb) {
  socket.on('reset-ask', (gameId) => {
    cb(null,gameId);
  });
}

function subToResetRes(cb) {
  socket.on('board-reset', (gameId) => {
    cb(null,gameId);
  });
}

function subToOpponentDisconnect(cb) {
  socket.on('opponent-disconnect', (gameId) => {
    cb(null,gameId);
  });
}

// TODO:
// set up "Create room" / "join room"
//    create room person will be x
//    need to create a unique room: var on server?
// if room changes, get current board state
//    Also get who's turn it is
// add consent to reset board
//    if button clicked, ask for reset
//    if asked for reset, button click will send "reset" to all with gameId
//    if a "reset" is received, reset
// prevent move if not client's turn
// switch which client is x?

function Square(props) {
  return (
      <button className="square" onClick={props.onClick}>
        {props.value}
      </button>
  );
} // end Square

class Board extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      squares: Array(9).fill(null),
      resetAsk: false,
      playerTurn: 'X',
      winner:null,
      opponentConnected: '',
    };
  }

  componentDidMount() {
    this._isMounted = true;
    // if other player made a move
    subToMove((err,gameId,player,move) => {
      if (gameId === this.props.gameId) {
        const squares = this.state.squares.slice();
        squares[move] = player;
        const winner = determineWinner(squares);
        this.setState({
          playerTurn: (this.props.player==='X')? 'X':'O',
          squares:squares,
          winner: winner,
        });
        // this.props.onMove(squares);
      }
    });

    subToRequestGameState((err,gameId) => {
      if (gameId===this.props.gameId) {
        console.log(`board request:${this.state.squares}`);
        socket.emit('got-board',this.props.gameId,this.state.squares,this.state.playerTurn);
        this.setState({opponentConnected: 'true'});
        
      }
    });

    subToReturnGameState((err,gameId,board,playerTurn) => {
      if (gameId===this.props.gameId) {
        console.log(`board received ${board}`);
        this.setState({
          squares: board,
          playerTurn: playerTurn,
          opponentConnected: 'true',
        });
      }
    });

    console.log(`joinGameId: ${this.props.joinGameId}`);
    if (this.props.joinGameId !== '') {
      socket.emit('get-board',this.props.joinGameId);
    }

    subToResetAsk((err,gameId) => {
      if (gameId === this.props.gameId) {
        this.setState({resetAsk: true});
      }
    });

    subToResetRes((err,gameId) => {
      if (gameId === this.props.gameId) {
        console.log(`reset board`);
        this.setState({
          playerTurn: 'X',
          squares: Array(9).fill(null),
          winner: null
        });
      }
    });

    subToOpponentDisconnect((err,gameId) => {
      if (gameId === this.props.gameId) {
        console.log(`opponent disconnect`);
        this.setState({
          opponentConnected: 'false',
        });
      }
    });



  }

  handleClick(i) {
      const squares = this.state.squares.slice();

      // if we are not allowed to make a move (its our turn, there is no winner, and the square is empty)
      if ((this.state.playerTurn !== this.props.player) || (determineWinner(squares) || squares[i])) {
        return;
      }
      socket.emit('make-move',this.props.gameId,this.props.player, i);

      squares[i] = this.props.player;
      const winner = determineWinner(squares);
      this.setState({
        playerTurn: (this.props.player === 'X')? 'O' : 'X',
        squares:squares,
        winner: winner
      });
      // console.log(`squares after move: ${squares}`);
      // this.props.onMove(squares);
  }

  renderSquare(i) {
    return <Square 
      value={this.state.squares[i]}
      onClick={() => this.handleClick(i,this.props.player)}
      />;
  }

  resetGame() {
    if(!this.state.resetAsk) {
      socket.emit('ask-reset',this.props.gameId);
    }
    else {
      this.setState({resetAsk: false});
      socket.emit('reset-board',this.props.gameId);
    }
  }

  render() {
    
    const winner = this.state.winner;
    let status;
    if (winner) {
      status = `Player ${winner} wins!`;
    }
    else if (isDraw(this.state.squares)) {
      status = `Draw! Click reset to clear the board`;
    }
    else {
      status = `Player ${this.state.playerTurn}'s turn`;
    }
    return (
      <div className="board">
        <p>You are player {this.props.player}</p>
        <p>{status}</p>
        <div className="board board-row">
          {this.renderSquare(0)}
          {this.renderSquare(1)}
          {this.renderSquare(2)}
        </div>
        <div className="board board-row">
          {this.renderSquare(3)}
          {this.renderSquare(4)}
          {this.renderSquare(5)}
        </div>
        <div className="board board-row">
          {this.renderSquare(6)}
          {this.renderSquare(7)}
          {this.renderSquare(8)}
        </div>
        
        <button className="reset-button" onClick={() => this.resetGame() }>Reset Game</button>
        {this.state.resetAsk && 
          <p>The other player wants to reset. Click the button to accept</p>
        }

        <p>Your game id is: {this.props.gameId}</p>
        {this.state.opponentConnected==='' &&<p>Have opponent join using that game id</p>}
        {this.state.opponentConnected==='true' &&<p>Opponent connected</p>}
        {this.state.opponentConnected==='false' &&<p>Opponent disconnected</p>}
        <button onClick={() => this.props.onDisconnect()}>Disconnect</button>

      </div>
    );
  }
} // end Board

class Game extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      gameId: '',
      joinGameId: '',
      toggle: 'False',
      player:'X',
      squares: Array(9).fill(null),
    };
    this.handleChange = this.handleChange.bind(this);
    this.disconnect = this.disconnect.bind(this);
  }

  handleChange(event) {
    this.setState({joinGameId: event.target.value});
  }

  createRoom() {
    // joins the room if it exists
    this.getGameId(this.state.joinGameId)
    .then(res => {
      if (res) {
        // socket.emit('get-board',this.state.joinGameId);
        this.setState({gameId: res.id,player:'X'});
      };
    })
    .catch(err => console.log(err));
  }

  joinRoom() {
    // joins the room if it exists
    this.checkGameId(this.state.joinGameId)
    .then(res => {
      if (res) {
        // socket.emit('get-board',this.state.joinGameId);
        this.setState({gameId: this.state.joinGameId,player:'O'});
      };
    })
    .catch(err => console.log(err));

  }

  getGameId = async () => {
    // asks the server to generate a unique game id

    const postOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({msg:'h'})
    };

    const response = await fetch('/gen',postOptions);
    const body = await response.json();

    if (response.status !== 200) throw Error(body.message);
    
    return body;

  }

  checkGameId = async () => {
    // asks the server if the join game id is valid

    const postOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({gameId:this.state.joinGameId})
    };

    const response = await fetch('/checkGameId',postOptions);
    const body = await response.json();

    if (response.status !== 200) throw Error(body.message);
    
    return body.isValidGame;

  }

  componentDidMount() {   
    this._isMounted = true;
  }

  disconnect() {
    this.setState({
      gameId: '',
      joinGameId: '',
      player:'X',
      squares: Array(9).fill(null),
    });
    socket.emit('disconnect-client',this.state.gameId);
  }

//onMove={() => this.makeMove()}
  render() {
    let connected;
    if (this.state.gameId!=='') {
      connected = <div>
        <Board gameId={this.state.gameId} player={this.state.player} joinGameId={this.state.joinGameId} onDisconnect={this.disconnect} />
        
      </div>;
    }
    else {
      connected = <div>
        <p>Create or join a room to play!</p>
        <button onClick={() => this.createRoom()}>Create Room</button>
        <p> or </p>
        <button onClick={() => this.joinRoom()}>Join Room</button>
          <input type="text" placeholder="Game id" value={this.state.joinGameId} onChange={this.handleChange} />
      </div>;
    }
    return (
        <div className="Game">          
          <p>Welcome to Tic-Tac-Toe!</p>
          <div >
            {connected}
          </div>
          {/* <p>Your game id is: {this.state.gameId}</p> */}
        </div>
      
    );
  }
} // end Game

export default Game;

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to refresh.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

// export default App;
