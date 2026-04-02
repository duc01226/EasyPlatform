---
name: debug
version: 1.0.0
description: '[Fix & Debug] Systematic debugging with root cause investigation. Use when bugfix workflow reaches debug step.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

> **Understand Code First** — Search codebase for 3+ similar implementations BEFORE writing any code. Read existing files, validate assumptions with grep evidence, map dependencies via graph trace. Never invent new patterns when existing ones work.
> MUST READ `.claude/skills/shared/understand-code-first-protocol.md` for full protocol and checklists.

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs `file:line` proof. Confidence: >95% recommend freely, 80-94% with caveats, <80% DO NOT recommend — gather more evidence. Cross-service validation required for architectural changes.
> MUST READ `.claude/skills/shared/evidence-based-reasoning-protocol.md` for full protocol and checklists.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

> **Estimation Framework** — SP scale: 1(trivial) → 2(small) → 3(medium) → 5(large) → 8(very large, high risk) → 13(epic, SHOULD split) → 21(MUST split). MUST provide `story_points` and `complexity` estimate after investigation.
> MUST READ `.claude/skills/shared/estimation-framework.md` for full protocol and checklists.
> **Red Flag STOP Conditions** — STOP current approach when: 3+ fix attempts on same issue (root cause not identified), each fix reveals NEW problems (upstream root cause), fix requires 5+ files for "simple" change (wrong abstraction layer), using "should work"/"probably fixed" without verification evidence. After 3 failed attempts, report all outcomes and ask user before attempt #4.
> MUST READ `.claude/skills/shared/red-flag-stop-conditions-protocol.md` for full protocol and checklists.

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

> **[MANDATORY]** Read `.claude/skills/shared/root-cause-debugging-protocol.md` BEFORE proposing any fix. Responsibility attribution and data lifecycle tracing are required.

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

> **IMPORTANT MUST:** If you are NOT already in a workflow, use `AskUserQuestion` to ask the user:
>
> 1. **Activate `bugfix` workflow** (Recommended) — scout → investigate → debug → plan → fix → prove-fix → review → test
> 2. **Execute `/debug` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST** after completing this skill, use `AskUserQuestion` to recommend:

- **"/fix (Recommended)"** — Apply fix based on debug findings
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

- **MUST** READ `.claude/skills/shared/understand-code-first-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/evidence-based-reasoning-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/estimation-framework.md` before starting
- **MUST** READ `.claude/skills/shared/red-flag-stop-conditions-protocol.md` before starting
