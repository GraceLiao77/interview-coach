// 读取 cases.json 文件
import { readFile } from "fs/promises";
import { EvalCaseSchema } from "./caseSchema";
import { z } from "zod";
import path from "path";
import { scoreAnswer } from "../src/services/scoringService";

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

const successList = []
// call scoreAnswer
for (const item of cases.data) {
    try {
        const res = await scoreAnswer(item.question, item.answer)
        successList.push([item.id, res.contentScore, res.languageScore])
    } catch (e) {
        console.error(item.id, e)
    }
}

console.log(successList, 'error: ', cases.data.length-successList.length)
