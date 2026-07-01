<!--
Sync Impact Report
==================
Version change: (template / unversioned) → 1.0.0
Rationale: Initial ratification of the gastar project constitution (MAJOR baseline).

Modified principles:
  - [PRINCIPLE_1_NAME] → I. Spec-Driven Development
  - [PRINCIPLE_2_NAME] → II. Quality Gates & Testing
  - [PRINCIPLE_3_NAME] → III. Consistent Formatting & Style
  - [PRINCIPLE_4_NAME] → IV. Secure by Default
  - [PRINCIPLE_5_NAME] → V. Simplicity First (YAGNI)

Added sections:
  - Technology & Architecture Constraints (was [SECTION_2_NAME])
  - Development Workflow & Quality Gates (was [SECTION_3_NAME])

Removed sections: none

Templates requiring updates:
  - .specify/templates/plan-template.md ✅ compatible (Constitution Check gate references this file)
  - .specify/templates/spec-template.md ✅ compatible (no changes required)
  - .specify/templates/tasks-template.md ✅ compatible (tests remain optional per Principle II)
  - AGENTS.md ✅ compatible (LeanSpec workflow aligns with Principle I)

Follow-up TODOs: none
-->

# gastar Constitution

## Core Principles

### I. Spec-Driven Development

Every non-trivial change begins with a specification, not code. Multi-part features,
breaking changes, and design decisions MUST be captured as a spec before implementation
begins; bug fixes, trivial changes, and self-explanatory refactors MAY skip this step.
Specs MUST be created and managed through the project tooling (LeanSpec / Spec Kit), never
by editing spec files or frontmatter by hand. Status MUST track implementation reality:
`planned` → `in-progress` (before coding) → `complete` (after done).

**Rationale**: Specs bridge human and AI understanding and prevent duplicate work. Manual
file or frontmatter edits corrupt the tooling that keeps that shared context reliable.

### II. Quality Gates & Testing

The project MUST build cleanly before any change is considered done: `./gradlew build` for
the backend and `ng build` for the web frontend. Tests are the guardrail for behavior that
matters: bug fixes MUST add a regression test, and new behavioral logic SHOULD ship with
tests. Backend tests use JUnit 5 (`./gradlew test`); frontend tests use Vitest (`ng test`).
A change MUST NOT be merged while any existing test is failing.

**Rationale**: Automated gates catch regressions cheaply and keep a small, personal codebase
trustworthy without heavyweight process.

### III. Consistent Formatting & Style

All Java code MUST pass Spotless (`./gradlew spotlessCheck`) using the configured Google Java
Format (AOSP) profile, with imports ordered, unused imports removed, and the required license
header present. Formatting is enforced by tooling, not debated in review: run
`./gradlew spotlessApply` before committing. Frontend code MUST follow the Angular project's
configured conventions.

**Rationale**: Automated formatting removes bikeshedding, keeps diffs meaningful, and makes
the code uniform regardless of author or tool.

### IV. Secure by Default

Authentication and authorization MUST NOT be weakened. Requests require an authenticated
user, and privileged access is gated by explicit roles (e.g. `ROLE_ADMIN`) via the OAuth2 /
OIDC login flow. Secrets — client IDs, client secrets, admin emails, credentials — MUST live
in `secrets.properties` or environment-provided config and MUST NEVER be committed to the
repository. Placeholder values in tracked config MUST remain placeholders.

**Rationale**: The app handles a user's personal financial data through third-party identity;
a single leaked secret or relaxed access rule compromises the whole system.

### V. Simplicity First (YAGNI)

Prefer the simplest solution that satisfies the current spec. New dependencies, abstractions,
services, or layers MUST be justified by a concrete present need, not a hypothetical future
one. When a change adds material complexity, the plan MUST record why the simpler alternative
was rejected.

**Rationale**: gastar is a focused personal expense tracker; unjustified complexity is the
main long-term maintenance risk for a small codebase.

## Technology & Architecture Constraints

- **Backend**: Spring Boot 3.3.x on Java 21 (toolchain-pinned). Persistence via MongoDB
  (Spring Data MongoDB). Build tool is Gradle (use the wrapper: `./gradlew`).
- **Frontend**: Angular 21 single-page app in `web/`, styled with Bootstrap / ng-bootstrap
  and FontAwesome. Package management via npm.
- **Identity**: OAuth2 / OIDC client (Google) for login; no local password store.
- **Local infrastructure**: MongoDB runs via the committed Docker Compose file
  (`src/docker/compose.yaml`), managed by Spring Boot Docker Compose support.
- Introducing a new datastore, framework, or major dependency is a design decision and MUST
  be captured in a spec (Principle I) with justification (Principle V).

## Development Workflow & Quality Gates

- **Before coding**: discover existing context and specs via project tooling; create or move
  the relevant spec to `in-progress`.
- **While coding**: keep the spec current with decisions and learnings; make focused commits.
- **Before done**: run `./gradlew spotlessApply` then `./gradlew build` (backend) and, for
  web changes, `ng build` and `ng test`. All must pass.
- **After done**: document completion in the spec and move status to `complete`.
- Constitution compliance is a gate during planning (`Constitution Check` in
  `.specify/templates/plan-template.md`). Violations MUST be justified in the plan's
  Complexity Tracking or the approach MUST be revised.

## Governance

This constitution supersedes ad-hoc practices for the gastar project. Amendments are made by
editing this file and MUST include an updated Sync Impact Report and a version bump.

Versioning follows semantic versioning:
- **MAJOR**: Backward-incompatible governance changes or principle removals/redefinitions.
- **MINOR**: A new principle or section, or materially expanded guidance.
- **PATCH**: Clarifications, wording, and non-semantic refinements.

All plans and reviews MUST verify compliance with these principles. Complexity that violates
Principle V MUST be justified or removed. For day-to-day AI and contributor guidance, defer to
`AGENTS.md` and the Spec Kit templates in `.specify/templates/`, which MUST stay consistent
with this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-07-01 | **Last Amended**: 2026-07-01
