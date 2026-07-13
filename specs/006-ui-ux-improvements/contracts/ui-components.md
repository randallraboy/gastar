# Phase 1 Contracts: UI Components

This feature is an application UI, so its "interfaces" are the reusable component contracts
and the pure helper signatures other code depends on. **No new HTTP API endpoints or
request/response schemas are introduced** — the existing `/api/expenses`, `/api/categories`,
`/api/receipts`, and `/api/expenses/[id]/*` contracts are unchanged. These component
contracts define the boundary tasks/tests will build against.

## Pure helpers (unit-tested)

### `src/lib/theme.ts`

```ts
type ThemePreference = "system" | "light" | "dark";
type EffectiveTheme = "light" | "dark";

// Pure: precedence = explicit override > system (prefersDark).
function resolveEffectiveTheme(pref: ThemePreference, prefersDark: boolean): EffectiveTheme;

// Parse a possibly-invalid stored value into a valid preference ("system" default).
function normalizeThemePreference(raw: string | null): ThemePreference;

// Storage key constant used by ThemeProvider + the no-FOUC inline script.
const THEME_STORAGE_KEY = "gastar.theme";
```

**Contract**: `resolveEffectiveTheme("system", true) === "dark"`;
`resolveEffectiveTheme("light", true) === "light"`; unknown stored strings normalize to
`"system"`.

### `src/lib/chart-data.ts`

```ts
function toTrendSeries(
  items: { expenseDate: string; amountCents: number }[],
  range: { from?: string; to?: string },
): TrendPoint[];

function toCategorySlices(
  categoryTotals: { categoryId: string; name: string; bucket: BudgetCategory; sumCents: number }[],
): CategorySlice[];

// Both return [] (or a single-point series) → components show the text fallback.
```

**Contract**: deterministic for identical input; buckets sorted ascending by period; slices
sorted descending by amount with `share` summing to ≈1 (excluding an "Other" group);
zero-total input yields an empty result that triggers the fallback.

## Component contracts

### `Icon` — `src/components/ui/Icon.tsx`

```tsx
<Icon name={IconDefinition} label?={string} decorative?={boolean} className?={string} />
```

- `decorative` (default true when no `label`): renders `aria-hidden="true"`.
- `label` present → sets accessible name (meaningful icon). Enforces FR-012/FR-015 a11y.

### `ThemeProvider` / `ThemeToggle` — `src/components/ui/`

```tsx
<ThemeProvider>{children}</ThemeProvider>
// context: { preference, effectiveTheme, setPreference(pref) }
<ThemeToggle />  // switches theme in ≤ 2 taps; persists; updates <html data-theme>
```

- Must not flash the wrong theme on load (pre-hydration inline script sets `data-theme`).

### `Toast` — `src/components/ui/Toast.tsx`

```tsx
const { notify } = useToast();
notify({ kind: "success" | "error" | "info", message: string, timeoutMs?: number });
```

- Non-blocking, auto-dismiss, rendered in a polite ARIA live region (FR-005, FR-006).

### `ConfirmDialog` — `src/components/ui/ConfirmDialog.tsx`

```tsx
const confirmed: boolean = await confirm({
  title, message, confirmLabel?, tone?: "danger" | "default",
});
```

- Replaces native `confirm()`; cancel resolves `false` with no side effects (FR-008).

### `EmptyState` — `src/components/ui/EmptyState.tsx`

```tsx
<EmptyState icon={IconDefinition} title={string} description={string} action?={ReactNode} />
```

- Explains the screen's purpose and offers the primary next action (FR-007).

### `Skeleton` — `src/components/ui/Skeleton.tsx`

```tsx
<Skeleton variant="text" | "card" | "chart" count?={number} />
```

- Loading placeholder; respects `prefers-reduced-motion` (no shimmer when reduced).

### Charts — `src/components/charts/`

```tsx
<TrendChart data={TrendPoint[]} />               // renders fallback when data.length < 2
<CategoryBreakdownChart data={CategorySlice[]} /> // renders fallback when data is empty
```

- Responsive SVG; colors read from theme CSS custom properties; accessible summary/label
  provided for screen readers (FR-012, FR-016).

## Non-goals (explicitly out of contract)

- No new/changed HTTP endpoints, request bodies, or response shapes.
- No database schema, migration, or entity changes.
- No server-side theme storage (theme is client-only).
