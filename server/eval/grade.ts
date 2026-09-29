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
    const realErrors = report.languageErrorList.filter(e => e.severity !== 'nice-to-have')
    
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
            pass: report.languageErrorList.some(o => o.original.includes(i.span) && i.patternCode === o.patternCode),
        })),
        mustNotFlag: mustNotFlag.map(i => ({
            span: i,
            pass: !realErrors.some(e => e.original.includes(i) || i.includes(e.original))
        }))
    }
}