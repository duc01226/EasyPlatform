---
name: fix-ci
version: 1.0.0
description: '[Implementation] Analyze Github Actions logs and fix issues'
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

> **Skill Variant:** Variant of `/fix` — specialized for CI/GitHub Actions log analysis.

## Quick Summary

**Goal:** Analyze GitHub Actions CI logs to identify and fix build/test failures in the pipeline.

**Workflow:**

1. **Fetch** — Download CI logs from GitHub Actions
2. **Analyze** — Identify root cause from log output (build errors, test failures, env issues)
3. **Fix** — Apply targeted fix based on traced root cause

**Key Rules:**

- **Infrastructure Context:** Read `docs/project-config.json` → `infrastructure.cicd.tool` to identify CI platform (e.g., "azure-devops", "github-actions", "gitlab-ci"). Target the correct pipeline config files for that platform.
- Debug Mindset: every claim needs `file:line` evidence
- Focus on CI-specific issues (env vars, Docker, dependencies, build order)
- Verify fix doesn't break local development

> **[MANDATORY]** Read `.claude/skills/shared/root-cause-debugging-protocol.md` BEFORE proposing any fix. Responsibility attribution and data lifecycle tracing are required.

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

## Github Actions URL

<url>$ARGUMENTS</url>

> **⚠️ Validate Before Fix (NON-NEGOTIABLE):** After CI log analysis + root cause identification, MUST present findings + proposed fix to user via `AskUserQuestion` and get explicit approval BEFORE any code changes. No silent fixes.

## Workflow

1. Use `debugger` subagent to read the github actions logs with `gh` command, analyze and find the root cause of the issues and report back to main agent.
   1.5. Write analysis findings to `.ai/workspace/analysis/{ci-issue}.analysis.md`. Re-read before implementing fix.
2. **🛑 Present root cause + proposed fix → `AskUserQuestion` → wait for user approval.**
3. Start implementing the fix based the reports and solutions.
4. Use `tester` agent to test the fix and make sure it works, then report back to main agent.
5. If there are issues or failed tests, repeat from step 2.
6. After finishing, respond back to user with a summary of the changes and explain everything briefly, guide user to get started and suggest the next steps.

## Notes

- If `gh` command is not available, instruct the user to install and authorize GitHub CLI first.

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
