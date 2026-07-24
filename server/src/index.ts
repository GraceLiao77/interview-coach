import { env } from './env'; // must be first: loads .env before anything reads process.env
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { sessionsRouter } from './routes/sessions';
import { logger } from './utils/logger';
import type { HealthResponse } from '@shared/types';

const app = express();

// The Vite dev server runs on 5173; without this, the browser blocks cross-origin fetches.
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  const payload: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
  res.json(payload);
});

app.use('/api/auth', authRouter);
app.use('/api/sessions', sessionsRouter);

// Express 5 forwards rejected promises here automatically.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled request error', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(env.port, () => {
  logger.info(`Server listening on http://localhost:${env.port}`);
});
