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
    if (boardState[i] === null) {
      return false;
    }
  }
  return true;
}

// function to bind the move socket to a state
function subToMove(cb) {
  socket.on('move-made', (gameId,player,move) => {
    cb(null,gameId,player,move);
  });
}

// function to bind the game state request socket to a state
function subToRequestGameState(cb) {
  socket.on('board-get', (gameId) => {
    cb(null,gameId);
  });
}

// function to bind the game state response socket to a state
function subToReturnGameState(cb) {
  socket.on('board-got', (gameId,board,playerTurn) => {
    cb(null,gameId,board,playerTurn);
  });
}

// function to bind the ask for reset socket to a state
function subToResetAsk(cb) {
  socket.on('reset-ask', (gameId) => {
    cb(null,gameId);
  });
}

// function to bind the reset response socket to a state
function subToResetRes(cb) {
  socket.on('board-reset', (gameId) => {
    cb(null,gameId);
  });
}

// function to bind the opponent disconnect socket to a state
function subToOpponentDisconnect(cb) {
  socket.on('opponent-disconnect', (gameId) => {
    cb(null,gameId);
  });
}

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
      }
    });

    subToRequestGameState((err,gameId) => {
      if (gameId===this.props.gameId) {
        socket.emit('got-board',this.props.gameId,this.state.squares,this.state.playerTurn);
        this.setState({opponentConnected: 'true'});
      }
    });

    subToReturnGameState((err,gameId,board,playerTurn) => {
      if (gameId===this.props.gameId) {
        this.setState({
          squares: board,
          playerTurn: playerTurn,
          opponentConnected: 'true',
        });
      }
    });

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
        this.setState({
          playerTurn: (this.state.playerTurn==='O') ? 'O': 'X',
          squares: Array(9).fill(null),
          winner: null,
          resetAsk: false,
        });
      }
    });

    subToOpponentDisconnect((err,gameId) => {
      if (gameId === this.props.gameId) {
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
  }

  renderSquare(i) {
    return <Square 
      value={this.state.squares[i]}
      onClick={() => this.handleClick(i,this.props.player)}
      />;
  }

  resetGame() {
    // if client hasn't been aksed to reset, the ask opponent to reset
    if(this.state.resetAsk===false) {
      this.setState({resetAsk: 'asked'});
      socket.emit('ask-reset',this.props.gameId);
    }
    // if the client has been asked to reset
    else if (this.state.resetAsk === true) {
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
        {this.state.resetAsk===true && 
          <p>The other player wants to reset. Click the button to accept</p>
        }
        {this.state.resetAsk==='asked' && 
          <p>Asked opponent to reset</p>
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

export default Board;

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
