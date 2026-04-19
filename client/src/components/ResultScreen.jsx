import React from 'react';

const ResultScreen = ({ room, playerId, onPlayAgain }) => {
  const isWinner = room.winnerId === playerId;
  const isTie = room.winnerId === 'tie';

  const me = room.players.find(p => p.id === playerId);
  const opp = room.players.find(p => p.id !== playerId);

  const myScore = room.finalScores?.[playerId] ?? 0;
  const oppScore = room.finalScores?.[opp?.id] ?? 0;

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
      <button className="btn btn-gold" onClick={onPlayAgain}>
        🔥 Play Again
      </button>
    </div>
  );
};

export default ResultScreen;
