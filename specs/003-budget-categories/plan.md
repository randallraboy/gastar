# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implement exactly three top-level expense categories ("Needs", "Wants", "Savings") by migrating existing data and locking down the category structure.

## Technical Context

**Language/Version**: TypeScript / Next.js (App Router)

**Primary Dependencies**: Next.js, Drizzle ORM, Auth.js

**Storage**: Neon Postgres

**Testing**: Vitest

**Target Platform**: Vercel Serverless

**Project Type**: Web Application

**Performance Goals**: Fast server-side rendering for data-heavy pages

**Constraints**: Secure by default, minimal abstractions

**Scale/Scope**: Personal tool, 1-2 allowlisted users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I (Spec-Driven)**: ✅ This feature has a completed spec (`specs/003-budget-categories/spec.md`).
- **Principle II (Quality Gates)**: ✅ The plan will rely on standard `npm run build` and Vitest testing.
- **Principle III (Style)**: ✅ Existing formatters will be used.
- **Principle IV (Security)**: ✅ No changes to authentication or authorization.
- **Principle V (Simplicity)**: ✅ This change removes complexity by enforcing a strict 3-category model rather than a dynamic user-defined category system.

## Project Structure

### Documentation (this feature)

```text
specs/003-budget-categories/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (dashboard)/
│   └── api/
├── components/
└── lib/
    └── db/
```

**Structure Decision**: Standard Next.js App Router layout as already established in the repository.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
