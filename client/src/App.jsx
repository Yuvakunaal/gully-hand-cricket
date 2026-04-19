import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import Toss from './components/Toss';
import GameArea from './components/GameArea';
import ResultScreen from './components/ResultScreen';
import { nanoid } from 'nanoid';
import './index.css';

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:3001`;
const socket = io(SOCKET_URL);

function App() {
  const [screen, setScreen] = useState('lobby');
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [matchHistory, setMatchHistory] = useState([]);
  const [lastSavedGameId, setLastSavedGameId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    // Load player info
    let savedId = localStorage.getItem('hc_player_id');
    let savedName = localStorage.getItem('hc_player_name');
    if (!savedId) {
      savedId = nanoid();
      localStorage.setItem('hc_player_id', savedId);
    }
    if (!savedName) {
      savedName = `Player_${Math.floor(Math.random() * 1000)}`;
      localStorage.setItem('hc_player_name', savedName);
    }
    setPlayerId(savedId);
    setPlayerName(savedName);

    // Load match history
    try {
      const saved = JSON.parse(localStorage.getItem('hc_match_history') || '[]');
      setMatchHistory(saved);
    } catch { setMatchHistory([]); }

    socket.on('room_update', (updatedRoom) => {
      setRoom(updatedRoom);
      setScreen('game');
    });

    socket.on('error_message', (msg) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(''), 3500);
    });
    socket.on('opponent_disconnected', () => {});

    return () => {
      socket.off('room_update');
      socket.off('error_message');
      socket.off('opponent_disconnected');
    };
  }, []);

  // Save match to history when game ends
  useEffect(() => {
    if (room && room.gameState === 'game_over' && room.finalScores && room.id !== lastSavedGameId) {
      setLastSavedGameId(room.id);
      const opp = room.players.find(p => p.id !== playerId);
      if (!opp) return;

      const myScore = room.finalScores[playerId] ?? 0;
      const oppScore = room.finalScores[opp.id] ?? 0;
      const result = room.winnerId === playerId ? 'win' : room.winnerId === 'tie' ? 'tie' : 'lose';

      const entry = {
        opponent: opp.name,
        myScore,
        oppScore,
        result,
        overs: room.totalOvers || 1,
        timestamp: Date.now()
      };

      setMatchHistory(prev => {
        const updated = [entry, ...prev].slice(0, 2);
        localStorage.setItem('hc_match_history', JSON.stringify(updated));
        return updated;
      });
    }
  }, [room?.gameState, room?.id]);

  const handleJoin = (roomId, name, overs, creating = false) => {
    if (name) {
      setPlayerName(name);
      localStorage.setItem('hc_player_name', name);
    }
    socket.emit('join_room', {
      roomId,
      playerId,
      playerName: name || playerName,
      totalOvers: overs || 1,
      isCreating: creating
    });
  };

  const handleTossCall = (choice) => {
    if (room) socket.emit('toss_call', { roomId: room.id, playerId, choice });
  };

  const handleTossChooseRole = (role) => {
    if (room) socket.emit('toss_choose_role', { roomId: room.id, playerId, role });
  };

  const handlePlayHand = (hand) => {
    if (room) socket.emit('play_hand', { roomId: room.id, playerId, hand });
  };

  const handlePlayAgain = () => {
    setRoom(null);
    setScreen('lobby');
    const newId = nanoid();
    setPlayerId(newId);
    localStorage.setItem('hc_player_id', newId);
  };

  const handleLeaveRoom = () => {
    if (room) {
      socket.emit('leave_room', { roomId: room.id, playerId });
    }
    setRoom(null);
    setScreen('lobby');
  };

  const isToss = room && (room.gameState === 'toss' || room.gameState === 'toss_flipping' || room.gameState === 'toss_choose');
  const isPlaying = room && (room.gameState === 'playing_inning_1' || room.gameState === 'playing_inning_2' || room.gameState === 'inning_transition');
  const isGameOver = room && room.gameState === 'game_over';
  const isWaiting = room && room.gameState === 'waiting';

  const opponentDisconnected = room && room.players?.length === 2 &&
    room.players.find(p => p.id !== playerId)?.connected === false &&
    room.gameState !== 'waiting' && room.gameState !== 'game_over';

  return (
    <div className="app-container">
      <div className="stadium-bg">
        <img src="/assets/stadium_bg.png" alt="stadium" />
      </div>

      <div className="content-layer">
        {screen === 'lobby' && (
          <Lobby onJoin={handleJoin} playerName={playerName} matchHistory={matchHistory} />
        )}

        {screen === 'game' && room && (
          <>
            {isWaiting && (
              <div className="glass-card waiting-screen">
                <h2>Waiting for Opponent</h2>
                <p className="sub">Share this code with your friend</p>
                <div className="room-code-display">{room.id}</div>
                <p style={{color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 10}}>
                  <span className="pulse-dot"></span> Waiting to connect...
                </p>
                <p style={{color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 8}}>
                  {room.totalOvers} Over{room.totalOvers > 1 ? 's' : ''} Match
                </p>
                <button className="btn btn-red" onClick={handleLeaveRoom} style={{marginTop: 16, fontSize: 12, padding: '10px 16px'}}>
                  ✕ Cancel
                </button>
              </div>
            )}

            {isToss && (
              <Toss room={room} playerId={playerId} onCall={handleTossCall} onChooseRole={handleTossChooseRole} />
            )}

            {isPlaying && (
              <>
                <GameArea room={room} playerId={playerId} onPlayHand={handlePlayHand} />
                {opponentDisconnected && (
                  <div className="action-toast" style={{top: '50%', background: 'rgba(198,40,40,0.9)'}}>
                    ⚠️ Opponent disconnected — waiting...
                  </div>
                )}
              </>
            )}

            {isGameOver && (
              <ResultScreen room={room} playerId={playerId} onPlayAgain={handlePlayAgain} />
            )}
          </>
        )}
      </div>

      {/* Error Toast */}
      {toastMessage && (
        <div className="error-toast" onClick={() => setToastMessage('')}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default App;
