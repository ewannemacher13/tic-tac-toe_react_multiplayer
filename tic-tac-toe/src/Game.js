import './App.css';
import React from 'react';
import Board from './Board';
import openSocket from "socket.io-client";
const socket = openSocket();

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
      this.setState({joinGameId: event.target.value.toLowerCase()});
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
          this.setState({gameId: this.state.joinGameId,player:res});
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
      
      // if player is false, the game is not valid
      console.log(`player: ${body.player}`);
      return body.player;
  
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
      socket.emit('disconnect-client',this.state.gameId,this.state.player);
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