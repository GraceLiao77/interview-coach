import { env } from './env'; // must be first: loads .env before anything reads process.env
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { sessionsRouter } from './routes/sessions';
import { questionsRouter } from './routes/questions';
import { logger } from './utils/logger';
import type { HealthResponse } from '@shared/types';
import multer from 'multer';

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
app.use('/api/questions', questionsRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? '录音太长了（超过 25MB），请录短一点'
        : '音频上传失败，请重试';
    res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: message });
    return;
  }

  logger.error('Unhandled request error', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(env.port, () => {
  logger.info(`Server listening on http://localhost:${env.port}`);
});
