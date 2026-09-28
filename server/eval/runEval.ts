// 读取 cases.json 文件
import { readFile, mkdir, writeFile } from "fs/promises";

import { EvalCaseSchema } from "./caseSchema";
import { z } from "zod";
import path from "path";
import { scoreAnswer } from "../src/services/scoringService";
import { CaseResult, gradeCase } from "./grade";
import { formatCaseLine, summarize, formatSummary } from "./report";
import { ScoreReport } from "../src/schemas/scoring";
import { env } from "../src/env";
import { MODELS } from "../src/lib/aiConfig";

const filePath = path.join(import.meta.dirname, "cases.json") 
const raw = JSON.parse(await readFile(filePath, "utf-8")); // // 文本-> 对象 
const cases = z.array(EvalCaseSchema).safeParse(raw); //检查类型 用schema这个值

if (!cases.success) {
    console.log(z.prettifyError(cases.error))
    process.exit(1) // exit code is not equal 0, which means failed.
}

const IDlist: Set<string> = new Set([])
const ErrList: Array<string> = []

for (const item of cases.data) {
    const eachID = item.id
    const eachAnswer = item.answer
    const { mustCatch, mustNotFlag } = item.expect

    // mustCatch and mustNotFlag should be found in answer
    for (const i of mustCatch) {
        if (!eachAnswer.includes(i.span)) {
            ErrList.push(`${eachID}'s mustCatch ${i.span} not in the answer`)
        }
    }
    for (const x of mustNotFlag) {
        if (!eachAnswer.includes(x)) {
            ErrList.push(`${eachID}'s mustNotFlag ${x} not in the answer`)
        }
    }

    // id can't be repeated
    if (IDlist.has(eachID)) {
        ErrList.push(`${eachID} cannot be repeated`)
    } else {
        IDlist.add(eachID)
    }
}

if (ErrList.length > 0) {
    console.error(ErrList)
    process.exit(1) // exit code is not equal 0, which means failed.
}
console.log(` ✓ ${cases.data.length} cases loaded`);

// call scoreAnswer
const results: CaseResult[] = []
const reports: {id: string, report: ScoreReport}[] = []

for (const item of cases.data) {
    try {
        const res = await scoreAnswer(item.question, item.answer)
        results.push(gradeCase(item, res)) // 批改结果
        reports.push({id: item.id, report: res}) // 原始答卷
    } catch (e) {
        console.error(item.id, e)
    }
}
// format result
for (const r of results) console.log(formatCaseLine(r));
const summary = summarize(results, cases.data.length);
console.log(formatSummary(summary));
// write transcript to baselines file
const baselineDir = path.join(import.meta.dirname, "baselines");   // 文件夹
await mkdir(baselineDir, { recursive: true });                      // 创建文件夹
const name = env.mockAi ? "mock" : MODELS.scoring.id;
const baselineFile = path.join(baselineDir, `${name}.json`);        // 文件夹里的文件
const content = { model: name, runAt: new Date().toISOString(), summary, results, reports };

await writeFile(baselineFile, JSON.stringify(content, null, 2));
console.log(`✓ saved ${baselineFile}`);