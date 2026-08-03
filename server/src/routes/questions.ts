
import { scoreAnswer } from '../services/scoringService'
import { saveAnswerWithScore } from '../services/answerService'
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';

export const questionsRouter = Router();
// .use() 是用来注册「中间件 (middleware)」的
// 中间件就是:在请求到达最终 handler 之前,先跑一遍的函数。 它的签名是 (req, res, next):
// - 做点事(比如验 JWT)
// - 然后 next() = "放行,交给下一个" —— 或者直接 res.status(401) = "拦下,不放行"
//  没有 requireAuth → req.userId 是 undefined。
// - 而 Prisma 里 where: { session: { userId: undefined } } 的 undefined 意思是"忽略这个条件" → 归属校验直接失效,任何人都能回答任何题!
questionsRouter.use(requireAuth) //   // ← 加这行,所有端点先验 JWT,保证 req.userId 存在、且用户已登录的门。 少了它,后面所有归属校验都是空的

const answerSchema = z.object({ answer: z.string().min(1) });

// answer the question, so :id is questionId
questionsRouter.post('/:id/answers', async(req, res) => {
    // gain answer context
    const parsed = answerSchema.safeParse(req.body)
    if (!parsed.success) {
        res.status(400).json({ error: 'answer is required'})
        return
    }
    const answerText = parsed.data.answer
    // // 2. 找题 + 验归属(穿过关系) 不懂
    const question = await prisma.question.findFirst({
      where: {
        id: req.params.id,
        // filter query
        // ③ 为什么要验归属?—— 不验会怎样?
        // 假设你去掉 session: { userId },只写 where: { id: req.params.id }:
        // ▎ 攻击者(用户 B)只要知道/猜到用户 A 的某个 questionId,就能往 /api/questions/<A的题id>/answers 提交答案 → 污染 A 的数据,甚至读到 A 的题目内容。

        // 加上归属校验后:
        // - 如果这道题的 session 不是你的 → findFirst 返回 null → 你的代码返回 404。
        // - 你只能回答自己的题。 别人的题对你来说"根本不存在"。
        session: {
            userId: req.userId
        }
      }
    })
    if (!question) {
        res.status(404).json({ error: 'question not found'})
        return
    }
    // score
    const report = await scoreAnswer(question.text, answerText)
    // store answer + scoreReport
    const saved = await saveAnswerWithScore(question.id, answerText, report)
    
    res.json(saved)
  })