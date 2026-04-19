const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const logic = require('./gameLogic');

const rooms = {};

// ── ROOM CLEANUP ──
function cleanupRoom(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  logic.clearAllTimers(room);
  delete rooms[roomId];
  console.log(`🗑️  Room ${roomId} deleted.`);
}

// Periodic stale room cleanup (rooms older than 30 min with no activity)
setInterval(() => {
  const now = Date.now();
  for (const roomId in rooms) {
    const room = rooms[roomId];
    const allDisconnected = room.players.every(p => !p.connected);
    const isStale = room.gameState === 'game_over' || 
                    (allDisconnected && room.players.length > 0);
    if (isStale) {
      cleanupRoom(roomId);
    }
  }
}, 60000); // check every minute

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  // ── JOIN ROOM ──
  socket.on('join_room', ({ roomId, playerId, playerName, totalOvers, isCreating }) => {
    // Validate inputs
    if (!roomId || !playerId) {
      socket.emit('error_message', 'Invalid room or player ID.');
      return;
    }
    if (typeof playerName === 'string' && playerName.length > 20) {
      playerName = playerName.slice(0, 20);
    }

    if (!rooms[roomId]) {
      if (!isCreating) {
        socket.emit('error_message', 'Room not found! Check the code and try again.');
        return;
      }
      rooms[roomId] = logic.createRoom(roomId, totalOvers || 1);
    }

    // If someone tries to "create" but room already exists, just join it
    const room = rooms[roomId];

    // Block joining a game that's already in progress
    if (room.gameState !== 'waiting') {
      const existing = room.players.find(p => p.id === playerId);
      if (!existing) {
        socket.emit('error_message', 'Game already in progress!');
        return;
      }
      // Reconnection for existing player
      existing.socketId = socket.id;
      existing.connected = true;
      socket.join(roomId);
      io.to(roomId).emit('room_update', logic.sanitizeRoom(room));
      return;
    }

    // Check for reconnection
    const existingPlayer = room.players.find(p => p.id === playerId);
    if (existingPlayer) {
      existingPlayer.socketId = socket.id;
      existingPlayer.connected = true;
      socket.join(roomId);
      io.to(roomId).emit('room_update', logic.sanitizeRoom(room));
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('error_message', 'Room is full!');
      return;
    }

    room.players.push({
      id: playerId,
      socketId: socket.id,
      name: (playerName || '').trim() || `Player ${room.players.length + 1}`,
      connected: true,
      score: 0,
      totalScore: 0,
      currentInput: null,
      lastInput: null,
      role: null,
    });

    socket.join(roomId);

    if (room.players.length === 2 && room.gameState === 'waiting') {
      room.gameState = 'toss';
      const callerIndex = Math.floor(Math.random() * 2);
      room.tossCallerId = room.players[callerIndex].id;
    }

    io.to(roomId).emit('room_update', logic.sanitizeRoom(room));
  });

  // ── TOSS CALL ──
  socket.on('toss_call', ({ roomId, playerId, choice }) => {
    const room = rooms[roomId];
    if (!room || room.gameState !== 'toss' || room.tossCallerId !== playerId) return;

    // Validate choice
    if (choice !== 'heads' && choice !== 'tails') return;

    const isHeads = Math.random() > 0.5;
    const actualResult = isHeads ? 'heads' : 'tails';
    const wonToss = choice === actualResult;

    room.gameState = 'toss_flipping';
    room.tossCalledChoice = choice;
    room.tossResult = actualResult;
    room.tossWinnerId = wonToss ? playerId : room.players.find(p => p.id !== playerId).id;

    io.to(roomId).emit('room_update', logic.sanitizeRoom(room));

    room._tossDelay = setTimeout(() => {
      room._tossDelay = null;
      // Guard: ensure state hasn't changed
      if (room.gameState !== 'toss_flipping') return;
      room.gameState = 'toss_choose';
      io.to(roomId).emit('room_update', logic.sanitizeRoom(room));
    }, 2500);
  });

  // ── TOSS CHOOSE ROLE ──
  socket.on('toss_choose_role', ({ roomId, playerId, role }) => {
    const room = rooms[roomId];
    if (!room || room.gameState !== 'toss_choose' || room.tossWinnerId !== playerId) return;
    
    // Validate role
    if (role !== 'bat' && role !== 'bowl') return;

    const winner = room.players.find(p => p.id === playerId);
    const loser = room.players.find(p => p.id !== playerId);

    winner.role = role;
    loser.role = role === 'bat' ? 'bowl' : 'bat';

    room.gameState = 'playing_inning_1';
    room.currentBall = 1;

    logic.startBallTimer(io, room);
  });

  // ── PLAY HAND ──
  socket.on('play_hand', ({ roomId, playerId, hand }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.gameState !== 'playing_inning_1' && room.gameState !== 'playing_inning_2') return;
    if (room.ballPhase !== 'waiting_input') return;

    // Validate hand input: must be 1-6 integer
    const num = parseInt(hand, 10);
    if (isNaN(num) || num < 1 || num > 6) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player || player.currentInput !== null) return;

    player.currentInput = num;

    if (room.players.every(p => p.currentInput !== null)) {
      logic.resolveBall(io, room);
    }
  });

  // ── DISCONNECT ──
  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        player.connected = false;

        // If game is waiting and a player disconnects, remove them
        if (room.gameState === 'waiting') {
          room.players = room.players.filter(p => p.id !== player.id);
          if (room.players.length === 0) {
            cleanupRoom(roomId);
            continue;
          }
        }

        // If game is in progress and both disconnect, cleanup
        const allDisconnected = room.players.every(p => !p.connected);
        if (allDisconnected && room.gameState !== 'waiting') {
          logic.clearAllTimers(room);
          // Give 30 seconds for reconnection before cleanup
          setTimeout(() => {
            const r = rooms[roomId];
            if (r && r.players.every(p => !p.connected)) {
              cleanupRoom(roomId);
            }
          }, 30000);
        }

        // If one player disconnects mid-game, notify the other
        if (!allDisconnected && room.gameState !== 'waiting' && room.gameState !== 'game_over') {
          io.to(roomId).emit('room_update', logic.sanitizeRoom(room));
          io.to(roomId).emit('opponent_disconnected', player.name);
        }
      }
    }
  });

  // ── LEAVE ROOM (cancel waiting) ──
  socket.on('leave_room', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.gameState !== 'waiting') return;
    room.players = room.players.filter(p => p.id !== playerId);
    socket.leave(roomId);
    if (room.players.length === 0) {
      cleanupRoom(roomId);
    } else {
      io.to(roomId).emit('room_update', logic.sanitizeRoom(room));
    }
  });
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Hand Cricket Server running on port ${PORT}`);
});
