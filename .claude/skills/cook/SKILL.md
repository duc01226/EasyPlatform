---
name: cook
version: 1.0.0
description: '[Implementation] Implement a feature [step by step]'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** `.claude/skills/shared/understand-code-first-protocol.md` before executing.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

## Quick Summary

**Goal:** Implement a feature step-by-step with research, planning, execution, and verification.

**Workflow:**

1. **Question** — Clarify requirements via AskUserQuestion; challenge assumptions
2. **Research** — Use researcher subagents in parallel; scout codebase for patterns
3. **Plan** — Create implementation plan, get user approval
4. **Implement** — Execute with skill activation, code-simplifier, review-changes

**Key Rules:**

- Parent skill for all cook-\* variants (cook-auto, cook-fast, cook-hard, cook-parallel)
- Write research findings to `.ai/workspace/analysis/` for context preservation
- Always activate relevant skills from catalog during implementation
- Break work into small todo tasks; add final review task

## Greenfield Mode

> **Auto-detected:** If no existing codebase is found (no code directories like `src/`, `app/`, `lib/`, `server/`, `packages/`, etc., no manifest files like `package.json`/`*.sln`/`go.mod`, no populated `project-config.json`), this skill switches to greenfield mode automatically. Planning artifacts (docs/, plans/, .claude/) don't count — the project must have actual code directories with content.

**When greenfield is detected:**

1. If an **approved plan exists** in `plans/`: scaffold project structure from the plan
2. If **no approved plan**: redirect to `/plan` first — "No approved plan found. Run /plan first to create a greenfield project plan."
3. Generate: folder layout, starter files, build config, CI skeleton, CLAUDE.md
4. Skip codebase pattern search (no patterns exist yet)
5. Use plan's tech stack decisions to generate project scaffold
6. After scaffolding, run `/project-config` to populate project configuration

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Variant Decision Guide

| If implementation needs...  | Use                   | Why                                     |
| --------------------------- | --------------------- | --------------------------------------- |
| Quick, straightforward      | `/cook-fast`          | Skip deep research, minimal planning    |
| Complex, multi-layer        | `/cook-hard`          | Maximum verification, subagent research |
| Backend + frontend parallel | `/cook-parallel`      | Parallel fullstack-developer agents     |
| Full autonomous execution   | `/cook-auto`          | Minimal user interaction                |
| Fast autonomous             | `/cook-auto-fast`     | Auto + skip deep research               |
| Parallel autonomous         | `/cook-auto-parallel` | Auto + parallel agents                  |
| General/interactive         | `/cook` (this skill)  | Step-by-step with user collaboration    |

Think harder to plan & start working on these tasks:
<tasks>$ARGUMENTS</tasks>

---

## Your Approach

1. **Question Everything**: Use `AskUserQuestion` tool to fully understand the request, constraints, and true objectives. Don't assume — clarify until certain.
2. **Brutal Honesty**: Provide frank feedback. If something is unrealistic or over-engineered, say so directly. Prevent costly mistakes.
3. **Explore Alternatives**: Consider multiple approaches. Present 2-3 viable solutions with clear pros/cons.
4. **Challenge Assumptions**: Question the initial approach. Often the best solution differs from what was originally envisioned.
5. **Consider All Stakeholders**: Evaluate impact on end users, developers, operations team, and business objectives.

---

## Workflow

**IMPORTANT:** Analyze the skills catalog at `.claude/skills/*` and activate needed skills during the process.

### Research

- Use multiple `researcher` subagents in parallel to explore the request, validate ideas, and find best solutions.
- Keep research reports concise (≤150 lines) with citations.
- Use `/scout-ext` (preferred) or `/scout` (fallback) to search the codebase.
- **External Memory**: Write all research findings to `.ai/workspace/analysis/{task-name}.analysis.md`. Re-read ENTIRE file before planning.

### Plan

- Use `planner` subagent to create an implementation plan using progressive disclosure structure.
- Create directory using plan naming pattern, save overview at `plan.md` (under 80 lines).
- For each phase: `phase-XX-name.md` with Context, Overview (date/priority/status), Key Insights, Requirements, Architecture, Related Code Files, Implementation Steps, Todo List, Success Criteria, Risk Assessment, Security Considerations, Next Steps.

### Implementation

- Use `/code` slash command to implement the plan step by step.
- Use `ui-ux-designer` subagent for frontend work per `./docs/design-guidelines.md`.
- Run type checking and compile to verify no syntax errors.

### Testing

- Write real tests covering happy path, edge cases, and error cases.
- Use `tester` subagent to run tests. If failures: use `debugger` subagent to find root cause, fix, re-run.
- Repeat until all tests pass. Do not use fake data, mocks, or temporary solutions just to pass the build.

### Code Review

- Delegate to `code-reviewer` subagent. If critical issues: fix and re-run `tester`.
- Repeat until all tests pass and code is reviewed.
- Report summary to user and ask for approval.

### Project Management & Documentation

**If user approves:** Use `project-manager` and `docs-manager` subagents in parallel to update progress and documentation.
**If user rejects:** Ask user to explain issues, fix, and repeat.

### Onboarding

- Instruct user on getting started (API keys, env vars, config) if needed.
- Help configure step by step, one question at a time.

### Final Report

- Summary of changes with next steps.
- Ask user if they want to commit and push via `git-manager` subagent.

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements

---

## Workflow Recommendation

> **IMPORTANT MUST:** If you are NOT already in a workflow, use `AskUserQuestion` to ask the user:
>
> 1. **Activate `feature` workflow** (Recommended) — scout → investigate → plan → cook → review → sre-review → test → docs
> 2. **Execute `/cook` directly** — run this skill standalone
