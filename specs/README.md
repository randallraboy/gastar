# Specs

Feature specifications managed with [Spec Kit](https://github.com/github/spec-kit).

Each feature lives in a numbered directory:

```text
specs/
└── 001-expense-tracking/
    ├── spec.md          # What & why (user stories, requirements)
    ├── plan.md          # Technical plan + constitution check
    ├── research.md      # Decisions with rationale
    ├── data-model.md    # Entities & schema
    ├── contracts/       # API contracts
    ├── quickstart.md    # Validation scenarios
    └── tasks.md         # Executable task breakdown
```

Workflow: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` →
`/speckit-implement`. Governance: `.specify/memory/constitution.md`.
