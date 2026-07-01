# gastar — Agent Guide

Personal expense tracker for 1–2 allowlisted users: manual expenses, receipt-photo staging
with an owner-run local parsing harness, auto-categorization. Active feature:
`specs/001-expense-tracking/` (see `.specify/feature.json`).

## Workflow (Spec Kit)

- Constitution: `.specify/memory/constitution.md` — gates every plan. Read it first.
- Specs live in `specs/NNN-name/` (`spec.md`, `plan.md`, `tasks.md`, `contracts/`, …).
- Lifecycle: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` →
  `/speckit-implement`. Manage specs only through these commands — never hand-create spec
  scaffolding.
- Non-trivial change (multi-part feature, breaking change, design decision) → spec first.
  Bug fixes and trivial changes skip specs.
- Keep `spec.md` **Status** current: `Draft` → `in-progress` (before coding) → `complete`.
  Record decisions and learnings in the spec as work happens.

## Tech Stack (constitution v2.0.1)

- TypeScript / Next.js (App Router) on Vercel — UI + serverless API, single project.
- Neon Postgres via Drizzle ORM; Vercel Blob for receipt images.
- Auth.js with Google login + `ALLOWED_EMAILS` allowlist; no local passwords.
- Receipt processing is async: staging queue + local harness CLI (`harness/`) driven by the
  `receipt-harness` project skill. Hosted app never calls third-party AI/OCR.
- Legacy Spring Boot / Gradle / MongoDB / Angular is retired; removal tracked in feature 001.

## Quality Gates

`npm run lint` · `npm run build` · `npm test` (Vitest) — all green before any change is done.
Bug fixes MUST add a regression test.

## Git Commits

- AI attribution: when more than 50% of a commit's changes were generated or assisted by AI,
  add a co-author trailer naming the model:

  ```text
  Co-Authored-By: <Model + Version> <model-name-lowercase@ai-company-name>
  ```

  Example: `Co-Authored-By: Claude Fable 5 <claude-fable-5@anthropic.com>`

## Secrets

Env vars only (`.env.local` locally, Vercel project settings deployed). Never commit
credentials, tokens, or allowlisted emails.
