# Interview Coach

A mock interview platform for **non-native English-speaking engineers** job-hunting overseas (starting with New Zealand 🇳🇿).

Most AI mock-interview tools score *what* you said. Interview Coach also cares about *how* you said it — because for ESL candidates, "I fixed bug in production" and "I fixed **a** bug in production" are the difference between sounding junior and sounding fluent.

## What makes it different

- 🗣️ **ESL-tailored language feedback** — names the exact error pattern (e.g. *"missing article before a countable noun — a common Chinese-L1 transfer"*) and shows your original sentence next to a native-sounding rewrite
- 📈 **Cross-session weakness tracking** — accumulates your error patterns over time (*"you dropped articles in 12 of your last 20 answers"*) and suggests targeted drills
- 🎯 **Three-axis scoring** — every answer is scored separately on **Content** (STAR structure, specifics, quantified results), **Language** (grammar, word order, vocabulary), and **Delivery** (filler words, pace, pauses) — never one vague total
- ✍️ **Two optimized versions of your answer** — a *polished* version that keeps your own experiences (something you can actually say out loud), and a *structural exemplar* that annotates the gaps instead of handing you a script to memorize

## Feature roadmap

| # | Feature | Status |
|---|---------|--------|
| 1 | Monorepo scaffold — Express ↔ React loop with CORS | ✅ |
| 2 | PostgreSQL (Supabase) + Prisma, session/question CRUD | ✅ |
| 3 | JWT auth (register/login, bcrypt, `requireAuth`) | ✅ |
| 4 | AI core: question generation → voice answer → transcription → three-axis scoring | ✅ |
| 5 | Resume (PDF) + job description match analysis | ⬜ |
| 6 | Cross-session weakness profile + drills | ⬜ |

## How a session works

1. Paste a job description when you create a session
2. **Generate questions** — Claude produces a tiered set (warmup / behavioural / technical) from the JD
3. **Answer by typing or by voice** — recording shows only a waveform and a timer, never live subtitles, so you can't quietly correct yourself mid-sentence
4. The recording is uploaded, transcribed by **Groq-hosted Whisper**, and the transcript is shown back to you — so a low score and a misheard word stay distinguishable
5. **Claude scores the transcript** on all three axes and returns the language error table plus both rewrite versions

Both answer paths converge on the same scoring and persistence code; transcription simply slots in one step earlier.

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | React + Vite + TypeScript (deploys to **AWS** — S3 + CloudFront) |
| Backend | Express 5 + TypeScript (deploys to **AWS** — App Runner) |
| Database | PostgreSQL on Supabase + Prisma ORM |
| Auth | JWT + bcrypt |
| AI | Claude API (questions, strict-JSON three-axis scoring) · Groq-hosted Whisper `whisper-large-v3-turbo` (speech-to-text) |
| Uploads | multer (in-memory, 25 MB cap) — audio never touches disk |
| Repo | Monorepo: `client/` + `server/` + `shared/` types, TypeScript strict mode |

> **Voice answering is Chrome-only for now.** No mimeType negotiation — a deliberate MVP trade-off, not an oversight.

## Project structure

```
interview-coach/
├── shared/types.ts             # API request/response types shared by both sides
├── server/
│   ├── prisma/                 # schema + migrations
│   └── src/
│       ├── index.ts            # Express app (CORS, routes, error handler incl. MulterError)
│       ├── env.ts              # loads + validates .env once, at startup
│       ├── routes/             # auth.ts, sessions.ts, questions.ts
│       ├── services/           # questionService, transcriptionService, scoringService, answerService
│       ├── middleware/         # requireAuth (JWT)
│       ├── lib/                # prisma.ts, anthropic.ts, groq.ts (shared clients)
│       └── utils/logger.ts     # the only place allowed to touch the console
└── client/
    └── src/
        ├── api/                # client.ts (fetch wrapper: base URL, JWT, FormData-aware), interview.ts
        ├── context/            # AuthContext
        ├── hook/               # useAudioRecorder (MediaRecorder + timer + Blob)
        └── pages/              # AuthForm, Sessions, Interview, QuestionCard, Recorder
```

## Getting started

**Prerequisites:** Node.js ≥ 22, a free [Supabase](https://supabase.com) project, an [Anthropic](https://console.anthropic.com) API key, a free [Groq](https://console.groq.com) API key.

```bash
git clone https://github.com/GraceLiao77/interview-coach.git
cd interview-coach

# 1. Server
cd server
npm install
cp .env.example .env        # fill in the values below
npx prisma migrate dev      # create tables
npm run dev                 # http://localhost:3009

# 2. Client (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

`server/.env` values:

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Supabase **pooled** connection string (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase **direct** connection string (port 5432, used by migrations) |
| `JWT_SECRET` | generate with `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | Claude — question generation and scoring |
| `GROQ_API_KEY` | Groq — Whisper transcription |
| `MOCK_AI` | `true` = canned Claude responses, no API cost |
| `MOCK_TRANSCRIPTION` | `true` = canned transcript, no Groq call |

The two mock flags are **separate on purpose**: you can exercise the voice path against the live Whisper API while scoring stays mocked and free.

> If the database suddenly returns `FATAL: (ENOTFOUND) tenant/user postgres.<ref> not found`, your free Supabase project has been auto-paused after ~7 days idle. Restore it from the dashboard and re-copy the connection strings — the pooler hostname can change.

## Verify it works

```bash
curl http://localhost:3009/api/health
# → {"status":"ok","timestamp":"..."}
```

Then open http://localhost:5173, register an account, create a session with a job description, generate questions, and answer one — by typing or by hitting 🎙 and speaking.

---

*Built by a Chinese-native developer job-hunting in Auckland — this app's first user is its author.*
