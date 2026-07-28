// 存数据库
import { prisma } from "../lib/prisma";
import type { ScoreReport } from "../schemas/scoring";

// 确保answer和scoreReport捆绑成一个transaction，不会只成功一半，因为这个答案是评分是 one-to-one
export async function saveAnswerWithScore(questionId:string, transcript: string, report: ScoreReport) {
    return prisma.$transaction(async (tx) => { //tx 是prisma的临时版
        const answer = await tx.answer.create({
            data: { questionId, content: transcript },
        })
        const score = await tx.scoreReport.create({
            data: {
                answerId: answer.id,
                contentScore: report.contentScore,
                languageScore: report.languageScore,
                deliveryScore: report.deliveryScore,
                contentContext: report.contentContext,
                deliveryContext: report.deliveryContext,
                languageContext: report.languageContext,
                languageErrorList: report.languageErrorList,
                polishedVersion: report.polishedVersion,
                structuralExemplar: report.structuralExemplar
            }
        })
        return { answer, score }
    })
    
}