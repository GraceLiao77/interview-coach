# Day 03 — Learning Diary

**Date:** 2026-07-30 – 08-04 (across a few sessions)
**Topic:** Finish question persistence + the scoring endpoint + **wire the full frontend flow (generate → answer → score)**
**Status:** 🎉 The core of Step 4 works end-to-end! Generate questions + answer + three-axis scoring, front-to-back (mock mode).

---

## What I did
1. **Finished B2**: persist generated questions (`@@unique` + `createMany skipDuplicates`, idempotent), verified end-to-end
2. **Scoring endpoint** `POST /api/questions/:id/answers` (ownership through a relation + zod + transaction)
3. **Full frontend flow**: Interview page + `QuestionCard`/`ScoreCard` + route `/interview/:sessionId` + a "Practice" button on Sessions
4. Wrote an **API reference doc** `docs/api-reference.md`

---

## Notes · Backend
1. **Express middleware & `.use()`**: middleware runs **before** the handler; `requireAuth` is mounted with `.use()` on the router → verify JWT → `req.userId` or 401. `app.use(cors)` and `app.use(express.json())` are middleware too.
2. **JWT**: stateless auth, a signed token; **signed ≠ encrypted**; the server only verifies, never stores it.
3. **Route matching & order**: static parts match exactly, `:param` is a single-segment wildcard; **put specific routes before `:param` routes**.
4. **Prisma queries**: `where` = the filter; `findFirst` (multiple conditions) vs `findUnique` (unique field) vs `findMany` (array).
5. **Ownership through a relation**: a `Question` has no `userId` of its own — ownership lives in `session → user`, so `where: { id, session: { userId } }` = **one query with a JOIN**.
6. **`createMany` + `skipDuplicates` + `@@unique`**: bulk insert, dedup enforced by a **DB unique constraint**; **idempotent** (repeated calls create no dirty data).
7. **`@` vs `@@`**: field-level vs model-level attribute.
8. **Two transaction styles**: callback (later ops need earlier results) vs array (independent ops).

## Notes · Frontend
9. **The `api()` wrapper**: a wrapper around `fetch` — auto-prefixes the base URL, attaches the JWT, parses JSON, throws on error; the generic `api<T>` gives typed results.
10. **Promises**: an `async` function **implicitly returns a Promise** (no `new Promise`); resolve/reject; `await` to get the value. **Not awaiting = using the receipt as if it were the coffee.**
11. **Serialization**: HTTP **transmits text, not JS objects** → the frontend `JSON.stringify`s, and `express.json()` deserializes it back into `req.body`.
12. **`useEffect` can't be `async`**: its return must be `undefined` or a **cleanup function**; an `async` callback returns a Promise → put the async work in an inner function.
13. **`import type`**: types are **erased at runtime**; importing a type as a value → runtime "no such export" error; `verbatimModuleSyntax` forces `import type` for types.
14. **`useParams`**: reads the `:sessionId` route param; the destructured name must match the route.
15. **Component design trade-off**: `QuestionCard` **self-contained** (simple) vs **`onSubmit` injected** (decoupled/testable).
16. **Pass the generic through**: calling `post`/`get` **without a generic** → returns `unknown` → can't read fields.
17. **Port config**: `.env`'s `PORT` is the **real source of truth** (it beats the code default and the docs); changing `.env` needs a **restart**.
18. **401 vs 404**: 401 = not logged in (no token); 404 = logged in but that id isn't yours.

## Bugs I hit 🐛
- `res.json(res)` (passed the response object itself; should be `res.json(result)`)
- Stored a **Promise in state** (forgot to `await`)
- Reinvented empty `get`/`post` → should reuse `api()`
- **Auto-generated questions in `useEffect`** → burns budget; moved to a button click
- `import { SessionDto }` → runtime error; should be `import type`
- Changed the port in the docs but **not in `.env`** → frontend 3009, backend 3000, mismatch
- Called `post` without a generic → `res` was `unknown`

## Interview lines
- *"You can't assume an endpoint is called once — design for idempotency."*
- *"A question has no `userId` of its own — ownership lives one level up, through its session; filter through the relation."*
- *"HTTP transmits text, not objects — serialize going out, deserialize coming in."*
- *"An `async` function implicitly returns a Promise; you don't write `new Promise`."*
- *"Types are erased at runtime — import them with `import type`."*

## Interview vocabulary
`middleware` · `.use()` · `JWT / stateless auth` · `route matching` · `path parameter` · `ownership check` · `nested relation filter` · `createMany` · `skipDuplicates` · `idempotency` · `transaction` · `serialize / deserialize` · `Promise resolve/reject` · `await` · `useEffect cleanup function` · `import type` · `useParams` · `self-contained component` · `generic` · `port precedence`

## Plan for Day 04
1. **Align the port** (`.env` `PORT=3009` + restart) and actually run "generate → answer → score" in the browser
2. (Optional) cost logging · rate limiting · prompt caching
3. Resume upload + JD match (Step 5)
4. Voice answers + Whisper (Step 4-voice)

> Note to my future AI mentor: the generate/score endpoints + the frontend UI are all done and type-checking passes; what's left is an end-to-end manual test after aligning the port. Jin writes the frontend logic and I review; I write the markup/CSS.
