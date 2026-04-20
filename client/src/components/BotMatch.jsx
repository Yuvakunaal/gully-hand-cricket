import React, { useState, useEffect } from 'react';
import AnimatedNumber from './AnimatedNumber';

const BotMatch = ({ playerName, overs, onExit }) => {
  const [gameState, setGameState] = useState('toss'); // toss, toss_flipping, toss_choose, playing_inning_1, inning_transition, playing_inning_2, game_over
  const [tossCaller, setTossCaller] = useState('player'); // randomly assigned at start
  const [tossCalledChoice, setTossCalledChoice] = useState(null);
  const [tossResult, setTossResult] = useState(null);
  const [tossWinner, setTossWinner] = useState(null);

  const [playerRole, setPlayerRole] = useState(null); // 'bat' or 'bowl'
  const botRole = playerRole === 'bat' ? 'bowl' : playerRole === 'bowl' ? 'bat' : null;

  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [playerTotalScore, setPlayerTotalScore] = useState(0);
  const [botTotalScore, setBotTotalScore] = useState(0);

  const [currentBall, setCurrentBall] = useState(0);
  const [targetScore, setTargetScore] = useState(null);

  const [ballPhase, setBallPhase] = useState('waiting_input');
  const [playerInput, setPlayerInput] = useState(null);
  const [botInput, setBotInput] = useState(null);
  const [lastActionLog, setLastActionLog] = useState('');
  
  const [showToast, setShowToast] = useState(false);
  const [isWicket, setIsWicket] = useState(false);
  const [isSix, setIsSix] = useState(false);
  const [isFour, setIsFour] = useState(false);
  
  const totalBalls = overs * 6;

  // Initialize toss caller
  useEffect(() => {
    resetGame();
  }, []);

  const resetGame = () => {
    setGameState('toss');
    setTossCaller(Math.random() > 0.5 ? 'player' : 'bot');
    setTossCalledChoice(null);
    setTossResult(null);
    setTossWinner(null);
    setPlayerRole(null);
    setPlayerScore(0);
    setBotScore(0);
    setPlayerTotalScore(0);
    setBotTotalScore(0);
    setCurrentBall(0);
    setTargetScore(null);
    setBallPhase('waiting_input');
    setPlayerInput(null);
    setBotInput(null);
    setLastActionLog('');
  };

  // Bot calls toss logic
  useEffect(() => {
    if (gameState === 'toss' && tossCaller === 'bot') {
      const timer = setTimeout(() => {
        const choice = Math.random() > 0.5 ? 'heads' : 'tails';
        handleTossCall(choice, 'bot');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState, tossCaller]);

  // Bot chooses role logic
  useEffect(() => {
    if (gameState === 'toss_choose' && tossWinner === 'bot') {
      const timer = setTimeout(() => {
        const role = Math.random() > 0.5 ? 'bat' : 'bowl';
        handleTossChooseRole(role, 'bot');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState, tossWinner]);

  // Toast effect
  useEffect(() => {
    if (ballPhase === 'showing_result' && lastActionLog) {
      setShowToast(true);
    } else {
      setShowToast(false);
    }
  }, [ballPhase, lastActionLog, currentBall]);

  const handleTossCall = (choice, caller) => {
    setTossCalledChoice(choice);
    const actualResult = Math.random() > 0.5 ? 'heads' : 'tails';
    const wonToss = choice === actualResult;

    setTossResult(actualResult);
    setTossWinner(wonToss ? caller : (caller === 'player' ? 'bot' : 'player'));
    setGameState('toss_flipping');

    setTimeout(() => {
      setGameState('toss_choose');
    }, 2500);
  };

  const handleTossChooseRole = (role, chooser) => {
    if (chooser === 'player') {
      setPlayerRole(role);
    } else {
      setPlayerRole(role === 'bat' ? 'bowl' : 'bat');
    }
    setGameState('playing_inning_1');
    setCurrentBall(1);
    setBallPhase('waiting_input');
  };

  const handlePlayHand = (num) => {
    if (ballPhase !== 'waiting_input') return;

    setPlayerInput(num);
    const botNum = Math.floor(Math.random() * 6) + 1;
    setBotInput(botNum);
    setBallPhase('showing_result');

    const batter = playerRole === 'bat' ? 'player' : 'bot';
    const batterInput = batter === 'player' ? num : botNum;
    const bowlerInput = batter === 'player' ? botNum : num;

    let wicket = false;
    let log = '';
    let six = false;
    let four = false;

    if (batterInput === bowlerInput) {
      wicket = true;
      log = `WICKET! Both chose ${batterInput}!`;
    } else {
      if (batter === 'player') {
        setPlayerScore(prev => prev + batterInput);
      } else {
        setBotScore(prev => prev + batterInput);
      }

      if (batterInput === 6) {
        log = `SIX! 🔥 ${batter === 'player' ? 'You' : 'Bot'} smashed 6!`;
        six = true;
      } else if (batterInput === 4) {
        log = `FOUR! ${batter === 'player' ? 'You' : 'Bot'} hit 4!`;
        four = true;
      } else {
        log = `${batter === 'player' ? 'You' : 'Bot'} scored ${batterInput} run${batterInput > 1 ? 's' : ''}!`;
      }
    }

    setIsWicket(wicket);
    setIsSix(six);
    setIsFour(four);
    setLastActionLog(log);
    
    // Evaluate match progress
    const newCurrentBall = currentBall + 1;
    const isOverComplete = newCurrentBall > totalBalls;
    
    let inningEnded = wicket || isOverComplete;
    
    // 2nd inning chase check
    if (gameState === 'playing_inning_2' && !wicket) {
      const currentBatterScore = batter === 'player' ? playerScore + batterInput : botScore + batterInput;
      if (currentBatterScore > targetScore) {
        inningEnded = true;
      }
    }

    if (inningEnded) {
      setTimeout(() => {
        if (gameState === 'playing_inning_1') {
          setGameState('inning_transition');
          setTargetScore(batter === 'player' ? playerScore + (wicket ? 0 : batterInput) : botScore + (wicket ? 0 : batterInput));
          
          setTimeout(() => {
            // Start inning 2
            setGameState('playing_inning_2');
            setCurrentBall(1);
            setPlayerTotalScore(playerScore + (batter === 'player' && !wicket ? batterInput : 0));
            setBotTotalScore(botScore + (batter === 'bot' && !wicket ? batterInput : 0));
            setPlayerScore(0);
            setBotScore(0);
            setPlayerRole(playerRole === 'bat' ? 'bowl' : 'bat');
            setPlayerInput(null);
            setBotInput(null);
            setBallPhase('waiting_input');
            setLastActionLog('Second Inning Started!');
          }, 4000);
        } else {
          setGameState('game_over');
          // Determine winner logic runs during render
        }
      }, 2000);
    } else {
      setTimeout(() => {
        setCurrentBall(newCurrentBall);
        setPlayerInput(null);
        setBotInput(null);
        setBallPhase('waiting_input');
      }, 2000);
    }
  };

  // -------------------------------------------------------------
  // RENDER HELPERS
  // -------------------------------------------------------------
  
  if (gameState === 'toss' || gameState === 'toss_flipping' || gameState === 'toss_choose') {
    const isCaller = tossCaller === 'player';
    const isFlipping = gameState === 'toss_flipping';

    return (
      <div className="glass-card">
        <h2>⚡ Toss Time! (vs Bot)</h2>
        <p className="sub">
          {gameState === 'toss' ? 'The coin is ready' : 
           isFlipping ? `${tossCaller === 'player' ? 'You' : 'Bot'} called ${tossCalledChoice?.toUpperCase()}!` : 
           `Coin landed on: `}
          {gameState === 'toss_choose' && <strong style={{color: 'var(--gold)'}}>{tossResult?.toUpperCase()}</strong>}
        </p>

        <div className="coin-wrap">
          <div className={`coin ${isFlipping ? 'flipping' : ''}`}>
            <div className="coin-side coin-h">H</div>
            <div className="coin-side coin-t">T</div>
          </div>
        </div>

        {gameState === 'toss' && (
          isCaller ? (
            <>
              <p style={{color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 15}}>You call it!</p>
              <button className="btn btn-gold" onClick={() => handleTossCall('heads', 'player')}>
                🪙 Heads
              </button>
              <button className="btn btn-blue" onClick={() => handleTossCall('tails', 'player')}>
                🪙 Tails
              </button>
            </>
          ) : (
            <p style={{color: 'rgba(255,255,255,0.5)', fontSize: 14}}>
              <span className="pulse-dot"></span>
              Bot is calling the toss...
            </p>
          )
        )}

        {isFlipping && <p style={{color: 'var(--gold)', fontWeight: 700, fontSize: 16}}>Flipping the coin...</p>}

        {gameState === 'toss_choose' && (
          tossWinner === 'player' ? (
            <>
              <h2 style={{color: 'var(--gold)'}}>🎉 You Won the Toss!</h2>
              <p className="sub">Choose wisely</p>
              <button className="btn btn-blue" onClick={() => handleTossChooseRole('bat', 'player')}>
                🏏 Bat First
              </button>
              <button className="btn btn-red" onClick={() => handleTossChooseRole('bowl', 'player')}>
                🎾 Bowl First
              </button>
            </>
          ) : (
            <>
              <h2>Bot Won the Toss</h2>
              <p style={{color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 10}}>
                <span className="pulse-dot"></span>
                Waiting for Bot to choose...
              </p>
            </>
          )
        )}
      </div>
    );
  }

  if (gameState === 'inning_transition') {
    return (
      <div className="glass-card transition-panel">
        <h2>🏏 Innings Break</h2>
        <p className="sub">Target to chase</p>
        <div className="target-num">{targetScore + 1}</div>
        <p style={{color: 'rgba(255,255,255,0.4)', fontSize: 13}}>
          <span className="pulse-dot"></span> Switching sides...
        </p>
      </div>
    );
  }

  if (gameState === 'game_over') {
    const finalPlayerScore = playerRole === 'bowl' ? playerTotalScore : playerScore;
    const finalBotScore = botRole === 'bowl' ? botTotalScore : botScore;
    
    let winner = 'tie';
    if (finalPlayerScore > finalBotScore) winner = 'player';
    if (finalBotScore > finalPlayerScore) winner = 'bot';

    const isWinner = winner === 'player';
    const isTie = winner === 'tie';
    
    const margin = Math.abs(finalPlayerScore - finalBotScore);
    let winLog = 'Match Tied! 🤝';
    if (!isTie) {
      const iBattedFirst = playerRole === 'bowl';
      if (isWinner) {
        if (iBattedFirst) {
          winLog = `WON! Defended and won by ${margin} runs 🏆`;
        } else {
          winLog = `WON! Chased and won by ${margin} runs 🏆`;
        }
      } else {
        if (iBattedFirst) {
          winLog = `LOST! Couldn't defend by ${margin} runs 😔`;
        } else {
          winLog = `LOST! Couldn't chase by ${margin} runs 😔`;
        }
      }
    }

    return (
      <div className="glass-card result-screen">
        <div className="trophy">
          {isTie ? '🤝' : isWinner ? '🏆' : '🤖'}
        </div>
        <h2 className={isTie ? 'draw' : isWinner ? 'win' : 'lose'}>
          {isTie ? "It's a Tie!" : isWinner ? 'YOU BEAT THE BOT!' : 'BOT WINS!'}
        </h2>

        <div style={{
          display: 'flex', justifyContent: 'center', gap: 30,
          margin: '15px 0', fontSize: 14, color: 'rgba(255,255,255,0.6)'
        }}>
          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4}}>
              {playerName || 'You'}
            </div>
            <div style={{fontSize: 28, fontWeight: 900, color: 'white'}}>{finalPlayerScore}</div>
          </div>
          <div style={{alignSelf: 'center', fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.3)'}}>
            vs
          </div>
          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4}}>
              BOT
            </div>
            <div style={{fontSize: 28, fontWeight: 900, color: 'white'}}>{finalBotScore}</div>
          </div>
        </div>

        <p className="result-detail">{winLog}</p>

        <div className="rematch-section">
          <button className="btn btn-gold" onClick={resetGame}>
            🔥 Play Bot Again
          </button>
          <button className="btn btn-dim" onClick={onExit}>
            🏠 Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // GAME AREA (playing_inning_1 or playing_inning_2)
  const isShowingResult = ballPhase === 'showing_result';
  const myCount = isShowingResult ? (playerInput ?? 0) : 0;
  const oppCount = isShowingResult ? (botInput ?? 0) : 0;
  const canSelect = ballPhase === 'waiting_input';

  const getDisplayScore = (isPlayer) => {
    if (gameState === 'playing_inning_2') {
      if (isPlayer) return playerRole === 'bat' ? playerScore : playerTotalScore;
      return botRole === 'bat' ? botScore : botTotalScore;
    }
    return isPlayer ? playerScore : botScore;
  };

  return (
    <div className={`game-area ${isWicket && showToast ? 'shake' : ''}`}>
      {/* Scoreboard */}
      <div className="scoreboard">
        <div className="player-score">
          <span className="p-name">{playerName || 'You'}</span>
          <span className={`p-role ${playerRole}`}>{playerRole?.toUpperCase()}</span>
          <span className="p-runs">
            <AnimatedNumber value={getDisplayScore(true)} />
          </span>
        </div>

        <div className="match-info">
          <span className="ball-count">
            Ball {Math.min(currentBall, totalBalls)} / {totalBalls}
          </span>
          {targetScore !== null && (
            <span className="target-badge">Target: {targetScore + 1}</span>
          )}
        </div>

        <div className="player-score">
          <span className="p-name">BOT</span>
          <span className={`p-role ${botRole}`}>{botRole?.toUpperCase()}</span>
          <span className="p-runs">
            <AnimatedNumber value={getDisplayScore(false)} />
          </span>
        </div>
      </div>

      {/* Toast */}
      {showToast && lastActionLog && (
        <div className={`action-toast ${isWicket ? 'wicket' : ''} ${isSix ? 'six' : ''} ${isFour ? 'four' : ''}`}>
          {lastActionLog}
        </div>
      )}

      {/* Hands */}
      <div className="hands-zone">
        <div className={`hand-wrapper hand-left ${isShowingResult ? 'pop' : ''}`}>
          <img src={`/assets/hands/blue/${myCount}.png`} alt={`blue-${myCount}`} />
        </div>

        <div className="center-badge">
          {isShowingResult ? (
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
          {isShowingResult ? 'Result...' : playerInput ? `You chose ${playerInput} — waiting...` : 'Choose Your Number'}
        </div>
        <div className="pad-grid">
          {[1, 2, 3, 4, 5, 6].map(num => (
            <button
              key={num}
              className={`num-btn ${playerInput === num ? 'selected' : ''}`}
              onClick={() => handlePlayHand(num)}
              disabled={!canSelect}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      <div className="room-tag">BOT MATCH • {overs} OVER{overs > 1 ? 'S' : ''}</div>
    </div>
  );
};

export default BotMatch;
