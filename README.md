# gastar

Personal expense tracker for 1–2 allowlisted Google accounts. Manual expenses, receipt-photo
staging with an owner-run local parsing harness, and auto-categorization.

## Stack

- **Next.js 15** (App Router) on Vercel
- **Neon Postgres** via Drizzle ORM
- **Auth.js** with Google login + `ALLOWED_EMAILS` allowlist
- **Vercel Blob** for receipt images

## Setup

1. Copy `.env.example` to `.env.local` and fill in values (see `specs/001-expense-tracking/quickstart.md`).
2. Install and migrate:

```bash
npm install
npm run db:migrate
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality gates

```bash
npm run lint
npm run build
npm test
```

## Receipt harness

Process pending receipt photos locally (no cloud AI from the hosted app):

```bash
export GASTAR_URL=http://localhost:3000
export HARNESS_TOKEN=your-token
npm run harness -- list
npm run harness -- pull ./receipts-out
npm run harness -- push ./receipts-out/results.json
```

See `harness/README.md` and `.claude/skills/receipt-harness/SKILL.md`.

## Deploy (Vercel)

Push to `main`; set all env vars from `.env.example` in Vercel project settings.

## Specs

Feature spec and tasks: `specs/001-expense-tracking/`. Managed via Spec Kit (`/speckit-*`).
