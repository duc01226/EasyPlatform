# Project Documentation Management

## Quick Summary

**Goal:** Keep project documentation in `./docs/` synchronized with implementation progress — plans, changelogs, architecture, code standards.

**Workflow:**

1. **Detect** — Identify documentation triggers (feature shipped, bug fixed, milestone hit)
2. **Update** — Read current state, update relevant docs, verify cross-references
3. **Plan** — Save implementation plans in `./plans/` with structured phase files

**Key Rules:**

- Update docs AFTER every feature, milestone, bug fix, or security patch
- Plans go in `./plans/` with timestamp naming — phase files follow development-rules.md
- Always read current doc state before updating — maintain version consistency

---

### Managed Documentation Artifacts

Maintain project docs in `./docs/`. Create if the project needs them:

- **Roadmap** — project phases, milestones, progress
- **Changelog** — significant changes, features, fixes
- **Architecture** — system design, component interactions
- **Code Standards** — coding conventions, quality standards

### Automatic Updates Required

- **After Feature Implementation**: Update relevant docs (roadmap, changelog, etc.)
- **After Major Milestones**: Review and adjust roadmap phases, update success metrics
- **After Bug Fixes**: Document fixes in changelog with severity and impact
- **After Security Updates**: Record security improvements and version updates
- **Weekly Reviews**: Update progress percentages and milestone statuses

### Documentation Triggers

The `project-manager` agent MUST ATTENTION update documents when:

- A development phase status changes (e.g., "In Progress" → "Complete")
- Major features are implemented or released
- Significant bugs are resolved or security patches applied
- Project timeline or scope adjustments are made
- External dependencies or breaking changes occur

### Update Protocol

1. **Before Updates**: Read current roadmap and changelog status
2. **During Updates**: Maintain version consistency and proper formatting
3. **After Updates**: Verify links, dates, and cross-references are accurate
4. **Quality Check**: Ensure updates align with actual implementation progress

---

### Plans

#### Plan Location

Save plans in `./plans/` with timestamp and descriptive name.

**Format:** Use naming pattern from `## Naming` section injected by hooks.

**Example:** `plans/251101-1505-authentication-and-profile-implementation/`

#### File Organization

```
plans/
├── 20251101-1505-authentication-and-profile-implementation/
    ├── research/
    │   ├── researcher-XX-report.md
    │   └── ...
│   ├── reports/
│   │   ├── scout-report.md
│   │   ├── researcher-report.md
│   │   └── ...
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

#### File Structure

##### Overview Plan (plan.md)

- Keep generic and under 80 lines
- List each phase with status/progress
- Link to detailed phase files
- Key dependencies

##### Phase Files (phase-XX-name.md)

> **Development Rules** — YAGNI/KISS/DRY. Logic in LOWEST layer. Understand code first. Evidence-based actions.
> Phase files MUST ATTENTION follow `./.claude/docs/development-rules.md`.

Each phase file contains:

| Section                     | Contents                                         |
| --------------------------- | ------------------------------------------------ |
| **Context Links**           | Related reports, files, documentation            |
| **Overview**                | Priority, status, brief description              |
| **Key Insights**            | Findings from research, critical considerations  |
| **Requirements**            | Functional + non-functional                      |
| **Architecture**            | System design, component interactions, data flow |
| **Related Code Files**      | Files to modify / create / delete                |
| **Implementation Steps**    | Detailed, numbered, specific instructions        |
| **Todo List**               | Checkbox list for tracking                       |
| **Success Criteria**        | Definition of done, validation methods           |
| **Risk Assessment**         | Potential issues, mitigation strategies          |
| **Security Considerations** | Auth/authorization, data protection              |
| **Next Steps**              | Dependencies, follow-up tasks                    |

---

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** update docs after every feature, milestone, bug fix, or security patch
**MANDATORY IMPORTANT MUST ATTENTION** read current doc state before updating — never overwrite blindly
**MANDATORY IMPORTANT MUST ATTENTION** save plans in `./plans/` with timestamp naming and structured phase files
**MANDATORY IMPORTANT MUST ATTENTION** follow development-rules.md in all phase files (YAGNI/KISS/DRY, class responsibility, evidence-based)
