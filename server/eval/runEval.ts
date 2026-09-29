// Eval harness: load the Test Set, score each case, grade it, save a baseline.
//   MOCK_AI=true  npm run eval                                        free, canned model output
//   MOCK_AI=false npm run eval -- --model claude-sonnet-5 --only grammar-01   one paid case (canary)
//   MOCK_AI=false npm run eval -- --model claude-sonnet-5                     the full paid run
import { readFile, mkdir, writeFile } from "fs/promises";
import path from "path";
import { parseArgs } from "node:util";
import { z } from "zod";

import { env } from "../src/env";
import { EvalCaseSchema } from "./caseSchema";
import { CaseResult, gradeCase } from "./grade";
import { formatCaseLine, summarize, formatSummary } from "./report";
import { scoreAnswer } from "../src/services/scoringService";
import { ScoreReport } from "../src/schemas/scoring";
import { MODELS } from "../src/lib/aiConfig";

// ---- 1. Command-line options ----
const { values } = parseArgs({
    options: {
        model: { type: "string" },  // which model to test; defaults to the production scoring model
        only: { type: "string" },   // run a single case by id (for a cheap canary run)
    },
});

// A model that was passed but isn't in MODELS is a typo. Stop, rather than silently
// falling back to the default model and paying for the wrong run.
const modelIds = Object.values(MODELS).map(m => m.id);
const requestedModel = modelIds.find(id => id === values.model);
if (values.model !== undefined && requestedModel === undefined) {
    console.error(`Unknown model "${values.model}". Use one of: ${modelIds.join(", ")}`);
    process.exit(1);
}
const model = requestedModel ?? MODELS.scoring.id;  // the one model used for both the calls and the file name

// ---- 2. Load and validate the Test Set ----
const filePath = path.join(import.meta.dirname, "cases.json");
const raw = JSON.parse(await readFile(filePath, "utf-8"));      // text -> object
const parsed = z.array(EvalCaseSchema).safeParse(raw);            // check the shape against the schema

if (!parsed.success) {
    console.error(z.prettifyError(parsed.error));
    process.exit(1); // a non-zero exit code means failure
}
const allCases = parsed.data;

// Checks the schema can't express: every span is in its answer, and ids are unique.
// These run on the whole file, even when --only picks one case.
const seenIds = new Set<string>();
const problems: string[] = [];

for (const item of allCases) {
    for (const m of item.expect.mustCatch) {
        if (!item.answer.includes(m.span)) {
            problems.push(`${item.id}: mustCatch "${m.span}" is not in the answer`);
        }
    }
    for (const span of item.expect.mustNotFlag) {
        if (!item.answer.includes(span)) {
            problems.push(`${item.id}: mustNotFlag "${span}" is not in the answer`);
        }
    }
    if (seenIds.has(item.id)) {
        problems.push(`${item.id}: duplicate id`);
    }
    seenIds.add(item.id);
}

if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
}

// --only: a typo must stop the run, not quietly run zero cases.
const cases = values.only === undefined ? allCases : allCases.filter(c => c.id === values.only);
if (cases.length === 0) {
    console.error(`No case with id "${values.only}". Ids: ${allCases.map(c => c.id).join(", ")}`);
    process.exit(1);
}
console.log(` ✓ ${allCases.length} cases loaded, running ${cases.length} with ${env.mockAi ? "mock output" : model}`);

// ---- 3. Score, grade and save after every case ----
const results: CaseResult[] = [];
const reports: { id: string; report: ScoreReport }[] = [];

// These never change during a run, so they are worked out once, outside saveBaseline.
const name = env.mockAi ? "mock" : model;
const baselineDir = path.join(import.meta.dirname, "baselines");
// A one-case canary gets its own file, so it can't overwrite a full baseline.
const baselineFile = path.join(baselineDir, values.only === undefined ? `${name}.json` : `${name}.only-${values.only}.json`);
const runAt = new Date().toISOString();   // when this run started, not when each save happened
await mkdir(baselineDir, { recursive: true });

// Rewrites the whole file with everything so far. If the run dies halfway, the
// cases already paid for are on disk, and complete: false says the run didn't finish.
const saveBaseline = async (complete: boolean) => {
    const summary = summarize(results, cases.length);  // worked out from the results so far
    const content = { model: name, runAt, complete, only: values.only ?? null, summary, results, reports };
    await writeFile(baselineFile, JSON.stringify(content, null, 2));
};

for (const item of cases) {
    try {
        const report = await scoreAnswer(item.question, item.answer, model);
        reports.push({ id: item.id, report });       // the raw answer sheet
        results.push(gradeCase(item, report));       // the graded result
        await saveBaseline(false);
    } catch (e) {
        console.error(item.id, e);
    }
}

// ---- 4. Report ----
for (const r of results) console.log(formatCaseLine(r));
console.log(formatSummary(summarize(results, cases.length)));
await saveBaseline(true);
console.log(`✓ saved ${baselineFile}`);
