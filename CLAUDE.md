# interview-coach

Mock interview platform for **non-native English-speaking engineers** job-hunting overseas (initial market: New Zealand). Core differentiators: ESL-tailored language feedback + cross-session weakness tracking. NOT a generic AI mock interview tool. First user = the developer (Chinese-native, seeking Frontend/Full-Stack roles in Auckland).

## Tech stack (FIXED — do not change)

- **Client**: React + Vite + TypeScript (`client/`), deploys to **AWS** (S3 + CloudFront)
- **Server**: Express 5 + TypeScript, NOT Next.js (`server/`), runs with `tsx`, deploys as a Docker container to **Google Cloud Run** (Tokyo `asia-northeast1`, next to the Supabase DB in `ap-northeast-1`; max 1 instance; ADR 0004 — App Runner closed to new customers)
- **DB**: PostgreSQL on Supabase + Prisma 6 (`server/prisma/schema.prisma`); pooled `DATABASE_URL` (6543, pgbouncer) + `DIRECT_URL` (5432) for migrations
- **Auth**: JWT (`jsonwebtoken`, 7d expiry) + bcryptjs; `requireAuth` middleware sets `req.userId`
- **AI**: Claude API (analysis/questions/evaluation — output MUST be strict JSON, no markdown fences); **Groq-hosted** Whisper `whisper-large-v3-turbo` (authoritative transcription). Two independent mock flags: `MOCK_AI` (Claude) and `MOCK_TRANSCRIPTION` (Groq)
- One repo, `client/` + `server/` installed independently (each has its own `package.json` and `node_modules`), `shared/` is plain source imported via path aliases. **No workspace tooling** — don't add pnpm/npm workspaces, Nx or Turborepo
- TypeScript **strict mode** everywhere; TS 7 (`baseUrl` removed — `paths` are tsconfig-relative)

## Conventions

- All API request/response types live in `shared/types.ts`, imported as `@shared/types` (tsconfig `paths` on server; Vite `resolve.alias` + `fs.allow` on client)
- Server env: `server/.env` (gitignored) — `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `PORT`. Loaded via `process.loadEnvFile()` in `src/env.ts` (must stay the first import in `index.ts`)
- Zod validation on every route input; error responses are `{ error: string }` (`ApiError`)
- Session queries always scoped by `userId` (ownership check + lookup in one query)
- Login/register share one generic 401 message — never reveal whether an email exists
- **Never use `console.log` in production code** — use the logger in `server/src/utils/logger.ts`
- Client tsconfig has `erasableSyntaxOnly` — no TS parameter properties or enums

## Commands

- Server dev: `cd server && npm run dev` (port 3009)
- Client dev: `cd client && npm run dev` (port 5174; 5173 is taken by another local project)
- Typecheck: `npx tsc --noEmit` (server) / `npx tsc -b` (client)
- Migrations: `cd server && npm run prisma:migrate <name>` (runs `prisma migrate dev --name <name>`; check the name before running, because an applied migration can't be renamed)
- Eval harness: `cd server && MOCK_AI=true npm run eval` (free, canned output) / `MOCK_AI=false npm run eval -- --model <id> [--only <case-id>] [--runs N]` (real model calls, costs money). Set `MOCK_AI` explicitly: `server/.env` defaults it to `true`, and the command line overrides `.env`. Run a one-case `--only` canary before a full paid run; commit a prompt change together with the baseline it produced

## Progress (dev order — one new concept per step)

- [x] 1. Minimal loop: Express `/api/health` + client fetch + CORS
- [x] 2. Prisma + Supabase; Session/Question CRUD
- [x] 3. JWT register/login + `requireAuth`; client AuthContext + Login/Register/Sessions pages
- [x] 4. Claude + Whisper: generate questions → voice answer → transcribe → three-axis scoring (Content / Language / Delivery — never one collapsed total; language feedback must name the error pattern, e.g. Chinese-L1 transfer, with original → native rewrite). Voice is **Chrome-only** (deliberate MVP trade-off, no mimeType negotiation)
- [x] 5. Eval harness — labelled test set, scoring rubric, regression run before any prompt change (v1 covers the scoring prompt only). Baseline: `eval/baselines/claude-sonnet-5-5.json`. Queued prompt changes: #3 very short answers, #4 ignore spelling/capitalisation, #5 `[GAP]`/`[SENIOR]` exemplar, #6 polished version keeps the meaning
- [x] 6. Cost guardrails, before anything goes public (ADR 0002): AI routes only for Allowed Accounts, a no-sign-in Demo Interview for everyone else, `express-rate-limit` on auth and AI routes, and an Anthropic Console monthly spend limit. BYOK and charging are deferred until other people want to use the app
  - [x] `User.isAllowed` (default false), carried in the JWT; `requireAllowed` → 403 on AI routes
  - [x] Rate limits (`middleware/rateLimits.ts`)
  - [x] D1 `GET /sessions/:id` returns each question's `latestAttempt` · D2 client shows saved answers/reports, New/Practised tabs · D3 `npm run demo:export -- --session <id>` → `client/src/demo/demoInterview.json`
  - [x] D4 public read-only `/demo` (`DemoPage.tsx`, no RequireLogin, no API calls): `Interview` fetches, `InterviewView` draws; `readOnly` hides Generate, Record and Submit. Demo transcription stays off (a public endpoint would expose the Groq key)
  - [x] D5 Sign-up closed (ADR 0003): `REGISTRATION_OPEN = false` on the server (register → 403) and the client (`/register` → `/login`); the login page says "Sign-up is invite-only for now. Just looking? Try the demo."
  - [x] Generate Questions shows its error on the page instead of `console.log` (state lives in `Interview`, passed to `InterviewView` as a prop); `api()` turns a failed `fetch` into "Can't reach the server…"
  - [x] Create Interview: job description required (button disabled while empty; server Zod rejects a blank one) and no double submit (button disabled and shows "Creating…" while the request is in flight); Delete likewise (`deletingId` disables only that card's button and shows "Deleting…")
  - Deferred to step 7: the Anthropic Console monthly spend limit (owner's call: the app only runs locally for now, so only the owner can reach the AI routes)
  - Later: Vitest + TDD on the client (start with a pure `filterQuestions` function); fix the login timing attack (dummy bcrypt hash when the email doesn't exist); `@@index([questionId, createdAt])` on Answer, checked with EXPLAIN ANALYZE
- [ ] 7. Deploy (ADR 0004): Terraform for S3 + CloudFront (client) and Cloud Run (server); GitHub Actions CI runs both typechecks and the mock eval on every push
  - [x] CI (`.github/workflows/ci.yml`, on push to main): client lint + `npm run build` (tsc -b + vite build); server `prisma generate` + `tsc --noEmit` + mock eval. Fake keys only; `cp .env.example .env` because `env.ts` requires the file (fix that in 7a, since Cloud Run has no .env either)
  - [ ] 7a Docker: `env.ts` starts without a `.env` file (then drop the `cp` from CI); a server `Dockerfile`; run it locally with `docker run`
  - [ ] 7b Terraform basics + client on S3 + CloudFront; the client's API base URL comes from `VITE_API_URL` instead of `localhost:3009`
    - AWS access (owner's Mac): new free-plan account with no root user; sign-in is an AWS Builder ID via Google + passkey. CLI is the official installer (not Homebrew: its Python broke `aws login`); `aws login` gives temporary credentials for `AccountFullAccessRole`; CLI default region `ap-southeast-2`. Re-run `aws login` on `ExpiredToken`
  - [ ] 7c Server on Cloud Run: Artifact Registry image, secrets in Secret Manager, CORS allows the CloudFront domain
  - [ ] 7d CI deploys on push to main
  - [ ] Before the first public deploy: set the Anthropic Console monthly spend limit (deferred from step 6)
  - Optional later: deploy the same image to AWS ECS Fargate with Terraform, then `destroy` (learn ECS for a few dollars)
- [ ] 8. RAG question bank: a Python ingestion script (official APIs only, no scraping), chunking, embeddings in Supabase `pgvector`, and retrieval grounding question generation. Retrieval quality is measured with the eval harness (recall@k)
- [ ] 9. MCP server exposing scoring as tools, so an interview can be practised from inside Claude
- [ ] 10. Cost telemetry: per-call token accounting from `response.usage`, tiered model selection, prompt caching
- [ ] 11. Resume upload (PDF) + JD match analysis (match score, missing skills → priority question topics)
- [ ] 12. Cross-session weakness profile + targeted drills, plus an interviewer agent that asks follow-up questions using tools (weakness profile, question bank)

Every step has to answer "what does this do for the user?". Adding a feature only so it can go on a CV is out of scope.

Domain vocabulary lives in `CONTEXT.md` — use its terms (e.g. **Interview**, not "session", in prose).

## MVP constraints

- Excluded: payments, community, email notifications, admin dashboard
- Voice answering: live transcript is a toggle, OFF by default (waveform/timer only while speaking); Web Speech API for optional preview, Whisper after answer ends as authoritative text
- Two optimized answer versions: "polished" (user's own content, fixed language) + "structural exemplar" (annotated gaps, not a memorisable model answer)
- Per-user rate limiting (one full session ≈ NZ$0.5–2 in API costs)
