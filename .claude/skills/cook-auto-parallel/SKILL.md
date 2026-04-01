---
name: cook-auto-parallel
version: 1.0.0
description: '[Implementation] Plan parallel phases & execute with fullstack-developer agents'
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

> **Skill Variant:** Variant of `/cook` — autonomous parallel execution with fullstack-developer subagents.

## Quick Summary

**Goal:** Plan parallel-executable phases and dispatch to fullstack-developer subagents for concurrent implementation.

**Workflow:**

1. **Plan** — Create plan with parallel-executable phases (strict file ownership)
2. **Dispatch** — Launch fullstack-developer subagents per phase
3. **Merge** — Integrate results and verify

**Key Rules:**

- Each subagent owns specific files; no cross-boundary edits
- Autonomous mode: no user confirmation between phases
- Break work into todo tasks; add final self-review task

**Ultrathink parallel** to implement: <tasks>$ARGUMENTS</tasks>

**IMPORTANT:** Activate needed skills. Ensure token efficiency. Sacrifice grammar for concision.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Workflow

### 1. Research (Optional)

- Use max 2 `researcher` agents in parallel if tasks complex
- Use `/scout-ext` to search codebase
- Keep reports ≤150 lines
- **External Memory**: Write research to `.ai/workspace/analysis/{task-name}.analysis.md`. Re-read before parallel execution.

### 2. Parallel Planning

- Trigger `/plan-parallel <detailed-instruction>`
- Wait for plan with dependency graph, execution strategy, file ownership matrix

### 3. Parallel Implementation

- Read `plan.md` for dependency graph
- Launch multiple `fullstack-developer` agents in PARALLEL for concurrent phases
    - Example: "Phases 1-3 parallel" → launch 3 agents simultaneously
    - Pass phase file path: `{plan-dir}/phase-XX-*.md`
    - Include environment info
- Wait for all parallel phases complete before dependent phases
- Sequential phases: launch one agent at a time

### 4. Testing

- Use `tester` subagent for full test suite
- NO fake data/mocks/cheats
- If fail: use `debugger`, fix, repeat

### 5. Code Review

- Use `code-reviewer` for all changes
- If critical issues: fix, retest

### 6. Project Management & Docs

- If approved: use `project-manager` + `docs-manager` in parallel
- Update plan files, docs, roadmap
- If rejected: fix and repeat

### 7. Final Report

- Summary of all parallel phases
- Guide to get started
- Ask to commit (use `git-manager` if yes)

**Example:** Phases 1-3 parallel → Launch 3 fullstack-developer agents → Wait → Phase 4 sequential

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
