// Game logic - production-ready state machine with full edge case handling

function createRoom(roomId, totalOvers = 1) {
  return {
    id: roomId,
    gameState: 'waiting',
    players: [],
    tossCallerId: null,
    tossWinnerId: null,
    tossResult: null,
    tossCalledChoice: null,
    currentBall: 0,
    totalOvers: Math.min(Math.max(parseInt(totalOvers) || 1, 1), 3),
    timerExpiry: null,
    targetScore: null,
    _timer: null,
    _resolveDelay: null,
    _tossDelay: null,
    lastActionLog: null,
    ballPhase: 'waiting_input',
    serverTime: Date.now(),
    rematchRequests: {},
    winnerId: null,
    finalScores: null
  };
}

function sanitizeRoom(room) {
  const { _timer, _resolveDelay, _tossDelay, ...safeRoom } = room;
  safeRoom.serverTime = Date.now();
  safeRoom.players = safeRoom.players.map(p => {
    const { currentInput, socketId, ...safePlayer } = p;
    return { ...safePlayer, hasPlayed: currentInput !== null };
  });
  return safeRoom;
}

function clearAllTimers(room) {
  if (room._timer) { clearTimeout(room._timer); room._timer = null; }
  if (room._resolveDelay) { clearTimeout(room._resolveDelay); room._resolveDelay = null; }
  if (room._tossDelay) { clearTimeout(room._tossDelay); room._tossDelay = null; }
}

function startBallTimer(io, room) {
  clearAllTimers(room);

  // Reset player inputs for this ball
  room.players.forEach(p => {
    p.currentInput = null;
    p.lastInput = null;
  });
  room.lastActionLog = null;
  room.ballPhase = 'waiting_input';
  room.timerExpiry = Date.now() + 5000;

  // Emit room update so clients get fresh timerExpiry
  io.to(room.id).emit('room_update', sanitizeRoom(room));

  // Server-side timeout
  room._timer = setTimeout(() => {
    room._timer = null;
    // Guard: only resolve if still waiting for input
    if (room.ballPhase !== 'waiting_input') return;
    // Force 0 for anyone who hasn't chosen
    room.players.forEach(p => {
      if (p.currentInput === null) p.currentInput = 0;
    });
    resolveBall(io, room);
  }, 5300); // 300ms buffer for latency
}

function resolveBall(io, room) {
  clearAllTimers(room);

  // Guard: must be in a playing state
  if (room.gameState !== 'playing_inning_1' && room.gameState !== 'playing_inning_2') return;

  const batter = room.players.find(p => p.role === 'bat');
  const bowler = room.players.find(p => p.role === 'bowl');
  if (!batter || !bowler) return;

  let wicket = false;
  const batterInput = batter.currentInput ?? 0;
  const bowlerInput = bowler.currentInput ?? 0;

  // Save inputs for UI display
  room.players.forEach(p => { p.lastInput = p.currentInput ?? 0; });
  room.ballPhase = 'showing_result';

  if (batterInput !== 0 && batterInput === bowlerInput) {
    wicket = true;
    room.lastActionLog = `WICKET! Both chose ${batterInput}!`;
  } else if (batterInput === 0 && bowlerInput === 0) {
    room.lastActionLog = 'Dot ball! Both timed out.';
  } else if (batterInput === 0) {
    room.lastActionLog = 'Batter timed out! 0 runs.';
  } else {
    batter.score += batterInput;
    if (batterInput === 6) {
      room.lastActionLog = `SIX! 🔥 Batter smashed 6!`;
    } else if (batterInput === 4) {
      room.lastActionLog = `FOUR! Batter hit 4!`;
    } else {
      room.lastActionLog = `Batter scored ${batterInput} run${batterInput > 1 ? 's' : ''}!`;
    }
  }

  room.currentBall++;

  const totalBalls = room.totalOvers * 6;
  const isOverComplete = room.currentBall > totalBalls;
  let inningEnded = wicket || isOverComplete;

  // In 2nd inning, check if target is chased
  if (room.gameState === 'playing_inning_2' && !wicket) {
    if (batter.score > room.targetScore) {
      inningEnded = true;
    }
  }

  // Stop client timer
  room.timerExpiry = null;
  io.to(room.id).emit('room_update', sanitizeRoom(room));

  if (inningEnded) {
    if (room.gameState === 'playing_inning_1') {
      room._resolveDelay = setTimeout(() => {
        room.gameState = 'inning_transition';
        room.targetScore = batter.score;
        io.to(room.id).emit('room_update', sanitizeRoom(room));

        room._resolveDelay = setTimeout(() => {
          startInning2(io, room);
        }, 4000);
      }, 2000);
    } else {
      // Game over
      room._resolveDelay = setTimeout(() => {
        room.gameState = 'game_over';
        determineWinner(room);
        io.to(room.id).emit('room_update', sanitizeRoom(room));
        // Room will be cleaned up by the server after emitting
      }, 2000);
    }
  } else {
    room._resolveDelay = setTimeout(() => {
      startBallTimer(io, room);
    }, 2000);
  }
}

function startInning2(io, room) {
  room.gameState = 'playing_inning_2';
  room.currentBall = 1;
  room.players.forEach(p => {
    p.role = p.role === 'bat' ? 'bowl' : 'bat';
    p.totalScore = p.score;
    p.score = 0;
    p.lastInput = null;
    p.currentInput = null;
  });
  room.lastActionLog = 'Second Inning Started!';
  room.ballPhase = 'waiting_input';
  startBallTimer(io, room);
}

function determineWinner(room) {
  const p1 = room.players[0];
  const p2 = room.players[1];

  const p1BatScore = p1.role === 'bowl' ? p1.totalScore : p1.score;
  const p2BatScore = p2.role === 'bowl' ? p2.totalScore : p2.score;

  // Also store final scores for result screen
  room.finalScores = {
    [p1.id]: p1BatScore,
    [p2.id]: p2BatScore
  };

  if (p1BatScore > p2BatScore) {
    room.winnerId = p1.id;
    room.lastActionLog = `${p1.name} wins by ${p1BatScore - p2BatScore} runs! 🏆`;
  } else if (p2BatScore > p1BatScore) {
    room.winnerId = p2.id;
    room.lastActionLog = `${p2.name} wins! Chased the target! 🏆`;
  } else {
    room.winnerId = 'tie';
    room.lastActionLog = 'Match Tied! 🤝';
  }
}

function resetRoomForRematch(room) {
  clearAllTimers(room);

  // Reset game state but keep players & room identity
  room.gameState = 'toss';
  room.tossResult = null;
  room.tossCalledChoice = null;
  room.tossWinnerId = null;
  room.currentBall = 0;
  room.timerExpiry = null;
  room.targetScore = null;
  room.lastActionLog = null;
  room.ballPhase = 'waiting_input';
  room.winnerId = null;
  room.finalScores = null;
  room.rematchRequests = {};

  // Pick new toss caller randomly
  const callerIndex = Math.floor(Math.random() * 2);
  room.tossCallerId = room.players[callerIndex].id;

  // Reset player stats but keep identity
  room.players.forEach(p => {
    p.score = 0;
    p.totalScore = 0;
    p.currentInput = null;
    p.lastInput = null;
    p.role = null;
  });
}

module.exports = {
  createRoom,
  sanitizeRoom,
  clearAllTimers,
  startBallTimer,
  resolveBall,
  resetRoomForRematch
};
