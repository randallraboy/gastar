# UI Contract: Mobile-Friendly Receipt Capture

**Feature**: 002-mobile-receipt-capture | **Date**: 2026-07-02

Design-system declaration per the web-design-engineer skill workflow ("declare the system
before writing code", "adding to an existing UI" mode). This extends — never replaces — the
visual vocabulary already in `app/globals.css`.

## Design system declaration

- **Anchor**: existing gastar UI (quiet, neutral, utilitarian personal tool). No rebrand.
- **Color palette**: unchanged tokens — neutral fg/bg (`#171717`/`#fafafa`, dark
  `#ededed`/`#0a0a0a`), single primary blue (`#2563eb`, dark `#3b82f6`), danger red,
  muted gray, hairline borders. New UI introduces **no new hues**; any needed variants
  derive from these (skill rule: never invent hues).
- **Typography**: system font stack (established vocabulary; deliberate Principle-V
  override of the skill's webfont preference). Fluid scale via `clamp()`:
  - `--fs-body: clamp(0.9375rem, 0.9rem + 0.2vw, 1rem)`
  - `--fs-h1: clamp(1.375rem, 1.2rem + 1vw, 1.75rem)`; h2 scales proportionally.
- **Spacing system**: 4px base — tokens `--space-1..6` = 4/8/12/16/24/32px. Replace ad-hoc
  inline margins on touched screens.
- **Border-radius strategy**: unchanged — 8px cards/modals, 6px controls, 999px badges.
- **Shadow/elevation**: borders remain the primary separator (current vocabulary); one
  elevation token for overlays: `--shadow-sheet: 0 -8px 30px rgb(0 0 0 / 0.12)`.
- **Motion**: 150–200ms ease-out for sheet slide-in and progress transitions; all new
  motion wrapped in `@media (prefers-reduced-motion: no-preference)`.
- **Touch**: `--tap-min: 44px` minimum interactive height/width on touch layouts; ≥ 8px
  gaps between adjacent targets (FR-006).
- **Anti-cliché commitments** (skill): no gradients, no emoji-as-icons (text labels or
  simple inline SVG), no fabricated content; placeholders labeled honestly.

## Breakpoints

| Token | Range | Layout |
|-------|-------|--------|
| mobile | < 768px | Bottom tab bar, single column, cards, full-height sheets |
| desktop | ≥ 768px | Existing top nav, current layouts (unchanged capability, FR-012) |

One breakpoint only — 5 screens for 1–2 users does not justify a grid system (Principle V).

## Screen contracts (mobile < 768px)

### Navigation shell (`app/(app)/layout.tsx`)

- Bottom tab bar, fixed, 4 items: **Expenses · Capture · Receipts · Categories**; active
  state = primary color + label; `env(safe-area-inset-bottom)` padding.
- Capture tab is visually primary (center emphasis). Tap count contract: any screen →
  Capture tab (1 tap) → camera opens (1 tap) = **≤ 2 taps** (FR-001, SC-002).
- Desktop ≥ 768px: existing top bar unchanged; sign-out and account email move into a
  compact overflow row on mobile (not lost — FR-012 applies per-viewport capability).
- Content gets bottom padding = tab-bar height + safe area (no content hidden behind bar).

### Capture flow (`ReceiptCapture` on Receipts screen / Capture tab)

States per [data-model.md](../data-model.md) client state machine:

- **idle**: full-width primary button "Take photo" (opens `input capture="environment"`),
  secondary "Choose file" (same input, no capture — explicit FR-004 fallback path, always
  visible, also the desktop default).
- **preview**: captured image fills available width (correct EXIF orientation,
  `image-orientation: from-image`), two actions: "Retake" (secondary) / "Use this photo"
  (primary). Both ≥ `--tap-min`.
- **uploading**: determinate progress bar (fraction from upload helper), photo still
  visible, cancel available.
- **error**: plain-language message + "Retry" (primary, same file) + "Retake". No raw
  browser/HTTP jargon.
- **success**: brief confirmation ("Receipt queued"), auto-return to idle; pending list
  refreshes; next capture available immediately (FR-009).

### Expenses screen

- Filters (date range, category) as touch-friendly stacked controls; ≥ `--tap-min` inputs.
- Table → card list under 768px: each card shows amount (prominent), merchant, date,
  category badge, receipt-photo indicator; tap → detail/edit sheet.
- Filtered total stays visible (sticky summary row acceptable).
- Draft-review flow completes fully on mobile, including viewing the attached receipt image
  (Story 2 scenario 2).

### Modals → sheets

- `.modal` on mobile renders as bottom sheet: full width, max-height ~92vh, slide-up,
  scrollable body, safe-area padding; desktop keeps centered dialog.
- Forms inside sheets: inputs ≥ `--tap-min`, correct mobile keyboards via input
  types/`inputmode` (decimal for amount, date picker for dates).

### Categories screen

- Single-column list; add/rename/delete actions ≥ `--tap-min`.

## Accessibility & platform behavior

- No horizontal scroll at 360×640 through 430×932 (SC-003 reference viewports).
- Text ≥ 16px in form inputs (prevents iOS focus zoom).
- Dark mode: all new UI uses tokens only — inherits existing `prefers-color-scheme`.
- Focus states visible for keyboard/switch access; buttons are real `<button>` elements.
- Backgrounding mid-capture: component state survives tab re-activation (no submission
  side effects on visibility change); a killed tab returns to idle — sane-state edge case.

## v0 checkpoint (skill workflow)

Implementation sequences a v0 pass first — nav shell + capture skeleton + card-list layout
with placeholder polish — validated on a real phone against this contract before refinement.
