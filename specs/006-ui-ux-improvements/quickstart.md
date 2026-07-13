# Quickstart & Validation: Better UI & UX

A validation/run guide proving the redesign works end-to-end. Implementation details live in
`tasks.md` and the code; this file is how you confirm the feature is done.

## Prerequisites

- Node + npm installed; repo dependencies installed (`npm install`) — this feature adds the
  FontAwesome free packages, so re-run `npm install` after they are added to `package.json`.
- A working local env (`.env.local`) with Google OAuth + Neon configured, as for normal dev.
- An allowlisted Google account with some confirmed expenses across a few categories and
  dates (needed to see charts populate); optionally at least one receipt draft.

## Run

```bash
npm run dev        # start the app (http://localhost:3000)
```

Sign in with an allowlisted Google account and open the app screens.

## Automated gates (must pass — Constitution II)

```bash
npm run lint       # eslint + prettier --check
npm run build      # next build + type check
npm test           # vitest run
```

Expected: all pass, including new tests (`tests/theme.test.ts`, `tests/chart-data.test.ts`,
`tests/ui-feedback.test.tsx`) and the pre-existing suite (no regressions — SC-007).

## Manual validation scenarios

Map each scenario to the spec's success criteria / user stories.

1. **Cohesive visual design (US1 / SC-001)**
   - Visit Expenses, Receipts, Capture, Categories, sign-in, and not-authorized.
   - Confirm shared typography, spacing, cards, buttons, color accents, and iconography;
     no screen looks noticeably rougher than the others.

2. **Iconography, liberal use (FR-015 / SC-009)**
   - Confirm nav items, action buttons, and state indicators carry consistent FontAwesome
     icons, and categories/expenses show emoji or icon accents.
   - With a screen reader, confirm decorative icons are silent and meaningful ones are named.

3. **Theme toggle (FR-002 / SC-011)**
   - Use the header theme toggle to switch light ↔ dark in ≤ 2 taps; confirm the whole app
     (including charts and icons) recolors and stays legible/contrasty in both themes.
   - Reload the page: the chosen theme persists and there is **no** flash of the wrong theme.
   - Set the OS to dark with preference on "system": app follows the OS.

4. **Spending charts (FR-016 / SC-010)**
   - On Expenses, confirm a spending-over-time trend chart and a category breakdown chart
     render, are legible on a phone width, and match the visible totals.
   - Narrow the viewport (DevTools device mode): charts stay readable (breakdown may switch
     to bars); no horizontal scrolling (SC-008).
   - Filter to a range/category with 0–1 data points: charts show the text/summary fallback
     instead of an empty canvas.

5. **Feedback states (US2 / SC-002, SC-003)**
   - Add/edit/confirm an expense on a throttled connection: the submit control disables and a
     loading indicator shows; on success a non-blocking toast appears.
   - Force an error (e.g., offline): a plain-language error message with retry appears.
   - Open a screen with no data (fresh filter / empty state): a friendly empty state explains
     the screen and offers the primary action.

6. **Destructive confirmation (FR-008)**
   - Delete an expense/category: a styled confirm dialog appears; Cancel makes no change;
     Confirm performs the delete and toasts success.

7. **Accessibility & motion (FR-012 / SC-006)**
   - Keyboard-tab through each screen: focus is visible and ordered; all controls reachable.
   - Enable "reduce motion": chart/skeleton/sheet animations are minimized or removed.
   - Run an automated a11y audit (e.g., Lighthouse/axe) on each primary screen: no critical
     or serious issues.

8. **Mobile ergonomics (US1 / SC-008)**
   - On a mid-range phone (or device emulation), confirm no horizontal scrolling and all tap
     targets meet the 44px minimum.

## Definition of done

- All automated gates pass; all manual scenarios above pass.
- Spec `Status` moved to `complete`; no existing functionality regressed (FR-014).
