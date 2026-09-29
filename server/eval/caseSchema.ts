import { PATTERN_CODES } from "@shared/errorPatterns";
import { z } from "zod";

const ScoreSchema = z.number().int().min(1).max(5)
const BandSchema = z.object({
    min: ScoreSchema, max: ScoreSchema
}).refine((band) => band.max >= band.min, { error: 'min must not be greater than max'})

// 惯例值用schema
export const EvalCaseSchema = z.object({
    id: z.string(), 
    note: z.string(),
    category: z.enum(["behavioral", "technical", "warmup"]),
    question: z.string(),
    answer: z.string(),
    expect: z.object({
        content: BandSchema,
        language: BandSchema,
        mustCatch: z.array(z.object({ // recall 召回率
            span: z.string(), patternCode: z.enum(PATTERN_CODES)
        })),
        mustNotFlag: z.array(z.string()), // precision 精确率
    })
})
// 惯例类型
export type EvalCase = z.infer<typeof EvalCaseSchema>
