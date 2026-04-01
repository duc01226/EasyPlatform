---
name: cook-parallel
version: 1.0.0
description: '[Implementation] Parallel implementation - multiple tasks simultaneously'
disable-model-invocation: false
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

> **Understand Code First** — Search codebase for 3+ similar implementations BEFORE writing any code. Read existing files, validate assumptions with grep evidence, map dependencies via graph trace. Never invent new patterns when existing ones work.
> MUST READ `.claude/skills/shared/understand-code-first-protocol.md` for full protocol and checklists.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)
- `docs/test-specs/` — Test specifications by module (read existing TCs; generate/update test specs via `/tdd-spec` after implementation)

> **Plan Quality** — Every plan phase MUST include `## Test Specifications` section with TC-{FEAT}-{NNN} format. Verify TC satisfaction per phase before marking complete. Plans must include `story_points` and `effort` in frontmatter.
> MUST READ `.claude/skills/shared/plan-quality-protocol.md` for full protocol and checklists.

> **Rationalization Prevention** — AI consistently skips steps via: "too simple for a plan", "I'll test after", "already searched", "code is self-explanatory". These are EVASIONS — not valid reasons. Plan anyway. Test first. Show grep evidence with file:line. Never combine steps to "save time".
> MUST READ `.claude/skills/shared/rationalization-prevention-protocol.md` for full protocol and checklists.

> **Red Flag STOP Conditions** — STOP current approach when: 3+ fix attempts on same issue (root cause not identified), each fix reveals NEW problems (upstream root cause), fix requires 5+ files for "simple" change (wrong abstraction layer), using "should work"/"probably fixed" without verification evidence. After 3 failed attempts, report all outcomes and ask user before attempt #4.
> MUST READ `.claude/skills/shared/red-flag-stop-conditions-protocol.md` for full protocol and checklists.

> **Skill Variant:** Variant of `/cook` — parallel multi-task implementation with subagents.

## Quick Summary

**Goal:** Implement multiple independent tasks simultaneously using parallel fullstack-developer subagents.

**Workflow:**

1. **Plan** — Create plan with parallel phases and strict file ownership
2. **Dispatch** — Launch fullstack-developer subagents per phase
3. **Merge** — Integrate all changes and verify
4. **Review** — Run code-simplifier and review-changes

**Key Rules:**

- Phases must have non-overlapping file ownership
- User approval required before dispatching subagents
- Break work into todo tasks; add final self-review task

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Execute these tasks in parallel for maximum efficiency:
<tasks>$ARGUMENTS</tasks>

**Mode:** PARALLEL - Multiple subagents working concurrently.

## Workflow

### 1. Task Decomposition

- Analyze tasks for independence
- Group into parallelizable work units
- Identify dependencies between units
- Create dependency graph
- **External Memory**: Write task analysis to `.ai/workspace/analysis/{task-name}.analysis.md`. Re-read before parallel dispatch.

### 2. Parallel Research (if needed)

Launch multiple `researcher` subagents simultaneously:

```
Task A research ──┐
Task B research ──┼──► Synthesis
Task C research ──┘
```

### 3. Parallel Planning

- Use `planner` subagent with synthesized research
- Create plan with parallel-safe phases
- Mark file ownership boundaries (prevent conflicts)

### 4. Parallel Implementation

Launch multiple `fullstack-developer` subagents:

```
Phase 1 (Backend API) ──┐
Phase 2 (Frontend UI) ──┼──► Integration
Phase 3 (Tests)       ──┘
```

**Critical:** Each subagent must stay within file ownership boundaries.

### 5. Integration & Testing

- Merge parallel outputs
- Use `tester` subagent for integration tests
- Use `debugger` if integration issues found

### 6. Review & Report

- Use `code-reviewer` for final review
- Consolidate all changes
- Report to user

## Parallelization Rules

| Rule                 | Description                                    |
| -------------------- | ---------------------------------------------- |
| **File Ownership**   | Each subagent owns specific files - no overlap |
| **Dependency Order** | Respect dependency graph                       |
| **Max Concurrent**   | 3 subagents max to prevent conflicts           |
| **Sync Points**      | Integration checkpoints between phases         |

## When to Use

- Multi-component features (backend + frontend)
- Large refactoring across independent modules
- Parallel test writing
- Documentation updates alongside code

## Example Task Split

```
"Add user authentication with login UI"
├── Backend API (subagent 1)
│   ├── auth-controller.ts
│   └── auth-service.ts
├── Frontend UI (subagent 2)
│   ├── login-page.component.ts
│   └── login-form.component.ts
└── Tests (subagent 3)
    ├── auth.spec.ts
    └── login.e2e.ts
```

## Trade-offs

| Aspect       | Parallel             | Sequential |
| ------------ | -------------------- | ---------- |
| Speed        | ~2-3x faster         | Baseline   |
| Coordination | Higher complexity    | Simple     |
| Conflicts    | Risk of merge issues | None       |
| Context      | Split across agents  | Unified    |

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
- **MUST** validate decisions with user via `AskUserQuestion` — never auto-decide
  **MANDATORY IMPORTANT MUST** READ the following files before starting:
- **MUST** READ `.claude/skills/shared/understand-code-first-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/plan-quality-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/rationalization-prevention-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/red-flag-stop-conditions-protocol.md` before starting
