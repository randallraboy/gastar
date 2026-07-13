# Phase 1 Data Model: Better UI & UX

This feature introduces **no persistent database entities and no schema changes**. It is a
presentation/interaction feature. The "data" involved is (a) one piece of client-side
persisted preference and (b) derived, in-memory datasets computed from data the existing
API already returns. Documented here so tasks and tests have a precise contract.

## Client-persisted state

### ThemePreference

- **Represents**: The user's chosen color-theme mode.
- **Storage**: `localStorage` key `gastar.theme` (client only; not sent to the server).
- **Value**: one of `"system" | "light" | "dark"`. Absent/invalid → treated as `"system"`.
- **Derived**: `effectiveTheme: "light" | "dark"` = if preference is `light`/`dark` use it;
  if `system`, resolve from `prefers-color-scheme`.
- **Rules**:
  - Explicit `light`/`dark` overrides the OS preference.
  - `effectiveTheme` is written to `<html data-theme="...">` before first paint (no FOUC).
  - Changing the preference updates `localStorage` and the `data-theme` attribute immediately.
- **Owned by**: `src/lib/theme.ts` (pure resolution helpers) + `ThemeProvider`.

## Derived / in-memory datasets (no persistence)

These are computed by pure functions in `src/lib/chart-data.ts` from the existing
`/api/expenses` response. They are recomputed on load/filter change and never stored.

### TrendPoint (series for `TrendChart`)

- **Fields**: `bucketLabel: string` (e.g., `2026-07-01` / `Jul` / ISO week), `periodStart:
  string` (date), `totalCents: number`.
- **Source**: confirmed expense items (`expenseDate`, `amountCents`) from the current filter.
- **Rules**:
  - Bucket granularity chosen from the active date range (day for short ranges, week/month
    for longer) to keep the x-axis legible on phone widths.
  - Series sorted ascending by `periodStart`.
  - `totalCents` is the summed amount within the bucket.
  - Insufficient data (0–1 points) → chart component renders the text/summary fallback.

### CategorySlice (series for `CategoryBreakdownChart`)

- **Fields**: `categoryId: string`, `label: string`, `bucket: BudgetCategory`,
  `amountCents: number`, `share: number` (0–1 of the visible total), `accent: string`
  (theme token / color for the slice).
- **Source**: existing top-level `categoryTotals` from the `/api/expenses` response.
- **Rules**:
  - `share = amountCents / sum(amountCents)`; if the total is 0 → fallback (no chart).
  - Slices sorted descending by `amountCents`; very small slices may group into "Other" to
    keep the donut/legend readable.
  - `accent` comes from the per-bucket/per-category accent palette in the design tokens, so
    it recolors correctly in light/dark.

## UI state (component-local, non-persistent)

- **Toast**: `{ id, kind: "success" | "error" | "info", message, timeoutMs }` managed by the
  `Toast` context; auto-dismisses and is announced to assistive tech (polite live region).
- **ConfirmDialog**: `{ title, message, confirmLabel, tone: "danger" | "default" }` with
  resolve/cancel; cancel has no side effects (FR-008).
- **Loading / EmptyState**: booleans/props already implied by each page's fetch lifecycle;
  standardized via `Skeleton` and `EmptyState` components.

## Relationships & invariants

- No entity relationships change. Existing entities (Expense, Category, Receipt) are read-
  only inputs to the derived datasets above and are untouched by this feature (FR-014).
- The derived datasets are a pure function of the current `/api/expenses` response + active
  filters; identical inputs always yield identical charts (supports deterministic tests).
