import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app: Application = express();

// ── Security middleware ───────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '10kb' })); // prevent large payload attacks

// ── Rate limiting ─────────────────────────────────────────
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'mzansibuilds-api' });
});

// ── Routes (to be added Day 3+) ───────────────────────────
// app.use('/api/auth', authRouter);
// app.use('/api/projects', projectsRouter);
// app.use('/api/developers', developersRouter);
// app.use('/api/celebration', celebrationRouter);

export default app;
