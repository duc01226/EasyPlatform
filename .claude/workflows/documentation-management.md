# Project Documentation Management

## Quick Summary

**Goal:** Keep authoritative project documentation aligned with durable changes, following the project's configured documentation roots and artifact owners.

**Workflow:**

1. **Detect** — Identify which authoritative documentation, if any, a change makes stale
2. **Route** — Use project configuration and its documentation index to resolve the owner and path
3. **Update** — Read current state, update only affected durable docs, and verify cross-references
4. **Plan** — Keep canonical plans in the configured plans root; put disposable reports under the workspace `tmp/reports/`

**Key Rules:**

- Update a durable doc when its recorded behavior, architecture, operations, security guidance, or project convention changes, or when project policy requires it
- Do not create or update a roadmap or progress summary unless the user explicitly requests that artifact or an established project process owns it
- Plans go in the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) with timestamp naming — phase files follow development-rules.md
- Always read current doc state before updating — maintain version consistency

---

### Managed Documentation Artifacts

Resolve documentation paths from project configuration and the existing docs index. Do not assume every project uses `./docs/` or create a second documentation plane. Create durable artifacts only when an explicit request or established project convention calls for them:

- **Roadmap** — optional planning artifact; update only when explicitly requested or owned by an established project process
- **Architecture** — system design and component interactions, when this project maintains such a document
- **Code Standards** — coding conventions and quality standards, when this project maintains such a document

### Documentation Update Triggers

- **Behavior or contract change**: Update the canonical specification, API contract, or user-facing guidance that records the changed behavior.
- **Architecture or operations change**: Update the architecture or runbook owner when its durable instructions or boundaries changed.
- **Security change**: Update security or operations guidance when the supported controls or procedures changed.
- **Dependency or standards change**: Update project references when supported versions, commands, or conventions changed.
- **Explicit documentation request**: Update the requested artifact within its declared ownership and authority.

Plan/task status is maintained in its canonical plan or task tracker. A status change alone does not require a roadmap edit, a progress percentage, or a new project document. This workflow has no recurring weekly progress-report requirement.

### Documentation Triggers

The `docs-manager` agent checks for affected documents when:

- A behavior, public contract, or data rule changes
- An architecture, operational procedure, or security control changes
- A supported dependency, command, or project convention changes
- A project-owned roadmap or other durable planning artifact is explicitly in scope
- The user explicitly requests documentation

### Update Protocol

1. **Before Updates**: Resolve the authoritative owner; read the affected doc and its source of truth. Read a roadmap only when that artifact is explicitly in scope.
2. **During Updates**: Preserve ownership, version consistency, and local formatting; do not create duplicate or progress-only artifacts.
3. **After Updates**: Verify links, dates, and cross-references against the current source.
4. **Quality Check**: Ensure every statement reflects implemented behavior or a clearly marked plan decision.

---

### Plans

#### Plan Location

Save plans in the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) with timestamp and descriptive name.

**Format:** Use naming pattern from `## Naming` section injected by hooks.

**Example:** `plans/251101-1505-authentication-and-profile-implementation/` — the tree below assumes the default root; `docsRoots.plans.path` in `docs/project-config.json` relocates it.

#### File Organization

Shown at the default root; `docsRoots.plans.path` in `docs/project-config.json` relocates the whole tree.

```
plans/
├── 20251101-1505-authentication-and-profile-implementation/
│   ├── plan.md                                # Overview access point
│   ├── phase-01-setup-environment.md          # Setup environment
│   ├── phase-02-implement-database.md         # Database models
│   ├── phase-03-implement-api-endpoints.md    # API endpoints
│   ├── phase-04-implement-ui-components.md    # UI components
│   ├── phase-05-implement-authentication.md   # Auth & authorization
│   ├── phase-06-implement-profile.md          # Profile page
│   └── phase-07-write-tests.md                # Tests
└── ...
```

Disposable investigation, researcher, and verification reports belong under `tmp/reports/{run-id}/` in the project workspace, not inside the canonical plan directory. Keep durable decisions and essential findings in `plan.md` or the relevant phase file; do not depend on temporary report paths as long-lived context.

#### File Structure

##### Overview Plan (plan.md)

- Keep generic and under 80 lines
- List each phase with status/progress
- Link to detailed phase files
- Key dependencies

##### Phase Files (phase-XX-name.md)

> **Development Rules** — YAGNI/KISS/DRY. Behavior with the project-identified owner. Understand code first. Evidence-based actions.
> Phase files MUST ATTENTION follow `./.claude/docs/development-rules.md`.

Each phase file contains:

| Section                     | Contents                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Context Links**           | Durable source files and documentation; summarize essential findings in the plan rather than relying on temporary report links |
| **Overview**                | Priority, status, brief description                                                                                            |
| **Key Insights**            | Findings from research, critical considerations                                                                                |
| **Requirements**            | Functional + non-functional                                                                                                    |
| **Architecture**            | System design, component interactions, data flow                                                                               |
| **Related Code Files**      | Files to modify / create / delete                                                                                              |
| **Implementation Steps**    | Detailed, numbered, specific instructions                                                                                      |
| **Todo List**               | Checkbox list for tracking                                                                                                     |
| **Success Criteria**        | Definition of done, validation methods                                                                                         |
| **Risk Assessment**         | Potential issues, mitigation strategies                                                                                        |
| **Security Considerations** | Auth/authorization, data protection                                                                                            |
| **Next Steps**              | Dependencies, follow-up tasks                                                                                                  |

---

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** update only durable docs whose recorded behavior, architecture, operations, security guidance, or conventions changed; roadmap and recurring progress updates require an explicit request or established project process
**MANDATORY IMPORTANT MUST ATTENTION** read current doc state before updating — never overwrite blindly
**MANDATORY IMPORTANT MUST ATTENTION** save plans in the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) with timestamp naming and structured phase files
**MANDATORY IMPORTANT MUST ATTENTION** save disposable reports under workspace `tmp/reports/{run-id}/`, not inside canonical plan directories
**MANDATORY IMPORTANT MUST ATTENTION** follow development-rules.md in all phase files (YAGNI/KISS/DRY, class responsibility, evidence-based)
