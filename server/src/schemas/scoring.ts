import { PATTERN_CODES, SEVERITIES } from '@shared/errorPatterns';
import { z } from 'zod';

const scoreSchema = z.number().int().min(1).max(5)
export const scoreReportSchema = z.object({
  contentScore: scoreSchema,
  languageScore: scoreSchema,
  deliveryScore: scoreSchema.nullable(),
  contentContext: z.string(),
  languageContext: z.string(),
  deliveryContext: z.string().nullable(),
  polishedVersion: z.string(),
  structuralExemplar: z.string(),
  languageErrorList: z.array(z.object({   // 一个数组,每项是一个对象
    original: z.string(),   // 用户原句
    rewrite: z.string(),    // 母语者改写
    patternCode: z.enum(PATTERN_CODES),  
    severity: z.enum(SEVERITIES),
    proposedPattern: z.object({
      code: z.string(),
      reason: z.string()
    }).nullable(), // only set when patternCode is 'other'
  })),
});

export const scoreReportSetSchema = z.object({
  scoreReports: z.array(scoreReportSchema),
// its for future extension fields 方便扩展字段 
});

export type ScoreReport = z.infer<typeof scoreReportSchema>;