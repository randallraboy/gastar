# Research: Expense Tracking System (001)

**Date**: 2026-07-01 | **Plan**: [plan.md](./plan.md)

All Technical Context unknowns resolved. Decisions below; each ratified against constitution
v2.0.0 (Vercel + Neon, no third-party AI in the request path, Google allowlist).

## R1. Web framework on Vercel

- **Decision**: Next.js 15+ (App Router) with React, single project hosting UI and API routes.
- **Rationale**: First-class Vercel support (zero-config serverless functions, image
  handling, env management); Auth.js and Drizzle have mature Next.js integrations; one
  framework for UI + API keeps ops to a single deploy target (Principle V).
- **Alternatives considered**:
  - *Keep Angular + separate Vercel functions*: two frameworks and a glue layer; Angular
    scaffolding is being retired anyway per spec Clarifications.
  - *SvelteKit / Nuxt*: both viable on Vercel; rejected for weaker ecosystem fit with the
    chosen auth/ORM stack, not on merit.

## R2. Database access layer for Neon

- **Decision**: Drizzle ORM with `@neondatabase/serverless` (HTTP driver) and
  `drizzle-kit` for SQL migrations committed to the repo.
- **Rationale**: Serverless-friendly (no connection pool management, works over HTTP from
  Vercel functions); fully typed schema in TypeScript; migrations are plain SQL — easy to
  audit for a small project.
- **Alternatives considered**:
  - *Prisma*: heavier cold starts and engine binary; more machinery than a 2-user app needs.
  - *Raw SQL (`pg`)*: no type safety; hand-rolled migrations.

## R3. Authentication & allowlist

- **Decision**: Auth.js (NextAuth v5) with the Google provider, JWT session strategy (no
  database adapter). Allowlist enforced in the `signIn` callback against `ALLOWED_EMAILS`
  (comma-separated env var), and re-checked in an API-level guard so a stale session can
  never outlive allowlist removal.
- **Rationale**: JWT strategy avoids session tables entirely; allowlist-by-env fits 1–2
  fixed users (no invite UI to build — Principle V); the double check (sign-in + API guard)
  satisfies FR-001/FR-014 and constitution Principle IV.
- **Alternatives considered**:
  - *DB-backed allowlist table*: adds admin UI and maintenance for zero benefit at this
    scale; a users table still exists for attribution, but authorization stays in config.
  - *Clerk/Auth0*: third-party service dependency for a personal app; unnecessary.

## R4. Receipt image storage (staging + attachment)

- **Decision**: Vercel Blob. Staged uploads go to a `receipts/staging/` prefix; on expense
  save the blob is kept and referenced by the expense (moved logically via DB reference, no
  copy); on discard/cleanup the blob is deleted.
- **Rationale**: Vercel-native (one platform, token-based, works from serverless functions);
  signed URLs let the harness download images without exposing them publicly.
- **Alternatives considered**:
  - *Postgres `bytea` in Neon*: keeps everything in one store but bloats the database and
    burns Neon storage/egress on multi-MB images.
  - *S3/R2*: another account + credential set; not needed.

## R5. Asynchronous receipt processing (staging + local harness)

- **Decision**: A `pending_receipts` table is the queue (states: `pending` → `processed` /
  `unreadable` / `converted`). The harness is a TypeScript CLI (`harness/cli.ts`, run with
  `tsx`) that authenticates with a `HARNESS_TOKEN` bearer secret and uses three endpoints:
  list pending, download image, post result. Posting a result creates a **draft expense**
  (an `expenses` row with `status = 'draft'`). A project-level Claude skill
  (`.claude/skills/receipt-harness`) drives the loop: run CLI to fetch pending images →
  read each image (multimodal) → emit `{amount_cents, date, merchant, category_hint}` or
  `unreadable` → CLI posts results back.
- **Rationale**: Matches the owner's clarification exactly (staging + local harness +
  project skill); no queue/broker infrastructure (Principle V) — a status column and
  polling CLI is enough for personal volume; the hosted app never calls AI services
  (constitution constraint), while extraction quality comes from the locally-run skill.
- **Alternatives considered**:
  - *Cloud OCR (Vision API/Textract) from a Vercel function*: rejected by owner decision in
    Clarifications.
  - *Self-hosted OCR (tesseract.js) inside functions*: poor accuracy on receipts, heavy
    bundles, still weaker than the skill-driven flow.
  - *Vercel Cron + queue*: nothing to schedule server-side; processing capacity lives on the
    owner's machine by design.

## R6. Auto-categorization

- **Decision**: Deterministic in-app pipeline at expense creation:
  1. Normalized-merchant lookup in `merchant_corrections` (exact match after
     lowercase/trim/strip-punctuation).
  2. Keyword rules over merchant/description against seeded category keywords.
  3. Fallback: `Uncategorized`.
  A user changing a category upserts the merchant correction (FR-012). The harness may also
  send a `category_hint`, which is applied only when steps 1–2 produce nothing.
- **Rationale**: Transparent, testable (pure function — Vitest), no AI dependency in the
  hosted app, and correction-learning satisfies FR-010–FR-012 and SC-004's "improves as
  corrections accumulate".
- **Alternatives considered**:
  - *Embedding/ML classifier*: unjustified complexity at this scale (Principle V).
  - *Categorize only in harness*: manual entries would never get auto-categories; rejected.

## R7. Money representation & currency

- **Decision**: `amount_cents INTEGER` + `currency CHAR(3) NOT NULL DEFAULT 'CAD'`.
  Formatting via `Intl.NumberFormat('en-CA', { currency: 'CAD' })`.
- **Rationale**: Integer cents avoids float errors; the currency column (always 'CAD' for
  this feature) is the future-proofing hook the spec asks for — multi-currency later adds
  an original-amount/original-currency pair without reshaping existing rows.
- **Alternatives considered**: `NUMERIC(12,2)` — fine in Postgres but JS drivers return
  strings; integer cents keeps arithmetic exact end-to-end.

## R8. Validation, testing, formatting

- **Decision**: Zod schemas shared by API routes and forms; Vitest for unit tests
  (categorize, money, authz, duplicate detection) and route-handler tests; ESLint +
  Prettier (`npm run lint`); `tsc --noEmit` in the build gate. Playwright E2E deferred
  until after MVP.
- **Rationale**: Matches constitution v2.0.0 gates; Vitest continuity from the prior stack
  (team familiarity); Zod gives FR-015's plain-language validation messages one place to
  live.

## R9. Duplicate detection (FR-016)

- **Decision**: On draft creation and on save of photo-sourced expenses, query for an
  existing expense with the same `expense_date`, `amount_cents`, and normalized merchant;
  if found, the API returns the match and the UI shows a "possible duplicate" warning that
  the user can override.
- **Rationale**: Cheap indexed lookup; warn-not-block matches spec ("warn ... before
  saving").

## R10. Legacy removal

- **Decision**: Delete Gradle/Spring (`build.gradle`, `src/main`, `src/test`,
  `src/docker`), Angular (`web/`), and related config in an early implementation task,
  after the Next.js scaffold builds green. Update `AGENTS.md` in the same task (constitution
  Sync Impact TODO).
- **Rationale**: Constitution v2.0.0 retires the stack; deleting after the new scaffold is
  green keeps the repo always-buildable.
