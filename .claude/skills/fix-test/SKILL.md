---
name: fix-test
version: 1.0.0
description: '[Implementation] Run test suite and fix issues'
disable-model-invocation: false
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

> **Understand Code First** — Search codebase for 3+ similar implementations BEFORE writing any code. Read existing files, validate assumptions with grep evidence, map dependencies via graph trace. Never invent new patterns when existing ones work.
> MUST READ `.claude/skills/shared/understand-code-first-protocol.md` for full protocol and checklists.

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs `file:line` proof. Confidence: >95% recommend freely, 80-94% with caveats, <80% DO NOT recommend — gather more evidence. Cross-service validation required for architectural changes.
> MUST READ `.claude/skills/shared/evidence-based-reasoning-protocol.md` for full protocol and checklists.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

> **Estimation Framework** — SP scale: 1(trivial) → 2(small) → 3(medium) → 5(large) → 8(very large, high risk) → 13(epic, SHOULD split) → 21(MUST split). MUST provide `story_points` and `complexity` estimate after investigation.
> MUST READ `.claude/skills/shared/estimation-framework.md` for full protocol and checklists.

- `docs/test-specs/` — Test specifications by module (read existing TCs for expected behavior context when diagnosing failures)

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

> **[MANDATORY]** Read `.claude/skills/shared/root-cause-debugging-protocol.md` BEFORE proposing any fix. Responsibility attribution and data lifecycle tracing are required.

Analyze the skills catalog and activate the skills that are needed for the task during the process.

## Debug Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

- Do NOT assume the first hypothesis is correct — verify with actual code traces
- Every root cause claim must include `file:line` evidence
- If you cannot prove a root cause with a code trace, state "hypothesis, not confirmed"
- Question assumptions: "Is this really the cause?" → trace the actual execution path
- Challenge completeness: "Are there other contributing factors?" → check related code paths
- No "should fix it" without proof — verify the fix addresses the traced root cause

## ⚠️ MANDATORY: Confidence & Evidence Gate

**MANDATORY IMPORTANT MUST** declare `Confidence: X%` with evidence list + `file:line` proof for EVERY claim.
**95%+** recommend freely | **80-94%** with caveats | **60-79%** list unknowns | **<60% STOP — gather more evidence.**

> **⚠️ Validate Before Fix (NON-NEGOTIABLE):** After root cause analysis + plan creation, MUST present findings + proposed fix to user via `AskUserQuestion` and get explicit approval BEFORE any code changes. No silent fixes.

## Reported Issues:

<issues>$ARGUMENTS</issues>

## Workflow:

1. Use `tester` subagent to compile the code and fix all syntax errors if any.
2. Use `tester` subagent to run the tests and report back to main agent.
    - **External Memory**: Write test failure analysis to `.ai/workspace/analysis/{test-issue}.analysis.md`. Re-read before fixing.
3. If there are issues or failed tests, use `debugger` subagent to find the root cause of the issues, then report back to main agent.
4. Use `planner` subagent to create an implementation plan based on the reports, then report back to main agent.
5. **🛑 Present root cause + fix plan → `AskUserQuestion` → wait for user approval.**
6. Use main agent to implement the plan step by step.
7. Use `tester` agent to test the fix and make sure it works, then report back to main agent.
8. Use `code-reviewer` subagent to quickly review the code changes and make sure it meets requirements, then report back to main agent.
9. If there are issues or failed tests, repeat from step 2.
10. After finishing, respond back to user with a summary of the changes and explain everything briefly, guide user to get started and suggest the next steps.

- **After fixing, MUST run `/prove-fix`** — build code proof traces per change with confidence scores. Never skip.

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
- **MUST** STOP after 3 failed fix attempts — report outcomes, ask user before #4
  **MANDATORY IMPORTANT MUST** READ the following files before starting:
- **MUST** READ `.claude/skills/shared/understand-code-first-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/evidence-based-reasoning-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/estimation-framework.md` before starting
