# interview-coach

Mock interview platform for **non-native English-speaking engineers** job-hunting overseas (initial market: New Zealand). Core differentiators: ESL-tailored language feedback + cross-session weakness tracking. NOT a generic AI mock interview tool. First user = the developer (Chinese-native, seeking Frontend/Full-Stack roles in Auckland).

## Tech stack (FIXED — do not change)

- **Client**: React + Vite + TypeScript (`client/`), deploys to Vercel
- **Server**: Express 5 + TypeScript, NOT Next.js (`server/`), runs with `tsx`, deploys to Fly.io
- **DB**: PostgreSQL on Supabase + Prisma 6 (`server/prisma/schema.prisma`); pooled `DATABASE_URL` (6543, pgbouncer) + `DIRECT_URL` (5432) for migrations
- **Auth**: JWT (`jsonwebtoken`, 7d expiry) + bcryptjs; `requireAuth` middleware sets `req.userId`
- **AI (later steps)**: Claude API (analysis/questions/evaluation — output MUST be strict JSON, no markdown fences); Whisper API (authoritative transcription)
- Monorepo `client/` + `server/` + `shared/`, **no pnpm workspaces**
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

## Progress (dev order — one new concept per step)

- [x] 1. Minimal loop: Express `/api/health` + client fetch + CORS
- [x] 2. Prisma + Supabase; Session/Question CRUD
- [x] 3. JWT register/login + `requireAuth`; client AuthContext + Login/Register/Sessions pages
- [ ] 4. Claude + Whisper: generate questions → voice answer → transcribe → three-axis scoring (Content / Language / Delivery — never one collapsed total; language feedback must name the error pattern, e.g. Chinese-L1 transfer, with original → native rewrite)
- [ ] 5. Resume upload (PDF) + JD match analysis (match score, missing skills → priority question topics)
- [ ] 6. Cross-session weakness profile + targeted drills

## MVP constraints

- Excluded: payments, community, email notifications, admin dashboard
- Voice answering: live transcript is a toggle, OFF by default (waveform/timer only while speaking); Web Speech API for optional preview, Whisper after answer ends as authoritative text
- Two optimized answer versions: "polished" (user's own content, fixed language) + "structural exemplar" (annotated gaps, not a memorisable model answer)
- Per-user rate limiting (one full session ≈ NZ$0.5–2 in API costs)
