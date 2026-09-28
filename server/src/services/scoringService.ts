//  跟 Claude 打交道(调 API、算分)
import { anthropic } from '../lib/anthropic';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';   // ① 引入 helper
import { scoreReportSchema, ScoreReport } from '../schemas/scoring';           // ① 引入 schema
import { MODELS, ModelId } from '../lib/aiConfig'
import { env } from '../env';

const MOCK_RESPONSE: ScoreReport ={
 contentScore: 3,
 languageScore: 4,
 // Delivery is deferred until it can be measured from the recording (see CONTEXT.md, "Axis").
 deliveryScore: null,
 contentContext: "The answer names a recent bug fix but gives no detail. A strong answer covers what the bug was, how you found the cause, what you changed, and the result. Right now it only says the bug was in production and that it was hard.",
 languageContext: "Two errors a listener would notice: a missing article ('I fixed bug') and present tense in a past story ('I solve it'). The meaning is still clear. 'Very hard' is fine in speech; 'really tough' would just sound more natural.",
 deliveryContext: null,
 polishedVersion: 'I fixed a bug in production last week. It was very hard, but I solved it.',
 structuralExemplar: 'I fixed a bug in production last week [GAP: What was the bug, and what did users see?]. It was very hard [GAP: Why was it hard?], but I solved it [GAP: How did you find the root cause, and what did you change?] [SENIOR: How did you make sure it would not happen again, and what was the impact?].',
 // One entry per error: the same error is never listed twice, and punctuation and spelling are ignored.
 languageErrorList: [
   {
     original: 'I fixed bug in production',
     rewrite: 'I fixed a bug in production',
     patternCode: 'missing-article',
     severity: 'must-fix',
     proposedPattern: null,
   },
   {
     original: 'I solve it',
     rewrite: 'I solved it',
     patternCode: 'wrong-tense-narrative',
     severity: 'must-fix',
     proposedPattern: null,
   },
   {
     original: 'very hard',
     rewrite: 'really tough',
     patternCode: 'too-informal',
     severity: 'nice-to-have',
     proposedPattern: null,
   },
 ]
}

export async function scoreAnswer(question: string, answer: string, model: ModelId = MODELS.scoring.id) {
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

    const response = await anthropic.messages.parse({
        model,
        max_tokens: 8000,
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
