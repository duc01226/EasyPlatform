---
name: fix-test
version: 1.0.0
description: '[Implementation] Run test suite and fix issues'
activation: user-invoked
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** `.claude/skills/shared/understand-code-first-protocol.md` AND `.claude/skills/shared/evidence-based-reasoning-protocol.md` before executing.

> **Skill Variant:** Variant of `/fix` — test suite failure diagnosis and resolution.

## Quick Summary

**Goal:** Run test suites, analyze failures, and fix the underlying code or test issues.

**Workflow:**
1. **Run** — Execute test suite and capture results
2. **Analyze** — Identify failing tests, classify as code bug vs test issue
3. **Fix** — Apply targeted fix to code or test

**Key Rules:**
- Debug Mindset: every claim needs `file:line` evidence
- Distinguish between code bugs and flawed test expectations
- Run tests again after fix to confirm all pass

Analyze the skills catalog and activate the skills that are needed for the task during the process.

## Debug Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking. Every claim needs traced proof.**

- Do NOT assume the first hypothesis is correct — verify with actual code traces
- Every root cause claim must include `file:line` evidence
- If you cannot prove a root cause with a code trace, state "hypothesis, not confirmed"
- Question assumptions: "Is this really the cause?" → trace the actual execution path
- Challenge completeness: "Are there other contributing factors?" → check related code paths
- No "should fix it" without proof — verify the fix addresses the traced root cause

## ⚠️ MANDATORY: Confidence & Evidence Gate

**MUST** declare `Confidence: X%` with evidence list + `file:line` proof for EVERY claim.
**95%+** recommend freely | **80-94%** with caveats | **60-79%** list unknowns | **<60% STOP — gather more evidence.**

## Reported Issues:

<issues>$ARGUMENTS</issues>

## Workflow:

1. Use `tester` subagent to compile the code and fix all syntax errors if any.
2. Use `tester` subagent to run the tests and report back to main agent.
    - **External Memory**: Write test failure analysis to `.ai/workspace/analysis/{test-issue}.analysis.md`. Re-read before fixing.
3. If there are issues or failed tests, use `debugger` subagent to find the root cause of the issues, then report back to main agent.
4. Use `planner` subagent to create an implementation plan based on the reports, then report back to main agent.
5. Use main agent to implement the plan step by step.
6. Use `tester` agent to test the fix and make sure it works, then report back to main agent.
7. Use `code-reviewer` subagent to quickly review the code changes and make sure it meets requirements, then report back to main agent.
8. If there are issues or failed tests, repeat from step 2.
9. After finishing, respond back to user with a summary of the changes and explain everything briefly, guide user to get started and suggest the next steps.

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
