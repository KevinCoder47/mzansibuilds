import app from './app.js';
import http from 'http';
import dotenv from 'dotenv';
import { connectDB } from './data/store.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  const httpServer = http.createServer(app);
  httpServer.listen(PORT, () => {
    console.warn(`MzansiBuilds API running on http://localhost:${PORT}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
