import React, { useState } from 'react';

const Toss = ({ room, playerId, onCall, onChooseRole }) => {
  const [tossClicked, setTossClicked] = useState(false);
  const [roleClicked, setRoleClicked] = useState(false);
  const isCaller = room.tossCallerId === playerId;
  const isFlipping = room.gameState === 'toss_flipping';

  const handleCall = (choice) => {
    if (tossClicked) return;
    setTossClicked(true);
    onCall(choice);
  };

  const handleRole = (role) => {
    if (roleClicked) return;
    setRoleClicked(true);
    onChooseRole(role);
  };

  // TOSS - caller picks heads or tails
  if (room.gameState === 'toss') {
    return (
      <div className="glass-card">
        <h2>⚡ Toss Time!</h2>
        <p className="sub">The coin is ready</p>

        <div className="coin-wrap">
          <div className="coin">
            <div className="coin-side coin-h">H</div>
            <div className="coin-side coin-t">T</div>
          </div>
        </div>

        {isCaller ? (
          <>
            <p style={{color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 15}}>You call it!</p>
            <button className="btn btn-gold" onClick={() => handleCall('heads')} disabled={tossClicked}>
              🪙 Heads
            </button>
            <button className="btn btn-blue" onClick={() => handleCall('tails')} disabled={tossClicked}>
              🪙 Tails
            </button>
          </>
        ) : (
          <p style={{color: 'rgba(255,255,255,0.5)', fontSize: 14}}>
            <span className="pulse-dot"></span>
            Opponent is calling the toss...
          </p>
        )}
      </div>
    );
  }

  // TOSS FLIPPING - both players see the coin flip animation
  if (isFlipping) {
    return (
      <div className="glass-card">
        <h2>⚡ Toss Time!</h2>
        <p className="sub">
          {isCaller 
            ? `You called ${room.tossCalledChoice?.toUpperCase()}!` 
            : `Opponent called ${room.tossCalledChoice?.toUpperCase()}!`
          }
        </p>

        <div className="coin-wrap">
          <div className="coin flipping">
            <div className="coin-side coin-h">H</div>
            <div className="coin-side coin-t">T</div>
          </div>
        </div>

        <p style={{color: 'var(--gold)', fontWeight: 700, fontSize: 16}}>Flipping the coin...</p>
      </div>
    );
  }

  // TOSS CHOOSE - winner picks bat or bowl
  if (room.gameState === 'toss_choose') {
    const wonToss = room.tossWinnerId === playerId;

    return (
      <div className="glass-card">
        <p className="sub">
          Coin landed on: <strong style={{color: 'var(--gold)'}}>{room.tossResult?.toUpperCase()}</strong>
        </p>

        {wonToss ? (
          <>
            <h2 style={{color: 'var(--gold)'}}>🎉 You Won the Toss!</h2>
            <p className="sub">Choose wisely</p>
            <button className="btn btn-blue" onClick={() => handleRole('bat')} disabled={roleClicked}>
              🏏 Bat First
            </button>
            <button className="btn btn-red" onClick={() => handleRole('bowl')} disabled={roleClicked}>
              🎾 Bowl First
            </button>
          </>
        ) : (
          <>
            <h2>Opponent Won the Toss</h2>
            <p style={{color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 10}}>
              <span className="pulse-dot"></span>
              Waiting for their choice...
            </p>
          </>
        )}
      </div>
    );
  }

  return null;
};

export default Toss;
