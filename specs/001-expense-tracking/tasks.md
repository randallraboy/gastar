---

description: "Task list for Expense Tracking System (001)"
---

# Tasks: Expense Tracking System

**Input**: Design documents from `/specs/001-expense-tracking/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Constitution v2.0.0 Principle II — new behavioral logic SHOULD ship with tests. Test
tasks below cover pure logic (money, categorization, receipt state machine, duplicate
detection) and auth guards; UI snapshot tests intentionally omitted (YAGNI).

**Organization**: Tasks grouped by user story. US1 is the MVP; US2 and US3 build on the same
foundation and are independently verifiable per quickstart.md scenarios.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (record/review expenses), US2 (receipt photo), US3 (auto-categorization)

## Path Conventions

Single Next.js project at repository root per plan.md: `app/` (routes + API),
`src/lib/` (domain logic), `harness/` (local CLI), `drizzle/` (migrations), `tests/` (Vitest).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: New Vercel-stack scaffolding; legacy removal once the new build is green (research R10)

- [ ] T001 Scaffold Next.js 15 App Router project (TypeScript, ESLint) at repository root — `package.json`, `next.config.ts`, `tsconfig.json` (strict), `app/layout.tsx`, `app/page.tsx`; ensure `npm run build` passes before anything else
- [ ] T002 Install runtime deps: `next-auth@beta`, `drizzle-orm`, `@neondatabase/serverless`, `@vercel/blob`, `zod`; dev deps: `drizzle-kit`, `vitest`, `@testing-library/react`, `prettier`, `tsx` — update `package.json` scripts: `dev`, `build`, `test`, `lint`, `db:generate`, `db:migrate`, `seed`, `harness`
- [ ] T003 [P] Configure Prettier (`.prettierrc`) + ESLint integration; add `npm run lint` covering `app/`, `src/`, `harness/`, `tests/`
- [ ] T004 [P] Configure Vitest in `vitest.config.ts` with path aliases matching `tsconfig.json`; create `tests/setup.ts`
- [ ] T005 [P] Create `.env.example` with all vars from quickstart.md (DATABASE_URL, GOOGLE_CLIENT_ID/SECRET, AUTH_SECRET, ALLOWED_EMAILS, HARNESS_TOKEN, BLOB_READ_WRITE_TOKEN); ensure `.env.local` is gitignored
- [ ] T006 Remove legacy stack after `npm run build` is green: delete `build.gradle`, `settings.gradle`, `gradle/`, `gradlew*`, `src/main/`, `src/test/`, `src/docker/`, `web/`, `secrets.properties` references; update `README.md` stub to point at quickstart (constitution v2.0.0 retires this stack)

**Checkpoint**: `npm run lint && npm run build && npm test` all green on empty scaffold; legacy gone

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, DB client, auth, guards, shared helpers — no user story works without these

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Define Drizzle schema for all five tables (`users`, `categories`, `expenses`, `pending_receipts`, `merchant_corrections`) with constraints/checks/indexes from data-model.md in `src/lib/db/schema.ts`
- [ ] T008 Create Neon client + Drizzle instance in `src/lib/db/index.ts`; add `drizzle.config.ts`; generate initial migration into `drizzle/`
- [ ] T009 Seed script `scripts/seed.ts` inserting default categories with keywords (Groceries, Dining, Transport, Housing, Utilities, Health, Entertainment, Shopping, Travel, Uncategorized `is_system=true`); idempotent; wired to `npm run seed`
- [ ] T010 Configure Auth.js v5 in `src/lib/auth.ts` (Google provider, JWT sessions, `signIn` callback rejecting emails not in `ALLOWED_EMAILS`, first-login upsert into `users`) + route handler `app/api/auth/[...nextauth]/route.ts`
- [ ] T011 Implement guards in `src/lib/authz.ts`: `requireUser()` (session + allowlist re-check per research R3, returns user row) and `requireHarness()` (constant-time compare of `Authorization: Bearer` against `HARNESS_TOKEN`); shared JSON error helper `{ error: { code, message } }` per contracts/api.md
- [ ] T012 [P] Money helpers in `src/lib/money.ts`: dollars↔cents conversion, CAD formatting via `Intl.NumberFormat('en-CA')`, input parsing
- [ ] T013 [P] Zod schemas in `src/lib/validation.ts`: expense create/update, harness result payload, category input, upload constraints (jpeg/png/webp/heic, ≤10 MB) — plain-language messages (FR-015)
- [ ] T014 [P] Merchant normalization helper in `src/lib/normalize.ts` (lowercase, trim, strip punctuation/whitespace collapse) — single source used by expenses, corrections, duplicate check
- [ ] T015 Signed-in app shell: `app/(app)/layout.tsx` (nav: Expenses / Receipts / Categories, session guard redirect) + sign-in landing on `app/page.tsx`; not-authorized screen for 403 (edge case)
- [ ] T016 [P] Unit tests for foundations: `tests/money.test.ts`, `tests/normalize.test.ts`, `tests/authz.test.ts` (allowlist accept/reject, harness token accept/reject)

**Checkpoint**: Sign-in works against allowlist; DB migrated + seeded; gates green

---

## Phase 3: User Story 1 - Record and Review Expenses (Priority: P1) 🎯 MVP

**Goal**: Manual expense CRUD with filterable history and totals — a complete personal expense log

**Independent Test**: quickstart.md V1 + V2 — sign in, create/edit/delete expenses, filter by date/category with totals, invalid input rejected in plain language

### Implementation for User Story 1

- [ ] T017 [US1] Expense domain service in `src/lib/expenses.ts`: `listExpenses` (date-range/category/status filters + `sumCents`), `createExpense` (validation, merchant normalization, category default→Uncategorized placeholder until US3), `updateExpense`, `deleteExpense`, `findDuplicate` (date+amount+normalized-merchant per research R9)
- [ ] T018 [US1] API route `app/api/expenses/route.ts`: GET (filters, pagination, totals) and POST (create; 409 + `duplicateOf` when duplicate and no `overrideDuplicate`) per contracts/api.md
- [ ] T019 [US1] API route `app/api/expenses/[id]/route.ts`: PATCH (partial update) and DELETE (also deletes attached blob when present)
- [ ] T020 [P] [US1] Expense list page `app/(app)/expenses/page.tsx`: table with date/merchant/description/category/amount, date-range + category filters, filtered total, empty state
- [ ] T021 [P] [US1] Expense form component `src/components/ExpenseForm.tsx`: create/edit modes, dollars input → cents, category picker, Zod-driven inline errors
- [ ] T022 [US1] Wire create/edit/delete flows into expenses page (form modal or route, delete confirmation, optimistic refresh)
- [ ] T023 [P] [US1] Tests `tests/expenses.test.ts`: filter/total logic, validation failures (negative amount, future date), duplicate detection hit/miss

**Checkpoint**: US1 fully functional standalone — deployable MVP

---

## Phase 4: User Story 2 - Capture Invoice/Receipt by Photo (Priority: P2)

**Goal**: Photo → staging queue → owner-run harness parses → draft expense → review/confirm with image attached

**Independent Test**: quickstart.md V3 — upload receipt, run harness, confirm pre-filled draft, image viewable; unreadable path and instant manual conversion both work

### Implementation for User Story 2

- [ ] T024 [P] [US2] Blob helpers in `src/lib/blob.ts`: upload to staging prefix, delete, resolve URL for display/download (Vercel Blob per research R4)
- [ ] T025 [US2] Receipt domain service in `src/lib/receipts.ts`: create pending, list by status, state transitions (`pending→processed/unreadable/converted` per data-model.md), terminal cleanup (delete staged blob + row on resolution)
- [ ] T026 [US2] API route `app/api/receipts/route.ts`: POST multipart upload (type/size validation → Blob → pending row) and GET `?status=` list
- [ ] T027 [P] [US2] API route `app/api/receipts/[id]/image/route.ts`: stream image; accepts session OR harness token (contracts 🔧)
- [ ] T028 [US2] API route `app/api/receipts/[id]/result/route.ts` (harness-only): `parsed` → create draft expense (status `draft`, source `photo`, link receipt, mark `processed`); `unreadable` → status + `error_note`; 409 when receipt not `pending` (idempotency)
- [ ] T029 [US2] API routes: `app/api/receipts/[id]/route.ts` DELETE (discard staged/unreadable, blob cleanup) and `app/api/expenses/[id]/confirm/route.ts` POST (apply edits, duplicate check, `draft→confirmed`, resolve receipt, cleanup staging)
- [ ] T030 [P] [US2] Receipts queue page `app/(app)/receipts/page.tsx`: camera/file upload widget, pending/unreadable lists with image thumbnails, convert-to-manual action (pre-opens ExpenseForm with `pendingReceiptId`), discard action
- [ ] T031 [US2] Draft review flow: drafts section on expenses page with receipt image preview beside editable ExpenseForm, confirm button → confirm endpoint, duplicate-warning dialog with override (FR-016)
- [ ] T032 [US2] Harness CLI `harness/cli.ts` (`list` / `pull <dir>` / `push <results.json>` per contracts; env `GASTAR_URL`, `HARNESS_TOKEN`; run via `npm run harness`) + `harness/README.md`
- [ ] T033 [US2] Project skill `.claude/skills/receipt-harness/SKILL.md`: pull pending images → read each (multimodal) → emit `results.json` entries `{id, outcome, amountCents, expenseDate, merchant, categoryHint | errorNote}` → push; includes unreadable criteria and re-run safety notes
- [ ] T034 [P] [US2] Tests `tests/receipts.test.ts`: state machine transitions, result endpoint idempotency (second post → 409), upload validation (bad type/oversize), manual conversion path

**Checkpoint**: US1 + US2 work; async pipeline verifiable end-to-end via skill or CLI

---

## Phase 5: User Story 3 - Automatic Expense Categorization (Priority: P3)

**Goal**: Best-guess category on every new expense; corrections remembered per merchant; explicit Uncategorized fallback

**Independent Test**: quickstart.md V4 — keyword hit auto-categorizes, gibberish → Uncategorized, correction changes future suggestion for same merchant

### Implementation for User Story 3

- [ ] T035 [P] [US3] Categorization pipeline (pure function) in `src/lib/categorize.ts`: corrections lookup → keyword rules over `categories.keywords` → harness `categoryHint` → Uncategorized (order per research R6); returns `{categoryId, categoryWasAuto}`
- [ ] T036 [US3] Wire pipeline into `createExpense` (replace Uncategorized placeholder from T017) and harness result path (T028) so manual and photo expenses both auto-categorize (FR-010)
- [ ] T037 [US3] Correction learning in `src/lib/expenses.ts`: user-set category on create/PATCH/confirm upserts `merchant_corrections` by normalized merchant (FR-012)
- [ ] T038 [US3] UI: "auto" badge on auto-categorized expenses + one-click category change from list row and form (FR-010 "clearly allow the user to change it")
- [ ] T039 [P] [US3] Tests `tests/categorize.test.ts`: pipeline precedence (correction beats keyword beats hint), Uncategorized fallback, correction upsert → changed suggestion on next create

**Checkpoint**: All three stories independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Category management (FR-013), docs, full validation

- [ ] T040 [P] Category API routes `app/api/categories/route.ts` (GET, POST) and `app/api/categories/[id]/route.ts` (PATCH rename/keywords, DELETE with transactional reassign of expenses + corrections to Uncategorized; 400 on `is_system`) per FR-013
- [ ] T041 Category management page `app/(app)/categories/page.tsx`: list, add, rename, delete with reassignment warning; Uncategorized shown locked
- [ ] T042 [P] Tests `tests/categories.test.ts`: delete-reassign transaction, system-category protection (400)
- [ ] T043 [P] Rewrite `README.md`: project overview, setup from quickstart.md, deploy-to-Vercel notes, harness + skill usage
- [ ] T044 Run full quickstart validation V1–V5 locally + deployment check against Vercel preview; fix anything red; final gates `npm run lint && npm run build && npm test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational only
- **US2 (Phase 4)**: Depends on Foundational + US1's expense service/form (T017, T021 reused for drafts and conversion)
- **US3 (Phase 5)**: Depends on Foundational + US1 create path (T017); enhances US2's result path (T028) if present, but works with US1 alone
- **Polish (Phase 6)**: After desired stories complete

### Within Each User Story

- Domain service before API routes; API routes before UI wiring; tests parallel with or after their module
- T036 must follow both T017 (US1) and T028 (US2) where both exist

### Parallel Opportunities

```text
Phase 1: T003, T004, T005 together (after T001–T002)
Phase 2: T012, T013, T014, T016 together (after T007–T011)
US1:     T020, T021, T023 together (after T017–T019)
US2:     T024 ∥ T025 start; T027, T030, T034 parallel once routes exist
US3:     T035, T039 together; T036–T038 sequential (same files)
Polish:  T040, T042, T043 together
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 → Phase 2 → Phase 3
2. **STOP and VALIDATE**: quickstart V1 + V2 against local + Vercel preview
3. Deploy — usable expense log for both allowlisted users

### Incremental Delivery

1. MVP (above)
2. Add US2 → validate V3 (upload → harness → draft → confirm) → deploy
3. Add US3 → validate V4 → deploy
4. Polish (categories UI, docs, full V1–V5 sweep)

### Spec status tracking (constitution Principle I)

- Move spec to `in-progress` (LeanSpec tooling) before T001; `complete` after T044
