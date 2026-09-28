import type { BandResult, CaseResult, SpanResult } from "./grade";

export type Summary = {
    total: number;          // cases in the Test Set
    graded: number;         // cases that came back and were graded
    errors: number;         // cases whose scoreAnswer call failed
    content: { passed: number; total: number };
    language: { passed: number; total: number };
    mustCatch: { passed: number; total: number };    // recall
    mustNotFlag: { passed: number; total: number };  // guards precision
};

const mark = (pass: boolean) => (pass ? "✅" : "❌");

const band = (b: BandResult) => `${mark(b.pass)} ${b.actual} (${b.min}-${b.max})`;

const passedOf = (spans: SpanResult[]) => spans.filter(s => s.pass).length;

// One line per case, e.g.
// grammar-01         content ❌ 3 (4-5)   language ✅ 4 (3-4)   catch 0/2   noFlag 2/2
export function formatCaseLine(r: CaseResult): string {
    return [
        r.id.padEnd(18),
        `content ${band(r.content)}`,
        `language ${band(r.language)}`,
        `catch ${passedOf(r.mustCatch)}/${r.mustCatch.length}`,
        `noFlag ${passedOf(r.mustNotFlag)}/${r.mustNotFlag.length}`,
    ].join("   ");
}

// `total` is passed in separately: a case whose call failed has no CaseResult,
// so results.length alone would hide the failures.
export function summarize(results: CaseResult[], total: number): Summary {
    const allCatch = results.flatMap(r => r.mustCatch);
    const allNotFlag = results.flatMap(r => r.mustNotFlag);
    return {
        total,
        graded: results.length,
        errors: total - results.length,
        content: { passed: results.filter(r => r.content.pass).length, total: results.length },
        language: { passed: results.filter(r => r.language.pass).length, total: results.length },
        mustCatch: { passed: passedOf(allCatch), total: allCatch.length },
        mustNotFlag: { passed: passedOf(allNotFlag), total: allNotFlag.length },
    };
}

// content 3/11 · language 9/11 · mustCatch 1/21 · mustNotFlag 22/22 · errors 0
export function formatSummary(s: Summary): string {
    return [
        `content ${s.content.passed}/${s.content.total}`,
        `language ${s.language.passed}/${s.language.total}`,
        `mustCatch ${s.mustCatch.passed}/${s.mustCatch.total}`,
        `mustNotFlag ${s.mustNotFlag.passed}/${s.mustNotFlag.total}`,
        `errors ${s.errors}`,
    ].join(" · ");
}
