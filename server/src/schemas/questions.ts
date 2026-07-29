import { z } from 'zod';

const questionSchema = z.object({
  tier: z.enum(['warmup', 'behavioral', 'technical']), // 只能是这三个值之一
  text: z.string(),
  order: z.number().int(),
  resumeBased: z.boolean(),
});

export const questionSetSchema = z.object({
  questions: z.array(questionSchema), // 一个数组,每项都是 questionSchema
});

export type Question = z.infer<typeof questionSchema>;
export type QuestionSet = z.infer<typeof questionSetSchema>;