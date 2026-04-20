import React, { useState } from 'react';

const Lobby = ({ onJoin, playerName, matchHistory = [], disabled = false }) => {
  const [name, setName] = useState(playerName || '');
  const [roomId, setRoomId] = useState('');
  const [overs, setOvers] = useState(1);

  const handleCreate = () => {
    if (disabled) return;
    const newRoomId = String(Math.floor(10000 + Math.random() * 90000));
    onJoin(newRoomId, name, overs, true);
  };

  const handleJoin = () => {
    if (disabled) return;
    const code = roomId.trim();
    if (code.length === 5 && /^\d{5}$/.test(code)) {
      onJoin(code, name, null, false);
    }
  };

  const recentMatches = matchHistory.slice(0, 2);

  return (
    <>
      <div className="logo-area">
        <div className="logo-title">
          GULLY
        </div>
        <div className="logo-subtitle">Hand Cricket</div>
      </div>

      <div className="glass-card">
        <h2>Ready to Play?</h2>
        <p className="sub">No login needed. Jump right in!</p>

        <div className="field">
          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={15}
            style={{letterSpacing: '1px'}}
          />
        </div>

        {/* Over Selector */}
        <div className="over-selector">
          <span className="over-label">Overs</span>
          <div className="over-btns">
            {[1, 2, 3].map(o => (
              <button
                key={o}
                className={`over-btn ${overs === o ? 'active' : ''}`}
                onClick={() => setOvers(o)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-blue" onClick={handleCreate} disabled={!name.trim() || disabled}>
          ⚡ Create Match
        </button>

        <div className="divider-row">OR JOIN</div>

        <div className="field">
          <input
            type="text"
            placeholder="5-DIGIT CODE"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.replace(/\D/g, '').slice(0, 5))}
            maxLength={5}
            inputMode="numeric"
          />
        </div>

        <button className="btn btn-red" onClick={handleJoin} disabled={roomId.trim().length !== 5 || !name.trim() || disabled}>
          🎯 Join Match
        </button>
      </div>

      {/* Recent Matches */}
      {recentMatches.length > 0 && (
        <div className="match-history">
          <div className="history-title">Recent Matches</div>
          {recentMatches.map((m, i) => (
            <div key={i} className={`history-row ${m.result}`}>
              <div className="history-left">
                <span className={`history-badge ${m.result}`}>
                  {m.result === 'win' ? 'W' : m.result === 'lose' ? 'L' : 'T'}
                </span>
                <span className="history-opp">vs {m.opponent}</span>
              </div>
              <div className="history-score">
                {m.myScore} - {m.oppScore}
              </div>
              <div className="history-overs">{m.overs}ov</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default Lobby;
