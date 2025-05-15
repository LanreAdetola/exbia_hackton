// Simple Node.js + Express + Socket.io server for Battleship multiplayer
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');


const path = require('path');
const app = express();
app.use(cors());
// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

let waitingPlayer = null;

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  if (waitingPlayer) {
    // Pair the two players
    const room = `room-${waitingPlayer.id}-${socket.id}`;
    socket.join(room);
    waitingPlayer.join(room);
    io.to(room).emit('start', { room });
    waitingPlayer = null;
  } else {
    waitingPlayer = socket;
    socket.emit('waiting');
  }

  socket.on('move', (data) => {
    // Broadcast move to the other player in the room
    socket.to(data.room).emit('move', data);
  });

  socket.on('gameover', (data) => {
    socket.to(data.room).emit('gameover', data);
  });

  socket.on('disconnect', () => {
    if (waitingPlayer === socket) waitingPlayer = null;
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Battleship multiplayer server running on port ${PORT}`);
});
