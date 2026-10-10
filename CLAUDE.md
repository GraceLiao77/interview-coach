# interview-coach

Mock interview platform for **non-native English-speaking engineers** job-hunting overseas (initial market: New Zealand). Core differentiators: ESL-tailored language feedback + cross-session weakness tracking. NOT a generic AI mock interview tool. First user = the developer (Chinese-native, seeking Frontend/Full-Stack roles in Auckland).

## Tech stack (FIXED — do not change)

- **Client**: React + Vite + TypeScript (`client/`), deploys to **AWS** (S3 + CloudFront)
- **Server**: Express 5 + TypeScript, NOT Next.js (`server/`), runs with `tsx`, deploys to **AWS** (App Runner)
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
- Client dev: `cd client && npm run dev` (port 5173)
- Typecheck: `npx tsc --noEmit` (server) / `npx tsc -b` (client)
- Migrations: `cd server && npx prisma migrate dev`
- Eval harness: `cd server && MOCK_AI=true npm run eval` (free, canned output) / `MOCK_AI=false npm run eval -- --model <id> [--only <case-id>] [--runs N]` (real model calls, costs money). Set `MOCK_AI` explicitly: `server/.env` defaults it to `true`, and the command line overrides `.env`. Run a one-case `--only` canary before a full paid run; commit a prompt change together with the baseline it produced

## Progress (dev order — one new concept per step)

- [x] 1. Minimal loop: Express `/api/health` + client fetch + CORS
- [x] 2. Prisma + Supabase; Session/Question CRUD
- [x] 3. JWT register/login + `requireAuth`; client AuthContext + Login/Register/Sessions pages
- [x] 4. Claude + Whisper: generate questions → voice answer → transcribe → three-axis scoring (Content / Language / Delivery — never one collapsed total; language feedback must name the error pattern, e.g. Chinese-L1 transfer, with original → native rewrite). Voice is **Chrome-only** (deliberate MVP trade-off, no mimeType negotiation)
- [ ] 5. Eval harness — labelled test set, scoring rubric, regression run before any prompt change (v1 covers the scoring prompt only)
- [ ] 6. Cost guardrails, before anything goes public (ADR 0002): AI routes only for Allowed Accounts (an email allowlist in server config), a no-sign-in Demo Interview for everyone else, `express-rate-limit` on auth and AI routes, and an Anthropic Console monthly spend limit. BYOK and charging are deferred until other people want to use the app
- [ ] 7. Deploy: Terraform for S3 + CloudFront + App Runner; GitHub Actions CI runs both typechecks and the mock eval on every push
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
