import { env } from './env'; // must be first: loads .env before anything reads process.env
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { sessionsRouter } from './routes/sessions';
import { questionsRouter } from './routes/questions';
import { logger } from './utils/logger';
import type { HealthResponse } from '@shared/types';

const app = express();
/**
 * 看你的 index.ts:
    app.use(cors({...}))       // 中间件:给每个响应加 CORS 头
    app.use(express.json())    // 中间件:把请求体 JSON 解析成 req.body
    app.use('/api/questions', questionsRouter)  // 把整个子路由器挂到这个前缀
    它们全是 .use()。 .use() 就是往"请求处理流水线"里加一环。

    一个请求的完整流水线(pipeline)

    请求进来
      → app.use(cors)              加 CORS 头,next()
      → app.use(express.json)      解析 body → req.body,next()
      → 匹配到 /api/questions      交给 questionsRouter
          → questionsRouter.use(requireAuth)   验 JWT(通过→next / 失败→401 拦下)
          → 匹配 POST /:id/answers 的 handler   真正处理你的逻辑
    每一环 next() 一下,把请求往后传;任何一环都能中途 res.xxx() 直接结束。
 */

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

// Express 5 forwards rejected promises here automatically.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled request error', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(env.port, () => {
  logger.info(`Server listening on http://localhost:${env.port}`);
});
