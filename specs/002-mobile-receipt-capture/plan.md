# Implementation Plan: Mobile-Friendly Receipt Capture

**Branch**: `main` (no feature branch; solo project) | **Date**: 2026-07-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-mobile-receipt-capture/spec.md`

## Summary

Make the existing gastar web app fully usable from a phone browser and make receipt capture
via the phone camera a first-class, reliable flow. Technical approach: keep the existing
`<input type="file" capture="environment">` native-camera pattern (no in-page viewfinder),
add an in-app preview/retake/submit step, upload via `XMLHttpRequest` for progress events,
retain the captured file client-side for retry, and add a client-generated idempotency key to
`POST /api/receipts` so retries never create duplicate pending receipts. Mobile usability is
a responsive refactor of the existing plain-CSS design system (tokens in `globals.css`):
mobile-first layout, bottom navigation on small screens, card lists instead of tables on
narrow viewports, full-screen sheets instead of centered modals, and ≥44px touch targets.
Page design follows the web-design-engineer skill workflow (design-system declaration before
code, v0 checkpoint) as requested in the spec.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict), Node 20+ runtime on Vercel

**Primary Dependencies**: Next.js 15 (App Router), React 19, NextAuth v5 (Google OIDC), Drizzle ORM, @vercel/blob, Zod. No new runtime dependencies planned.

**Storage**: Neon Postgres (via `@neondatabase/serverless` + Drizzle); receipt images in Vercel Blob (private, staging prefix). One additive column on `pending_receipts` (idempotency key).

**Testing**: Vitest + @testing-library/react (jsdom). Gates: `npm run lint`, `npm run build`, `npm test`.

**Target Platform**: Phone browsers first — iOS Safari 16.4+ and Android Chrome (current); desktop browsers keep full parity. Hosted on Vercel.

**Project Type**: Web application (single Next.js project: frontend + API routes).

**Performance Goals**: Open-app → submitted capture < 20 s on a phone (SC-001); camera reachable ≤ 2 taps (SC-002); upload feedback visible within 500 ms of submit.

**Constraints**: No third-party AI/OCR from the hosted app (constitution); existing upload limits stay (JPEG/PNG/WebP/HEIC, ≤ 10 MB); no offline queue (out of scope per spec); no new datastore or framework.

**Scale/Scope**: 1–2 allowlisted users; 5 primary screens to make mobile-friendly (expenses, receipts/capture, categories, draft review, sign-in); ~1 new API field + 1 migration.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|-----------|-------|--------|
| I. Spec-Driven Development | Spec 002 created via `/speckit-specify`; this plan via `/speckit-plan`; status tracked in spec | ✅ PASS |
| II. Quality Gates & Testing | Plan keeps `npm run build`/`npm test` green; new behavioral logic (idempotent upload, capture state machine, responsive nav) ships with Vitest tests | ✅ PASS |
| III. Consistent Formatting & Style | TypeScript only; Prettier + ESLint enforced; no untyped JS | ✅ PASS |
| IV. Secure by Default | No auth changes. Capture/upload stays behind `requireUser()` (allowlist); harness endpoints untouched; blob stays private; no new secrets | ✅ PASS |
| V. Simplicity First (YAGNI) | No new dependencies (no Tailwind, no upload lib, no PWA framework). Native camera input over getUserMedia viewfinder. One additive DB column justified by FR-008 (no duplicate on retry) | ✅ PASS |

**Post-Phase-1 re-check**: design artifacts introduce no new violations — no new entities, one additive nullable column, one new form field on an existing endpoint. ✅ PASS

## Project Structure

### Documentation (this feature)

```text
specs/002-mobile-receipt-capture/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── api.md           # API contract changes (receipts idempotency)
│   └── ui.md            # Screen/breakpoint/design-system contract
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

Existing single Next.js project; this feature modifies it in place. New/changed paths:

```text
app/
├── globals.css                     # MODIFIED: extended token set (spacing/type scale,
│                                   #   touch targets), mobile-first layout rules,
│                                   #   bottom-nav, sheet-style modals, card-list styles
├── layout.tsx                      # MODIFIED: viewport/theme-color metadata if needed
├── (app)/
│   ├── layout.tsx                  # MODIFIED: responsive nav (top bar desktop /
│   │                               #   bottom tab bar mobile), capture entry point
│   ├── expenses/page.tsx           # MODIFIED: responsive list (cards on narrow),
│   │                               #   touch-friendly filters, sheet modals
│   ├── receipts/page.tsx           # MODIFIED: uses new capture flow component
│   └── categories/page.tsx         # MODIFIED: responsive + touch targets
│
├── api/receipts/route.ts           # MODIFIED: accept optional clientKey form field,
│                                   #   idempotent create
src/
├── components/
│   ├── ReceiptCapture.tsx          # NEW: capture flow — camera/file input, preview,
│   │                               #   retake, submit, progress, retry (XHR upload)
│   └── ExpenseForm.tsx             # MODIFIED: touch-friendly inputs
├── lib/
│   ├── receipts.ts                 # MODIFIED: createPendingReceipt idempotency lookup
│   ├── upload.ts                   # NEW: XHR upload helper with progress callback
│   └── db/schema.ts                # MODIFIED: client_key column on pending_receipts
drizzle/                            # NEW migration: additive client_key + unique index
tests/
├── receipts.test.ts                # MODIFIED: idempotency cases
├── upload.test.ts                  # NEW: upload helper behavior
└── receipt-capture.test.tsx        # NEW: capture flow states (preview/retry/reset)
```

**Structure Decision**: Keep the existing single-project Next.js layout (`app/` routes +
`src/` libraries + `tests/`). This is a UI/UX and reliability feature over feature 001's
foundation; no structural reorganization is warranted (Principle V).

## Design Approach (per spec's design-skill reference)

The spec records the user's request to apply the web-design-engineer skill
(https://github.com/ConardLi/garden-skills/blob/main/skills/web-design-engineer/SKILL.md)
when designing pages. Its workflow is adapted to this codebase as follows (details in
[research.md](./research.md) §7 and [contracts/ui.md](./contracts/ui.md)):

- **Design system declared before code**: extended token set (spacing scale, fluid type via
  `clamp()`, touch-target minimums, elevation, motion) is specified in `contracts/ui.md` and
  lands in `globals.css` as CSS custom properties — the skill's "declare the system first"
  step, done against the existing visual vocabulary rather than from scratch.
- **Match existing vocabulary**: the app already has a quiet, neutral, system-font language
  with a single blue primary. New mobile UI extends it; it does not rebrand. No gradients,
  no emoji-as-icons, no decorative slop (skill anti-cliché rules).
- **v0 checkpoint**: tasks will sequence a low-fidelity responsive pass (layout + nav +
  capture skeleton) before polish, so direction can be corrected early.
- **Skill scope note**: the skill targets standalone HTML artifacts (CDN React, Babel); those
  mechanics don't apply to a Next.js codebase and are consciously not adopted. Its design
  process, token discipline, and anti-cliché principles are what we apply.

## Complexity Tracking

> No constitution violations. Table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
