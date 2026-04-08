---
name: workflow-review-changes
version: 3.0.0
description: '[Workflow] Trigger Review Current Changes workflow — review, fix, and re-review recursively until all issues resolved.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `review-changes` workflow. Run `/workflow-start review-changes` with the user's prompt as context.

**Steps:** /review-changes → /review-architecture → /code-simplifier → /code-review → /performance → /plan → /plan-validate → /cook → **/workflow-review-changes** (recursive) → /docs-update → /watzup → /workflow-end

---

## Mandatory Task Creation (ZERO TOLERANCE)

When this workflow starts, create EXACTLY these 12 tasks in order (source: `workflows.json` → `review-changes.sequence`):

| #   | Task Subject                                                       | Conditional?                                     |
| --- | ------------------------------------------------------------------ | ------------------------------------------------ |
| 1   | `[Workflow] /review-changes — Review all uncommitted changes`      | No                                               |
| 2   | `[Workflow] /review-architecture — Architecture compliance review` | No                                               |
| 3   | `[Workflow] /code-simplifier — Simplify and refine code`           | No                                               |
| 4   | `[Workflow] /code-review — Comprehensive code review`              | No                                               |
| 5   | `[Workflow] /performance — Performance analysis`                   | No                                               |
| 6   | `[Workflow] /plan — Consolidate review findings into fix plan`     | Yes — skip if all reviews PASS                   |
| 7   | `[Workflow] /plan-validate — Critical questions on fix plan`       | Yes — skip if all reviews PASS                   |
| 8   | `[Workflow] /cook — Implement fixes from plan`                     | Yes — skip if all reviews PASS                   |
| 9   | `[Workflow] Fresh-context sub-agent re-review (iteration N/3)`     | Yes — skip if all reviews PASS                   |
| 10  | `[Workflow] /docs-update — Update impacted documentation`          | Yes — skip if all reviews PASS with no staleness |
| 11  | `[Workflow] /watzup — Wrap up and summarize`                       | No                                               |
| 12  | `[Workflow] /workflow-end — End workflow`                          | No                                               |

**NEVER** consolidate, rename, or omit any step. If reviews PASS, mark conditional tasks as `completed` with note "Skipped — all reviews passed".

---

## Fresh-Context Sub-Agent Re-Review Protocol (CRITICAL)

This workflow uses **fresh-context sub-agents** for re-review iterations. After fixing issues, it spawns a NEW `code-reviewer` sub-agent with ZERO memory of prior fixes — eliminating AI confirmation bias.

<!-- SYNC:fresh-context-review -->

> **Fresh-Context Review** — Eliminate AI confirmation bias. Spawn `code-reviewer` sub-agent for re-review iterations — zero memory of prior fixes.
>
> **When:** After fixing review findings. NOT for initial review (needs intent context).
>
> **How:** `Agent(subagent_type: "code-reviewer")` with self-contained prompt: git diff scope + `docs/project-reference/code-review-rules.md` + checklist summary. Prompt MUST NOT reference prior findings. Report to `plans/reports/review-iteration-{N}-{date}.md`.
>
> **Result:** PASS → proceed | FAIL (iteration < 3) → fix ALL issues, spawn NEW agent | FAIL (iteration 3) → escalate to user | Issue count increased → STOP, escalate
>
> **Max 3 iterations.** Track `[Re-Review {N}/3]` tasks per iteration.

<!-- /SYNC:fresh-context-review -->

### Flow Diagram

```
┌─────────────────────────────────────────────────┐
│  Phase 1: REVIEW                                │
│  /review-changes → /review-architecture →       │
│  /code-simplifier → /code-review → /performance │
│                                                 │
│  Output: PASS or ISSUES FOUND                   │
└──────────────┬──────────────────────────────────┘
               │
        ┌──────▼──────┐
        │ PASS?       │──YES──→ Skip to /watzup → /workflow-end
        └──────┬──────┘
               │ NO
        ┌──────▼──────────────────────────────────┐
        │  Phase 2: FIX PLANNING                  │
        │  /plan (consolidate findings) →         │
        │  /plan-validate (critical questions)    │
        └──────┬──────────────────────────────────┘
               │
        ┌──────▼──────────────────────────────────┐
        │  Phase 3: FIX IMPLEMENTATION            │
        │  /cook (implement fix plan)             │
        └──────┬──────────────────────────────────┘
               │
        ┌──────▼──────────────────────────────────┐
        │  Phase 4: FRESH-CONTEXT RE-REVIEW       │
        │  Spawn Agent(code-reviewer) with:       │
        │  - git diff for scope                   │
        │  - code-review-rules.md for standards   │
        │  - No mention of prior fixes            │
        │  Returns: PASS or FAIL with issues      │
        └──────┬──────────────────────────────────┘
               │
               └──→ Loop until PASS (max 3 iterations)
```

### Sub-Agent Review Prompt Template

When spawning the re-review sub-agent, use this self-contained prompt:

```
Agent({
  description: "Fresh-context re-review iteration N/3",
  subagent_type: "code-reviewer",
  prompt: "## Task\nReview ALL uncommitted changes in this repository for code quality issues.\nThis is iteration {N}/3 of a review-fix cycle. You are reviewing with completely fresh eyes —\nyou have NO knowledge of what was fixed or why. Review as if seeing this code for the first time.\n\n## Review Scope\nRun git diff to see all uncommitted changes (staged + unstaged).\n\n## Review Instructions\n1. Read docs/project-reference/code-review-rules.md for project standards\n2. For each changed file:\n   - Verify it follows codebase conventions (grep 3+ similar patterns)\n   - Check: null safety, boundary conditions, error handling, resource management\n   - Check: DRY (grep for duplicates), YAGNI (unused abstractions), KISS (simpler alternative?)\n   - Check: logic correctness — trace one happy path + one error path\n   - Check: naming, typing, responsibility layer placement\n3. Write findings to plans/reports/review-iteration-{N}-{date}.md\n\n## Output Format\nReturn a structured summary:\n- **Status**: PASS (no Critical/High issues) or FAIL (Critical/High issues found)\n- **Critical Issues**: [list with file:line evidence]\n- **High Priority**: [list with file:line evidence]\n- **Minor/Info**: [list with file:line evidence]\n- **Issue Count**: {number}\n\nIMPORTANT: Every finding MUST have file:line evidence. No speculation.\nIMPORTANT: ALL severity levels will be fixed — classify accurately."
})
```

### Iteration Rules

1. **Max 3 iterations** — if issues persist after 3 full review-fix cycles, STOP and report remaining issues to user via `AskUserQuestion`
2. **Track iteration count** — log "Review iteration N/3" at the start of each cycle
3. **PASS = exit** — when sub-agent reports no Critical/Major issues, skip plan/cook/re-review and proceed to `/docs-update` → `/watzup`
4. **Diminishing scope** — each iteration should find FEWER issues. If iteration N finds MORE issues than N-1, STOP and escalate to user
5. **Skip conditions for plan/cook/re-review:**
    - Sub-agent reports PASS with no Critical or Major findings
    - Only Minor/cosmetic findings remain (log them, don't fix)

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** track iteration count — log "Review iteration N/3" at start of each cycle
- **IMPORTANT MUST ATTENTION** stop after max 3 iterations and escalate remaining issues to user
- **IMPORTANT MUST ATTENTION** skip plan/cook/recursive-call when all reviews PASS
- **IMPORTANT MUST ATTENTION** spawn fresh code-reviewer sub-agent for each re-review iteration (zero prior context)
