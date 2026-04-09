import app from './app';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Plain HTTP server — real-time delivery is handled via SSE in routes/projects.ts
const httpServer = http.createServer(app);

httpServer.listen(PORT, () => {
  console.warn(`MzansiBuilds API running on http://localhost:${PORT}`);
});
