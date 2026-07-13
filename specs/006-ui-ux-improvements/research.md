# Phase 0 Research: Better UI & UX

All spec ambiguities were resolved in the 2026-07-12 clarification session, so no
NEEDS CLARIFICATION markers remain. This document records the technical decisions that
turn those product choices into an implementable approach for a Next.js 15 / React 19 /
TypeScript app with hand-rolled CSS.

## 1. Icon system (FontAwesome free + emoji)

- **Decision**: Add FontAwesome free via the React SVG integration —
  `@fortawesome/fontawesome-svg-core`, `@fortawesome/free-solid-svg-icons`, and
  `@fortawesome/react-fontawesome`. Wrap it in a single `src/components/ui/Icon.tsx` so the
  rest of the app imports one typed component. Emoji are used as category/expense accents
  (data-driven, no dependency).
- **Rationale**: The SVG integration is tree-shakeable (only imported icons ship),
  TypeScript-friendly, and lets the wrapper enforce accessibility — `aria-hidden` for
  decorative icons and an accessible label (`title`/`aria-label`) for meaningful ones
  (FR-015, FR-012). Centralizing in `Icon.tsx` keeps icon usage consistent and makes future
  swaps trivial.
- **Alternatives considered**:
  - FontAwesome CSS/webfont (`@fortawesome/fontawesome-free` + `<i class="fa-...">`): one
    dependency and simplest wiring, but ships the whole font (larger payload), weaker
    per-icon a11y control, and class-string usage is untyped. Rejected for payload + a11y.
  - Emoji-only / inline SVG (Lucide): explicitly declined by the user during clarification.
- **A11y note**: Meaningful icons paired with text keep the icon decorative; icon-only
  controls get an accessible name. Honors `prefers-reduced-motion` for any icon animation.

## 2. Spending data visualization (charts)

- **Decision**: Build two dependency-free, responsive SVG chart components:
  `TrendChart` (spending over time — area/line) and `CategoryBreakdownChart` (category
  share — donut with legend, degrading to horizontal bars on narrow widths). Both consume
  plain datasets produced by pure functions in `src/lib/chart-data.ts`.
- **Rationale**: Only two modest charts are required (FR-016). Hand-rolled SVG gives full
  control over the expressive-modern look, uses the same CSS custom properties as the rest
  of the theme (so charts recolor automatically in light/dark), adds zero bundle weight, and
  avoids React 19 peer-dependency friction that current charting libraries still carry.
  Separating data transforms into `chart-data.ts` makes chart correctness unit-testable
  without rendering (SC-010).
- **Data source**: No new backend work. `/api/expenses` already returns `sumCents`,
  hierarchical `categoryTotals`, and items with `expenseDate` + `amountCents`. The trend
  series is bucketed client-side (by day/week/month depending on range); the breakdown maps
  from the existing top-level `categoryTotals`.
- **Alternatives considered**: Recharts / Chart.js (react-chartjs-2) / visx. Rejected under
  Principle V — heavy for two charts and adds React 19 peer-friction. Reconsider only if
  richer interactive charting is requested later.
- **Fallback**: When there is insufficient data (0–1 points, or no confirmed expenses),
  charts render a readable text/summary fallback rather than an empty canvas (FR-016 edge
  case).

## 3. Manual light/dark theme toggle

- **Decision**: A `ThemeProvider` client context exposing `theme: "system" | "light" |
  "dark"` and a resolved effective theme. Selection persists in `localStorage` under a
  stable key. The effective theme is written as `data-theme="light|dark"` on `<html>`. A
  small blocking inline script in `app/layout.tsx` sets the attribute before first paint to
  avoid a flash of the wrong theme (FOUC). Pure resolution logic lives in `src/lib/theme.ts`.
- **Rationale**: `data-theme` + CSS custom properties is the standard, framework-agnostic
  pattern and layers cleanly on top of the existing `@media (prefers-color-scheme)` styling.
  Keeping resolution pure (`theme.ts`) makes the precedence rules (explicit override >
  system) unit-testable (SC-011). The inline pre-hydration script is the accepted way to
  prevent FOUC in SSR/App Router apps.
- **CSS refactor**: `app/globals.css` currently themes via `@media (prefers-color-scheme:
  dark)`. Refactor dark tokens to apply under BOTH `:root[data-theme="dark"]` and
  `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])`, so system default
  still works while explicit overrides win.
- **Alternatives considered**: `next-themes` — small and popular, but hand-rolling is a few
  lines given the existing CSS-variable setup, avoids another dependency (Principle V), and
  removes App-Router/React-19 compatibility questions.

## 4. Expressive-modern design system

- **Decision**: Extend `app/globals.css` design tokens rather than adopt a CSS framework —
  add an elevation/shadow scale, larger radius scale, a semantic accent palette with a
  per-bucket/per-category accent color, and motion tokens (already partially present). Build
  shared classes for cards, buttons, badges, chips, toasts, skeletons, and empty states.
  Retain the existing mobile-first breakpoints, bottom-nav, and sheet-modal patterns.
- **Rationale**: The app already uses a coherent hand-rolled token system; extending it is
  lower-risk and lighter than introducing Tailwind/CSS-in-JS (Principle V) and keeps a
  single source of truth that charts and icons also read from. Theme-aware tokens guarantee
  contrast in both themes (FR-012, FR-017).
- **Alternatives considered**: Tailwind CSS or a component library (shadcn/MUI). Rejected —
  large migration for a small personal app, and overkill for ~6 screens.

## 5. Feedback states (loading / success / error / empty / confirm)

- **Decision**: Add a `Toast` context for non-blocking success/error messages, `Skeleton`
  components for loading, an `EmptyState` component, and a `ConfirmDialog` that replaces the
  native `confirm()` calls (e.g., `deleteExpense`) with a styled, cancelable dialog reusing
  the existing modal/sheet pattern. Submit controls disable while their action is in flight
  (FR-004, FR-005, FR-006, FR-007, FR-008).
- **Rationale**: These are small, dependency-free primitives that make every action's state
  explicit and consistent across screens, directly satisfying User Story 2. Reusing the
  existing modal/sheet styles keeps the sheet-slide-up mobile behavior and reduced-motion
  handling already in `globals.css`.
- **Alternatives considered**: A toast/dialog library (e.g., sonner, radix) — unnecessary
  for a single-user app and adds dependencies (Principle V).

## 6. Testing strategy

- **Decision**: Unit-test the pure logic — `theme.ts` (precedence + persistence) and
  `chart-data.ts` (bucketing, breakdown mapping, insufficient-data fallback) — plus
  component behavior for `Toast`, `ConfirmDialog`, and `EmptyState` via Testing Library.
  Keep and re-run the existing suite to guard against regressions (SC-007, FR-014).
- **Rationale**: Behavioral logic (theme resolution, chart math, confirm/cancel flows) is
  where bugs hide; pure functions are cheap to test. Visual polish is validated manually via
  `quickstart.md`. Matches Constitution Principle II.
- **Alternatives considered**: Adding visual-regression/E2E tooling (Playwright) — out of
  scope for this feature and not currently in the stack.
