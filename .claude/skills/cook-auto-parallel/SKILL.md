---
name: cook-auto-parallel
version: 1.0.0
description: '[Implementation] Plan parallel phases & execute with fullstack-developer agents'
activation: user-invoked
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI may ask user whether to skip.

**Prerequisites:** **MUST READ** `.claude/skills/shared/understand-code-first-protocol.md` before executing.

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

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
