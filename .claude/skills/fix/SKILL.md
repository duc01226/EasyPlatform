---
name: fix
version: 1.0.0
description: '[Implementation] Analyze and fix issues [INTELLIGENT ROUTING]'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

> **Understand Code First** — Search codebase for 3+ similar implementations BEFORE writing any code. Read existing files, validate assumptions with grep evidence, map dependencies via graph trace. Never invent new patterns when existing ones work.
> MUST READ `.claude/skills/shared/understand-code-first-protocol.md` for full protocol and checklists.

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs `file:line` proof. Confidence: >95% recommend freely, 80-94% with caveats, <80% DO NOT recommend — gather more evidence. Cross-service validation required for architectural changes.
> MUST READ `.claude/skills/shared/evidence-based-reasoning-protocol.md` for full protocol and checklists.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

> **Estimation Framework** — SP scale: 1(trivial) → 2(small) → 3(medium) → 5(large) → 8(very large, high risk) → 13(epic, SHOULD split) → 21(MUST split). MUST provide `story_points` and `complexity` estimate after investigation.
> MUST READ `.claude/skills/shared/estimation-framework.md` for full protocol and checklists.

> **Evidence Gate:** MANDATORY IMPORTANT MUST — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

> **Red Flag STOP Conditions** — STOP current approach when: 3+ fix attempts on same issue (root cause not identified), each fix reveals NEW problems (upstream root cause), fix requires 5+ files for "simple" change (wrong abstraction layer), using "should work"/"probably fixed" without verification evidence. After 3 failed attempts, report all outcomes and ask user before attempt #4.
> MUST READ `.claude/skills/shared/red-flag-stop-conditions-protocol.md` for full protocol and checklists.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

## Quick Summary

**Goal:** Analyze issues and intelligently route to the best-matching specialized fix command (fix-ci, fix-fast, fix-hard, fix-ui, etc.).

**Workflow:**

1. **Check** — Look for existing plan; if found, route to `/code <plan>`
2. **Classify** — Match issue type (type errors, UI, CI, logs, tests, general)
3. **Route** — Delegate to specialized fix variant based on classification

**Key Rules:**

- Debug Mindset is non-negotiable: every claim needs traced proof with `file:line` evidence
- Never assume first hypothesis is correct — verify with actual code traces
- Parent skill for all fix-\* variants; routes based on issue keywords

> **[MANDATORY]** Read `.claude/skills/shared/root-cause-debugging-protocol.md` BEFORE proposing any fix. Responsibility attribution and data lifecycle tracing are required.

### Frontend/UI Context (if applicable)

> When this task involves frontend or UI changes,

> **UI System Context** — For frontend/UI/styling tasks, MUST READ these BEFORE implementing: `frontend-patterns-reference.md` (component base classes, stores, forms), `scss-styling-guide.md` (BEM methodology, SCSS vars, responsive), `design-system/README.md` (design tokens, component inventory, icons).
> MUST READ `.claude/skills/shared/ui-system-context.md` for full protocol and checklists.

- Component patterns: `docs/project-reference/frontend-patterns-reference.md`
- Styling/BEM guide: `docs/project-reference/scss-styling-guide.md`
- Design system tokens: `docs/project-reference/design-system/README.md`

## Variant Decision Guide

| If the issue is...        | Use                 | Why                                         |
| ------------------------- | ------------------- | ------------------------------------------- |
| Type errors (TS/C#)       | `/fix-types`        | Specialized for type system errors          |
| UI/visual bug             | `/fix-ui`           | Includes visual comparison                  |
| CI/CD pipeline failure    | `/fix-ci`           | Reads pipeline logs, understands CI context |
| Test failures             | `/fix-test`         | Focuses on test assertions and mocking      |
| Log-based investigation   | `/fix-logs`         | Parses log files for root cause             |
| GitHub issue with context | `/fix-issue`        | Reads issue details, links to code          |
| Simple/obvious fix        | `/fix-fast`         | Skip deep investigation                     |
| Complex/multi-file bug    | `/fix-hard`         | Uses subagents for parallel investigation   |
| Multiple independent bugs | `/fix-parallel`     | Parallel fix execution                      |
| General/unknown           | `/fix` (this skill) | Routes automatically based on keywords      |

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

**Analyze issues and route to specialized fix command:**
<issues>$ARGUMENTS</issues>

## ⚠️ MANDATORY: Plan Before Fix (NON-NEGOTIABLE)

**MANDATORY IMPORTANT MUST** — Before routing to ANY fix variant, you MUST have a validated plan. This applies whether running standalone or within a workflow.

**If no plan exists**, you MUST create todo tasks for and execute these steps IN ORDER before proceeding to fix:

1. **`/plan`** — Create an implementation plan for the fix (root cause analysis + fix approach + affected files)
2. **`/plan-review`** — Auto-review the plan for validity, correctness, and best practices
3. **`/plan-validate`** — Validate plan with critical questions interview (get user confirmation)

**Only after plan is validated** → proceed to fix routing below.

**If a plan already exists** (markdown plan file in `plans/`) → skip to fix routing.

> **Why:** Fixes without plans lead to incomplete root cause analysis, missed side effects, and regressions. Planning forces the AI to think before acting.

## Decision Tree

**1. Check for existing plan:**

- If markdown plan exists → `/code <path-to-plan>`
- If NO plan exists → **STOP. Run `/plan → /plan-review → /plan-validate` first** (see section above)

**2. Route by issue type (only after plan exists):**

**A) Type Errors** (keywords: type, typescript, tsc, type error)
→ `/fix-types`

**B) UI/UX Issues** (keywords: ui, ux, design, layout, style, visual, button, component, css, responsive)
→ `/fix-ui <detailed-description>`

**C) CI/CD Issues** (keywords: github actions, pipeline, ci/cd, workflow, deployment, build failed)
→ `/fix-ci <github-actions-url-or-description>`

**D) Test Failures** (keywords: test, spec, jest, vitest, failing test, test suite)
→ `/fix-test <detailed-description>`

**E) Log Analysis** (keywords: logs, error logs, log file, stack trace)
→ `/fix-logs <detailed-description>`

**F) Multiple Independent Issues** (2+ unrelated issues in different areas)
→ `/fix-parallel <detailed-description>`

**G) Complex Issues** (keywords: complex, architecture, refactor, major, system-wide, multiple components)
→ `/fix-hard <detailed-description>`

**H) Simple/Quick Fixes** (default: small bug, single file, straightforward)
→ `/fix-fast <detailed-description>`

## Graph Intelligence (MANDATORY — DO NOT SKIP when graph.db exists)

If `.code-graph/graph.db` exists, you MUST use graph to enhance analysis with structural queries:

**Without graph, your fix may miss affected callers, consumers, and tests. This step is NOT optional.**

- **Trace callers of buggy function:** `python .claude/scripts/code_graph query callers_of <function> --json`
- **Find existing tests:** `python .claude/scripts/code_graph query tests_for <function> --json`
- **Batch analysis:** `python .claude/scripts/code_graph batch-query file1 file2 --json`

> See `.claude/skills/shared/graph-intelligence-queries.md` for full query reference.

### Graph-Assisted Fix Verification

Before and after fixing, use graph trace to understand blast radius:

1. `python .claude/scripts/code_graph trace <file-to-fix> --direction downstream --json` — see all downstream consumers affected by the fix
2. `python .claude/scripts/code_graph trace <file-to-fix> --direction both --json` — full flow to ensure fix doesn't break upstream or downstream

## Notes

- `detailed-description` = enhanced prompt describing issue in detail
- If unclear, ask user for clarification before routing
- Can combine routes: e.g., multiple type errors + UI issue → `/fix-parallel`

## ⚠️ MANDATORY: Post-Fix Verification

**After EVERY fix, you MUST run `/prove-fix` to verify correctness.**

`/prove-fix` builds code proof traces (stack-trace-style) per change, assigns confidence percentages, and produces a ship/block verdict. This is non-negotiable — never skip it. If confidence < 80% on any change, return to investigation.

---

## Workflow Recommendation

> **IMPORTANT MUST:** If you are NOT already in a workflow, use `AskUserQuestion` to ask the user:
>
> 1. **Activate `bugfix` workflow** (Recommended) — scout → investigate → debug → plan → plan-review → plan-validate → fix → prove-fix → review → test
> 2. **Execute `/fix` directly** — still requires `/plan → /plan-review → /plan-validate` before fixing (enforced by Plan Before Fix gate above)

---

## Next Steps

**MANDATORY IMPORTANT MUST** after completing this skill, use `AskUserQuestion` to recommend:

- **"/prove-fix (Recommended)"** — Prove fix correctness with code traces
- **"/test"** — Run tests to verify fix
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST** READ the following files before starting:

- **MUST** READ `.claude/skills/shared/understand-code-first-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/evidence-based-reasoning-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/estimation-framework.md` before starting
- **MUST** READ `.claude/skills/shared/red-flag-stop-conditions-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/ui-system-context.md` before starting
