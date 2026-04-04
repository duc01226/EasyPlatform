---
name: debug
version: 1.0.0
description: '[Fix & Debug] Systematic debugging with root cause investigation. Use when bugfix workflow reaches debug step.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

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

> **Estimation** — Modified Fibonacci: 1(trivial) → 2(small) → 3(medium) → 5(large) → 8(very large) → 13(epic, SHOULD split) → 21(MUST split). Output `story_points` and `complexity` in plan frontmatter. Complexity auto-derived: 1-2=Low, 3-5=Medium, 8=High, 13+=Critical.

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

## Quick Summary

**Goal:** Investigate and identify root cause of a bug with evidence.

**Workflow:**

1. **Reproduce** — Understand expected vs actual behavior
2. **Hypothesize** — Form theories about root cause
3. **Trace** — Follow code paths with file:line evidence
4. **Confirm** — Verify root cause with grep/read evidence
5. **Report** — Output root cause with confidence level

**Key Rules:**

- Debug Mindset: every claim needs file:line proof
- Never assume first hypothesis is correct
- Output: confirmed root cause OR "hypothesis, not confirmed" with evidence gaps
- This is investigation-only — hand off to /fix for implementation

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

## Debug Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

- Do NOT assume the first hypothesis is correct — verify with actual code traces
- Every root cause claim must include `file:line` evidence
- If you cannot prove a root cause with a code trace, state "hypothesis, not confirmed"
- Question assumptions: "Is this really the cause?" → trace the actual execution path
- Challenge completeness: "Are there other contributing factors?" → check related code paths

## Confidence & Evidence Gate

**MANDATORY IMPORTANT MUST** declare `Confidence: X%` with evidence list + `file:line` proof for EVERY claim.

| Confidence | Meaning                                  | Action                               |
| ---------- | ---------------------------------------- | ------------------------------------ |
| 95-100%    | Full trace verified                      | Report as confirmed root cause       |
| 80-94%     | Main path verified, edge cases uncertain | Report with caveats                  |
| 60-79%     | Partial trace                            | Report as hypothesis                 |
| <60%       | Insufficient evidence                    | DO NOT report — gather more evidence |

## Workflow Details

### Step 1: Reproduce

- Clarify expected vs actual behavior
- Identify trigger conditions (user action, data state, timing)

### Step 2: Hypothesize

- Form 2-3 theories about root cause
- Rank by likelihood based on symptoms

### Step 3: Trace

- For each hypothesis, trace the code path:
    - Find entry point (API, UI, job, event)
    - Follow through handlers/services
    - Check data transformations and state changes
    - Verify error handling paths
- Use grep/read to collect `file:line` evidence

### Step 4: Confirm

- Match evidence to a single root cause
- Verify the root cause explains ALL symptoms
- Check for secondary contributing factors

## Dependency Tracing (MANDATORY — DO NOT SKIP when graph.db exists)

If `.code-graph/graph.db` exists, you MUST use structural queries to trace dependencies:

**Graph reveals ALL callers and consumers of buggy code — grep alone misses structural relationships.**

- **Who calls the buggy function:** `python .claude/scripts/code_graph query callers_of <function> --json`
- **Who imports the buggy module:** `python .claude/scripts/code_graph query importers_of <file> --json`
- **What tests exist:** `python .claude/scripts/code_graph query tests_for <function> --json`
- **What does this function call:** `python .claude/scripts/code_graph query callees_of <function> --json`

### Graph-Assisted Debugging

After identifying suspect files, use graph trace to understand the full context:

1. `python .claude/scripts/code_graph trace <suspect-file> --direction both --json` — see what calls this code AND what it triggers downstream
2. `python .claude/scripts/code_graph trace <suspect-file> --direction upstream --json` — find all callers that could trigger the bug
3. This reveals implicit connections (MESSAGE_BUS, event handlers) that may propagate the issue across services

### Step 5: Report

- Output: confirmed root cause with evidence chain
- Include: affected files, data flow, fix recommendation
- Hand off to `/fix` for implementation

## ⚠️ MANDATORY: Post-Fix Verification

**After `/fix` applies changes, `/prove-fix` MUST be run.** It builds code proof traces per change with confidence scores. This is non-negotiable in all fix workflows.

## Red Flags — STOP (Debugging-Specific)

If you're thinking:

- "I see the problem, let me fix it" — Seeing symptoms is not understanding root cause. Investigate first.
- "Quick fix for now, investigate later" — Quick fixes mask bugs and create debt. Find root cause.
- "Just try changing X and see" — One hypothesis at a time. Scientific method, not trial and error.
- "Already tried 2+ fixes, one more" — 3+ failed fixes = STOP. Question the architecture, not the fix.
- "The error message is misleading" — Read it again carefully. Error messages are usually right.
- "It works on my machine" — Reproduce in the failing environment. Your environment hides bugs.
- "This can't be the cause" — Verify with evidence, not intuition. Unlikely causes are still causes.

## IMPORTANT Task Planning Notes (MUST FOLLOW)

- Always plan and break work into many small todo tasks using `TaskCreate`
- Always add a final review todo task to verify work quality and identify fixes/enhancements

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `bugfix` workflow** (Recommended) — scout → investigate → debug → plan → fix → prove-fix → review → test
> 2. **Execute `/debug` directly** — run this skill standalone

---

## Next Steps (Standalone: MUST ask user via `AskUserQuestion`. Skip if inside workflow.)

**MANDATORY IMPORTANT MUST — NO EXCEPTIONS** after completing this skill, you MUST use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (debug complete, root cause identified). This ensures fix, verification, review, and testing steps aren't skipped.
- **"/fix"** — Apply fix based on debug findings
- **"/plan"** — If fix requires planning
- **"Skip, continue manually"** — user decides

## Standalone Review Gate (Non-Workflow Only)

> **MANDATORY IMPORTANT MUST:** If this skill is called **outside a workflow** (standalone `/debug`), you MUST create a `TaskCreate` todo task for `/review-changes` as the **last task** in your task list. This ensures all changes are reviewed before commit even without a workflow enforcing it.
>
> If already running inside a workflow (e.g., `bugfix`), skip this — the workflow sequence handles `/review-changes` at the appropriate step.

## Closing Reminders

**MANDATORY IMPORTANT MUST** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST** READ the following files before starting:

<!-- SYNC:understand-code-first:reminder -->

- **MUST** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
      <!-- /SYNC:understand-code-first:reminder -->
      <!-- SYNC:evidence-based-reasoning:reminder -->
- **MUST** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
      <!-- /SYNC:evidence-based-reasoning:reminder -->
      <!-- SYNC:estimation-framework:reminder -->
- **MUST** include `story_points` and `complexity` in plan frontmatter. SP > 8 = split.
      <!-- /SYNC:estimation-framework:reminder -->
      <!-- SYNC:red-flag-stop-conditions:reminder -->
- **MUST** STOP after 3 failed fix attempts. Report all attempts, ask user before continuing.
    <!-- /SYNC:red-flag-stop-conditions:reminder -->
