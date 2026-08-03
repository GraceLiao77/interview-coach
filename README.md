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
| 4 | AI core: question generation → voice answer → Whisper transcription → three-axis scoring | 🚧 next |
| 5 | Resume (PDF) + job description match analysis | ⬜ |
| 6 | Cross-session weakness profile + drills | ⬜ |

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | React + Vite + TypeScript (deploys to Vercel) |
| Backend | Express 5 + TypeScript (deploys to Fly.io) |
| Database | PostgreSQL on Supabase + Prisma ORM |
| Auth | JWT + bcrypt |
| AI | Claude API (analysis, questions, strict-JSON evaluation) · Whisper API (speech-to-text) |
| Repo | Monorepo: `client/` + `server/` + `shared/` types, TypeScript strict mode |

## Project structure

```
interview-coach/
├── shared/types.ts        # API request/response types shared by both sides
├── server/
│   ├── prisma/            # schema + migrations
│   └── src/
│       ├── index.ts       # Express app (CORS, routes, error handler)
│       ├── routes/        # auth.ts, sessions.ts
│       ├── middleware/    # requireAuth (JWT)
│       └── lib/prisma.ts  # PrismaClient singleton
└── client/
    └── src/
        ├── api/client.ts  # fetch wrapper (base URL + JWT header)
        ├── context/       # AuthContext
        └── pages/         # AuthForm, Sessions
```

## Getting started

**Prerequisites:** Node.js ≥ 22, a free [Supabase](https://supabase.com) project.

```bash
git clone https://github.com/GraceLiao77/interview-coach.git
cd interview-coach

# 1. Server
cd server
npm install
cp .env.example .env        # fill in DATABASE_URL, DIRECT_URL, JWT_SECRET
npx prisma migrate dev      # create tables
npm run dev                 # http://localhost:3009

# 2. Client (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

`server/.env` values:

- `DATABASE_URL` — Supabase **pooled** connection string (port 6543, `?pgbouncer=true`)
- `DIRECT_URL` — Supabase **direct** connection string (port 5432, used by migrations)
- `JWT_SECRET` — generate with `openssl rand -base64 32`

## Verify it works

```bash
curl http://localhost:3009/api/health
# → {"status":"ok","timestamp":"..."}
```

Then open http://localhost:5173, register an account, and create a mock session.

---

*Built by a Chinese-native developer job-hunting in Auckland — this app's first user is its author.*
