//  跟 Claude 打交道(调 API、算分)
import { anthropic } from '../lib/anthropic';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';   // ① 引入 helper
import { scoreReportSchema, ScoreReport } from '../schemas/scoring';           // ① 引入 schema
import { env } from '../env';

const MOCK_RESPONSE: ScoreReport ={
 contentScore: 3,
 languageScore: 4,
 deliveryScore: 3,
 contentContext: "The answer identifies a recent bug fix but lacks critical detail. A strong answer should include: (1) the nature/symptoms of the bug, (2) the debuggingprocess and tools used, (3) the root cause discovered, (4) the solution implemented, and (5) lessons learned or impact. Currently only states 'bug in production' and 'very hard' without technical depth, methodology, or measurable outcomes.",
 languageContext: "Multiple grammatical errors affect clarity: missing articles before 'bug' and 'production', subject-verb agreement error ('I solve' instead of 'solved'), and lack of conjunctions creating choppy delivery. Vocabulary is overly simple ('very hard', 'solve it') where technical terminology would be expected. The response shows common patterns from learners with article-less L1 backgrounds and inconsistent past tense usage.",
 deliveryContext: 'The answer is extremely brief (under 20 words) and lacks professional structure. No opening context-setting, no logical progression through the debugging narrative, and abrupt ending. The monotone structure (simple subject-verb-object sentences) fails to demonstrate communication skills expected in technical interviews.Needs transitional phrases, elaboration, and a clear beginning-middle-end framework.',
 polishedVersion: 'I fixed a bug in production last week. It was very difficult, but I solved it.',
 structuralExemplar: 'I fixed a bug in production last week [MISSING: What was the bug? What symptoms did users experience?], it was very difficult [MISSING: Why was it difficult? What challenges did you face?] but I solved it [MISSING: How did you solve it? What was your debugging process? What was the root cause? What was the impact?].',
 languageErrorList: [
   {
     original: 'I fixed bug in production',
     rewrite: 'I fixed a bug in production',
     pattern: 'missing article before countable noun — article-less L1 transfer'
   },
   {
     original: 'bug in production',
     rewrite: 'a bug in production',
     pattern: "missing indefinite article 'a' — common in Chinese/Slavic L1 speakers"
   },
   {
     original: 'I solve it',
     rewrite: 'I solved it',
     pattern: 'incorrect verb tense — simple present instead of simple past'
   },
   {
     original: 'it was very hard but I solve it',
     rewrite: 'it was very difficult, but I solved it',
     pattern: 'comma splice/missing comma before coordinating conjunction'
   },
   {
     original: 'very hard',
     rewrite: 'very difficult/challenging',
     pattern: "informal register — 'hard' too colloquial for professional context"
   }
 ]
}

export async function scoreAnswer(question: String, answer: String) {
    if (env.mockAi) {
        return MOCK_RESPONSE; // 如果启用 mockAI，则返回 mock 响应
    }

    const prompt = `You are an ESL interview coach. Score the answer on three axes, each 0-10:
    - content, language, delivery.
    For language, list each error as { original, rewrite, pattern } — name the pattern
    (e.g. "missing article — Chinese-L1 transfer"). Also give a polishedVersion (fix only
    language, keep their content) and a structuralExemplar (annotate the gaps).
    Question: ${question}
    Answer: ${answer}`;

    // basic call to anthropic api without and restri
    const response = await anthropic.messages.parse({
        model: 'claude-sonnet-4-5', // demo model, later we will use the real model
        max_tokens: 1000,
        messages: [{role: 'user', content: prompt}],
        output_config: {
            format: zodOutputFormat(scoreReportSchema),
        }
    });

    if (!response.parsed_output) {
        throw new Error('Model returned no valid output');
    }

    return response.parsed_output;
}
