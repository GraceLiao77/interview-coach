//  跟 Claude 打交道(调 API、算分)
import { Anthropic } from '@anthropic-ai/sdk';
import { anthropic } from '../lib/anthropic';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';   // ① 引入 helper
import { rawScoreReportSchema, normaliseReport, ScoreReport } from '../schemas/scoring';
import { MODELS, ModelId } from '../lib/aiConfig'
import { PATTERN_CODES, PATTERN_INFO } from '@shared/errorPatterns';
import { env } from '../env';
import { logger } from '../utils/logger';

// The Error Pattern list as the model sees it: one "- code: definition" line per pattern.
// Built once at module load from PATTERN_INFO, so editing a definition there updates the prompt.
const PATTERN_LIST = PATTERN_CODES
    .map(code => `- ${code}: ${PATTERN_INFO[code].definition}`)
    .join('\n');

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
const prompt = (question: string, answer: string): string => (`You are an ESL interview coach. Score the answer on two axes, each an integer from 1 to 5: content and language.
Do not score delivery: set deliveryScore and deliveryContext to null.

For language, list each error with:
- original: copied exactly from the answer, word for word. Use the shortest part that shows the error.
  Give each error its own entry. If one sentence has several errors, list each one separately.
  For example, "Yesterday I fix bug in production" has two errors: "fix" (tense) and "bug" (missing article).
- rewrite: how a native speaker would say that part.
- patternCode: one code from the list below.
- severity:
  - must-fix: it is wrong, or it makes the meaning unclear.
  - should-fix: it is grammatical, but a native speaker would find it unnatural.
  - nice-to-have: it is fine as it is, but could sound more natural. A style preference is never more than nice-to-have.
- Correct English is never must-fix or should-fix, even if you would say it another way. In particular:
  - Simple words and short sentences are correct. Do not flag them for being simple.
  - Present tense is correct for a fact that is still true now, e.g. "I joined a team that builds payment apps".
    Events in the story still need past tense, e.g. "there was a bug" when describing what happened.
  - A preposition at the end of a clause is correct, e.g. "the tool we relied on".
- proposedPattern: only when patternCode is "other", suggest a new pattern as { code, reason }. Otherwise set it to null.

Error patterns:
${PATTERN_LIST}

Also give a polishedVersion (fix only language, keep their content) and a structuralExemplar (annotate the gaps).

Question: ${question}
Answer: ${answer}`);

// One retry, only for output the model got wrong (malformed JSON, a score outside 1-5).
// Network errors, timeouts and 429s are APIErrors, and the SDK already retries those.
const MAX_ATTEMPTS = 2;

export async function scoreAnswer(question: string, answer: string, model: ModelId = MODELS.scoring.id): Promise<ScoreReport> {
    if (env.mockAi) {
        return MOCK_RESPONSE; // 如果启用 mockAI，则返回 mock 响应
    }

    for (let attempt = 1; ; attempt++) {
        try {
            const response = await anthropic.messages.parse({
                model,
                max_tokens: 8000,
                messages: [{ role: 'user', content: prompt(question, answer) }],
                output_config: {
                    format: zodOutputFormat(rawScoreReportSchema),
                },
            });
            if (!response.parsed_output) {
                throw new Error('Model returned no valid output');
            }
            return normaliseReport(response.parsed_output);
        } catch (e) {
            if (e instanceof Anthropic.APIError || attempt >= MAX_ATTEMPTS) throw e;
            logger.warn(`scoreAnswer: invalid model output, retrying (attempt ${attempt + 1} of ${MAX_ATTEMPTS})`, e instanceof Error ? e.message : e);
        }
    }
}
