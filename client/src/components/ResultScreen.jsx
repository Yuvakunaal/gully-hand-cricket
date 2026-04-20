import React from 'react';

const ResultScreen = ({ room, playerId, onRematch, onCancelRematch, onLeaveGame }) => {
  const isWinner = room.winnerId === playerId;
  const isTie = room.winnerId === 'tie';

  const me = room.players.find(p => p.id === playerId);
  const opp = room.players.find(p => p.id !== playerId);

  const myScore = room.finalScores?.[playerId] ?? 0;
  const oppScore = room.finalScores?.[opp?.id] ?? 0;

  const iRequested = room.rematchRequests?.[playerId] === true;
  const oppRequested = room.rematchRequests?.[opp?.id] === true;
  const bothReady = iRequested && oppRequested;

  return (
    <div className="glass-card result-screen">
      <div className="trophy">
        {isTie ? '🤝' : isWinner ? '🏆' : '😔'}
      </div>
      <h2 className={isTie ? 'draw' : isWinner ? 'win' : 'lose'}>
        {isTie ? "It's a Tie!" : isWinner ? 'YOU WIN!' : 'YOU LOSE!'}
      </h2>

      <div style={{
        display: 'flex', justifyContent: 'center', gap: 30,
        margin: '15px 0', fontSize: 14, color: 'rgba(255,255,255,0.6)'
      }}>
        <div style={{textAlign: 'center'}}>
          <div style={{fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4}}>
            {me?.name}
          </div>
          <div style={{fontSize: 28, fontWeight: 900, color: 'white'}}>{myScore}</div>
        </div>
        <div style={{alignSelf: 'center', fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.3)'}}>
          vs
        </div>
        <div style={{textAlign: 'center'}}>
          <div style={{fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4}}>
            {opp?.name}
          </div>
          <div style={{fontSize: 28, fontWeight: 900, color: 'white'}}>{oppScore}</div>
        </div>
      </div>

      <p className="result-detail">{room.lastActionLog}</p>

      {/* Rematch Section */}
      {!bothReady && (
        <div className="rematch-section">
          {!iRequested ? (
            <>
              <button className="btn btn-gold" onClick={onRematch}>
                🔥 Rematch
              </button>
              <button className="btn btn-dim" onClick={onLeaveGame}>
                🏠 Back to Lobby
              </button>
            </>
          ) : (
            <div className="rematch-waiting">
              <div className="rematch-waiting-text">
                <span className="pulse-dot"></span>
                Waiting for {opp?.name || 'opponent'} to accept...
              </div>
              {oppRequested && (
                <div className="rematch-accepted-text">
                  Opponent accepted! Starting...
                </div>
              )}
              <button className="btn btn-dim" onClick={onCancelRematch} style={{marginTop: 8}}>
                ✕ Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Show if opponent requested first */}
      {oppRequested && !iRequested && (
        <div className="rematch-nudge">
          ⚡ {opp?.name} wants a rematch!
        </div>
      )}
    </div>
  );
};

export default ResultScreen;
