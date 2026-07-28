# Day 01 — Learning Diary

**Date:** 2026-07-28
**Topic:** Step 4 — Integrating the Claude API (data modeling → structured output → persistence). **I hand-wrote everything; my mentor reviewed.**
**Takeaway:** The biggest lesson today was *problem-first* learning — see the bug with your own eyes first, then learn the fix. It sticks far better.

---

## What I did today (overview)
1. Hand-wrote the Prisma models `Answer` / `ScoreReport` and ran the migration
2. Integrated the Anthropic SDK (singleton client + config file)
3. Locked down Claude's JSON output with Zod + structured outputs
4. Hit a real bug on purpose: `JSON.parse` crashed → fixed it with `messages.parse()`
5. Added a mock mode (zero-cost development)
6. Used a transaction to save `Answer` + `ScoreReport` together

---

## 1. Data Modeling
- **One-to-many vs one-to-one**: one-to-one is enforced by putting `@unique` on the foreign key
- **Primary key `@id` / foreign key / index `@@index`** — the difference: a primary key uniquely identifies a row (auto-indexed); a foreign key points to another table's id; an index is a "table of contents" that speeds up lookups
- `@unique` **auto-creates an index**, so a one-to-one foreign key doesn't need a separate `@@index`
- Cascade delete: `onDelete: Cascade` (delete the parent → children go too)
- Prisma fields use **camelCase** (not SQL's snake_case)
- 🐛 **Bug**: I wrote `createdAt DateTime(now())` and it errored → the correct form is `createdAt DateTime @default(now())` (the `@default(...)` modifier goes *after* the type)

## 2. Migration
- `npx prisma migrate dev --name xxx` = compare schema vs database → generate SQL → apply it → regenerate the Prisma Client
- Mental model: **version control for your database, like `git commit`**; migration files are committed to git

## 3. Security
- Frontend "bundling" = minification/obfuscation, **not encryption**; anyone can read the source
- Vite inlines frontend env vars as **plaintext** into the bundle → secrets must **never** live in the frontend
- HTTPS encrypts data *in transit*, not the code sitting in the browser
- ✅ Correct approach: the key stays on the server; the browser calls the server; the server calls Claude
- 💬 Interview line: *"Minification is not encryption; you can't keep a secret in client code."*

## 4. SDK Setup (Step 4a)
- **Singleton**: create `new Anthropic()` once in `lib/anthropic.ts` → saves resources
- `aiConfig.ts` centralizes model names + prices (change them in one place)
- **Don't invent date suffixes on model IDs**: use `claude-sonnet-4-6` / `claude-opus-4-8`
- `npm` (manages packages / runs scripts) vs `npx` (runs an executable)
- `npx tsc --noEmit` = type-check only, emit no files
- 🐛 **Bug**: `npm tsx` → "Unknown command"; should be `npx tsx`
- 🐛 **Bug**: added `-20260620` to a model ID → would 404

## 5. Zod + Structured Outputs (Step 4b)
- TypeScript types **disappear at runtime**; Zod validates real data **at runtime**
- Building blocks: `z.object` / `z.string` / `z.number().int` / `z.array` / `z.enum`
- `z.infer<typeof schema>` = a **free TS type** (write the schema once, get runtime validation *and* a compile-time type)
  - Used in: the service's return type, mock data, downstream autocomplete, mapping to DB columns
- A structured-output schema's **root must be an object** → that's why the questions are wrapped: `{ questions: [...] }`
- The **Zod schema (Claude's output) and the Prisma model (DB storage) are two different things** and don't have to match (e.g. `resumeBased` only lives in the schema)

## 6. Pain → Cure (problem-first, today's highlight)
- **Naive version**: `messages.create` + `JSON.parse` → 💥 Claude wrapped the JSON in ` ```json ` → `SyntaxError`
- The shape wasn't guaranteed either: scores came back on a 0–100 scale, it invented `overallScore`, feedback was one big blob
- **The cure**: `messages.parse()` + `output_config: { format: zodOutputFormat(schema) }`
  → guarantees clean JSON, all fields present, correct types (read `response.parsed_output`)
- ✅ The product's core works: `languageErrorList` holds **original → rewrite → pattern** (naming the ESL error, e.g. "missing article — Chinese-L1 transfer")

## 7. Mock Mode (Step 4d)
- `MOCK_AI=true` → the function returns fake data directly, so development costs **$0**
- Env vars are **strings** → convert with `process.env.MOCK_AI === 'true'`
- The mock object is typed with `ScoreReport` (where `z.infer` shines)

## 8. Import vs Instantiate
- `import`ing a function (like `zodOutputFormat`) ≠ `new`-ing a client → **no extra instance is created**
- The singleton pattern only matters for **stateful, resource-holding** objects (clients / connection pools created with `new`)
- Node **caches modules**, so a package loads only once

## 9. Persistence + Transactions
- **Separation of concerns**: `scoringService` (talks to Claude) vs `answerService` (talks to the DB)
- **A transaction = atomicity**: a group of operations either **all succeed or all roll back** (the bank-transfer analogy)
- `prisma.$transaction(async (tx) => {...})`: inside, use `tx.xxx` instead of `prisma.xxx` (`tx` is a temporary Prisma client with all the models)
- The return value = whatever the callback `return`s
- **If any step fails → Prisma rolls back automatically**, leaving no orphaned data; you just `try/catch` upstream and return a 500
- `upsert` = use-if-exists, create-if-not (handy for seeding test data)
- 💬 Interview line: *"If any statement in the transaction fails, the whole thing rolls back."*

---

## Interview vocabulary from today
`primary key` · `foreign key` · `index` · `one-to-one` / `one-to-many` · `cascade delete` · `migration` · `singleton` · `stateless helper function` · `runtime validation` · `structured output` · `inferred type` · `mock mode` · `transaction` · `roll back` / `rollback` · `atomicity` · `persist to the database` · `separation of concerns` · `minification ≠ encryption`

## Next
- The `generateQuestions` service (using Sonnet)
- Prompt caching + token / cost logging
- Rate limiting + routes + frontend UI
- (Later) Whisper speech-to-text
