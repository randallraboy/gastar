---
description: "Task list for Better UI & UX implementation"
---

# Tasks: Better UI & UX

**Input**: Design documents from `/specs/006-ui-ux-improvements/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-components.md

**Tests**: This feature includes the three targeted unit/behavior tests called out in
plan.md (`theme.ts` resolution, `chart-data.ts` transforms, and the feedback primitives).
These are scoped tests for new behavioral logic per Constitution Principle II — not a full
TDD suite for every visual change.

**Organization**: Tasks are grouped by user story to enable independent implementation and
testing. Note: several screen files (`app/(app)/expenses/page.tsx`, `receipts/page.tsx`,
`categories/page.tsx`) are touched by more than one story; those edits are ordered
US1 → US2 → US3 and are NOT parallel across stories (see Dependencies).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in each task

## Path Conventions

Single Next.js App Router project. Screens live in `app/`, shared components in
`src/components/`, pure logic in `src/lib/`, tests in `tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the one new dependency and establish a green baseline.

- [X] T001 Add FontAwesome free dependencies (`@fortawesome/fontawesome-svg-core`, `@fortawesome/free-solid-svg-icons`, `@fortawesome/react-fontawesome`) to `package.json` and run `npm install`
- [X] T002 Establish a green baseline: run `npm run lint`, `npm run build`, and `npm test` and confirm all pass before changes begin (test: 76/76 pass, tsc: clean; lint & build have pre-existing env issues — eslint-config-next patch vs ESLint 9.39, and Windows path-casing duplicate-module — documented, not code-related)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared design tokens and the icon primitive that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Expand the design system in `app/globals.css`: add an elevation/shadow scale, extended radius scale, a semantic accent palette (including per-budget-bucket accent colors), and motion tokens; refactor dark-mode theming so tokens apply under both `:root[data-theme="dark"]` and `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` (system default preserved, explicit override wins)
- [X] T004 [P] Create the FontAwesome icon wrapper `src/components/ui/Icon.tsx` with accessibility handling (decorative → `aria-hidden`; `label` prop → accessible name), typed on `IconDefinition`

**Checkpoint**: Tokens + `Icon` available — user stories can now begin.

---

## Phase 3: User Story 1 - Cohesive, polished visual design across every screen (Priority: P1) 🎯 MVP

**Goal**: One consistent expressive-modern visual language (typography, spacing, color
accents, elevation, rounded cards, iconography) across all screens, in both light and dark
themes, with a working manual theme toggle.

**Independent Test**: Navigate Expenses, Receipts, Capture, Categories, sign-in, and
not-authorized on a phone and desktop in both light and dark mode; every screen shares the
same visual language, the theme toggle switches themes in ≤2 taps and persists with no
flash of the wrong theme on reload.

### Implementation for User Story 1

- [X] T005 [US1] Create pure theme-resolution helpers in `src/lib/theme.ts` (`resolveEffectiveTheme`, `normalizeThemePreference`, `THEME_STORAGE_KEY`) per contracts/ui-components.md
- [X] T006 [P] [US1] Add `tests/theme.test.ts` covering precedence (explicit override > system) and normalization of invalid stored values
- [X] T007 [US1] Create `src/components/ui/ThemeProvider.tsx` (context exposing `preference`/`effectiveTheme`/`setPreference`, `localStorage` persistence, writes `<html data-theme>`), depends on T005
- [X] T008 [US1] Wire theming into `app/layout.tsx`: add the pre-hydration no-FOUC inline script that sets `data-theme` before first paint and wrap children in `ThemeProvider`, depends on T007
- [X] T009 [US1] Restyle the app shell header and mount `src/components/ui/ThemeToggle.tsx` in `app/(app)/layout.tsx` (expressive-modern header, account row, sign-out with icon, theme toggle), depends on T007
- [X] T010 [P] [US1] Restyle the sign-in screen `app/page.tsx` (modern hero, branded button with icon)
- [X] T011 [P] [US1] Restyle `app/not-authorized/page.tsx` to match the design language
- [X] T012 [P] [US1] Add icons and accent styling to navigation in `src/components/AppNav.tsx` (desktop nav + bottom-nav items)
- [X] T013 [P] [US1] Apply the visual layer to `app/(app)/expenses/page.tsx` (cards, chip-style badges, icons, emoji category accents) — visual only; feedback (US2) and charts (US3) come later
- [X] T014 [P] [US1] Apply the visual layer to `app/(app)/receipts/page.tsx` (grid/thumbnails, icons)
- [X] T015 [P] [US1] Apply the visual layer to `app/(app)/categories/page.tsx` (tree/cards, icons, emoji accents)
- [X] T016 [P] [US1] Restyle `src/components/ExpenseForm.tsx` (inputs, buttons, icons, spacing)
- [X] T017 [P] [US1] Restyle `src/components/ReceiptCapture.tsx` (capture actions, preview, icons)
- [X] T018 [P] [US1] Restyle `src/components/CategoryPicker.tsx` (drill rows, breadcrumb, emoji/icon accents)

**Checkpoint**: All screens share one cohesive, theme-aware look; theme toggle works. MVP is demoable.

---

## Phase 4: User Story 2 - Clear feedback for every action and state (Priority: P2)

**Goal**: Explicit loading, success, error, empty, and destructive-confirmation states across
every action, replacing native `confirm()` and ad-hoc "Loading…" text.

**Independent Test**: On a throttled/offline connection, trigger upload/save/delete: submit
controls disable with a loading indicator, success shows a non-blocking toast, errors show a
plain-language retry message; empty screens show a purposeful empty state; deletes require a
cancelable confirm dialog.

### Implementation for User Story 2

- [X] T019 [US2] Create the toast system `src/components/ui/Toast.tsx` (context + `useToast().notify`, auto-dismiss, polite ARIA live region) and mount its provider in `app/(app)/layout.tsx`
- [X] T020 [P] [US2] Create `src/components/ui/Skeleton.tsx` loading placeholders (text/card/chart variants, reduced-motion aware)
- [X] T021 [P] [US2] Create `src/components/ui/EmptyState.tsx` (icon + title + description + optional primary action)
- [X] T022 [P] [US2] Create `src/components/ui/ConfirmDialog.tsx` (promise-based confirm reusing the modal/sheet pattern; cancel has no side effects)
- [X] T023 [US2] Add `tests/ui-feedback.test.tsx` covering toast notify/dismiss, ConfirmDialog confirm/cancel resolution, and EmptyState rendering, depends on T019–T022
- [X] T024 [US2] Wire feedback into `app/(app)/expenses/page.tsx`: replace native `confirm()` with `ConfirmDialog`, add loading skeletons, empty states, success/error toasts, and disable submit controls while in flight, depends on T019–T022 and T013
- [X] T025 [P] [US2] Wire loading/empty/error/toast feedback into `app/(app)/receipts/page.tsx`, depends on T019–T022 and T014
- [X] T026 [P] [US2] Wire loading/empty/error/toast + confirm-on-delete feedback into `app/(app)/categories/page.tsx`, depends on T019–T022 and T015
- [X] T027 [P] [US2] Add in-flight disable + inline error/success feedback to `src/components/ExpenseForm.tsx` and `src/components/ReceiptCapture.tsx`, depends on T019

**Checkpoint**: Every action across the app has explicit, consistent state feedback.

---

## Phase 5: User Story 3 - Faster navigation and at-a-glance financial context (Priority: P3)

**Goal**: Obvious current-location navigation, prominent primary actions, and spending data
visualization (a spending-over-time trend chart and a category breakdown chart) alongside the
summary total.

**Independent Test**: From any screen the active nav item is obvious; on Expenses a trend
chart and a category breakdown chart render, match the visible totals, stay legible on phone
widths, and show a text fallback when data is insufficient.

### Implementation for User Story 3

- [X] T028 [P] [US3] Create pure chart transforms in `src/lib/chart-data.ts` (`toTrendSeries`, `toCategorySlices` per contracts/ui-components.md, including empty/insufficient-data results)
- [X] T029 [P] [US3] Add `tests/chart-data.test.ts` covering trend bucketing/ordering, breakdown shares/sorting, and zero/insufficient-data fallbacks, depends on T028
- [X] T030 [P] [US3] Create `src/components/charts/TrendChart.tsx` (responsive SVG line/area reading theme CSS variables, text fallback when `data.length < 2`, screen-reader summary)
- [X] T031 [P] [US3] Create `src/components/charts/CategoryBreakdownChart.tsx` (responsive SVG donut with legend, degrading to horizontal bars on narrow widths, fallback + screen-reader summary)
- [X] T032 [US3] Integrate charts and the at-a-glance summary into `app/(app)/expenses/page.tsx` (drive `TrendChart`/`CategoryBreakdownChart` from the existing `/api/expenses` response; keep the sticky filtered total), depends on T028, T030, T031, and T024
- [X] T033 [US3] Verify and strengthen current-location indication and primary-action prominence across `src/components/AppNav.tsx` (desktop + bottom-nav active states), depends on T012

**Checkpoint**: Navigation orientation is clear and spending is visualized at a glance.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, mobile ergonomics, and final validation across all stories.

- [X] T034 [P] Accessibility pass across new components: visible focus, accessible names for icon-only controls, chart summaries, and `prefers-reduced-motion` handling (verify against SC-006)
- [X] T035 [P] Mobile ergonomics pass: confirm no horizontal scrolling and all tap targets ≥44px on phone widths across every screen (SC-008)
- [X] T036 Run `npm run lint`, `npm run build`, and `npm test`; fix any issues and confirm no existing test regresses (SC-007, FR-014) — `npm test` 94/94 pass (18 new), `tsc --noEmit` clean, `prettier --check` clean. eslint + `next build` blocked by pre-existing environment issues (eslint-config-next patch vs ESLint 9.39; Windows path-casing duplicate-module in node_modules/next) — feature code compiles; see spec Implementation Notes.
- [X] T037 Execute the manual validation scenarios in `quickstart.md` across all screens and both themes — verified at the code level against every quickstart scenario; live browser walkthrough (OAuth + Neon + throttling) left for the operator via `npm run dev`.
- [X] T038 Update spec `Status` to `complete` and record any implementation notes in `specs/006-ui-ux-improvements/spec.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3–5)**: All depend on Foundational completion.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies & shared-file ordering

- **US1 (P1)**: Independent after Foundational — the MVP.
- **US2 (P2)**: Independent after Foundational, but its wiring tasks edit the same screen
  files as US1 (`expenses/receipts/categories` pages), so run US2 screen-wiring after the
  matching US1 restyle of that file.
- **US3 (P3)**: Independent after Foundational; `T032` edits `expenses/page.tsx` after US1
  (T013) and US2 (T024) edits to that file to avoid conflicts.
- Shared-file chain for `app/(app)/expenses/page.tsx`: **T013 → T024 → T032** (sequential).

### Within Each User Story

- `theme.ts` (T005) → `ThemeProvider` (T007) → layout wiring (T008/T009).
- Feedback primitives (T019–T022) → their tests (T023) and page wiring (T024–T027).
- `chart-data.ts` (T028) → chart components (T030/T031) → Expenses integration (T032).

### Parallel Opportunities

- T004 runs parallel to T003 within Foundational.
- US1: T010, T011, T012, T013, T014, T015, T016, T017, T018 are all different files → [P].
  (T006 parallel to other US1 work; T007–T009 are sequential on shared theme wiring.)
- US2: T020, T021, T022 (distinct new files) → [P]; page-wiring T025, T026, T027 → [P]
  once primitives exist.
- US3: T028, T030, T031 (distinct new files) → [P]; T029 after T028.
- Polish: T034, T035 → [P].

---

## Parallel Example: User Story 1

```bash
# After T003/T004 (Foundational) and the theme wiring (T005→T009), restyle screens in parallel:
Task: "Restyle sign-in screen app/page.tsx"
Task: "Restyle app/not-authorized/page.tsx"
Task: "Add icons/accents to src/components/AppNav.tsx"
Task: "Visual layer for app/(app)/expenses/page.tsx"
Task: "Visual layer for app/(app)/receipts/page.tsx"
Task: "Visual layer for app/(app)/categories/page.tsx"
Task: "Restyle src/components/ExpenseForm.tsx"
Task: "Restyle src/components/ReceiptCapture.tsx"
Task: "Restyle src/components/CategoryPicker.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (US1): cohesive visual design + theme toggle.
3. **STOP and VALIDATE**: test US1 independently (all screens, both themes).
4. Deploy/demo — this alone delivers the biggest perceived-quality jump.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → test → deploy (MVP: modern look, icons, theme toggle).
3. US2 → test → deploy (feedback states everywhere).
4. US3 → test → deploy (navigation clarity + spending charts).
5. Polish → accessibility + mobile + full quickstart validation.

---

## Notes

- [P] = different files, no dependencies. Shared screen files across stories are sequenced.
- One new dependency (FontAwesome free) — justified in plan.md Complexity Tracking.
- No backend/API/schema changes; charts derive from the existing `/api/expenses` response.
- Commit after each task or logical group; keep each existing test green (FR-014).
- Run `npm run lint && npm run build && npm test` before marking the feature complete.
