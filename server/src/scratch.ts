// scratch file for testing code
import './env' // // 第一行:先加载 .env(否则读不到 API key)
import { scoreAnswer } from './services/scoringService';
import { saveAnswerWithScore } from './services/answerService';
import { generateQuestions } from './services/questionService'
import { prisma } from './lib/prisma';


// // 1) 造测试数据:User → Session → Question
// const user = await prisma.user.upsert({          // upsert = 有就用、没有就建(避免重复邮箱报错)
//   where: { email: 'test@test.com' },
//   update: {},
//   create: { email: 'test@test.com', passwordHash: 'x' },
// });
// const session = await prisma.session.create({
//   data: { userId: user.id, jobDescription: 'Frontend role' },
// });
// const question = await prisma.question.create({
//   data: { sessionId: session.id, tier: 'behavioral', text: 'Tell me about a bug you fixed.', order: 0 },
// });

// // 2) 评分(mock 秒回,免费)
// const answerText = 'I fixed bug in production last week, it was very hard but I solve it.';
// const report = await scoreAnswer(question.text, answerText);

// // 3) 存库
// const saved = await saveAnswerWithScore(question.id, answerText, report);
// console.log('saved:', saved);

// 生成question
const jd = `Your Role
Here’s what you will be doing:

Build and maintain web and mobile applications using React across Youtap’s digital payments, wallet, and loyalty products.
Use AI-assisted development tools such as GitHub Copilot, Claude, and Cursor to rapidly prototype, generate boilerplate, write tests, and iterate on features.
Collaborate closely with product managers to understand requirements and translate them into responsive, intuitive interfaces.
Work with solution architects to ensure code meets technical standards, scalability requirements, and best practices.
Translate UI/UX designs into clean, reusable React components.
Integrate with REST APIs and back-end services to deliver seamless end-to-end features using AI assistance.
Participate in code reviews, sprint ceremonies, and continuous improvement practices.
Rapidly build and iterate on new features, optimizing application performance for web and mobile environments.
About You
The company is looking for:

A bachelor’s degree (or near completion) in Computer Science, Software Engineering, or a related field.
Foundational knowledge of React, JavaScript, HTML, and CSS.
Demonstrated ability to use AI coding tools (e.g., GitHub Copilot, Cursor, Claude, ChatGPT) effectively.
A strong interest in fintech, digital payments, or loyalty/rewards platforms.
Ability to collaborate effectively with cross-functional teams including product, design, and engineering.
A bias for action, comfortable shipping iteratively in a fast-paced environment and adapting quickly.
Familiarity with Agile development methodologies is a plus.
Right to work in New Zealand (citizenship, residency, or valid open work visa).
Ability to work on-site in Auckland CBD.
Compensation & Benefits
Competitive graduate salary based on experience and qualifications.
Hands-on exposure to real-world fintech and loyalty products used across multiple markets.
Mentorship from experienced engineers, architects, and product leaders.
A culture that embraces AI-first development with active investment in AI tools and encouragement of experimentation.
Convenient office location in the heart of Auckland CBD.`
const tier = 'behavioral'

const res = await generateQuestions(jd)
console.log('res', res)
                   