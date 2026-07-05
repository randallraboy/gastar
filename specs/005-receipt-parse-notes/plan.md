# Implementation Plan: Receipt Notes for Guided Parsing

**Branch**: `005-receipt-parse-notes` | **Date**: 2026-07-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-receipt-parse-notes/spec.md`

## Summary

Let a user attach an optional **note** (≤250 chars) to a receipt at capture time. The note is
stored on the pending receipt, editable while the receipt is still pending, carried to the
owner-run harness so it can be **included in the parsing prompt** as guidance, and preserved
permanently onto the resulting draft and confirmed expense as reference. Implementation adds
one nullable `note` column to `pending_receipts` and `expenses`, threads the value through the
capture UI → upload API → receipts lib → harness DTO → `harness/cli.ts` manifest →
`receipt-harness` SKILL.md prompt, and back onto the draft in `createDraftFromHarness`. A new
`PATCH /api/receipts/:id` supports edit/clear while pending. No new dependencies.

## Technical Context

**Language/Version**: TypeScript / Next.js 15 (App Router)

**Primary Dependencies**: Next.js, Drizzle ORM, Neon serverless driver, Auth.js, Zod, Vercel Blob

**Storage**: Neon Postgres — add `note text` to `pending_receipts` and `expenses` (both nullable, `char_length(note) <= 250` check). New migration `drizzle/0004_receipt_notes.sql`.

**Testing**: Vitest (`tests/receipts.test.ts`, `tests/expenses.test.ts`, `tests/validation.test.ts`, new note-thread test)

**Target Platform**: Vercel serverless (hosted app) + owner-run local harness (tsx CLI + Claude skill)

**Project Type**: Web application (UI + API routes, single repo) with a companion harness/skill

**Performance Goals**: No change to existing paths; note adds one small text field per receipt

**Constraints**: Auth/allowlist unchanged; harness endpoint stays token-gated; note guides parsing but never overrides readable image content or fabricates data for unreadable receipts (FR-003, FR-008); the note is one field, not a structured form (Simplicity)

**Scale/Scope**: 1–2 allowlisted users; personal ledger volume

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-design | Post-design |
|-----------|------------|-------------|
| **I Spec-Driven** | ✅ Spec + 2 clarifications complete | ✅ Plan/data-model/contracts trace to FR-001…FR-010 |
| **II Quality Gates** | ✅ Vitest for note validation, thread-through, draft carry-over | ✅ Regression: no-note path unchanged (FR-004), 250-char reject (FR-007) |
| **III Style** | ✅ Prettier + ESLint, TS only | ✅ No new untyped JS |
| **IV Security** | ✅ Note guarded by existing session/allowlist; harness GET already token-gated | ✅ Note is personal data, same protections; no new secrets/exposure |
| **V Simplicity** | ⚠️ Dedicated `note` column instead of reusing `expenses.description` — justified (see Complexity Tracking) | ✅ One nullable column ×2 tables, one PATCH route, no new deps |

## Project Structure

### Documentation (this feature)

```text
specs/005-receipt-parse-notes/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1 validation guide
├── contracts/
│   ├── api.md           # REST contract deltas (POST/PATCH/GET receipts, result carry)
│   └── ui.md            # Capture note field + pending-receipt edit
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
drizzle/
└── 0004_receipt_notes.sql        # add note column (+check) to pending_receipts & expenses

src/lib/
├── db/schema.ts                  # note column on pendingReceipts + expenses
├── validation.ts                 # receiptNoteSchema (trim, max 250); reuse in create/patch
├── receipts.ts                   # createPendingReceipt(note); updateReceiptNote()
├── expenses.ts                   # carry note in createDraftFromHarness + createExpense(convert)
└── api-types.ts                  # note on PendingReceiptDto + ExpenseDto (+ mappers)

app/api/receipts/
├── route.ts                      # POST reads note from formData
└── [id]/route.ts                 # + PATCH (edit/clear note while pending)

src/components/
└── ReceiptCapture.tsx            # optional note textarea in preview; send in formData

app/(app)/receipts/page.tsx       # show + edit note on pending receipts

harness/
└── cli.ts                        # pull() writes note into manifest.json

.claude/skills/receipt-harness/
└── SKILL.md                      # step 3: include manifest note in the parsing prompt

tests/
├── receipts.test.ts              # note persisted, edit-while-pending, 250 cap
└── expenses.test.ts              # note carried to draft; survives confirm
```

**Structure Decision**: Single Next.js repo (hosted app in `app/` + `src/`) plus the in-repo
owner-run harness (`harness/`) and its driving skill (`.claude/skills/receipt-harness/`). This
feature is a thin thread through all three layers; no new project or service is introduced.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New `note` column instead of reusing `expenses.description` | The note is capture-time user *guidance*, retained read-only for reference (FR-005). `description` is a separately user-editable expense field the parse may also populate. | Reusing `description` would let normal description edits overwrite the note (breaking "retained permanently for reference") and conflate two distinct meanings. One nullable column is the minimal honest model. |
