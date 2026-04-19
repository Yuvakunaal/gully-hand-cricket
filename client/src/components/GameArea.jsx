import React, { useState, useEffect } from 'react';
import AnimatedNumber from './AnimatedNumber';

const GameArea = ({ room, playerId, onPlayHand }) => {
  const [timeLeft, setTimeLeft] = useState(5);
  const [selectedNum, setSelectedNum] = useState(null);
  const [showToast, setShowToast] = useState(false);

  // Timer countdown from timerExpiry
  useEffect(() => {
    if (!room.timerExpiry) return;
    const tick = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((room.timerExpiry - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 100);
    return () => clearInterval(tick);
  }, [room.timerExpiry]);

  // Reset selection when new ball starts
  useEffect(() => {
    if (room.ballPhase === 'waiting_input') {
      setSelectedNum(null);
      setShowToast(false);
    }
  }, [room.ballPhase, room.currentBall]);

  // Show toast when result comes in
  useEffect(() => {
    if (room.ballPhase === 'showing_result' && room.lastActionLog) {
      setShowToast(true);
    }
  }, [room.ballPhase, room.lastActionLog, room.currentBall]);

  const p1 = room.players[0];
  const p2 = room.players[1];
  const amP1 = p1.id === playerId;
  const me = amP1 ? p1 : p2;
  const opp = amP1 ? p2 : p1;

  const totalBalls = (room.totalOvers || 1) * 6;
  const isTransition = room.gameState === 'inning_transition';
  const isWicket = room.lastActionLog?.includes('WICKET');
  const isSix = room.lastActionLog?.includes('SIX');
  const isFour = room.lastActionLog?.includes('FOUR');
  const isShowingResult = room.ballPhase === 'showing_result';

  const myCount = isShowingResult ? (me.lastInput ?? 0) : 0;
  const oppCount = isShowingResult ? (opp.lastInput ?? 0) : 0;

  const canSelect = !selectedNum && room.ballPhase === 'waiting_input' && room.gameState.startsWith('playing');

  const handleSelect = (num) => {
    if (canSelect) {
      setSelectedNum(num);
      onPlayHand(num);
    }
  };

  if (isTransition) {
    return (
      <div className="glass-card transition-panel">
        <h2>🏏 Innings Break</h2>
        <p className="sub">Target to chase</p>
        <div className="target-num">{(room.targetScore || 0) + 1}</div>
        <p style={{color: 'rgba(255,255,255,0.4)', fontSize: 13}}>
          <span className="pulse-dot"></span> Switching sides...
        </p>
      </div>
    );
  }

  const getDisplayScore = (player) => {
    if (room.gameState === 'playing_inning_2') {
      return player.role === 'bat' ? player.score : player.totalScore;
    }
    return player.score;
  };

  return (
    <div className={`game-area ${isWicket && showToast ? 'shake' : ''}`}>
      {/* Scoreboard */}
      <div className="scoreboard">
        <div className="player-score">
          <span className="p-name">{p1.name}</span>
          <span className={`p-role ${p1.role}`}>{p1.role?.toUpperCase()}</span>
          <span className="p-runs">
            <AnimatedNumber value={getDisplayScore(p1)} />
          </span>
        </div>

        <div className="match-info">
          <span className="ball-count">
            Ball {Math.min(room.currentBall, totalBalls)} / {totalBalls}
          </span>
          {room.targetScore !== null && (
            <span className="target-badge">Target: {room.targetScore + 1}</span>
          )}
        </div>

        <div className="player-score">
          <span className="p-name">{p2.name}</span>
          <span className={`p-role ${p2.role}`}>{p2.role?.toUpperCase()}</span>
          <span className="p-runs">
            <AnimatedNumber value={getDisplayScore(p2)} />
          </span>
        </div>
      </div>

      {/* Toast */}
      {showToast && room.lastActionLog && (
        <div className={`action-toast ${isWicket ? 'wicket' : ''} ${isSix ? 'six' : ''} ${isFour ? 'four' : ''}`}>
          {room.lastActionLog}
        </div>
      )}

      {/* Hands */}
      <div className="hands-zone">
        <div className={`hand-wrapper hand-left ${isShowingResult ? 'pop' : ''}`}>
          <img src={`/assets/hands/blue/${myCount}.png`} alt={`blue-${myCount}`} />
        </div>

        <div className="center-badge">
          {room.timerExpiry ? (
            <div className={`timer-circle ${timeLeft <= 2 ? 'urgent' : ''}`}>
              {timeLeft}
            </div>
          ) : isShowingResult ? (
            <div className="timer-circle" style={{background: 'linear-gradient(135deg, #333, #555)', border: '3px solid rgba(255,255,255,0.3)', boxShadow: 'none'}}>
              ⚡
            </div>
          ) : null}
        </div>

        <div className={`hand-wrapper hand-right ${isShowingResult ? 'pop' : ''}`}>
          <img src={`/assets/hands/red/${oppCount}.png`} alt={`red-${oppCount}`} />
        </div>
      </div>

      {/* Number Pad */}
      <div className="number-pad">
        <div className="pad-label">
          {isShowingResult ? 'Result...' : selectedNum ? `You chose ${selectedNum} — waiting...` : (opp.hasPlayed && !selectedNum ? '⚡ Opponent picked! Your turn!' : 'Choose Your Number')}
        </div>
        <div className="pad-grid">
          {[1, 2, 3, 4, 5, 6].map(num => (
            <button
              key={num}
              className={`num-btn ${selectedNum === num ? 'selected' : ''}`}
              onClick={() => handleSelect(num)}
              disabled={!canSelect}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      <div className="room-tag">ROOM: {room.id} • {room.totalOvers} OVER{room.totalOvers > 1 ? 'S' : ''}</div>
    </div>
  );
};

export default GameArea;
