# Feature Specification: Mobile-Friendly Receipt Capture

**Feature Branch**: `002-mobile-receipt-capture`

**Created**: 2026-07-02

**Status**: complete

**Completed**: 2026-07-02 — Mobile receipt capture (camera preview/retake/submit, bottom nav, responsive layouts, idempotent upload via `clientKey`). Design tokens extended per `contracts/ui.md` and web-design-engineer skill (existing vocabulary, no rebrand). Automated gates green; manual phone walkthrough per `quickstart.md` recommended before deploy.

**Input**: User description: "mobile friendly web-app. take a picture of a receipt using phone camera. use this skill when designing the webpage https://github.com/ConardLi/garden-skills/blob/main/skills/web-design-engineer/SKILL.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Snap a Receipt with the Phone Camera (Priority: P1)

A signed-in user standing at a checkout counter pulls out their phone, opens the app in the
browser, and with a couple of taps opens their phone's camera from within the app. They
photograph the paper receipt, see a preview, retake it if it's blurry, and submit. The image
lands in the existing pending-receipt queue for later processing, and the user gets clear
confirmation that it was received.

**Why this priority**: Capturing the receipt at the moment of purchase is the whole point of
this feature — it's when the paper is in hand and most likely to be lost afterward. The
existing app already accepts image submissions; making that effortless from a phone camera is
the explicitly requested capability.

**Independent Test**: Can be fully tested on a phone by signing in, tapping the capture
action, taking a photo with the device camera, reviewing the preview, submitting, and
verifying the receipt appears in the pending queue — with no other stories implemented.

**Acceptance Scenarios**:

1. **Given** a signed-in user on a phone, **When** they choose the receipt capture action,
   **Then** the phone's camera opens from within the app within at most 2 taps of landing on
   the app's main screen.
2. **Given** the camera is open, **When** the user takes a photo, **Then** they see a preview
   of the captured image with clear options to retake or submit.
3. **Given** a previewed photo, **When** the user submits it, **Then** the image is stored in
   the pending-receipt queue and the user sees confirmation that it was received.
4. **Given** a blurry or wrong capture in the preview, **When** the user chooses retake,
   **Then** the camera reopens and the discarded shot is never submitted.
5. **Given** a user who denies camera permission or whose device has no camera, **When** they
   use the capture action, **Then** they are clearly offered a file-upload alternative
   instead of hitting a dead end.
6. **Given** a user who has just submitted a receipt, **When** they want to capture another,
   **Then** they can start the next capture immediately without re-navigating from scratch.

---

### User Story 2 - Use the Whole App Comfortably on a Phone (Priority: P2)

A user on their phone browses their expense history, filters by date or category, reviews and
confirms draft expenses produced from processed receipts, and manages categories — all on a
small touchscreen, without pinch-zooming, horizontal scrolling, or mis-tapping controls that
are too small.

**Why this priority**: Camera capture (Story 1) starts on the phone, so the review-and-confirm
loop that follows must be comfortable there too, or users end up juggling two devices. It
builds on existing functionality and makes it usable in the mobile context.

**Independent Test**: Can be fully tested by walking through every primary screen (expenses
list and filters, expense create/edit, pending receipts, draft review, categories) on a
phone-sized screen and completing each task end-to-end without zooming, horizontal scrolling,
or failed taps.

**Acceptance Scenarios**:

1. **Given** a phone-sized screen, **When** the user opens any primary screen (expenses,
   pending receipts, draft review, categories), **Then** all content and actions are readable
   and reachable without pinch-zooming or horizontal scrolling.
2. **Given** a user reviewing a draft expense on their phone, **When** they correct a field
   and confirm, **Then** the flow completes entirely on the phone, including viewing the
   attached receipt image.
3. **Given** a user filtering expenses on a phone, **When** they apply a date range or
   category filter, **Then** the controls are operable by touch and the filtered list and
   totals are legible on the small screen.
4. **Given** any interactive control on a phone-sized screen, **When** the user taps it,
   **Then** it is large enough and spaced enough to hit reliably on the first try.
5. **Given** a desktop user, **When** they use the same screens after this feature ships,
   **Then** nothing they could do before is lost or degraded.

---

### User Story 3 - Reliable Submission on a Flaky Mobile Connection (Priority: P3)

A user captures a receipt somewhere with poor connectivity — a parking garage, a store with
weak signal. The upload shows its progress, and if it fails, the app keeps the captured photo
and lets the user retry without retaking the picture.

**Why this priority**: Mobile networks fail routinely, and losing a capture means the paper
receipt may already be discarded. This hardens Story 1 but is not required for it to deliver
value in normal conditions.

**Independent Test**: Can be fully tested by starting a submission, interrupting connectivity,
verifying the failure is reported with the photo retained, then restoring connectivity and
retrying successfully without recapturing.

**Acceptance Scenarios**:

1. **Given** a submission in progress, **When** the upload is underway, **Then** the user sees
   that progress is happening rather than a frozen screen.
2. **Given** an upload that fails mid-transfer, **When** the failure occurs, **Then** the user
   is told plainly what happened, the captured photo is retained, and a retry option is
   offered.
3. **Given** a retained failed capture, **When** the user retries after connectivity returns,
   **Then** the submission completes without retaking the photo.
4. **Given** an interrupted upload, **When** it eventually succeeds after retry, **Then**
   exactly one pending receipt exists for it — no duplicates from the failed attempts.

---

### Edge Cases

- Camera permission denied at the browser level: capture action explains the situation and
  offers file upload; no dead end or cryptic browser error surfaced raw.
- Device has no camera (or the user is on desktop): the same capture entry point offers file
  upload; desktop submission keeps working as it does today.
- Photo taken sideways or upside down: the submitted image displays in the correct
  orientation in the preview, the pending queue, and the saved expense.
- Very large photo from a modern phone camera: accepted within the app's existing size
  limits, or rejected with a plain-language message stating the limit — never a silent
  failure or an endless spinner.
- User backgrounds the browser or takes a call mid-capture: on return, the app is in a sane
  state — either the preview is still there or the user is back at the capture entry point;
  nothing half-submitted.
- Several receipts captured in quick succession: each becomes its own pending receipt; none
  are lost or overwritten by the next.
- Session expired when the user opens the app at the counter: the user is taken through
  sign-in and can proceed to capture without losing more than a few seconds.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to open their phone's camera from within the app and
  photograph a receipt, reaching the camera within at most 2 taps from the app's main screen.
- **FR-002**: Users MUST see a preview of the captured photo with the choice to retake or
  submit before anything is stored.
- **FR-003**: Submitted captures MUST enter the existing pending-receipt queue and behave
  exactly like receipts submitted by any other means (processing, draft creation, attachment
  to the saved expense).
- **FR-004**: The capture entry point MUST offer a file-upload alternative whenever the
  camera is unavailable — permission denied, no camera hardware, or unsupported device.
- **FR-005**: All primary screens (expenses list and filters, expense create/edit, pending
  receipts, draft review, categories) MUST be fully usable on a phone-sized touchscreen
  without pinch-zooming or horizontal scrolling.
- **FR-006**: All interactive controls MUST be sized and spaced for reliable touch operation
  on a phone.
- **FR-007**: The app MUST show upload progress during submission and, on failure, retain the
  captured photo and offer retry without requiring a new photo.
- **FR-008**: Retried submissions MUST NOT create duplicate pending receipts for the same
  capture.
- **FR-009**: Users MUST be able to capture and submit multiple receipts in succession
  without re-navigating through the app between captures.
- **FR-010**: Submitted photos MUST display in the correct orientation everywhere they
  appear (preview, pending queue, attached to the expense).
- **FR-011**: The existing sign-in and allowlist protections MUST apply unchanged to all
  mobile flows; no capture or submission is possible for unauthenticated or non-allowlisted
  users.
- **FR-012**: The desktop experience MUST retain all existing capabilities after the
  mobile-friendly changes.

### Key Entities *(include if feature involves data)*

No new entities. This feature reuses the existing **Pending Receipt** and **Receipt Image**
entities from the expense-tracking feature (001) unchanged; it changes how they are created
and viewed from a phone, not what they are.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user on a phone can go from opening the app to a submitted receipt capture in
  under 20 seconds under normal conditions.
- **SC-002**: The camera is reachable within 2 taps of the app's main screen on a phone.
- **SC-003**: Every primary task (record expense, filter history, review draft, manage
  categories, view receipt image) can be completed on a phone-sized screen with zero
  horizontal scrolling and zero pinch-zooming.
- **SC-004**: At least 95% of receipt submissions started on a phone eventually succeed
  (including via retry), with no captured photo lost to a transient upload failure.
- **SC-005**: After this feature ships, the majority of receipt submissions from phones use
  the in-app camera rather than the file picker.
- **SC-006**: Desktop users experience zero loss of existing functionality, verified by
  walking the existing feature-001 acceptance scenarios on desktop.

## Assumptions

- This feature builds directly on the shipped expense-tracking feature (001): the staging
  area, pending-receipt queue, asynchronous owner-run processing, and draft-review flow all
  exist and are unchanged. This feature changes how receipts get captured and how the app is
  operated from a phone.
- "Mobile friendly" means the existing web app becomes fully usable in a phone browser —
  one app, responsive to screen size. A separate native app-store app is out of scope; an
  installable home-screen shortcut is a nice-to-have, not a requirement.
- The whole app is in scope for mobile usability (Story 2), not just the capture screen,
  because capture leads directly into review-and-confirm on the same device.
- Camera access uses the phone's standard browser permission prompts; the app cannot and
  does not bypass them, it only handles denial gracefully (FR-004).
- Existing image format and size limits from feature 001 continue to apply; phone camera
  output is expected to fall within them or produce a clear message.
- Offline capture (queueing photos with no connectivity at all and syncing later) is out of
  scope; Story 3 covers flaky-connection retry, not full offline operation.
- Design reference (recorded for the planning/design phase, not a functional requirement):
  the user has asked that the web-design-engineer skill
  (https://github.com/ConardLi/garden-skills/blob/main/skills/web-design-engineer/SKILL.md)
  be used when designing the pages for this feature.
