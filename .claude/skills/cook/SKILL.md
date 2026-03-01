---
name: cook
version: 1.0.0
description: '[Implementation] Implement a feature [step by step]'
activation: user-invoked
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** `.claude/skills/shared/understand-code-first-protocol.md` before executing.

## Quick Summary

**Goal:** Implement a feature step-by-step with research, planning, execution, and verification.

**Workflow:**

1. **Question** — Clarify requirements via AskUserQuestion; challenge assumptions
2. **Research** — Use researcher subagents in parallel; scout codebase for patterns
3. **Plan** — Create implementation plan, get user approval
4. **Implement** — Execute with skill activation, code-simplifier, review-changes

**Key Rules:**

- Parent skill for all cook-* variants (cook-auto, cook-fast, cook-hard, cook-parallel)
- Write research findings to `.ai/workspace/analysis/` for context preservation
- Always activate relevant skills from catalog during implementation
- Break work into small todo tasks; add final review task

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
