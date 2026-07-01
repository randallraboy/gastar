<!--
Sync Impact Report
==================
Version change: 2.0.0 → 2.0.1
Rationale: PATCH — LeanSpec retired; Spec Kit is the sole spec tooling. Principle I wording
updated; no semantic governance change. (.lean-spec/ and LeanSpec docs removed from repo.)

Previous (2.0.0): MAJOR — Technology & Architecture Constraints redefined (Spring Boot/
MongoDB/Angular/Gradle retired in favor of full Vercel stack + Neon Postgres) and
quality-gate commands replaced. Decision recorded in specs/001-expense-tracking/spec.md
Clarifications (Session 2026-07-01) and approved by the project owner.

Modified principles:
  - I. Spec-Driven Development → unchanged
  - II. Quality Gates & Testing → gate commands replaced (Gradle/JUnit → npm build/Vitest)
  - III. Consistent Formatting & Style → Spotless/Google Java Format → Prettier + ESLint
  - IV. Secure by Default → OAuth2/OIDC retained; allowlist model and env-var secrets on
    Vercel/Neon made explicit; harness token added
  - V. Simplicity First (YAGNI) → unchanged

Added sections: none
Removed sections: none (Technology & Architecture Constraints content replaced)

Templates requiring updates:
  - .specify/templates/plan-template.md ✅ compatible (generic Constitution Check gate)
  - .specify/templates/spec-template.md ✅ compatible (no changes required)
  - .specify/templates/tasks-template.md ✅ compatible
  - AGENTS.md ⚠ pending (still describes Spring Boot/Gradle/Angular workflow; update when
    old scaffolding is removed during implementation)

Follow-up TODOs:
  - Update AGENTS.md after the Vercel/Next.js scaffolding lands (tracked in tasks).
-->

# gastar Constitution

## Core Principles

### I. Spec-Driven Development

Every non-trivial change begins with a specification, not code. Multi-part features,
breaking changes, and design decisions MUST be captured as a spec before implementation
begins; bug fixes, trivial changes, and self-explanatory refactors MAY skip this step.
Specs MUST be created and managed through Spec Kit (`/speckit-*` commands), never by
hand-creating spec scaffolding. The spec's Status MUST track implementation reality:
`Draft` → `in-progress` (before coding) → `complete` (after done).

**Rationale**: Specs bridge human and AI understanding and prevent duplicate work. Bypassing
the tooling corrupts the shared context that keeps humans and agents aligned.

### II. Quality Gates & Testing

The project MUST build cleanly before any change is considered done: `npm run build` at the
application root. Tests are the guardrail for behavior that matters: bug fixes MUST add a
regression test, and new behavioral logic SHOULD ship with tests. Tests use Vitest
(`npm test` / `npm run test`). A change MUST NOT be merged while any existing test is
failing. Type checking MUST pass (`tsc --noEmit` or the build's type check step).

**Rationale**: Automated gates catch regressions cheaply and keep a small, personal codebase
trustworthy without heavyweight process.

### III. Consistent Formatting & Style

All code MUST pass the configured linter and formatter: Prettier for formatting and ESLint
for lint rules (`npm run lint`). Formatting is enforced by tooling, not debated in review:
run the formatter before committing. TypeScript MUST be used for application and harness
code; new untyped JavaScript files are not accepted.

**Rationale**: Automated formatting removes bikeshedding, keeps diffs meaningful, and makes
the code uniform regardless of author or tool.

### IV. Secure by Default

Authentication and authorization MUST NOT be weakened. Sign-in is Google OAuth2/OIDC only;
no local password store. Access MUST be restricted to an explicit allowlist of Google
accounts — a non-allowlisted account that authenticates with Google MUST still be rejected
by the app. The owner-run processing harness MUST authenticate with its own secret token,
scoped to receipt staging endpoints. Secrets — OAuth client credentials, database URLs,
harness tokens, allowlisted emails — MUST live in environment variables (Vercel project
settings / `.env.local`) and MUST NEVER be committed to the repository.

**Rationale**: The app holds personal financial data behind third-party identity; a single
leaked secret or relaxed access rule compromises the whole system.

### V. Simplicity First (YAGNI)

Prefer the simplest solution that satisfies the current spec. New dependencies, abstractions,
services, or layers MUST be justified by a concrete present need, not a hypothetical future
one. When a change adds material complexity, the plan MUST record why the simpler alternative
was rejected.

**Rationale**: gastar is a focused personal expense tracker; unjustified complexity is the
main long-term maintenance risk for a small codebase.

## Technology & Architecture Constraints

- **Platform**: Vercel hosts the site and its serverless API; there is no separately hosted
  backend service.
- **Application**: TypeScript web application (frontend + API routes in one project) deployed
  to Vercel. Package management via npm.
- **Database**: Neon (managed Postgres, serverless driver). One database; no additional
  datastores without a spec.
- **File storage**: Receipt images stored in Vercel Blob (or equivalent Vercel-native store);
  staged images are temporary and cleaned up when resolved.
- **Identity**: Google OAuth2/OIDC with an allowlist of one or two accounts; no local
  passwords.
- **Receipt processing**: Asynchronous. Images land in a staging area; an owner-run local
  harness (TypeScript CLI in this repo, driven by a project-level Claude skill) downloads
  pending receipts, parses them, and posts results back as draft expenses. The hosted app
  MUST NOT call third-party AI/OCR services directly.
- **Legacy stack**: Spring Boot, Gradle, MongoDB, Docker Compose, and the Angular app are
  retired; remaining scaffolding is removed as part of feature 001 implementation.
- Introducing a new datastore, framework, or major dependency is a design decision and MUST
  be captured in a spec (Principle I) with justification (Principle V).

## Development Workflow & Quality Gates

- **Before coding**: discover existing context and specs via project tooling; create or move
  the relevant spec to `in-progress`.
- **While coding**: keep the spec current with decisions and learnings; make focused commits.
- **Before done**: run `npm run lint`, `npm run build`, and `npm test`. All must pass.
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

**Version**: 2.0.1 | **Ratified**: 2026-07-01 | **Last Amended**: 2026-07-01
