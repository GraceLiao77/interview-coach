
import { scoreAnswer } from '../services/scoringService'
import { saveAnswerWithScore } from '../services/answerService'
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';
import { transcribe } from '../services/transcriptionService'
import multer from 'multer';
import { logger } from '../utils/logger';
import type { TranscribeResponse } from '@shared/types';

export const questionsRouter = Router();

// 所有端点先验 JWT。少了这行 req.userId 是 undefined,而 Prisma 里
// where: { userId: undefined } 意思是"忽略这个条件" → 下面的归属校验会全部失效。
questionsRouter.use(requireAuth)

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

    // Question 自己没有 userId,归属藏在 session → user。穿过关系过滤 = 一次 JOIN,
    // 别人的题对你来说"根本不存在"(findFirst 返回 null → 404)。
    const question = await prisma.question.findFirst({
      where: {
        id: req.params.id,
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // Groq 免费层单文件上限
})

// upload.single('audio') 挂在单条路由上,不能用 .use() —— 否则上面那条 JSON 路由
// 也会被拿去解析 multipart。字段名 'audio' 必须和前端 form.append('audio', blob) 一致。
questionsRouter.post<{ id: string }>('/:id/answers/audio', upload.single('audio'), async(req, res) => {
  // 如果音频文件不存在
  if (!req.file) {
    res.status(400).json({ error: 'audio file is required'})
    return
  }
  // 验归属
  const question = await prisma.question.findFirst({
      where: {
        id: req.params.id,
        session: {
          userId: req.userId
        }
      }
  })
  if (!question) {
    res.status(404).json({ error: 'question not found'})
    return
  }
  // 音频文件语音转化为text
  let transcript: string                    // ← 声明在 try 外面,否则 try 结束就出作用域了
  try {
    transcript = await transcribe(req.file.buffer)
  } catch (e) {
    logger.error('Groq transcription failed', e)        // 原始错误只进日志
    res.status(502).json({ error: '没听清，请重新录一次' })
    return
  }

  // 如果音频文件为空，不触发groq
  if (!transcript.trim()) {
    res.status(400).json({ error: 'audio file is empty，please try again'})
    return
  }
  // score
  const report = await scoreAnswer(question.text, transcript)
  // store answer + scoreReport
  const saved = await saveAnswerWithScore(question.id, transcript, report)

  res.json(saved)

})

// 只转写,不评分、不写库。前端把文字回填进 textarea,用户改完再走上面那条评分路由。
// 归属校验照样要做:这个端点不写数据,但会花 Groq 的额度 —— 不验的话任何登录用户
// 都能拿别人的 questionId 来白嫖转写。
questionsRouter.post<{ id: string }>('/:id/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'audio file is required' })
    return
  }

  const question = await prisma.question.findFirst({
    where: {
      id: req.params.id,
      session: { userId: req.userId },
    },
  })
  if (!question) {
    res.status(404).json({ error: 'question not found' })
    return
  }

  let transcript: string
  try {
    transcript = await transcribe(req.file.buffer)
  } catch (e) {
    logger.error('Groq transcription failed', e) // 原始错误只进日志
    res.status(502).json({ error: "We couldn't hear that clearly — please record again." })
    return
  }

  if (!transcript.trim()) {
    res.status(400).json({ error: 'No speech detected — move closer to the mic and try again.' })
    return
  }

  const body: TranscribeResponse = { transcript }
  res.json(body)
})