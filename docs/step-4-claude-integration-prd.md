# PRD — Step 4: Claude API Integration (Question Generation + Answer Scoring)

**Status:** Planned · **Owner:** Jin (GraceLiao77) · **Prerequisite:** Steps 1–3 complete (scaffold, Prisma CRUD, JWT auth)
**Scope of this doc:** Typed-text answers only. Voice/Whisper (OpenAI) is deferred to Step 4-voice.

---

## 1. Background & problem

The app so far can register users and store interview sessions, but it does nothing *intelligent* yet. Step 4 delivers the product's core value: **generate tailored interview questions, then score a candidate's typed answer on three separate axes (content, language, delivery)** — with language feedback specifically tuned for ESL (English-as-Second-Language) engineers.

This is where the app stops being a CRUD demo and starts being *the mock-interview coach* described in the product vision.

## 2. Why cost is the #1 design driver

The developer has **~$12 USD (20 NZD) of Anthropic credit that must last 2–3 months.** Every technical decision in this doc is shaped by that. If we ignore cost, a few days of testing could burn the whole budget. So this PRD treats cost as a first-class requirement, not an afterthought.

**Budget math (rough, per mock session ≈ question generation + scoring 4–5 answers):**

| Model | Cost / session | Sessions from $12 |
|-------|---------------|-------------------|
| Haiku 4.5 | ~$0.035 | ~340 |
| **Sonnet 4.6** (question gen) | ~$0.10 | ~120 |
| **Opus 4.8** (scoring) | ~$0.17 | ~70 |

**Chosen model split:** `claude-sonnet-4-6` for question generation (cheap, high-volume) and `claude-opus-4-8` for scoring (where language nuance matters most). Quality where it counts, economy on the bulk.

## 3. Goals / Non-goals

**Goals**
- Generate progressive questions (warmup → behavioral → technical) from a job description.
- Score a typed answer on three separate axes, never one collapsed total.
- Language axis must **name the error pattern** (e.g. "missing article — a common Chinese-L1 transfer") and show *original → native rewrite*.
- Output two answer versions: a **polished** one (keeps the user's content) and a **structural exemplar** (annotated gaps, not a memorisable model answer).
- Guarantee machine-parseable JSON output.
- Keep spend controllable and observable.

**Non-goals (this step)**
- Voice recording / Whisper transcription (needs an OpenAI key) → Step 4-voice.
- Resume PDF upload + JD match → Step 5.
- Cross-session weakness profile → Step 6.
- Deployment.

## 4. Architecture

```
React (client)  ──HTTP──▶  Express (server)  ──SDK──▶  Claude API
   textarea,                requireAuth +               sonnet-4-6 (questions)
   score view               rate limit +                opus-4-8   (scoring)
                            service layer
                                 │
                                 ▼
                            Postgres (Prisma)
```

**Key rule:** the API key lives **only on the server**. The browser never sees it. React talks to *our* Express endpoints; Express talks to Claude. This is both a security requirement and the reason the whole integration is backend work.

## 5. Data model additions (Prisma)

Add two models to `server/prisma/schema.prisma`, then `npx prisma migrate dev`:

- **Answer** — belongs to a `Question`; fields: `transcript` (text), `createdAt`. (Later: `audioUrl`, `wpm` when voice lands.)
- **ScoreReport** — belongs to an `Answer`; fields: `contentScore`, `languageScore`, `deliveryScore` (ints), JSON detail columns for each axis, `polishedVersion` (text), `structuralExemplar` (text).

Cascade-delete from parents (same pattern as `Question` in Step 2).

---

## 6. Step-by-step implementation — with the *why* for each

### Step 4a — SDK setup + client singleton
**What:** `npm install @anthropic-ai/sdk express-rate-limit`. Add `ANTHROPIC_API_KEY` to `server/.env` + `.env.example`; validate it in `env.ts`. Create `lib/anthropic.ts` (a singleton `new Anthropic()`) and `lib/aiConfig.ts` (model names + a price table).
**Why:** A singleton avoids re-creating the client on every request (same reasoning as `lib/prisma.ts`). Centralising model IDs and prices in one config file means you can swap models or update cost logging in one place — you'll thank yourself later.

### Step 4b — Structured JSON output (reliability core)
**What:** Use `client.messages.parse()` with `zodOutputFormat(schema)` from `@anthropic-ai/sdk/helpers/zod`. Define Zod schemas for the question set and the three-axis score report.
**Why:** The requirement is "output MUST be parseable JSON, no markdown fences." You *could* beg the model in the prompt ("no ``` fences, no preamble") but that's fragile — one stray fence and `JSON.parse` throws. **Structured outputs enforce the schema at the API layer**, so the response is guaranteed to match your Zod type. It's the difference between hoping and knowing. Guard for `stop_reason === 'refusal'` / `'max_tokens'` (then `parsed_output` can be null).

### Step 4c — Two service functions (separation of concerns)
**What:** `services/questionService.generateQuestions(jd)` (Sonnet, `effort: 'low'`) and `services/scoringService.scoreAnswer(question, answer)` (Opus, `thinking: {type:'adaptive'}` + `effort:'medium'`).
**Why:** Routes should stay thin — validate input, call a service, return a response — exactly like your Step 2/3 routes call Prisma. Putting Claude logic in a service layer keeps it testable, reusable, and easy to mock (next step). `effort: 'low'` on question generation saves tokens because it's a simpler task; adaptive thinking on scoring buys the reasoning quality the language feedback needs.

### Step 4d — Mock mode (dev-cost protection)
**What:** An env flag `MOCK_AI` (default `true`). At the top of each service function, if `MOCK_AI` is on, return a hardcoded object matching the Zod type instead of calling the API.
**Why:** While you build the UI, wire up routes, and fix bugs, you'll run the flow dozens of times. Every real call costs money. Mock mode lets you develop the *entire* feature for **$0**, then flip one flag when you're ready for a genuine run. This single decision is what makes a $12 budget survive months of iteration.

### Step 4e — Prompt caching (biggest recurring saving)
**What:** Put the stable system prompt + rubric in a `system` array with `cache_control: {type:'ephemeral'}` on the last block; keep the per-answer content in `messages`.
**Why:** Every scoring call reuses the same long rubric. Without caching you pay full input price for that rubric every single time. With caching, repeat calls pay ~10% on the cached prefix. Since the rubric is the bulk of each scoring request, this can cut your scoring cost dramatically. **Verify it works** by logging `usage.cache_read_input_tokens` — if it's 0 on the second identical call, something (like a timestamp in the system prompt) is silently breaking the cache. Minimum cacheable prefix: 4096 tokens for Opus, 2048 for Sonnet.

### Step 4f — Token & cost logging (observability)
**What:** After each real call, read `response.usage` and log tokens + estimated $ (from the `aiConfig` price table) via your existing `logger`.
**Why:** You can't manage what you can't see. With a tight budget you need to know which calls are expensive and how fast credit is draining — before you get a surprise. This turns "I hope I'm not overspending" into a number you can watch.

### Step 4g — Per-user rate limiting (the safety net)
**What:** `express-rate-limit` keyed by `req.userId`, applied **only** to the AI routes; cap sessions/day.
**Why:** A bug (an infinite retry loop, a runaway `useEffect` firing requests) could drain your entire credit in one afternoon. A rate limit is a hard backstop that makes that impossible. It also mirrors what you'd need in production anyway.

### Step 4h — Routes + shared types + client UI
**What:** Routes `POST /api/sessions/:id/generate-questions` and `POST /api/answers/:id/score` (behind `requireAuth` + the limiter, scoped by `req.userId`). Add `QuestionSetDto`, `AnswerDto`, `ScoreReportDto` to `shared/types.ts`. Client: a textarea to submit an answer + a page showing the three axes, the original→rewrite language table, the polished version, and the structural exemplar.
**Why:** Reusing `requireAuth` and `userId` scoping keeps the Step 3 security invariant (users can't see each other's data). Putting DTOs in `shared/types.ts` means the client and server can't drift out of sync — the compiler catches mismatches. The three-panel report UI is where the product's differentiation becomes visible to the user.

---

## 7. Verification plan (ordered to protect credit)

1. **`MOCK_AI=true`** — build the full flow; confirm the UI shows questions + a score report from mock data. **Zero spend.**
2. `npx tsc --noEmit` passes on both client and server; DTO types flow end-to-end.
3. **`MOCK_AI=false`** — run **one** real session. Confirm: JSON parses cleanly; the language axis names an error pattern with original→rewrite; the usage log prints tokens + est. cost.
4. Run a **second** scoring call — confirm `cache_read_input_tokens > 0` (caching works).
5. Exceed the rate limit → expect HTTP `429`. Confirm two users stay isolated.

## 8. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Burning credit while developing | Mock mode (4d) — build for free |
| Runaway loop drains credit | Per-user rate limit (4g) |
| Model returns unparseable text | Structured outputs (4b) |
| Silent cache misses inflate cost | Log `cache_read_input_tokens` (4e) |
| Delivery axis weak without audio | Score conservatively now; full delivery metrics arrive with Whisper (Step 4-voice) |

## 9. Future work

Step 4-voice (Whisper transcription, needs OpenAI key) · Step 5 (resume PDF + JD match analysis) · Step 6 (cross-session weakness profile) · deployment to Vercel + Fly.io.

---

*This is an implementation guide the developer follows themselves, to strengthen full-stack fundamentals across frontend, backend, database, security, and cost optimisation.*
