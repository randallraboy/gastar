# Feature Specification: Receipt Notes for Guided Parsing

**Feature Branch**: `005-receipt-parse-notes`

**Created**: 2026-07-05

**Status**: Draft

**Input**: User description: "add notes to a image receipt like i bought a fan part of a grocery i want the skill to include the note into the prompt of parsing"

## Clarifications

### Session 2026-07-05

- Q: After a draft is confirmed into a real expense, does the note survive permanently or is it dropped? → A: The note persists permanently on the confirmed expense and is viewable anytime in expense history. It attaches on both camera-captured photos and uploaded image files.
- Q: What is the maximum length of a note? → A: 250 characters — one or two tight sentences.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guide the Parse with a Note at Capture Time (Priority: P1)

A signed-in user photographs or uploads a receipt that needs a bit of human context to be
read correctly — for example, a grocery-store receipt where one line item is actually a
household fan, not food. Before submitting, the user types a short note in plain language
("the fan is a household item, the rest is groceries"). The receipt lands in the pending
queue carrying that note, and when it is later parsed the note is used as guidance so the
resulting draft expense reflects the user's intent instead of a blind read of the paper.

**Why this priority**: This is the entire point of the feature. Without the note reaching the
parsing step, the user gains nothing. A note that is captured but ignored during parsing
delivers no value, so this story is the minimum viable slice.

**Independent Test**: Can be fully tested by submitting a receipt with a guiding note,
letting it be processed, and confirming the produced draft expense reflects the note's
guidance — with no other story implemented.

**Acceptance Scenarios**:

1. **Given** a signed-in user submitting a receipt (via camera capture or file upload),
   **When** they reach the submit step, **Then** they can optionally type a free-text note
   before submitting, inline in the same flow without extra navigation.
2. **Given** a receipt submitted with a note, **When** it enters the pending queue, **Then**
   the note is stored with that receipt and is not lost or altered.
3. **Given** a pending receipt that carries a note, **When** it is parsed, **Then** the note
   is supplied to the parsing step as guidance and the resulting draft reflects that guidance
   (e.g., correct interpretation of a mixed-purchase, merchant, date, or category).
4. **Given** a user who submits a receipt without typing a note, **When** it is processed,
   **Then** it behaves exactly as receipts do today, with no change in outcome.

---

### User Story 2 - Review, Edit, and Keep the Note for Reference (Priority: P2)

A user wants to fix a note after submitting but before the receipt is processed, or simply
see the context they wrote when they later review the draft expense. They can open the
pending receipt, read the note they attached, edit or clear it while the receipt is still
waiting, and once the draft is created the note stays visible on it as a record of why the
expense was entered the way it was.

**Why this priority**: The note is most useful when it can be corrected before processing and
recalled afterward, but the core value (guiding the parse) is already delivered by Story 1.
This story hardens and rounds out the experience.

**Independent Test**: Can be fully tested by attaching a note, editing it on the pending
receipt before processing, verifying the updated note is the one used, and confirming the
note remains viewable on the resulting draft expense.

**Acceptance Scenarios**:

1. **Given** a pending receipt with a note, **When** the user opens it before it is processed,
   **Then** they can view, edit, or clear the note.
2. **Given** an edited note on a still-pending receipt, **When** the receipt is later parsed,
   **Then** the most recent version of the note is the one used as guidance.
3. **Given** a processed receipt that had a note, **When** the user reviews the resulting
   draft expense, **Then** the note is visible on the draft as reference context.
4. **Given** a receipt that has already been processed, **When** the user tries to change the
   note, **Then** editing the pending-stage note is no longer offered for that receipt.

---

### Edge Cases

- **No note (the common case)**: Submitting without a note behaves identically to today —
  the note is simply absent and parsing proceeds unguided.
- **Very long note**: The note is limited to a reasonable length; exceeding it produces a
  plain-language message rather than a silent truncation or failure.
- **Misleading or contradictory note**: The note is treated as guidance, not gospel. If it
  conflicts with what the image plainly shows, parsing still produces a best-effort draft;
  the user can correct it during draft review as they can today.
- **Unreadable image with a note**: A note does not fabricate data for a blank, blurry, or
  totalless receipt. Such a receipt is still flagged as unreadable, and the note is retained
  for the user's reference.
- **Multiple receipts submitted in succession, each with its own note**: Each note stays
  bound to its own receipt; notes never bleed across receipts.
- **Whitespace-only note**: Treated as no note.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to attach an optional free-text note to a receipt at
  submission time, inline in the existing capture/upload flow, for both camera capture and
  file upload.
- **FR-002**: A note attached to a receipt MUST travel with that receipt into and through the
  pending-receipt queue without being lost or altered.
- **FR-003**: When a receipt carries a note, the note MUST be supplied to the parsing step as
  guidance, and the resulting draft expense MUST reflect that guidance (for example, correctly
  interpreting a mixed-purchase, or disambiguating merchant, date, amount, or category).
- **FR-004**: Submitting a receipt without a note MUST behave exactly as receipts behave
  today, with no change to processing or outcome.
- **FR-005**: A note MUST be preserved and viewable on the pending receipt, on the resulting
  draft expense, and — once the draft is confirmed — permanently on the saved expense,
  viewable anytime in expense history as reference context.
- **FR-005a**: The note attachment MUST work identically for both submission paths — a photo
  taken with the phone camera and an image uploaded as a file.
- **FR-006**: Users MUST be able to view, edit, or clear a note on a pending receipt while it
  is still awaiting processing; the most recent version MUST be the one used when it is parsed.
- **FR-007**: Notes MUST be limited to 250 characters, with a clear message shown when the
  limit is exceeded rather than a silent failure or truncation.
- **FR-008**: A note MUST NOT cause data to be fabricated for an unreadable receipt; an
  unreadable image stays flagged as unreadable, with its note retained.
- **FR-009**: Each receipt's note MUST apply only to that receipt; notes MUST NOT be shared or
  cross-contaminated between different receipts.
- **FR-010**: The existing sign-in and allowlist protections MUST apply unchanged to notes; a
  note is personal data protected exactly like the receipt it belongs to, and is never exposed
  to unauthenticated or non-allowlisted users.

### Key Entities *(include if feature involves data)*

- **Pending Receipt** (existing, extended): Gains an optional **Note** — short free text
  supplied by the user at submission and editable while the receipt is pending. Everything
  else about the pending receipt is unchanged.
- **Note**: Optional, user-authored, plain-language guidance bound to a single receipt. Used
  as input to parsing and retained for reference; not a structured field the user must fill.
- **Draft Expense** (existing, extended): Retains the originating receipt's note as
  reference context visible during review. No other change to its meaning.
- **Expense** (existing, extended): Once a draft is confirmed, the note carries onto the
  saved expense and is retained permanently, viewable in expense history. No other change to
  its meaning.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can add a note during receipt submission without any extra navigation
  steps beyond the existing submit flow.
- **SC-002**: For receipts submitted with a guiding note, the produced draft expense reflects
  the note's guidance in the majority of cases, measured by the user needing fewer manual
  corrections at draft review than for the same kind of receipt submitted without a note.
- **SC-003**: For mixed-purchase or ambiguous receipts, supplying a note reduces the number of
  fields the user must manually correct during draft review by at least 50% compared to no
  note.
- **SC-004**: Receipts submitted without a note show zero change in behavior or outcome versus
  before this feature (no regression), verified against the existing receipt-processing
  scenarios.
- **SC-005**: A note attached at submission is present on the pending receipt and on the
  resulting draft expense 100% of the time — no note is ever silently dropped.

## Assumptions

- This feature builds on the shipped receipt pipeline (features 001 and 002): the staging
  area, pending-receipt queue, asynchronous owner-run parsing, and draft-review flow all
  exist and are otherwise unchanged. This feature adds a note that rides along and informs
  parsing; it does not change how receipts are captured, stored, or turned into drafts.
- The note is a single, short, optional free-text field capped at 250 characters, not a
  structured or multi-field form.
- "Include the note into the prompt of parsing" is interpreted as: the note is provided to
  the parsing step as additional guidance/context so the parse better matches the user's
  intent. The note guides, but does not override plainly readable image content, and never
  fabricates values for unreadable images.
- The note is editable only while the receipt is pending; once processed into a draft, the
  note is preserved read-only on the draft, and carries permanently onto the confirmed
  expense (further editing of the note as a saved-expense field is out of scope here).
- Notes carry the same sensitivity and access controls as receipts and expenses; no new
  sharing, export, or external exposure of notes is introduced.
- Categorization guidance in a note is interpreted within the existing fixed budget model
  (Needs/Wants/Savings and its category hierarchy from features 003 and 004); this feature
  adds no new categories.
