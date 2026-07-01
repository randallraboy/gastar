# Implementation Plan: Expense Tracking System

**Branch**: `main` | **Date**: 2026-07-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-expense-tracking/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Build gastar as a fresh full-Vercel application: a TypeScript Next.js app (UI + serverless
API routes) deployed on Vercel, backed by Neon Postgres, with Google-login access restricted
to an allowlist sharing a single CAD expense ledger. Receipt photos upload to a temporary
staging area (Vercel Blob); an owner-run local harness CLI (driven by a project-level Claude
skill) downloads pending receipts, extracts amount/date/merchant, and posts back draft
expenses for review. Auto-categorization uses remembered merchant→category corrections with
keyword-rule fallback to "Uncategorized". Legacy Spring Boot / Gradle / MongoDB / Angular
scaffolding is removed as part of this feature.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 (Vercel runtime)

**Primary Dependencies**: Next.js 15 (App Router), Auth.js (NextAuth v5) with Google
provider, Drizzle ORM + `@neondatabase/serverless`, `@vercel/blob`, Zod (input validation)

**Storage**: Neon Postgres (single database); Vercel Blob for receipt images (staged +
attached)

**Testing**: Vitest (+ React Testing Library for components); type gate via `tsc --noEmit`

**Target Platform**: Vercel (web + serverless functions); harness CLI runs on the owner's
machine (Windows/macOS/Linux, Node 22)

**Project Type**: Web application (frontend + API in one Next.js project) plus a small local
CLI (`harness/`)

**Performance Goals**: Personal-scale app. Spec targets: expense list interactions feel
instant (<1s perceived); photo upload into pending queue <15s; draft review+save <1min
(SC-001, SC-002, SC-005)

**Constraints**: No third-party AI/OCR calls from the hosted app (extraction happens only in
the owner-run local harness); Google-allowlist-only access; secrets in env vars only; single
CAD ledger; staged images are temporary and cleaned up when resolved

**Scale/Scope**: 1–2 users, thousands of expenses/year, receipt images a few MB each; ~16
functional requirements, 3 user stories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against constitution v2.0.0 (amended 2026-07-01 to ratify the full-Vercel
direction decided in spec Clarifications, Session 2026-07-01):

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ PASS | Spec + clarifications completed before this plan; stack change captured in spec Clarifications |
| II. Quality Gates & Testing | ✅ PASS | Plan adopts `npm run build`, `npm test` (Vitest), `tsc --noEmit` as gates; regression-test rule unaffected |
| III. Consistent Formatting & Style | ✅ PASS | Prettier + ESLint configured in scaffolding tasks; TypeScript everywhere (app + harness) |
| IV. Secure by Default | ✅ PASS | Google OAuth2/OIDC only, allowlist enforced in sign-in callback and API middleware; harness uses scoped bearer token; all secrets in env vars |
| V. Simplicity First (YAGNI) | ✅ PASS | One Next.js project, one database, no queue/broker (staging table + polling harness), no multi-currency/budgeting build-out — only attribution and currency columns future-proofed |

**Post-Phase-1 re-check**: ✅ PASS — design artifacts introduce no new frameworks,
datastores, or services beyond those ratified in constitution v2.0.0.

## Project Structure

### Documentation (this feature)

```text
specs/001-expense-tracking/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── api.md           # REST contract: app API + harness endpoints
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/                          # Next.js App Router
├── (app)/                    # Signed-in app shell
│   ├── expenses/             # List, filters, totals, edit/delete, drafts
│   ├── receipts/             # Pending receipt queue, upload, convert-to-manual
│   └── categories/           # Category management
├── api/
│   ├── auth/[...nextauth]/   # Auth.js (Google + allowlist)
│   ├── expenses/             # CRUD + confirm + duplicate check
│   ├── categories/           # CRUD (reassign-to-Uncategorized on delete)
│   └── receipts/             # Upload, pending list, image download, results (harness)
├── layout.tsx
└── page.tsx                  # Sign-in / landing

src/
├── lib/
│   ├── db/                   # Drizzle schema, client (Neon serverless), migrations config
│   ├── auth.ts               # Auth.js config, allowlist check
│   ├── authz.ts              # Session + harness-token guards for API routes
│   ├── categorize.ts         # corrections lookup → keyword rules → Uncategorized
│   ├── money.ts              # integer-cents helpers, CAD formatting
│   └── blob.ts               # Vercel Blob upload/delete helpers
└── components/               # Shared UI components

harness/
├── cli.ts                    # list/download pending, post back parsed results
└── README.md                 # How the Claude skill drives this

.claude/skills/receipt-harness/
└── SKILL.md                  # Project skill: run CLI, read images, produce parsed JSON

drizzle/                      # Generated SQL migrations
tests/                        # Vitest: unit (categorize, money, authz) + API route tests
```

**Structure Decision**: Single Next.js project at the repository root (Vercel's default
deployment model) — UI and serverless API co-located. The harness is a small TypeScript CLI
in `harness/` sharing the repo but running locally, authenticated by token. Legacy Gradle /
Spring (`src/main/...`), Angular (`web/`), and Docker Compose files are deleted during
implementation (tracked as tasks; constitution v2.0.0 retires that stack).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — no constitution violations. (The stack replacement itself was ratified as
constitution v2.0.0 before gating, per the owner's decision in spec Clarifications.)
