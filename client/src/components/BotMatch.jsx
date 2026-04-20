import React, { useState, useEffect } from 'react';
import AnimatedNumber from './AnimatedNumber';

// --- STOCKFISH ENGINE FOR HAND CRICKET ---
// Uses backward induction Dynamic Programming to solve the zero-sum game
// for every possible ball & run state, finding the exact Nash Equilibrium.
const HandCricketEngine = (() => {
  let in1DP = null;
  let in2DP = null;
  let maxBallsComputed = 0;
  let maxRunsComputed = 0;

  const solveZeroSum = (v_arr) => {
    // Sort descending keeping original index
    const sorted = v_arr.map((v, i) => ({ v, idx: i })).sort((a, b) => b.v - a.v);
    let S = [];
    let V_star = 0;
    let sum_inv = 0;
    
    for (let k = 1; k <= 6; k++) {
      const u_k = sorted[k-1].v;
      if (u_k === 0) {
        if (k === 1) return { V: 0, P: [1/6,1/6,1/6,1/6,1/6,1/6], Q: [1/6,1/6,1/6,1/6,1/6,1/6] };
        break;
      }
      const next_sum_inv = sum_inv + 1 / u_k;
      const V_k = (k - 1) / next_sum_inv;
      
      // Include strategies that are equal or better than the equilibrium threshold
      if (u_k >= V_k - 1e-9) {
        S.push(sorted[k-1]);
        sum_inv = next_sum_inv;
        V_star = V_k;
      } else {
        break;
      }
    }
    
    const P = [0, 0, 0, 0, 0, 0];
    const Q = [0, 0, 0, 0, 0, 0];
    for (let item of S) {
      Q[item.idx] = Math.max(0, 1 - V_star / item.v);
      P[item.idx] = Math.max(0, 1 / (item.v * sum_inv));
    }
    
    // Normalize probabilities to avoid float issues
    const sumP = P.reduce((a, b) => a + b, 0);
    const sumQ = Q.reduce((a, b) => a + b, 0);
    for (let i = 0; i < 6; i++) {
      P[i] = sumP > 0 ? P[i] / sumP : 1/6;
      Q[i] = sumQ > 0 ? Q[i] / sumQ : 1/6;
    }
    
    return { V: V_star, P, Q };
  };

  const ensureComputed = (balls, runs) => {
    if (balls <= maxBallsComputed && (runs === undefined || runs <= maxRunsComputed)) {
      return;
    }
    
    const newMaxBalls = Math.max(maxBallsComputed, balls + 10);
    const newMaxRuns = Math.max(maxRunsComputed, (runs || newMaxBalls * 6) + 30);
    
    // Inning 1 DP: Maximize Expected Runs
    const newIn1 = new Array(newMaxBalls + 1).fill(null);
    newIn1[0] = { V: 0, P: [1/6,1/6,1/6,1/6,1/6,1/6], Q: [1/6,1/6,1/6,1/6,1/6,1/6] };
    for (let b = 1; b <= newMaxBalls; b++) {
      const v_arr = [];
      for (let i = 1; i <= 6; i++) {
        v_arr.push(i + newIn1[b-1].V); // Expected runs if play continues
      }
      newIn1[b] = solveZeroSum(v_arr);
    }
    in1DP = newIn1;

    // Inning 2 DP: Maximize Win Probability
    const newIn2 = Array(newMaxBalls + 1).fill(null).map(() => Array(newMaxRuns + 1).fill(null));
    for (let r = 0; r <= newMaxRuns; r++) {
      let val = 0;
      if (r <= 0) val = 1; // Win
      else if (r === 1) val = 0.5; // Tie
      newIn2[0][r] = { V: val, P: [1/6,1/6,1/6,1/6,1/6,1/6], Q: [1/6,1/6,1/6,1/6,1/6,1/6] };
    }
    for (let b = 0; b <= newMaxBalls; b++) {
      newIn2[b][0] = { V: 1, P: [1/6,1/6,1/6,1/6,1/6,1/6], Q: [1/6,1/6,1/6,1/6,1/6,1/6] };
    }
    
    for (let b = 1; b <= newMaxBalls; b++) {
      for (let r = 1; r <= newMaxRuns; r++) {
        const v_arr = [];
        for (let i = 1; i <= 6; i++) {
          const next_r = Math.max(0, r - i);
          v_arr.push(newIn2[b-1][next_r].V);
        }
        newIn2[b][r] = solveZeroSum(v_arr);
      }
    }
    
    in2DP = newIn2;
    maxBallsComputed = newMaxBalls;
    maxRunsComputed = newMaxRuns;
  };

  const sampleWeighted = (probs) => {
    const r = Math.random();
    let sum = 0;
    for (let i = 0; i < 6; i++) {
      sum += probs[i];
      if (r <= sum) return i + 1;
    }
    return 6;
  };

  const getExploitativeProbs = (baseProbs, role, state, history) => {
    if (!history || history.length < 2) return baseProbs;
    
    // Count player frequencies with Laplace smoothing
    const counts = [1, 1, 1, 1, 1, 1];
    history.forEach(num => { if (num >= 1 && num <= 6) counts[num - 1]++; });
    const totalCount = counts.reduce((a, b) => a + b, 0);
    const h = counts.map(c => c / totalCount);

    const v = state.v_arr || [1, 2, 3, 4, 5, 6]; // Fallback values
    let exploitProbs = [0, 0, 0, 0, 0, 0];
    
    if (role === 'bowl') {
      // Bot is bowling. It wants to maximize h[i] * v[i] (predict player's high-value moves)
      const metrics = h.map((prob, i) => prob * v[i]);
      const sumMetrics = metrics.reduce((a, b) => a + b, 0);
      exploitProbs = metrics.map(m => sumMetrics > 0 ? m / sumMetrics : 1/6);
    } else {
      // Bot is batting. It wants to maximize v[i] * (1 - h[i]) (avoid player's bowling habits)
      const metrics = v.map((val, i) => val * (1 - h[i]));
      const sumMetrics = metrics.reduce((a, b) => a + b, 0);
      exploitProbs = metrics.map(m => sumMetrics > 0 ? m / sumMetrics : 1/6);
    }

    // Blend 50% Nash Equilibrium with 50% Exploitative Adaption
    const blended = baseProbs.map((p, i) => 0.5 * p + 0.5 * exploitProbs[i]);
    const sumBlended = blended.reduce((a, b) => a + b, 0);
    return blended.map(p => p / sumBlended);
  };

  return {
    getMoveInning1: (ballsRemaining, role, history) => {
      ensureComputed(ballsRemaining);
      const state = in1DP[ballsRemaining];
      const baseProbs = role === 'bat' ? state.P : state.Q;
      const finalProbs = getExploitativeProbs(baseProbs, role, state, history);
      return sampleWeighted(finalProbs);
    },
    getMoveInning2: (ballsRemaining, runsRequired, role, history) => {
      if (runsRequired <= 0) return Math.floor(Math.random() * 6) + 1;
      ensureComputed(ballsRemaining, runsRequired);
      const state = in2DP[ballsRemaining][runsRequired];
      const baseProbs = role === 'bat' ? state.P : state.Q;
      const finalProbs = getExploitativeProbs(baseProbs, role, state, history);
      return sampleWeighted(finalProbs);
    }
  };
})();
// --- END STOCKFISH ENGINE ---

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
  const [playerHistory, setPlayerHistory] = useState([]); // Track habits
  
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
    setPlayerHistory([]);
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

  const getThinkingBotMove = (history) => {
    const ballsRemaining = totalBalls - currentBall + 1;
    
    if (gameState === 'playing_inning_2') {
      const isBotBatting = botRole === 'bat';
      const batterScore = isBotBatting ? botScore : playerScore;
      const runsRequiredToWin = targetScore + 1 - batterScore;
      
      return HandCricketEngine.getMoveInning2(ballsRemaining, runsRequiredToWin, botRole, history);
    }
    
    return HandCricketEngine.getMoveInning1(ballsRemaining, botRole, history);
  };

  const handlePlayHand = (num) => {
    if (ballPhase !== 'waiting_input') return;

    const newHistory = [...playerHistory, num];
    setPlayerHistory(newHistory);

    setPlayerInput(num);
    const botNum = getThinkingBotMove(newHistory);
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
