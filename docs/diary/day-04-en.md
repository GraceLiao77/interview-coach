# Day 04 — Learning Diary

**Date:** 2026-09-15 – 09-18 (came back after more than a month away)
**Topic:** Voice answers (Step 4-voice) — record in the browser → upload → transcribe with Groq Whisper → reuse the existing scoring
**Status:** ✅ Working end-to-end. Record → upload → real Groq transcription → transcript fills the textarea → score card renders.

---

## What I did

1. **Diagnosed "the project won't start"** — the server was fine; my free Supabase project had been auto-paused after sitting idle
2. **`useAudioRecorder` hook** — MediaRecorder + timer + produces a Blob, touches no UI
3. **`transcriptionService`** — Groq `whisper-large-v3-turbo`, with its own mock flag
4. **Audio upload endpoint** `POST /api/questions/:id/answers/audio` — multer parses the multipart body → transcribe → reuse `scoreAnswer` + `saveAnswerWithScore`
5. **Added a multer branch to the global error middleware** — oversized files return 413 instead of a bare 500
6. **Wired the frontend** — `post()` now handles FormData, added `submitAudioAnswer()`, dropped the Recorder into `QuestionCard`
7. Set an **MVP rule**: Chrome only, no cross-browser compatibility code

---

## Design decisions

### Why Groq only transcribes and Claude still scores
Transcription needs accuracy of hearing; scoring needs an understanding of ESL language transfer and the ability to write insightful feedback. The prompt and structured output for the latter already work — switching models means starting over. **Two providers, each doing what it's best at, rather than collapsing to one for its own sake.**

### Mock flags split per provider
At first I got "real transcription + mocked scoring" by commenting out a line — fragile, and you forget to put it back and quietly burn quota. Now there are two independent env vars:

```
MOCK_AI=true             # Claude (question generation + scoring)
MOCK_TRANSCRIPTION=false # Groq Whisper
```

I can verify the voice path against the live API while scoring stays free, with no code changes.

### Store after scoring, rather than storing the transcript first
The existing `saveAnswerWithScore` writes answer + score in one transaction. The alternative — store the answer, score later — would survive a Claude failure without losing the user's transcript. The `scoreReport ScoreReport?` in the schema already leaves that door open, but not this round: single-user project, re-recording is an acceptable cost. I'll change it when a failure actually hurts.

### Middleware scoped to the route, not the router
`upload.single('audio')` is attached only to the audio route. Using `router.use()` would make the already-working JSON answer route try to parse multipart and break it. **Scope should always be the smallest that works.**

### Routers organised by URL prefix, not by feature
The audio endpoint lives under `/api/questions` → it belongs in `questionsRouter`. If I ever split, **both** answer routes should move to `/api/answers` together — they're 80% identical (ownership check → score → save), and moving only one creates the worst outcome: two nearly identical sibling endpoints in different files, where you change one and forget the other.

### `transcribe(buffer)` never receives `req`
The service only knows about a buffer; it has no idea an HTTP request was involved, and it shouldn't. That's exactly why it stays reusable (a script could batch-transcribe local files). Same reasoning puts the empty-transcript check and the user-facing message in the route — **a service shouldn't know what an HTTP status code looks like.**

---

## Notes · Backend

1. **The `multipart/form-data` boundary is a random string the browser generates on the spot**, and the server uses it to split the parts. So **never set `Content-Type` by hand when sending FormData** — do that and there's no boundary, and parsing fails outright.

2. **Multer is a body parser, the same species as `express.json()`.** One handles `application/json`, the other `multipart/form-data`. `express.json()` sees multipart and passes it straight through, so without multer nobody parses it.

3. **`multer({...})` only builds the machine; `upload.single('audio')` is what produces the middleware function.** Defining a const doesn't register anything.

4. **You can't catch multer's errors in the handler** — they happen **before** it runs; the chain short-circuits via `next(err)` and the handler never executes. They have to be handled in the error middleware via `err instanceof multer.MulterError`. `LIMIT_FILE_SIZE` → **413 Payload Too Large**.

5. **Error middleware is identified by its arity** (`err, req, res, next` — four params); with three it degrades to ordinary middleware. It must also be registered **after all routes** — Express runs stages in order, so registering it earlier means the request has already flowed past by the time something throws.

6. **Express 5 forwards a rejected async handler to the error middleware automatically** (Express 4 needed your own try/catch or `express-async-handler`).

7. **Keep the `try` narrow.** Wrap only the `transcribe` call — wrap the whole handler and a DB timeout, a Groq outage and malformed JSON from Claude all land in the same catch, leaving one vague "something went wrong". **The smaller the catch, the more precise the message.**

8. **500 vs 502**: 500 = I'm broken; 502 = the upstream I depend on is broken. A Groq outage is a 502.

9. **Short-circuit an empty transcript before scoring** — `if (!transcript.trim()) { res.status(400); return }`. That `return` is what saves money: an empty answer still costs a full LLM request.

10. **`safe` vs `idempotent`:**
    - **safe** = no side effects at all (only GET/HEAD). Browsers prefetch and crawlers crawl **on the strength of that promise** — making a write operation a GET authorises the whole world to fire it at will
    - **idempotent** = has side effects, but repeating it changes nothing (PUT/DELETE)
    - POST is neither → the submit button must be `disabled={submitting}`

11. **Why login is a POST** — logically it "reads", but as a GET the password lands in plaintext in server logs, proxy logs, browser history and `Referer` headers. **URLs get logged everywhere.**

12. **API keys live on the server, always.** Frontend code ships to the browser in full — F12 and it's theirs. The test: **any dependency that takes an API key goes in `server/`**.

13. **Explicit `new Groq({ apiKey: env.groqApiKey })` beats implicit `new Groq()`.** The implicit version depends on a hidden ordering ("`env.ts` must run first"); the explicit one turns that into a real import, so the module system enforces it — and the next reader can see where the key comes from.

14. **A `declare module 'express-serve-static-core'` augmentation has a side effect**: Express can no longer infer parameter types from the route path — but only on routes that carry an extra middleware (three arguments). It shows up as `req.params.id` degrading to `string | string[] | undefined`. Fix: declare it explicitly with `post<{ id: string }>(...)`.

---

## Notes · Frontend

15. **Stale closures** — every render produces a **brand-new set** of state values, and a callback captures the ones from the render that registered it. A local variable like `recorder` is fine: the closure captured that exact object and it never changes. State isn't — it has to go through a ref, because the ref *object* stays the same, so reads always see the latest contents. The `useCallback` dependency array is the same problem.

16. **An unmount cleanup with `[]` deps can't read the latest state** — so revoking an object URL requires keeping a separate ref.

17. **setState updaters must be pure.** `setUrl(prev => { revoke(prev); return newUrl })` is wrong — **StrictMode deliberately invokes them twice** to surface side effects, so you create two URLs and leak one. Side effects belong outside `setState`.

18. **Every `URL.createObjectURL` needs a matching `revokeObjectURL`**, or every recording leaks.

19. **Null out `onstop` before stopping on unmount** — otherwise the component is gone and the callback is still calling setState on nothing.

20. **Props are a component's public interface — only what genuinely has to cross the boundary.** Once the state moved into the hook, passing `recording`/`seconds`/`audioUrl` back in as props creates **two sources of truth**. What's left is `onComplete` (blob going out) and `disabled` (the parent saying "I'm busy"). **Adding a prop is easy; removing one is hard.**

21. **Putting a function that changes every render into a dependency array = firing every render.** `useEffect(() => { if (blob) onComplete(blob) }, [blob, onComplete])` would upload once per render. **A submit button sidesteps the concept entirely** — any time you're fighting the dependency array, that's a hint the design can be simpler.

22. **Custom hooks reuse logic; components reuse appearance.** Once `useAudioRecorder` was extracted, anything can record; `<Recorder>` exists only to reuse the waveform/timer markup and CSS.

23. **`JSON.stringify` on a FormData returns `"{}"`** — it doesn't throw, it silently drops the payload. So `post()` has to check `body instanceof FormData` and pass it through. **A special case belongs inside the helper, not in every call site.**

24. **Put a component where its data lives.** Mounted at page level, the Recorder had no idea which question it was recording for and could only pass `sessionId` — guaranteeing a 404. Inside `QuestionCard`, `question.id` is right there. The fix wasn't to thread more props down; it was to move the component.

---

## Problems I hit & how I solved them 🐛

| Problem | Symptom | Cause & fix |
|---|---|---|
| **Supabase project unreachable** | `FATAL: (ENOTFOUND) tenant/user postgres.<ref> not found` | `nslookup <ref>.supabase.co` returned **NXDOMAIN**; a direct 5432 connection failed identically, ruling out pgbouncer → **free-tier auto-pause after ~7 days idle**, not a code problem. Restore from the dashboard |
| **Misjudged the scope of the failure** | Thought "the server won't start" | The stack pointed at `auth.ts:53` — inside handling a request — so **the server was alive**; if it couldn't start you'd never reach that line. **Describing symptoms precisely is part of debugging** |
| **`useState(null)` type error** | `Type 'string' is not assignable to type 'null'` | TS infers from the initial value, and `null`'s type is `null`. **If the initial value is `null`, write the generic**: `useState<string \| null>(null)` |
| **Object URL leak** | No visible error | Doing revoke + create inside a `setAudioUrl` updater → StrictMode double-invokes → two URLs created, one leaked. Moved it out into a `urlRef` |
| **Every request 400'd** | `audio file is required` | The multer middleware was **defined but never wired into the route** → `req.file` always undefined. `multer({...})` only builds the machine; `upload.single()` is the middleware |
| **Wrong argument** | — | `transcribe(upload)` passed the multer instance as audio; it should be `req.file.buffer`. Later, copying code from the route into the service dragged `req.file.buffer` along — into a file where `req` doesn't exist |
| **Singular vs plural in the URL** | 404 | Wrote `/:id/answer/audio` when the frontend and existing route use `answers`. **One letter, and it looks completely fine** |
| **Mock mode was dead** | Burning real Groq quota | `process.env.mockAi` — the variable is `MOCK_AI`, so it was **always undefined**. Should be `env.mockAi`. **Don't bypass `env.ts` and read `process.env` directly** |
| **Copied a placeholder from the docs** | Degraded transcription | `prompt: "Specify context or spelling"` is example text from Groq's docs and gets fed to Whisper as real context. **Copying from docs drags the comments and params along, and they're usually wrong for you** |
| **`new File([buffer])` type mismatch** | `Buffer<ArrayBufferLike>` not assignable to `BlobPart` | A Node Buffer is backed by `ArrayBufferLike`, which TS treats as possibly `SharedArrayBuffer`. Solved with the SDK's `toFile()` |
| **Route param type degraded** | `req.params.id` became `string \| string[] \| undefined` | `requireAuth`'s `declare module` augmentation + a route with an extra middleware kills path-param inference. Fixed with `post<{ id: string }>(...)` |
| **FormData was JSON.stringify'd** | Server received an empty object, no error | `post()` stringified unconditionally. Fixed in the helper: `body instanceof FormData ? body : JSON.stringify(body)` |
| **Recorder in the wrong place** | Guaranteed 404 | At page level it couldn't reach a questionId and passed `sessionId`. Moved into `QuestionCard` |
| **The JD looked generated** | It only appeared after clicking Generate | The JD is actually typed by the user on the Sessions page. `sessionData` was only set inside `handleGenerate`, so nothing rendered on load. Added `GET /api/sessions/:id` in `useEffect` (a pure read, costs nothing) |

---

## Interview lines

- *"The server was healthy — only the database layer was down. Precise symptoms are half the debugging."*
- *"Multer is just another body parser: `express.json()` handles JSON, multer handles multipart. Neither knows anything about the client — by the time they run, the payload is only bytes."*
- *"GET is defined as safe, so the whole ecosystem is allowed to fire it whenever it likes. The moment an operation writes or costs money, that promise is broken."*
- *"I keep the `try` as narrow as possible. Wrapping the whole handler would collapse three different failure modes into one message."*
- *"I short-circuit on an empty transcript before the scoring call — an empty answer still costs a full LLM request."*
- *"Multer errors can't be caught in the handler at all; they short-circuit the chain before it runs."*
- *"Any dependency that takes an API key is server-side by definition."*
- *"`start` doesn't record anything — it acquires the stream, registers the callbacks, and returns. Everything interesting happens in handlers registered thirty seconds earlier, which is exactly why they read from refs instead of state."*
- *"Updater functions must be pure — StrictMode double-invokes them precisely to surface that."*
- *"Props are the component's public interface. Once the state moved into the hook, passing `recording` back in would have created two sources of truth."*
- *"`JSON.stringify` on a FormData silently returns `{}` — it doesn't throw, it just drops your payload, so it's exactly the kind of thing a wrapper should make impossible."*
- *"I split the mock flags per provider — one for Claude, one for Whisper — so I can verify the voice path live while scoring stays free. Commenting out a line to achieve the same thing is a trap."*
- *"A function's parameters define the world it can see. `transcribe` only knows about a buffer — it has no idea an HTTP request was involved, and that's why it's reusable."*
- *"Chrome-only is a deliberate trade-off, not an oversight."*

---

## Interview vocabulary

`middleware chain / pipeline` · `body parser` · `multipart/form-data` · `boundary` · `wire up` · `scoped to a route` · `short-circuit` · `bubble up` · `swallow an error` · `safe vs idempotent` · `payload too large` · `fail fast` · `fail silently` · `cohesion / coupling` · `sibling endpoints` · `premature abstraction` · `register a callback` · `closure` · `stale closure` · `pure function` · `side effect` · `memory leak` · `dependency array` · `controlled vs uncontrolled component` · `two sources of truth` · `custom hook` · `extract into a hook` · `smoke test` · `happy path / failure path` · `end-to-end` · `deliberate trade-off` · `it's back up / it's down`

---

## Next (Day 05)

1. Turn `MOCK_AI` off and verify real Claude scoring (watch the cost)
2. `express-rate-limit` is installed but unused — the voice endpoint is the most expensive door in the app
3. Cost logging: record token counts and an estimated price per call
4. Resume upload + JD match (Step 5)
