// scratch file for testing code
import './env' // // 第一行:先加载 .env(否则读不到 API key)
import { scoreAnswer } from './services/scoringService';
import { saveAnswerWithScore } from './services/answerService';
import { prisma } from './lib/prisma';


// 1) 造测试数据:User → Session → Question
const user = await prisma.user.upsert({          // upsert = 有就用、没有就建(避免重复邮箱报错)
  where: { email: 'test@test.com' },
  update: {},
  create: { email: 'test@test.com', passwordHash: 'x' },
});
const session = await prisma.session.create({
  data: { userId: user.id, jobDescription: 'Frontend role' },
});
const question = await prisma.question.create({
  data: { sessionId: session.id, tier: 'behavioral', text: 'Tell me about a bug you fixed.', order: 0 },
});

// 2) 评分(mock 秒回,免费)
const answerText = 'I fixed bug in production last week, it was very hard but I solve it.';
const report = await scoreAnswer(question.text, answerText);

// 3) 存库
const saved = await saveAnswerWithScore(question.id, answerText, report);
console.log('saved:', saved);