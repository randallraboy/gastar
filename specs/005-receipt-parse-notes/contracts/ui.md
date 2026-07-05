# UI Contract: Receipt Notes

Reuses existing gastar design tokens/vocabulary (card, btn, form controls). No rebrand.

## Capture flow — note field (`src/components/ReceiptCapture.tsx`)

- In the **preview** state (after a photo is taken or a file chosen, before submit), show an
  optional multiline note input below the image preview:
  - Label: "Note (optional)" with helper text like "Add context to help parse this receipt —
    e.g. 'the fan is a household item, rest is groceries'."
  - `maxLength=250`; show a live remaining-character count; block/trim beyond 250 (FR-007).
  - Applies to **both** the camera and the file-upload path (FR-005a) — the field lives in the
    shared preview view, so both sources get it automatically.
- On **submit**, include the note in the `FormData` (`formData.set("note", note)`), only when
  non-empty after trim.
- On **retake / reset**, clear the note along with the rest of capture state.
- Note is optional: submitting with an empty note behaves exactly as today (FR-004).

## Pending receipts list — view & edit (`app/(app)/receipts/page.tsx`)

- Each pending receipt card shows its note (if any) as read text.
- Provide an **Edit note** affordance that opens an inline editor (textarea, ≤250, save/cancel)
  calling `PATCH /api/receipts/:id`. Saving refreshes the list; clearing (empty save) removes
  the note.
- Editing is offered **only for `pending`** receipts. Once processed/converted, the note is
  shown read-only (no edit control) — it lives on the expense from then on.

## Draft review & expense views

- The draft-review UI and the saved-expense view display the note as read-only reference
  context (it rides `ExpenseDto.note`). No editing of the note as an expense field in this
  feature (out of scope per clarified assumptions).

## Accessibility / mobile

- Note input is a standard labelled `textarea`, keyboard-accessible, sized for touch per the
  feature-002 mobile rules (no pinch-zoom, adequate tap targets).
- Character counter is announced politely; the over-limit message uses the existing `.error`
  styling.
