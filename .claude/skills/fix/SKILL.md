---
name: fix
version: 1.0.0
description: '[Implementation] Analyze and fix issues [INTELLIGENT ROUTING]'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

<!-- SYNC:estimation-framework -->

> **Estimation** — Modified Fibonacci: 1(trivial) → 2(small) → 3(medium) → 5(large) → 8(very large) → 13(epic, SHOULD split) → 21(MUST ATTENTION split). Output `story_points` and `complexity` in plan frontmatter. Complexity auto-derived: 1-2=Low, 3-5=Medium, 8=High, 13+=Critical.

<!-- /SYNC:estimation-framework -->

<!-- SYNC:red-flag-stop-conditions -->

> **Red Flag Stop Conditions** — STOP and escalate to user via AskUserQuestion when:
>
> 1. Confidence drops below 60% on any critical decision
> 2. Changes would affect >20 files (blast radius too large)
> 3. Cross-service boundary is being crossed
> 4. Security-sensitive code (auth, crypto, PII handling)
> 5. Breaking change detected (interface, API contract, DB schema)
> 6. Test coverage would decrease after changes
> 7. Approach requires technology/pattern not in the project
>
> **NEVER proceed past a red flag without explicit user approval.**

<!-- /SYNC:red-flag-stop-conditions -->

<!-- SYNC:fix-layer-accountability -->

> **Fix-Layer Accountability** — NEVER fix at the crash site. Trace the full flow, fix at the owning layer.
>
> AI default behavior: see error at Place A → fix Place A. This is WRONG. The crash site is a SYMPTOM, not the cause.
>
> **MANDATORY before ANY fix:**
>
> 1. **Trace full data flow** — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where the bad state ENTERS, not where it CRASHES.
> 2. **Identify the invariant owner** — Which layer's contract guarantees this value is valid? That layer is responsible. Fix at the LOWEST layer that owns the invariant — not the highest layer that consumes it.
> 3. **One fix, maximum protection** — Ask: "If I fix here, does it protect ALL downstream consumers with ONE change?" If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
> 4. **Verify no bypass paths** — Confirm all data flows through the fix point. Check for: direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
>
> **BLOCKED until:** `- [ ]` Full data flow traced (origin → crash) `- [ ]` Invariant owner identified with `file:line` evidence `- [ ]` All access sites audited (grep count) `- [ ]` Fix layer justified (lowest layer that protects most consumers)
>
> **Anti-patterns (REJECT these):**
>
> - "Fix it where it crashes" — Crash site ≠ cause site. Trace upstream.
> - "Add defensive checks at every consumer" — Scattered defense = wrong layer. One authoritative fix > many scattered guards.
> - "Both fix is safer" — Pick ONE authoritative layer. Redundant checks across layers send mixed signals about who owns the invariant.

<!-- /SYNC:fix-layer-accountability -->

> **OOM/Memory Fix Triage** — Before jumping to projection or chunking: (1) Is the query unbounded — no DB-level filter for the triggering condition? Push that filter to the DB — eliminates OOM absolutely. (2) Is each row excessively large? Apply projection — reduces severity proportionally. Row count has higher ROI than row size for memory fixes.

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

<!-- SYNC:root-cause-debugging -->

> **Root Cause Debugging** — Systematic approach, never guess-and-check.
>
> 1. **Reproduce** — Confirm the issue exists with evidence (error message, stack trace, screenshot)
> 2. **Isolate** — Narrow to specific file/function/line using binary search + graph trace
> 3. **Trace** — Follow data flow from input to failure point. Read actual code, don't infer.
> 4. **Hypothesize** — Form theory with confidence %. State what evidence supports/contradicts it
> 5. **Verify** — Test hypothesis with targeted grep/read. One variable at a time.
> 6. **Fix** — Address root cause, not symptoms. Verify fix doesn't break callers via graph `connections`
>
> **NEVER:** Guess without evidence. Fix symptoms instead of cause. Skip reproduction step.

<!-- /SYNC:root-cause-debugging -->

### Frontend/UI Context (if applicable)

> When this task involves frontend or UI changes,

<!-- SYNC:ui-system-context -->

> **UI System Context** — For ANY task touching `.ts`, `.html`, `.scss`, or `.css` files:
>
> **MUST ATTENTION READ before implementing:**
>
> 1. `docs/project-reference/frontend-patterns-reference.md` — component base classes, stores, forms
> 2. `docs/project-reference/scss-styling-guide.md` — BEM methodology, SCSS variables, mixins, responsive
> 3. `docs/project-reference/design-system/README.md` — design tokens, component inventory, icons
>
> Reference `docs/project-config.json` for project-specific paths.

<!-- /SYNC:ui-system-context -->

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

> **[ROOT-CAUSE-FIX]** Never patch symptoms. Trace the full call chain to find WHO is responsible. Fix at the correct layer (Entity > Service > Handler). If a fix feels like a workaround, it IS — find the real root cause first.

**Be skeptical. Every claim needs `file:line` traced proof. Confidence >80% to act.**

- NEVER assume first hypothesis is correct — verify with actual code traces
- MUST ATTENTION include `file:line` evidence for every root cause claim; otherwise state "hypothesis, not confirmed"
- ALWAYS trace execution path before claiming cause; ALWAYS check related code paths for contributing factors
- NEVER say "should fix it" without proof the fix addresses the traced root cause
- **Confidence Gate:** `Confidence: X%` required for EVERY claim. **95%+** recommend freely | **80-94%** with caveats | **60-79%** list unknowns | **<60% STOP — gather more evidence.**

**Analyze issues and route to specialized fix command:**
<issues>$ARGUMENTS</issues>

## ⚠️ MANDATORY: Plan Before Fix (NON-NEGOTIABLE)

**MANDATORY IMPORTANT MUST ATTENTION** — Before routing to ANY fix variant, you MUST ATTENTION have a validated plan. This applies whether running standalone or within a workflow.

**If no plan exists**, you MUST ATTENTION create todo tasks for and execute these steps IN ORDER before proceeding to fix:

1. **`/plan`** — Create an implementation plan for the fix (root cause analysis + fix approach + affected files)
2. **`/plan-review`** — Auto-review the plan for validity, correctness, and best practices
3. **`/plan-validate`** — Validate plan with critical questions interview (get user confirmation)

**Only after plan is validated** → proceed to fix routing below.

**If a plan already exists** (markdown plan file in `plans/`) → skip to fix routing.

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

If `.code-graph/graph.db` exists, you MUST ATTENTION use graph to enhance analysis with structural queries:

**Without graph, your fix may miss affected callers, consumers, and tests. This step is NOT optional.**

- **Trace callers of buggy function:** `python .claude/scripts/code_graph query callers_of <function> --json`
- **Find existing tests:** `python .claude/scripts/code_graph query tests_for <function> --json`
- **Batch analysis:** `python .claude/scripts/code_graph batch-query file1 file2 --json`

### Graph-Assisted Fix Verification

Before and after fixing, use graph trace to understand blast radius:

1. `python .claude/scripts/code_graph trace <file-to-fix> --direction downstream --json` — see all downstream consumers affected by the fix
2. `python .claude/scripts/code_graph trace <file-to-fix> --direction both --json` — full flow to ensure fix doesn't break upstream or downstream

## MANDATORY: Post-Fix Verification

**After EVERY fix, you MUST ATTENTION run `/prove-fix` to verify correctness.**

`/prove-fix` builds code proof traces (stack-trace-style) per change, assigns confidence percentages, and produces a ship/block verdict. This is non-negotiable — never skip it. If confidence < 80% on any change, return to investigation.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `bugfix` workflow** (Recommended) — scout → investigate → debug → plan → plan-review → plan-validate → fix → prove-fix → review → test
> 2. **Execute `/fix` directly** — still requires `/plan → /plan-review → /plan-validate` before fixing (enforced by Plan Before Fix gate above)

---

## Next Steps (Standalone: MUST ATTENTION ask user via `AskUserQuestion`. Skip if inside workflow.)

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (fix applied). This ensures prove-fix, review, testing, and docs steps aren't skipped.
- **"/prove-fix"** — Prove fix correctness with code traces
- **"/test"** — Run tests to verify fix
- **"/integration-test"** — Generate/update regression integration tests
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

<!-- SYNC:understand-code-first:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
  <!-- /SYNC:understand-code-first:reminder -->
  <!-- SYNC:evidence-based-reasoning:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
  <!-- /SYNC:evidence-based-reasoning:reminder -->
  <!-- SYNC:estimation-framework:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** include `story_points` and `complexity` in plan frontmatter. SP > 8 = split.
  <!-- /SYNC:estimation-framework:reminder -->
  <!-- SYNC:red-flag-stop-conditions:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** STOP after 3 failed fix attempts. Report all attempts, ask user before continuing.
  <!-- /SYNC:red-flag-stop-conditions:reminder -->
  <!-- SYNC:ui-system-context:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.
  <!-- /SYNC:ui-system-context:reminder -->
  <!-- SYNC:fix-layer-accountability:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** trace full data flow and fix at the owning layer, not the crash site. Audit all access sites before adding `?.`.
  <!-- /SYNC:fix-layer-accountability:reminder -->
