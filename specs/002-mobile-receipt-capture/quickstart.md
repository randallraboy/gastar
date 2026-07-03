# Quickstart: Validating Mobile-Friendly Receipt Capture

**Feature**: 002-mobile-receipt-capture | **Date**: 2026-07-02

Validation guide — proves the feature works end-to-end. Contracts:
[api.md](./contracts/api.md), [ui.md](./contracts/ui.md); state machine:
[data-model.md](./data-model.md).

## Prerequisites

- Node 20+, npm; `.env.local` with Google OAuth, Neon `DATABASE_URL`, blob token, allowlist,
  harness token (same setup as feature 001 — see `specs/001-expense-tracking/quickstart.md`).
- A real phone (iOS Safari or Android Chrome) on the same network as the dev machine, or a
  tunnel (e.g., `vercel dev` / preview deploy). Camera capture requires a **secure context**:
  `localhost` is fine on desktop, but a phone hitting a LAN IP over plain HTTP is not —
  use a preview deployment or HTTPS tunnel for phone testing.

## Setup

```bash
npm install
npm run db:migrate     # applies the additive client_key migration
npm run dev            # desktop checks
# phone checks: push branch → Vercel preview URL, or HTTPS tunnel to :3000
```

## Automated gates (must pass — constitution II/III)

```bash
npm run lint
npm run build
npm test               # includes: receipts idempotency, upload helper, capture state machine
```

## Manual validation on a phone

Sign in with an allowlisted Google account on the phone browser.

### Story 1 — camera capture (P1)

1. From the Expenses screen: tap **Capture** tab → tap **Take photo** → phone camera opens.
   *Expect: ≤ 2 taps (SC-002).*
2. Photograph a receipt → preview appears with **Retake** / **Use this photo**.
3. Tap Retake → camera reopens; nothing uploaded (check pending list unchanged).
4. Retake, then **Use this photo** → progress bar → "Receipt queued"; receipt appears in
   pending list. *Time whole flow from app open: < 20 s (SC-001).*
5. Immediately capture a second receipt without navigating → both in pending list (FR-009).
6. Deny camera / use a device without one → **Choose file** path still submits (FR-004).

### Story 2 — whole app on phone (P2)

Walk every screen at phone size (also desktop-browser devtools at 360×640 and 430×932):

- Expenses: filter by date + category; cards legible; total visible; **no horizontal
  scroll, no pinch-zoom needed** (SC-003).
- Draft review: confirm a draft end-to-end on the phone incl. viewing the receipt image.
- Categories: add/rename/delete with touch only; all controls comfortably tappable.
- Modals appear as bottom sheets; forms use correct mobile keyboards (decimal, date).
- Desktop ≥ 768px: re-run feature-001 flows — nothing lost (FR-012, SC-006).

### Story 3 — flaky network (P3)

1. Start an upload, then enable airplane mode mid-transfer.
2. *Expect:* plain-language failure, photo/preview retained, **Retry** offered.
3. Disable airplane mode → Retry → success **without retaking**.
4. Verify exactly **one** pending receipt exists for that capture (FR-008 idempotency;
   check the pending list count or `pending_receipts` rows for the `client_key`).

### API idempotency spot-check (optional, curl)

```bash
# same clientKey twice → first 201, second 200, same receipt id, one row
KEY=$(uuidgen)
curl -s -b "$SESSION" -F file=@receipt.jpg -F clientKey=$KEY https://<host>/api/receipts
curl -s -b "$SESSION" -F file=@receipt.jpg -F clientKey=$KEY https://<host>/api/receipts
```

### Harness regression

Run the feature-001 harness flow once (`npm run harness` per receipt-harness skill):
pending receipt → draft expense → confirm on the **phone**. Confirms harness path untouched
by the `client_key` change.

## Expected outcomes summary

| Check | Pass criterion |
|-------|----------------|
| Capture flow | ≤ 2 taps to camera; preview→submit→queued < 20 s |
| Fallback | File upload path works with no camera/permission |
| Retry | Failed upload retried without retake; zero duplicate receipts |
| Mobile usability | All primary tasks, no horizontal scroll/zoom, 44px targets |
| Desktop parity | Feature-001 scenarios still pass on desktop |
| Gates | lint, build, test all green |
