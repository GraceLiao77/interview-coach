// Turns database rows into the API shapes in @shared/types.
// One place for each conversion, so every route returns the same shape for the same thing.
import type { Answer as AnswerRow, ScoreReport as ScoreReportRow } from '@prisma/client';
import type { AnswerDto, ScoreReportDto, SubmitAnswerResponse } from '@shared/types';
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
