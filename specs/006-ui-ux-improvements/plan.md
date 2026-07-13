# Implementation Plan: Better UI & UX

**Branch**: `006-ui-ux-improvements` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-ui-ux-improvements/spec.md`

## Summary

Redesign the gastar expense tracker into an expressive-modern, mobile-first interface with
a cohesive design language, liberal iconography (FontAwesome free/solid for UI icons plus
emoji accents for categories/expenses), spending data visualization (a spending-over-time
trend chart and a category breakdown chart), consistent feedback states (loading, success,
error, empty, confirm), and a manual light/dark theme toggle layered on the OS default.

Technical approach: keep the existing single Next.js App Router project, data model, API
routes, and auth unchanged. Extend `app/globals.css` into a richer token/design system,
add a small set of reusable client UI primitives (`Icon`, `ThemeProvider`/`ThemeToggle`,
`Toast`, `Skeleton`, `EmptyState`, `ConfirmDialog`) and two dependency-free responsive SVG
chart components. Charts and trends are derived client-side from data the existing
`/api/expenses` endpoint already returns (`sumCents`, `categoryTotals`, and item
`expenseDate`/`amountCents`), so no new backend aggregation or endpoints are required.

## Technical Context

**Language/Version**: TypeScript 5.7, React 19, Next.js 15 (App Router)

**Primary Dependencies**: Next.js, React, next-auth 5 (beta), drizzle-orm + Neon serverless
driver, zod. **New**: FontAwesome free (icons) — added per the 2026-07-12 clarification.

**Storage**: Neon Postgres (unchanged). Client theme preference persisted in `localStorage`.
No schema changes.

**Testing**: Vitest 2 + @testing-library/react + jsdom (`npm run test`).

**Target Platform**: Vercel-hosted web app; mobile-first (modern iOS/Android browsers) and
desktop browsers. Respects `prefers-color-scheme` and `prefers-reduced-motion`.

**Project Type**: Single Next.js web application (frontend + API routes in one project).

**Performance Goals**: No layout jank on a mid-range phone; charts and theme switch feel
instant (<100ms perceived); no added blocking payload beyond a tree-shaken icon set; no
flash-of-wrong-theme on load.

**Constraints**: Presentation + client interaction only — no changes to the data model,
API routes, auth, or the receipt-processing harness. WCAG 2.1 AA baseline. No horizontal
scrolling; tap targets ≥ 44px (existing `--tap-min`).

**Scale/Scope**: Single allowlisted user; ~6 primary screens (Expenses, Receipts, Capture,
Categories, sign-in, not-authorized). Personal-scale data volumes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Spec-Driven Development**: PASS. Work is driven by spec 006 (specified + clarified);
  concrete tool decisions (FontAwesome, charts, theme toggle) are recorded in the spec's
  Clarifications and here. Spec status will move to `in-progress` before coding.
- **II. Quality Gates & Testing**: PASS (planned). `npm run build`, `npm run lint`, and
  `npm test` must pass. New behavioral logic (theme resolution/persistence, chart data
  transforms, toast/confirm behavior) ships with Vitest unit tests; no existing test may
  regress (FR-014, SC-007).
- **III. Consistent Formatting & Style**: PASS. All new files are TypeScript, formatted with
  Prettier and pass ESLint. No untyped JS.
- **IV. Secure by Default**: PASS. No change to Google OAuth2/OIDC, the allowlist, harness
  token, or secret handling. Purely presentational; no new network calls to third parties
  (FontAwesome ships as a bundled dependency, not a runtime CDN/telemetry call).
- **V. Simplicity First (YAGNI)**: PASS with one justified dependency. FontAwesome is added
  only because it is an explicit, clarified product requirement (Principle I). Charts are
  built as dependency-free SVG components rather than pulling a charting library, and the
  theme toggle / toasts / skeletons are hand-rolled — avoiding heavy dependencies and React
  19 peer-dependency risk. See Complexity Tracking for the FontAwesome justification.

**Result**: PASS. One new dependency (FontAwesome free), justified below. No other gates
violated. No unresolved NEEDS CLARIFICATION.

## Project Structure

### Documentation (this feature)

```text
specs/006-ui-ux-improvements/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (UI component contracts)
│   └── ui-components.md
├── checklists/
│   └── requirements.md  # From /speckit-specify + /speckit-clarify
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
app/
├── globals.css                 # Expanded design tokens + component styles (edited)
├── layout.tsx                  # Add no-FOUC theme init script + ThemeProvider (edited)
├── page.tsx                    # Sign-in screen restyle (edited)
├── not-authorized/page.tsx     # Restyle (edited)
└── (app)/
    ├── layout.tsx              # Header: add ThemeToggle, icons (edited)
    ├── expenses/page.tsx       # Charts, icons, feedback states, confirm dialog (edited)
    ├── receipts/page.tsx       # Icons, empty/loading states (edited)
    └── categories/page.tsx     # Icons, empty/loading states (edited)

src/
├── components/
│   ├── AppNav.tsx              # Add icons to nav/bottom-nav (edited)
│   ├── ExpenseForm.tsx         # Icons, inline validation feedback (edited)
│   ├── ReceiptCapture.tsx      # Icons, state feedback (edited)
│   ├── CategoryPicker.tsx      # Icons/emoji accents (edited)
│   └── ui/                     # NEW reusable primitives
│       ├── Icon.tsx            # FontAwesome wrapper w/ a11y (decorative vs meaningful)
│       ├── ThemeProvider.tsx   # Theme context: system|light|dark + persistence
│       ├── ThemeToggle.tsx     # Header control (2-tap switch)
│       ├── Toast.tsx           # Toast context + non-blocking notifications
│       ├── ConfirmDialog.tsx   # Styled destructive-action confirmation
│       ├── EmptyState.tsx      # Purpose + primary action
│       └── Skeleton.tsx        # Loading placeholders
│   └── charts/                 # NEW dependency-free SVG charts
│       ├── TrendChart.tsx      # Spending-over-time (area/line)
│       └── CategoryBreakdownChart.tsx  # Donut or horizontal bars
└── lib/
    ├── theme.ts                # Pure theme-resolution helpers (tested)
    └── chart-data.ts           # Pure transforms: expenses → chart datasets (tested)

tests/
├── theme.test.ts               # Theme resolution + persistence logic
├── chart-data.test.ts          # Trend + breakdown data transforms
└── ui-feedback.test.tsx        # Toast / ConfirmDialog / EmptyState behavior
```

**Structure Decision**: Single Next.js App Router project (matches the constitution's
"frontend + API routes in one project"). New presentational primitives live under
`src/components/ui/` and `src/components/charts/`; pure, testable logic lives under
`src/lib/` (`theme.ts`, `chart-data.ts`) so behavior is unit-tested without rendering.
Global design tokens and shared component styles remain in `app/globals.css` (hand-rolled
CSS is retained rather than introducing a CSS framework, per Principle V).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New dependency: FontAwesome free | Explicit, clarified product requirement (spec FR-015; 2026-07-12 clarification) to make "liberal use" of icons; provides a consistent, accessible, tree-shakeable UI icon set | Emoji-only was offered and rejected by the user during clarification — emoji render inconsistently across platforms and are weak for precise UI affordances (nav, actions, states) |
| Custom SVG chart components (net-new code, but no dependency) | Deliver the required trend + breakdown charts (FR-016) with high visual fidelity, theme-awareness, and no React 19 peer-dependency risk | A charting library (Recharts/Chart.js) was rejected: only two modest charts are needed, libraries add significant bundle weight and carry React 19 peer-dependency friction, conflicting with Principle V |
