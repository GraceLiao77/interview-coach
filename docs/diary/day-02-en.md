# Day 02 — Learning Diary

**Date:** 2026-07-29
**Topic:** From internal functions to a public API — the question-generation service + my first business HTTP endpoint (**in progress, not finished**)
**Status:** Step 4 ongoing. The question service + generate-questions endpoint (B1) work (mock mode); persistence (B2) is a few steps from done.

---

## What I did today
1. Built the `generateQuestions` service (Sonnet + structured output + mock mode)
2. Learned **prompt engineering** (splitting system/user, grounding in the JD, avoiding generic questions)
3. Built my first business endpoint: `POST /api/sessions/:id/generate-questions`
4. **Finally understood the foundation from Steps 1–3** (the AI wrote it for me earlier; today I actually get it): Express routing, middleware, `requireAuth`, JWT
5. Started B2 persistence (unfinished): `createMany`, two transaction styles, idempotency, unique constraints, dedup

---

## Notes

### 1. Prompt Engineering
- **System (stable rules) vs user (variable input)**; the system prompt goes in the top-level `system` field, not inside `messages`
- **Grounding in the JD / avoiding generic questions** is the key lever for accuracy
- Structured outputs already guarantee JSON, so the prompt should only care about *content*
- Wrap the input in `<job_description>` tags (Claude separates "instructions" from "data" by tags)
- 🐛 Bug: I accidentally pasted explanation text + the JD template into SYSTEM_PROMPT, and nested the whole `messages` array inside one user message's content

### 2. JWT (JSON Web Token)
- **Stateless authentication**: on login the server issues a **signed token**; every later request carries it, and the server **verifies the signature**
- Structure `header.payload.signature`; **signed ≠ encrypted**; the server doesn't store it, only verifies
- 🎫 Analogy: a tamper-proof concert wristband

### 3. Express Routing & Middleware
- `app.use('/api/sessions', router)` mounts a sub-router
- **Middleware** (`requireAuth`) runs **before** the handler: verify JWT → attach `req.userId`, or 401
- `req.params.id` = the value of `:id` in the URL
- **Route matching**: static parts match exactly, `:param` is a single-segment wildcard; put **specific routes before parameterized ones**
- Request flow: `index.ts` → `requireAuth` → handler → prisma → response

### 4. Prisma Queries
- `where` = the filter condition (= SQL `WHERE`); `findFirst` = first row / null; `findUnique` (unique field) / `findMany` (array)
- **Ownership check**: `where: { id, userId }` → user data isolation

### 5. Persistence & Design Decisions (B2, in progress)
- `createMany` = **bulk insert** an array
- **Two transaction styles**: callback `$transaction(async (tx) => …)` (later ops need earlier results) vs array `$transaction([…])` (independent ops)
- **Idempotency**: you can't assume an endpoint is called exactly once → design so repeated calls are safe
- `@@unique([sessionId, text])` + `createMany({ skipDuplicates: true })` = dedup (**enforced by a DB constraint, not app logic**)
- `@` vs `@@`: field-level vs model-level attribute
- **Design insight**: storage should **preserve context**; a "question bank" should be a **query-derived view (`DISTINCT`)**; **don't make one constraint serve two different needs**

---

## Interview lines
- *"You can't assume a client calls an endpoint exactly once — design for idempotency."*
- *"Store raw facts with context; derive aggregated views with queries — don't bake a reporting need into a storage constraint."*
- *"JWT is signed, not encrypted; the server just verifies the signature."*

## Interview vocabulary
`prompt engineering` · `system prompt` vs `user message` · `JWT / stateless authentication` · `signed, not encrypted` · `middleware` · `route matching` · `path parameter` · `ownership check` · `bulk insert` · `transaction` · `idempotency` · `unique constraint` · `deduplicate` · `derive a view`

---

## 🧗 Today's Challenge & Reflection: Database Relationship Design
The hardest part today wasn't writing code — it was a **design decision**: should interview questions be unique **per session** or **globally unique** across companies?

- **The snag:** I wanted a deduplicated "personal question bank," but what I *store* is "session questions with company context." Trying to make **one constraint** serve both needs is what tripped me up.
- **The resolution:** these are actually **two concepts** — separate them:
  - **Storage** → keep it per-session (`@@unique([sessionId, text])`), preserving "which company asked it."
  - **The bank** → derive it with a `DISTINCT` query; don't flatten the context in storage.
- **Principle:** *Store raw facts with context; compute aggregated views with queries. Don't make one constraint serve two needs.*

### One step further: an answer can be reused across many questions
Extended insight: **identical/similar questions usually share the same answer** → one prepared answer could be **reused across many questions** (and companies). This points to a future model:
- Make "answer" its own entity with a **many-to-many** link to "question" → one canonical answer attached to many questions.
- Benefit: maintain an answer once; every identically-phrased question shares it → far more efficient interview prep.
- **Not building it now** (avoid over-engineering), but noting it for when I build the question bank.

---

## Plan for Day 03
1. **Finish B2 persistence:**
   - Add `@@unique([sessionId, text])` to `Question` → `npx prisma migrate dev`
   - ⚠️ If old test data has duplicates, the migration fails → clear the `Question` test rows in Supabase first
   - Add `skipDuplicates: true` to `createMany`
   - Re-test the endpoint: questions persist, duplicates are skipped, repeated calls don't create dirty data
2. **Wire up the scoring endpoint:** `POST` an answer → `scoreAnswer` + `saveAnswerWithScore` (transaction) → save `Answer` + `ScoreReport`
3. (Optional) prompt caching + token/cost logging; rate limiting
4. Configure the **redpen plugin** (didn't finish today)

> Note to my future AI mentor: B1 (generate-questions endpoint) is done and tested (mock). B2 (persistence) code isn't written yet — start from step 1 above.
