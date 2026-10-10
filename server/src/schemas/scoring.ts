import { PATTERN_CODES, SEVERITIES, type PatternCode } from '@shared/errorPatterns';
import { z } from 'zod';

const scoreSchema = z.number().int().min(1).max(5);

// Only set when patternCode is 'other': the model's suggestion for a new Error Pattern (ADR 0001).
const proposedPatternSchema = z.object({
  code: z.string(),
  reason: z.string(),
}).nullable();

const reportFields = {
  contentScore: scoreSchema,
  languageScore: scoreSchema,
  deliveryScore: scoreSchema.nullable(),
  contentContext: z.string(),
  languageContext: z.string(),
  deliveryContext: z.string().nullable(),
  polishedVersion: z.string(),
  structuralExemplar: z.string(),
};

// What the model is asked for and what its output is parsed with.
// patternCode is any string here: the SDK doesn't enforce an enum during generation
// (it turns it into a plain string plus a hint), so a strict enum would make one
// unlisted code fail the whole report. normaliseReport repairs that instead.
export const rawScoreReportSchema = z.object({
  ...reportFields,
  languageErrorList: z.array(z.object({
    original: z.string(),   // 用户原句, copied word for word
    rewrite: z.string(),    // 母语者改写
    patternCode: z.string(),
    severity: z.enum(SEVERITIES),
    proposedPattern: proposedPatternSchema,
  })),
});

// What the rest of the app works with: every patternCode is on the curated list.
export const scoreReportSchema = z.object({
  ...reportFields,
  languageErrorList: z.array(z.object({
    original: z.string(),
    rewrite: z.string(),
    patternCode: z.enum(PATTERN_CODES),
    severity: z.enum(SEVERITIES),
    proposedPattern: proposedPatternSchema,
  })),
});

export const scoreReportSetSchema = z.object({
  scoreReports: z.array(scoreReportSchema),
// its for future extension fields 方便扩展字段
});

export type RawScoreReport = z.infer<typeof rawScoreReportSchema>;
export type ScoreReport = z.infer<typeof scoreReportSchema>;

// The code with the PatternCode type if it's on the list, otherwise undefined.
const toPatternCode = (code: string): PatternCode | undefined => PATTERN_CODES.find(c => c === code);

// Repair what is safe to repair, so one unlisted code doesn't cost a retry.
// An unlisted code becomes 'other', and the model's own code is kept as a proposal
// for a human to review, so nothing the model said is thrown away.
export function normaliseReport(raw: RawScoreReport): ScoreReport {
  return {
    ...raw,
    languageErrorList: raw.languageErrorList.map(e => {
      const known = toPatternCode(e.patternCode);
      if (known !== undefined) return { ...e, patternCode: known };   // on the list, including a deliberate 'other'
      return {
        ...e,
        patternCode: 'other',
        // If the model also wrote its own proposal, keep that one: it comes with a reason.
        proposedPattern: e.proposedPattern ?? {
          code: e.patternCode,
          reason: 'The model used a code that is not on the list.',
        },
      };
    }),
  };
}
