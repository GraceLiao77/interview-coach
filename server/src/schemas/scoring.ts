import { z } from 'zod';

export const scoreReportSchema = z.object({
  contentScore: z.number().int(),
  languageScore: z.number().int(),
  deliveryScore: z.number().int(),
  contentContext: z.string(),
  languageContext: z.string(),
  deliveryContext: z.string(),
  polishedVersion: z.string(),
  structuralExemplar: z.string(),
  languageErrorList: z.array(z.object({   // 一个数组,每项是一个对象
    original: z.string(),   // 用户原句
    rewrite: z.string(),    // 母语者改写
    pattern: z.string(),    // 错误模式,如 "missing article — Chinese-L1 transfer"
  })),
});

export const scoreReportSetSchema = z.object({
  scoreReports: z.array(scoreReportSchema),
// its for future extension fields 方便扩展字段 
});

export type ScoreReport = z.infer<typeof scoreReportSchema>;