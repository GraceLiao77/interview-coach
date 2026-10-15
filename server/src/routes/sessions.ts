import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';
import { toAnswerDto, toScoreReportDto } from '../lib/dto';
import { requireAuth } from '../middleware/requireAuth';
import type { QuestionDto, QuestionTier, SessionDetailDto, SessionDto, QuestionDetailDto } from '@shared/types';
import { generateQuestions } from '../services/questionService'
import { requireAllowed } from '../middleware/requireAllowed';
import { aiLimiter } from '../middleware/rateLimits';


const createSessionSchema = z.object({
  jobDescription: z.string().max(20_000).optional(),
  questions: z
    .array(
      z.object({
        tier: z.enum(['warmup', 'behavioral', 'technical']),
        text: z.string().min(1),
        order: z.number().int().min(0),
      }),
    )
    .optional(),
});

type SessionWithQuestions = {
  id: string;
  jobDescription: string | null;
  status: string;
  createdAt: Date;
  questions: { id: string; tier: string; text: string; order: number }[];
};

function toSessionDto(session: SessionWithQuestions): SessionDto {
  return {
    id: session.id,
    jobDescription: session.jobDescription,
    status: session.status,
    createdAt: session.createdAt.toISOString(),
    questions: session.questions.map(
      (q): QuestionDto => ({
        id: q.id,
        tier: q.tier as QuestionTier,
        text: q.text,
        order: q.order,
      }),
    ),
  };
}

// GET /sessions/:id only: each question with its most recent answer and that answer's report.
// orderBy + take: 1 is "ORDER BY createdAt DESC LIMIT 1" per question. Prisma runs one query
// per relation level (sessions, questions, answers, reports), so there is no N+1.
const withLatestAttempt = {
  questions: {
    orderBy: { order: 'asc' },
    include: {
      answers: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { scoreReport: true },
      },
    },
  },
} satisfies Prisma.SessionInclude; // 检查这个对象是合法的 include，但保留它具体的形状（不会被放宽成一个笼统的类型）

// The row type Prisma returns for that include, derived instead of written by hand.
type SessionWithLatestAttempt = Prisma.SessionGetPayload<{ include: typeof withLatestAttempt }>;

function toSessionDetailDto(session: SessionWithLatestAttempt): SessionDetailDto {
  const { questions, ...rest } = toSessionDto(session);   // reuse the base fields
  return {
    ...rest,
    questions: session.questions.map((q, i): QuestionDetailDto => {
      const answer = q.answers[0];   // at most one, thanks to take: 1
      return {
        ...questions[i]!,
        latestAttempt: answer === undefined ? null : {
          answer: toAnswerDto(answer),
          score: answer.scoreReport === null ? null : toScoreReportDto(answer.scoreReport),
        },
      };
    }),
  };
}

const questionsOrdered = { questions: { orderBy: { order: 'asc' as const } } };

export const sessionsRouter = Router();

// Everything below requires a valid JWT; req.userId is set by this middleware.
sessionsRouter.use(requireAuth);

sessionsRouter.get('/', async (req, res) => {
  const sessions = await prisma.session.findMany({
    where: { userId: req.userId },
    include: questionsOrdered,
    orderBy: { createdAt: 'desc' },
  });
  res.json(sessions.map(toSessionDto));
});

sessionsRouter.post('/', async (req, res) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    return;
  }

  const session = await prisma.session.create({
    data: {
      userId: req.userId!,
      jobDescription: parsed.data.jobDescription,
      questions: { create: parsed.data.questions ?? [] },
    },
    include: questionsOrdered,
  });
  res.status(201).json(toSessionDto(session));
});

sessionsRouter.get('/:id', async (req, res) => {
  // findFirst with userId in the filter = ownership check and lookup in one query.
  const session = await prisma.session.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: withLatestAttempt,
  });
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(toSessionDetailDto(session));
});

sessionsRouter.delete('/:id', async (req, res) => {
  const { count } = await prisma.session.deleteMany({
    where: { id: req.params.id, userId: req.userId },
  });
  if (count === 0) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.status(204).end();
});

// Generating questions calls the model, so it's for Allowed Accounts only (ADR 0002).
// The other session routes don't spend anything and stay open to every signed-in user.
sessionsRouter.post<{ id: string }>('/:id/generate-questions', requireAllowed, aiLimiter, async(req, res) => {
  const session = await prisma.session.findFirst({ // findFirst返回第一条匹配的
    where: { id: req.params.id, userId: req.userId}
  })
  if (!session) {
    res.status(404).json({ error: 'session not found'})
    return;
  }
  const result = await generateQuestions(session.jobDescription ?? 'please upload jobscription')
  await prisma.question.createMany({
    data: result.questions.map((q) => ({
      sessionId: session.id,
      tier: q.tier as QuestionTier,
      text: q.text,
      order: q.order,
      resumeBased: q.resumeBased
    })),
    skipDuplicates: true // 没这个选项,重复点击 → @@unique([sessionId, text]) 会抛错 (unique constraint violation),整个请求 fail。有这个 → 重复行静默跳过 (silently skipped),请求成功,DB 状态一致 → idempotent(幂等)
  });
  const updated = await prisma.session.findUnique({
    where: { id: session.id },
    include: questionsOrdered,
  });
  res.json(toSessionDto(updated!));
})

