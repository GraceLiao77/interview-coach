import { ScoreReport } from "../src/schemas/scoring";
import { EvalCase } from "./caseSchema";

export type BandResult = { min: number; max: number; actual: number; pass: boolean };
export type SpanResult = { span: string; pass: boolean };
export type CaseResult = {
  id: string;
  content: BandResult;
  language: BandResult;
  mustCatch: SpanResult[];
  mustNotFlag: SpanResult[];
};

// evalcase - original data, report - AI analysts answer
export const gradeCase = (evalCase: EvalCase, report: ScoreReport): CaseResult => {
    const {expect: { content, language, mustCatch, mustNotFlag }} = evalCase
    const originals = report.languageErrorList.map(e => e.original) // model marked all segments
    
    return {
        id: evalCase.id,
        content: {
            ...content,
            actual: report.contentScore,
            pass: content.min <= report.contentScore && report.contentScore <= content.max
        },
        language: {
            ...language,
            actual: report.languageScore,
            pass: language.min <= report.languageScore && report.languageScore <= language.max
        },
        mustCatch: mustCatch.map(i => ({
            span: i.span,
            pass: originals.some(o => o.includes(i.span)),
            // 思路是两层：
            // - 外层：数组里有没有至少一个元素满足条件 → some
            // - 内层：这个元素（字符串）是否包含 span → 字符串的 includes
        })),
        mustNotFlag: mustNotFlag.map(i => ({
            span: i,
            pass: !originals.some(o => o.includes(i) || i.includes(o)),
        }))
    }
}