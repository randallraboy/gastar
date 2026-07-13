# Feature Specification: Better UI & UX

**Feature Branch**: `006-ui-ux-improvements`

**Created**: 2026-07-12

**Status**: complete

**Input**: User description: "better Ui and UX"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cohesive, polished visual design across every screen (Priority: P1)

As someone who opens the expense tracker several times a day, I want every screen to
look clean, consistent, and intentionally designed so the app feels trustworthy and
pleasant to use rather than like a bare form.

**Why this priority**: Visual coherence is the foundation everything else builds on and
is what the user notices first. A single consistent design language (typography scale,
spacing rhythm, color, elevation, rounded corners, iconography) can be delivered on its
own and immediately raises the perceived quality of the whole app, making it a viable
standalone improvement.

**Independent Test**: Navigate through Expenses, Receipts, Capture, and Categories in
both light and dark mode on a phone and a desktop browser. Every screen should share the
same visual language — consistent headings, buttons, cards, spacing, and colors — with no
screen looking noticeably rougher than the others.

**Acceptance Scenarios**:

1. **Given** the user is on any primary screen, **When** they compare it to any other
   primary screen, **Then** headings, buttons, cards, inputs, and spacing follow the same
   consistent visual style.
2. **Given** the device is in dark mode, **When** the user opens any screen, **Then**
   colors, contrast, and elevation read clearly with no unreadable or washed-out elements.
3. **Given** the user is on a small phone screen, **When** they view any screen, **Then**
   content is comfortably readable and tappable targets meet a minimum touch size without
   horizontal scrolling.

---

### User Story 2 - Clear feedback for every action and state (Priority: P2)

As a user performing actions like uploading a receipt, saving an expense, or deleting a
category, I want the app to clearly show what is happening — loading, success, error, and
"nothing here yet" — so I never wonder whether an action worked.

**Why this priority**: Once the app looks consistent, the biggest UX gap is uncertainty.
Explicit loading, success, error, and empty states remove doubt and prevent duplicate or
lost actions. This layer is independently testable and valuable even without deeper
navigation changes.

**Independent Test**: Trigger each action (upload receipt, save expense, delete an item)
on a slow connection and an offline connection, and open a screen that has no data yet.
Each case should present a clear, human-readable loading indicator, success confirmation,
error message, or empty-state message respectively.

**Acceptance Scenarios**:

1. **Given** the user submits an action that takes time, **When** it is in progress,
   **Then** a visible loading indicator appears and the triggering control is disabled to
   prevent duplicate submissions.
2. **Given** an action succeeds, **When** it completes, **Then** the user sees a clear,
   non-blocking confirmation that the action succeeded.
3. **Given** an action fails, **When** the error occurs, **Then** the user sees a plain-
   language message explaining what went wrong and how to retry, without technical jargon.
4. **Given** a screen has no data yet, **When** the user opens it, **Then** a friendly
   empty state explains what the screen is for and offers the primary next action.
5. **Given** the user triggers a destructive action (e.g., delete), **When** they confirm,
   **Then** they are asked to confirm first and can cancel without consequence.

---

### User Story 3 - Faster navigation and at-a-glance financial context (Priority: P3)

As a user who mostly wants to check spending and add expenses quickly, I want obvious
navigation, a clear sense of where I am, and an at-a-glance summary of my spending so I
can complete common tasks in as few taps as possible.

**Why this priority**: With visuals and feedback solid, the remaining opportunity is
efficiency and orientation. Clear active-state navigation, prominent page context, and a
lightweight spending summary reduce taps and cognitive load. It is valuable but builds on
the prior two stories, so it is lowest priority.

**Independent Test**: From any screen, confirm the current location is visually obvious in
the navigation, the primary action for that screen is prominent, and a spending summary
(e.g., a running or period total) is visible where expenses are listed.

**Acceptance Scenarios**:

1. **Given** the user is on any screen, **When** they look at the navigation, **Then** the
   current screen is clearly indicated as active.
2. **Given** the user is viewing their expenses, **When** the list loads, **Then** a
   summary total for the current view/filter is visible without scrolling through every
   item, accompanied by spending visualizations (a spending-over-time trend chart and a
   category breakdown chart).
3. **Given** the user wants to perform the primary action of a screen (e.g., capture a
   receipt or add an expense), **When** they arrive on that screen, **Then** the primary
   action is the most visually prominent control.

---

### Edge Cases

- What happens on very long merchant names, category names, or notes? Text must truncate
  or wrap gracefully without breaking layout.
- How does the interface behave with a large number of expenses, receipts, or deeply
  nested categories? Layout and readability must hold and remain performant.
- How does the interface respond when the device requests reduced motion? Animations and
  transitions must be minimized or removed.
- What happens for users relying on keyboard navigation or screen readers? Focus order,
  focus visibility, labels, and active states must remain usable.
- How does the interface handle a very narrow or very wide viewport (small phone vs. large
  desktop)? Content must remain centered, readable, and free of horizontal scrolling.

## Clarifications

### Session 2026-07-12

- Q: Which icon/visual-aid system should the redesign standardize on? → A: FontAwesome (free/solid) for UI icons plus emoji for category/expense accents (a mix)
- Q: What counts as "visual aids" for spending — icons only, or actual data visualization? → A: Full data visualization, including trend charts (spending over time) and category breakdown charts
- Q: How bold should the "modern look" be relative to the current minimal design? → A: Expressive modern — per-category color accents, soft shadows/elevation, rounded cards, tasteful motion, and iconography throughout
- Q: Should the app add a manual light/dark theme toggle, or keep following the OS setting? → A: Add a manual in-app light/dark toggle on top of the system default

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The interface MUST apply a single, consistent, expressive-modern visual design
  language (typography scale, spacing, color, per-category color accents, soft
  shadows/elevation, rounded cards, tasteful motion/transitions, and control styling) across
  all primary screens: Expenses, Receipts, Capture, Categories, sign-in, and not-authorized.
- **FR-002**: The interface MUST render correctly and legibly in both light and dark
  color schemes, following the device's preference by default AND providing a manual in-app
  toggle that lets the user override the system preference; the chosen override MUST persist
  across visits.
- **FR-003**: The interface MUST be responsive, presenting an appropriate layout for phone
  and desktop widths without horizontal scrolling, and MUST keep interactive targets at or
  above a comfortable minimum touch size.
- **FR-004**: All actions that take perceptible time MUST show a loading indicator and MUST
  disable their triggering control while in progress to prevent duplicate submissions.
- **FR-005**: Successful actions MUST present a clear, non-blocking success confirmation.
- **FR-006**: Failed actions MUST present a plain-language error message that states what
  happened and how to retry.
- **FR-007**: Every screen that can be empty MUST present a friendly empty state that
  explains the screen's purpose and offers the primary next action.
- **FR-008**: Destructive actions MUST require an explicit confirmation step that can be
  cancelled without side effects.
- **FR-009**: Navigation MUST clearly indicate the user's current location on every screen.
- **FR-010**: Screens that list expenses MUST display an at-a-glance summary total for the
  current view or applied filter.
- **FR-011**: Each screen's primary action MUST be the most visually prominent control on
  that screen.
- **FR-012**: The interface MUST meet baseline accessibility expectations: visible keyboard
  focus, logical focus order, sufficient color contrast, labeled controls, and honoring the
  reduced-motion preference.
- **FR-013**: Long or overflowing text (merchant names, category names, notes, emails) MUST
  truncate or wrap gracefully without breaking layout.
- **FR-014**: The redesign MUST preserve all existing functionality and data; no current
  capability may be removed or regress as a result of the visual and interaction changes.
- **FR-015**: The interface MUST make liberal, consistent use of visual iconography — a
  FontAwesome (free/solid) icon set for interface icons (navigation, actions, and state
  indicators) combined with emoji accents for categories and expenses. Icons that convey
  meaning MUST have accessible text alternatives; purely decorative icons MUST be hidden
  from assistive technology.
- **FR-016**: The Expenses/Categories experience MUST include spending data visualization,
  including at least one trend chart (spending over time) and a category breakdown chart, in
  addition to the at-a-glance summary total. Charts MUST remain legible on phone widths and
  degrade to a readable text/summary fallback when there is insufficient data.
- **FR-017**: The interface MUST support both a system-default and a user-selected theme, and
  all icons, emojis, charts, color accents, and elevation MUST remain legible and contrast-
  compliant in both light and dark themes.

### Key Entities

Not applicable — this feature changes presentation and interaction only and introduces no
new data entities.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of primary screens share the same visual design language, verified by a
  side-by-side review of all screens in both light and dark mode.
- **SC-002**: Every user-triggered action that changes data has a distinct loading, success,
  and error presentation (100% coverage across capture, expense create/edit/confirm/delete,
  and category create/edit/delete).
- **SC-003**: Every screen that can be empty shows a purpose-explaining empty state (100%
  coverage).
- **SC-004**: A user can identify their current location in the app within 2 seconds on any
  screen during unmoderated review.
- **SC-005**: A user can see the total for their current expense view without additional
  taps or scrolling in 100% of expense-list states.
- **SC-006**: The interface passes an automated accessibility audit with no critical or
  serious issues on any primary screen.
- **SC-007**: No existing behavioral test regresses, and the application builds and type-
  checks cleanly after the changes.
- **SC-008**: On a mid-range phone, primary screens remain interactive with no horizontal
  scrolling and all tap targets meet the minimum touch size.
- **SC-009**: Every primary navigation item, action control, and state indicator carries a
  consistent icon, and every category/expense presents a visual accent (icon or emoji);
  meaningful icons have text alternatives (100% coverage on review).
- **SC-010**: The expense experience presents at least one spending-over-time trend chart and
  one category breakdown chart that render legibly on a phone in both light and dark themes,
  with a readable fallback when data is insufficient.
- **SC-011**: A user can switch between light and dark themes from within the app in 2 taps
  or fewer, and the chosen theme persists on the next visit.

## Assumptions

- Scope is a redesign and interaction-polish pass over the **existing** screens and flows,
  plus spending data visualization (charts) and a manual theme toggle; it does not add new
  data features or backend capabilities beyond the aggregation needed to drive the summary
  total and charts from existing expense data.
- The current tech stack, routing, authentication, and data model remain unchanged; only
  presentation, client-side interaction behavior, theme persistence, and client-side
  spending aggregation for charts are affected.
- The existing color, spacing, and typography tokens are the starting point and may be
  refined, extended, or replaced toward an expressive-modern look, but the app remains a
  mobile-first, self-hosted personal tool for a single allowlisted user (not a multi-tenant
  product).
- The app defaults to the operating system's light/dark preference and additionally offers a
  manual in-app toggle whose selection persists across visits.
- Iconography uses the FontAwesome free/solid set for interface icons plus emoji accents for
  categories and expenses; FontAwesome Pro and custom illustration sets are out of scope.
- Charts are driven by spending totals aggregated from existing expense data (a
  spending-over-time trend and a category breakdown); no new external reporting service is
  introduced.
- Accessibility baseline targets WCAG 2.1 AA as the reasonable industry-standard default.

## Implementation Notes (2026-07-12)

All 38 tasks in `tasks.md` are complete. Summary of what shipped and how it was verified.

**Delivered**
- Expanded design-token system in `app/globals.css`: elevation/shadow, radius, motion, and
  per-bucket accent scales; dark theme applied via both `:root[data-theme="dark"]` and
  `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` so the OS default is
  preserved and an explicit toggle wins.
- Reusable primitives under `src/components/ui/`: `Icon` (FontAwesome a11y wrapper),
  `ThemeProvider`/`ThemeToggle` (persisted preference + no-FOUC inline script in
  `app/layout.tsx`), `Toast`, `Skeleton`, `EmptyState`, `ConfirmDialog` (promise-based).
- Dependency-free responsive SVG charts under `src/components/charts/` (`TrendChart`,
  `CategoryBreakdownChart`) driven by pure transforms in `src/lib/chart-data.ts`; both render
  a text/screen-reader fallback on insufficient/zero data.
- All screens and shared components restyled with icons, emoji category accents, feedback
  states, and confirm-on-delete; native `confirm()`/`alert()` replaced with `ConfirmDialog` +
  toasts on Expenses/Receipts/Categories.

**Verification**
- `npm test`: 94/94 pass (18 new — `theme.test.ts`, `chart-data.test.ts`,
  `ui-feedback.test.tsx`); no existing test regressed (SC-007 / FR-014).
- `tsc --noEmit`: clean. `prettier --check`: clean (Constitution III).
- Manual quickstart scenarios verified at the code level; the live browser walkthrough
  (OAuth + Neon + throttling) remains for the operator to run via `npm run dev`.

**Known environment caveats (not feature code)**
- `npm run lint` (eslint portion) fails because `eslint-config-next`'s `@rushstack/eslint-patch`
  is incompatible with the installed ESLint 9.39.x ("Failed to patch ESLint"). Pre-existing;
  the `prettier --check` half of the lint script passes.
- `npm run build` fails at the prerender step due to a Windows path-casing duplicate-module
  issue (`C:\Workspace\Source` vs `C:\workspace\source`) inside `node_modules/next`. Feature
  code compiles ("Compiled with warnings"); the failure is environmental and pre-existed this
  work.
