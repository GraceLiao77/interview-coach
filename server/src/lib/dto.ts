// Turns database rows into the API shapes in @shared/types.
// One place for each conversion, so every route returns the same shape for the same thing.
import type { Answer as AnswerRow, Prisma, ScoreReport as ScoreReportRow } from '@prisma/client';
import type {
  AnswerDto,
  QuestionDetailDto,
  QuestionDto,
  QuestionTier,
  ScoreReportDto,
  SessionDetailDto,
  SessionDto,
  SubmitAnswerResponse,
} from '@shared/types';
import { scoreReportSchema } from '../schemas/scoring';
import { logger } from '../utils/logger';

export function toAnswerDto(row: AnswerRow): AnswerDto {
  return {
    id: row.id,
    questionId: row.questionId,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

// languageErrorList is a Prisma Json column: TypeScript only knows it as "some JSON".
// Rows written by an older version of the app can have a different shape (e.g. the
// free-text "pattern" field before error codes existed), so it's checked with the same
// Zod schema the scoring service uses. A row that doesn't fit is treated as having no
// report, so one bad row can't break the whole page; the warning says which row it was.
const languageErrorListSchema = scoreReportSchema.shape.languageErrorList;

export function toScoreReportDto(row: ScoreReportRow): ScoreReportDto | null {
  const errors = languageErrorListSchema.safeParse(row.languageErrorList);
  if (!errors.success) {
    logger.warn(`ScoreReport ${row.id} has a languageErrorList in an old or unknown format; showing it as no report`);
    return null;
  }
  return {
    id: row.id,
    answerId: row.answerId,
    contentScore: row.contentScore,
    languageScore: row.languageScore,
    deliveryScore: row.deliveryScore,
    contentContext: row.contentContext,
    languageContext: row.languageContext,
    deliveryContext: row.deliveryContext,
    languageErrorList: errors.data,
    polishedVersion: row.polishedVersion,
    structuralExemplar: row.structuralExemplar,
    createdAt: row.createdAt.toISOString(),
  };
}

// The response for a freshly scored answer. Its report was just checked against the strict
// schema before saving, so a null here would mean a bug, not old data.
export function toSubmitAnswerResponse(saved: { answer: AnswerRow; score: ScoreReportRow }): SubmitAnswerResponse {
  const score = toScoreReportDto(saved.score);
  if (score === null) throw new Error(`Report ${saved.score.id} failed its own schema right after being saved`);
  return { answer: toAnswerDto(saved.answer), score };
}

// ---- Sessions ----

type SessionWithQuestions = {
  id: string;
  jobDescription: string | null;
  status: string;
  createdAt: Date;
  questions: { id: string; tier: string; text: string; order: number }[];
};

export function toSessionDto(session: SessionWithQuestions): SessionDto {
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

// GET /sessions/:id and the demo export: each question with its most recent answer and that answer's report.
// orderBy + take: 1 is "ORDER BY createdAt DESC LIMIT 1" per question. Prisma runs one query
// per relation level (sessions, questions, answers, reports), so there is no N+1.
export const withLatestAttempt = {
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

export function toSessionDetailDto(session: SessionWithLatestAttempt): SessionDetailDto {
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
