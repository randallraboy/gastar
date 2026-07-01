# Feature Specification: Expense Tracking System

**Feature Branch**: `001-expense-tracking`

**Created**: 2026-07-01

**Status**: complete

**Input**: User description: "this project is practically empty. no significant code written and just bunch of scaffolding. the ultimate goal is to create an expense tracking system (budgeting also later and other features in the future). should incorporate ability to take picture of the invoice. should automatically categorize the expenses too."

## Clarifications

### Session 2026-07-01

- Q: Neon (Postgres) + Vercel conflicts with the current constitution stack (Spring Boot +
  MongoDB + Angular). Which direction? → A: Full Vercel stack — frontend and serverless API
  deployed on Vercel, Neon Postgres as the database; retire Spring Boot, MongoDB, and Docker
  Compose. Constitution amendment required before planning.
- Q: Is sending receipt images to a third-party AI/OCR cloud service acceptable? → A: No
  direct cloud AI in the request path. Submitted receipts land in a temporary staging area;
  the owner runs a local processing harness that downloads pending items, parses them
  (extraction + categorization), and posts results back as draft expenses. A project-level
  skill will be created to drive that harness. Extraction is therefore asynchronous.
- Q: How do users sign in? → A: Google login (OAuth/OIDC via Google). No local passwords.
- Q: Who can use the app? → A: Personal use — one or two allowlisted Google accounts. All
  allowed users share a single expense ledger; there is no privacy between them. Per-user
  private ledgers are a possible future feature, so records keep created-by attribution.
- Q: Default ledger currency? → A: CAD for now. Multi-currency support with CAD as the base
  currency is a likely future feature (travel), so the data model should not preclude
  storing an original currency and amount later.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Record and Review Expenses (Priority: P1)

A signed-in user records an expense (amount, date, merchant/description, category) and can
later browse, search, and filter their expense history to understand where their money went.

**Why this priority**: This is the core value of an expense tracker. Without the ability to
record and review expenses, no other feature (photo capture, auto-categorization, future
budgeting) has anything to build on. It is a complete, viable MVP by itself.

**Independent Test**: Can be fully tested by signing in, creating several expenses manually,
then viewing, filtering, editing, and deleting them — delivering a usable personal expense
log with no other stories implemented.

**Acceptance Scenarios**:

1. **Given** a signed-in user on the expenses view, **When** they enter an amount, date,
   description, and category and save, **Then** the expense appears in their expense list.
2. **Given** a user with recorded expenses, **When** they filter by a date range or a
   category, **Then** only matching expenses are shown along with the filtered total.
3. **Given** an existing expense, **When** the user edits its amount or category and saves,
   **Then** the updated values are shown everywhere the expense appears.
4. **Given** an existing expense, **When** the user deletes it and confirms, **Then** it no
   longer appears in any list or total.
5. **Given** a visitor who is not signed in with an allowlisted Google account, **When**
   they attempt to access expenses, **Then** they are rejected and cannot see any data.

---

### User Story 2 - Capture Invoice/Receipt by Photo (Priority: P2)

A user photographs (or uploads an image of) a paper invoice or receipt. The image lands in a
staging area as a pending receipt. The owner-run processing harness later picks up pending
receipts, extracts the key details (amount, date, merchant), and posts back a draft expense.
The user reviews the draft, corrects it if needed, and saves. The image stays attached to the
expense as proof of purchase. Extraction is asynchronous: drafts appear after the harness
runs, not instantly.

**Why this priority**: Photo capture removes the biggest friction in expense tracking —
manual typing — and was explicitly requested. It depends on Story 1 existing (an expense
record to create) but delivers standalone value the moment it ships.

**Independent Test**: Can be fully tested by submitting a clear receipt image, seeing it in
the pending queue, running the processing harness, then verifying a pre-filled draft expense
is presented, saved on confirmation, with the image viewable from the saved expense.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they take or upload a photo of a receipt, **Then**
   the image is stored in the staging area and shown as a pending receipt in their queue.
2. **Given** pending receipts in staging, **When** the processing harness runs, **Then**
   each legible receipt becomes a draft expense with amount, date, and merchant pre-filled.
3. **Given** a pre-filled draft expense, **When** the user corrects any extracted field and
   confirms, **Then** the expense is saved with the corrected values and the receipt image
   attached, and the staged copy is cleaned up.
4. **Given** a saved expense created from a photo, **When** the user opens it later, **Then**
   they can view the original receipt image.
5. **Given** an unreadable or non-receipt image, **When** processing fails for it, **Then**
   the pending receipt is marked unreadable and the user is offered manual entry with the
   image still attachable.
6. **Given** a pending receipt not yet processed, **When** the user doesn't want to wait,
   **Then** they can convert it to a manual expense entry at any time with the image
   attached.

---

### User Story 3 - Automatic Expense Categorization (Priority: P3)

When a user creates an expense — manually or from a receipt photo — the system automatically
assigns the most likely category (e.g., Groceries, Transport, Dining). The user can accept or
change it, and corrections make future suggestions better.

**Why this priority**: Auto-categorization was explicitly requested and makes the history and
future budgeting meaningful, but it only adds value once expenses exist and flow in (Stories
1 and 2).

**Independent Test**: Can be fully tested by creating expenses with recognizable merchants or
descriptions and verifying a sensible category is assigned automatically, then overriding one
and verifying the correction is respected for similar future expenses.

**Acceptance Scenarios**:

1. **Given** a new expense with a recognizable merchant or description, **When** it is saved
   without the user picking a category, **Then** a category is assigned automatically.
2. **Given** an automatically categorized expense, **When** the user changes the category,
   **Then** the new category is saved and treated as the correct one.
3. **Given** a user who has corrected the category for a given merchant, **When** they later
   add another expense from the same merchant, **Then** the corrected category is suggested
   instead of the original guess.
4. **Given** an expense the system cannot confidently categorize, **When** it is saved,
   **Then** it is placed in an explicit "Uncategorized" category so the user can find and fix
   it.

---

### Edge Cases

- Blurry, dark, or partial receipt photo: extraction fails gracefully; user is offered manual
  entry and the image can still be attached.
- Same receipt photographed twice: system warns about a likely duplicate (same amount, date,
  and merchant) before saving a second expense.
- Receipt in a foreign currency: the amount is recorded as read; the user can adjust the
  amount and the expense is stored in CAD (the ledger currency) for this feature.
- Category with existing expenses is removed or renamed: affected expenses move to
  "Uncategorized" (on removal) or follow the rename; no expense is ever orphaned.
- Very large image or unsupported file type: user receives a clear message with accepted
  formats and size limits.
- Expense dated in the future or with a non-positive amount: rejected with a clear validation
  message.
- A Google account that is not on the allowlist signs in successfully with Google but MUST
  be rejected by the app with a clear "not authorized" message.
- Two allowed users edit the same expense around the same time: last save wins; the ledger
  never ends up with a corrupted or partial record.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require users to be signed in with their Google account before
  viewing or modifying any expense data; no local passwords are stored.
- **FR-002**: Users MUST be able to create an expense with amount, date, description/merchant,
  and category.
- **FR-003**: Users MUST be able to view their expense history, filter it by date range and
  category, and see totals for the current filter.
- **FR-004**: Users MUST be able to edit and delete their own expenses.
- **FR-005**: Users MUST be able to submit a photo of an invoice/receipt, taken with a device
  camera or uploaded as an image file.
- **FR-006**: System MUST store submitted receipt images in a temporary staging area and show
  them to the owner as pending receipts until they are processed or converted to manual
  entries.
- **FR-007**: System MUST allow an owner-run processing harness to securely list and download
  pending receipts, and to post back extracted results (amount, date, merchant, suggested
  category) as editable draft expenses — nothing is saved as a final expense without user
  review.
- **FR-008**: System MUST keep the receipt image attached to the resulting expense, let the
  user view it later, and clean up the staged copy once the expense is saved or discarded.
- **FR-009**: System MUST handle unreadable images gracefully by marking the pending receipt
  as unreadable and offering manual entry with the image still attachable.
- **FR-010**: System MUST automatically assign a category to new expenses and clearly allow
  the user to change it.
- **FR-011**: System MUST use an explicit "Uncategorized" category when no confident
  suggestion exists, rather than guessing silently.
- **FR-012**: System MUST use a user's category corrections to improve future suggestions for
  similar expenses (at minimum, remembering merchant-to-category corrections).
- **FR-013**: System MUST provide a sensible default set of categories and let users add,
  rename, and remove categories (shared across the ledger) without orphaning expenses.
- **FR-014**: System MUST restrict all access — expenses, images, pending receipts, and
  harness endpoints — to allowlisted Google accounts; all allowed users share one ledger, and
  every record keeps created-by attribution for a possible future per-user split.
- **FR-015**: System MUST validate expense input (positive amount, valid date) and report
  problems in plain language.
- **FR-016**: System MUST warn the user before saving a likely duplicate expense created from
  a photo (matching amount, date, and merchant).

### Key Entities *(include if feature involves data)*

- **Expense**: A single spending record — amount, date, description/merchant, category,
  optional attached receipt image, created-by user (attribution for a future per-user split),
  and how it was created (manual or photo).
- **Category**: A named grouping for expenses (e.g., Groceries, Transport), shared across the
  ledger. Includes a default set plus user-defined entries; "Uncategorized" always exists.
- **Receipt Image**: The stored photo of an invoice/receipt, linked to exactly one expense,
  viewable by any allowed user.
- **Pending Receipt**: A staged, temporarily stored receipt image awaiting processing. States:
  pending → processed (became a draft expense) / unreadable / converted to manual entry.
  Cleaned up once resolved.
- **Categorization Correction**: A remembered link between a merchant/description pattern and
  the category the user chose, used to improve future suggestions; shared across the ledger.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can record a manual expense, from opening the entry form to seeing it in
  their list, in under 30 seconds.
- **SC-002**: Once the processing harness has run, reviewing and saving a pre-filled draft
  expense takes under 1 minute; submitting a photo into the pending queue takes under 15
  seconds.
- **SC-003**: For clear, legible receipts, extraction pre-fills amount, date, and merchant
  correctly at least 80% of the time.
- **SC-004**: At least 70% of new expenses receive a correct automatic category without user
  intervention, improving as corrections accumulate.
- **SC-005**: A user can find any past expense using date and category filters in under 3
  interactions.
- **SC-006**: 100% of expense data is accessible only to allowlisted signed-in accounts;
  zero access for anonymous visitors or non-allowlisted Google accounts.
- **SC-007**: Users abandon manual entry in favor of photo capture for the majority of paper
  receipts once Story 2 ships (photo-created expenses exceed 50% of receipt-backed entries).

## Assumptions

- The ledger currency is CAD. Multi-currency (with CAD as base) is a future feature and out
  of scope here; the data model keeps room for an original-currency amount later.
- Budgeting, reporting dashboards, recurring expenses, and data export are future features and
  explicitly out of scope here; the data model should simply not preclude them.
- Users sign in with Google login (OAuth/OIDC); the app never stores passwords itself. The
  existing scaffolded stack is being replaced (see Clarifications), so sign-in is rebuilt on
  the new platform.
- Platform decision (recorded for planning, not a functional requirement): the product is
  hosted on Vercel (site + serverless API) with Neon Postgres as the managed database; the
  previous Spring Boot / MongoDB / Angular scaffolding is retired.
- One shared expense ledger for one or two allowlisted Google accounts; no privacy between
  allowed users. Per-user private ledgers are a possible future feature — records keep
  created-by attribution so the data model does not preclude it.
- Auto-categorization assigns its best guess immediately (rather than asking every time) since
  the user can always change it; low-confidence cases fall back to "Uncategorized".
- Photo capture works with common image formats from phone cameras and file upload; scanning
  multi-page PDFs is out of scope.
- Receipt extraction and categorization run in an owner-operated local processing harness
  that pulls pending receipts from the staging area and posts results back; no third-party
  AI/OCR service is called directly from the hosted app. A project-level skill (developer
  tooling) will automate running the harness.
- Because processing is asynchronous, drafts appear after the harness runs; the pending queue
  makes waiting receipts visible, and manual conversion is always available.
- Receipt images are retained for as long as the expense exists and are deleted with it.
