import app from './app';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Create HTTP server and attach Socket.IO for the live feed
const httpServer = http.createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  },
});

io.on('connection', (socket) => {
  console.warn('A developer connected:', socket.id);

  socket.on('disconnect', () => {
    console.warn('Developer disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.warn(`MzansiBuilds API running on http://localhost:${PORT}`);
});
