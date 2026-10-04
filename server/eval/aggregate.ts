import type { CaseResult } from "./grade";
import { summarize } from "./report";

export type CheckStat = { passed: number; runs: number; flaky: boolean };

export type AggregatedCase = {
    id: string;
    content: CheckStat & { actual: number[] };
    language: CheckStat & { actual: number[] };
    mustCatch: (CheckStat & { span: string })[];
    mustNotFlag: (CheckStat & { span: string })[];
};

// One check across all runs, e.g. [true, false, true] -> passed 2 of 3, flaky.
// Flaky means it sometimes passes and sometimes fails. 0/3 and 3/3 are both stable.
const stat = (passes: boolean[]): CheckStat => {
    const passed = passes.filter(p => p).length;
    return { passed, runs: passes.length, flaky: passed > 0 && passed < passes.length };
};

// runs is "by run": runs[0] holds every case from the first run.
// The output is "by case": for each case, how each check did across the runs.
// So for every case id, take that case's "column" (its result from each run), then count.
export function aggregate(runs: CaseResult[][]): AggregatedCase[] {
    // Every id that appears in any run. If a call failed, that case is missing from that run.
    const ids = [...new Set(runs.flatMap(run => run.map(r => r.id)))];

    return ids.map(id => {
        // This case's result from each run where it was graded (failed calls are skipped,
        // so `runs` in the stats below counts only the runs that actually produced a grade).
        const column = runs
            .map(run => run.find(r => r.id === id))
            .filter((r): r is CaseResult => r !== undefined);

        // The spans come from cases.json, so they are in the same order in every run.
        // The first result supplies the span text; index i lines the runs up.
        const spansFrom = column[0];
        const mustCatchSpans = spansFrom?.mustCatch ?? [];
        const mustNotFlagSpans = spansFrom?.mustNotFlag ?? [];

        return {
            id,
            content: {
                ...stat(column.map(r => r.content.pass)),
                actual: column.map(r => r.content.actual),
            },
            language: {
                ...stat(column.map(r => r.language.pass)),
                actual: column.map(r => r.language.actual),
            },
            mustCatch: mustCatchSpans.map((m, i) => ({
                span: m.span,
                ...stat(column.map(r => r.mustCatch[i]?.pass === true)),
            })),
            mustNotFlag: mustNotFlagSpans.map((m, i) => ({
                span: m.span,
                ...stat(column.map(r => r.mustNotFlag[i]?.pass === true)),
            })),
        };
    });
}

// ---- Across runs: how much each total moves when nothing changes ----

export type Spread = { total: number; perRun: number[]; min: number; max: number };

export type RunsSummary = {
    content: Spread;
    language: Spread;
    mustCatch: Spread;
    mustNotFlag: Spread;
    errors: { perRun: number[] };
};

// e.g. mustCatch passed 17, 15 and 18 times in three runs -> { perRun: [17, 15, 18], min: 15, max: 18 }.
// The gap between min and max is the noise floor: a prompt change has to beat it to count.
export function summarizeRuns(runs: CaseResult[][], caseCount: number): RunsSummary {
    const perRun = runs.map(results => summarize(results, caseCount));  // one single-run summary per run
    const spread = (pick: (s: (typeof perRun)[number]) => { passed: number; total: number }): Spread => {
        const passed = perRun.map(s => pick(s).passed);
        return {
            total: Math.max(0, ...perRun.map(s => pick(s).total)),
            perRun: passed,
            min: Math.min(...passed),
            max: Math.max(...passed),
        };
    };
    return {
        content: spread(s => s.content),
        language: spread(s => s.language),
        mustCatch: spread(s => s.mustCatch),
        mustNotFlag: spread(s => s.mustNotFlag),
        errors: { perRun: perRun.map(s => s.errors) },
    };
}

// Every check that passed in some runs and failed in others, as readable lines.
export function listFlaky(cases: AggregatedCase[]): string[] {
    const lines: string[] = [];
    for (const c of cases) {
        if (c.content.flaky) lines.push(`${c.id} content ${c.content.passed}/${c.content.runs} (scores ${c.content.actual.join(", ")})`);
        if (c.language.flaky) lines.push(`${c.id} language ${c.language.passed}/${c.language.runs} (scores ${c.language.actual.join(", ")})`);
        for (const m of c.mustCatch) if (m.flaky) lines.push(`${c.id} catch "${m.span}" ${m.passed}/${m.runs}`);
        for (const m of c.mustNotFlag) if (m.flaky) lines.push(`${c.id} noFlag "${m.span}" ${m.passed}/${m.runs}`);
    }
    return lines;
}
