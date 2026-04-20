import React, { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import Toss from './components/Toss';
import GameArea from './components/GameArea';
import ResultScreen from './components/ResultScreen';
import ConnectionOverlay from './components/ConnectionOverlay';
import BotMatch from './components/BotMatch';
import { nanoid } from 'nanoid';
import './index.css';

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:3001`;

// Configure socket with Safari-compatible settings
const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: true,
  forceNew: false,
});

function App() {
  const [screen, setScreen] = useState('lobby');
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [matchHistory, setMatchHistory] = useState([]);
  const [lastSavedGameId, setLastSavedGameId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [botOvers, setBotOvers] = useState(1);
  const [connectionStatus, setConnectionStatus] = useState(
    socket.connected ? 'connected' : 'connecting'
  );

  // Ref to track if we got disconnected mid-game
  const roomRef = useRef(null);
  roomRef.current = room;

  useEffect(() => {
    // Load player info — keep stable player IDs across sessions
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

    // ── Socket: Connection Events ──
    const onConnect = () => {
      setConnectionStatus('connected');
    };

    const onDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    const onConnectError = () => {
      setConnectionStatus('connecting');
    };

    const onReconnectAttempt = () => {
      setConnectionStatus('connecting');
    };

    // ── Socket: Game Events ──
    const onRoomUpdate = (updatedRoom) => {
      setRoom(updatedRoom);
      setScreen('game');
    };

    const onErrorMessage = (msg) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(''), 3500);
    };

    const onOpponentLeft = (oppName) => {
      setToastMessage(`${oppName} left the match.`);
      setTimeout(() => setToastMessage(''), 3500);
      setRoom(null);
      setScreen('lobby');
    };

    const onOpponentDisconnected = () => {};

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.on('room_update', onRoomUpdate);
    socket.on('error_message', onErrorMessage);
    socket.on('opponent_left', onOpponentLeft);
    socket.on('opponent_disconnected', onOpponentDisconnected);

    // If socket is already connected on mount
    if (socket.connected) {
      setConnectionStatus('connected');
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.off('room_update', onRoomUpdate);
      socket.off('error_message', onErrorMessage);
      socket.off('opponent_left', onOpponentLeft);
      socket.off('opponent_disconnected', onOpponentDisconnected);
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

  const handleJoin = useCallback((roomId, name, overs, creating = false) => {
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
  }, [playerId, playerName]);

  const handlePlayBot = useCallback((name, overs) => {
    if (name) {
      setPlayerName(name);
      localStorage.setItem('hc_player_name', name);
    }
    setBotOvers(overs || 1);
    setScreen('bot_game');
  }, []);

  const handleTossCall = useCallback((choice) => {
    if (room) socket.emit('toss_call', { roomId: room.id, playerId, choice });
  }, [room, playerId]);

  const handleTossChooseRole = useCallback((role) => {
    if (room) socket.emit('toss_choose_role', { roomId: room.id, playerId, role });
  }, [room, playerId]);

  const handlePlayHand = useCallback((hand) => {
    if (room) socket.emit('play_hand', { roomId: room.id, playerId, hand });
  }, [room, playerId]);

  // ── REMATCH: request, cancel, leave ──
  const handleRematch = useCallback(() => {
    if (room) socket.emit('request_rematch', { roomId: room.id, playerId });
  }, [room, playerId]);

  const handleCancelRematch = useCallback(() => {
    if (room) socket.emit('cancel_rematch', { roomId: room.id, playerId });
  }, [room, playerId]);

  const handleLeaveGame = useCallback(() => {
    if (room) {
      socket.emit('leave_game', { roomId: room.id, playerId });
    }
    setRoom(null);
    setScreen('lobby');
  }, [room, playerId]);

  const handleLeaveRoom = useCallback(() => {
    if (room) {
      socket.emit('leave_room', { roomId: room.id, playerId });
    }
    setRoom(null);
    setScreen('lobby');
  }, [room, playerId]);

  const isToss = room && (room.gameState === 'toss' || room.gameState === 'toss_flipping' || room.gameState === 'toss_choose');
  const isPlaying = room && (room.gameState === 'playing_inning_1' || room.gameState === 'playing_inning_2' || room.gameState === 'inning_transition');
  const isGameOver = room && room.gameState === 'game_over';
  const isWaiting = room && room.gameState === 'waiting';

  const opponentDisconnected = room && room.players?.length === 2 &&
    room.players.find(p => p.id !== playerId)?.connected === false &&
    room.gameState !== 'waiting' && room.gameState !== 'game_over';

  const isDisconnected = connectionStatus !== 'connected';

  return (
    <div className="app-container">
      <div className="stadium-bg">
        <img src="/assets/stadium_bg.png" alt="stadium" />
      </div>

      {/* Connection Overlay */}
      {connectionStatus !== 'connected' && (
        <ConnectionOverlay status={connectionStatus} />
      )}

      <div className="content-layer">
        {screen === 'lobby' && (
          <Lobby
            onJoin={handleJoin}
            onPlayBot={handlePlayBot}
            playerName={playerName}
            matchHistory={matchHistory}
            disabled={isDisconnected}
          />
        )}

        {screen === 'bot_game' && (
          <BotMatch
            playerName={playerName}
            overs={botOvers}
            onExit={() => setScreen('lobby')}
          />
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
              <ResultScreen
                room={room}
                playerId={playerId}
                onRematch={handleRematch}
                onCancelRematch={handleCancelRematch}
                onLeaveGame={handleLeaveGame}
              />
            )}
          </>
        )}
      </div>

      {/* Connection status indicator (small dot when connected during game) */}
      <div className={`connection-dot ${connectionStatus}`} title={connectionStatus}>
        <span className="connection-dot-inner"></span>
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
