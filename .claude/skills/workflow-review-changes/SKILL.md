---
name: workflow-review-changes
version: 3.0.0
description: '[Workflow] Trigger Review Current Changes workflow — review, fix, and re-review recursively until all issues resolved.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

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
| 9   | `[Workflow] /workflow-review-changes — Recursive re-review`        | Yes — skip if all reviews PASS                   |
| 10  | `[Workflow] /docs-update — Update impacted documentation`          | Yes — skip if all reviews PASS with no staleness |
| 11  | `[Workflow] /watzup — Wrap up and summarize`                       | No                                               |
| 12  | `[Workflow] /workflow-end — End workflow`                          | No                                               |

**NEVER** consolidate, rename, or omit any step. If reviews PASS, mark conditional tasks as `completed` with note "Skipped — all reviews passed".

---

## Recursive Review Protocol (CRITICAL)

This workflow is **self-recursive**. After fixing issues, it calls itself to re-review the changes made by the fix. The loop continues until all reviews pass clean.

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
        │  Phase 4: RE-REVIEW (RECURSIVE)         │
        │  /workflow-review-changes               │
        │  (calls itself — full review cycle)     │
        └──────┬──────────────────────────────────┘
               │
               └──→ Loop until PASS (max 3 iterations)
```

### Iteration Rules

1. **Max 3 iterations** — if issues persist after 3 full review-fix cycles, STOP and report remaining issues to user via `AskUserQuestion`
2. **Track iteration count** — log "Review iteration N/3" at the start of each cycle
3. **PASS = exit** — when all review steps report no Critical/Major issues, skip plan/cook/recursive-call and proceed to `/watzup`
4. **Diminishing scope** — each iteration should find FEWER issues. If iteration N finds MORE issues than N-1, STOP and escalate to user
5. **Skip conditions for plan/cook/recursive-call:**
    - All reviews PASS with no Critical or Major findings
    - Only Minor/cosmetic findings remain (log them, don't fix)

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** track iteration count — log "Review iteration N/3" at start of each cycle
- **MUST** stop after max 3 iterations and escalate remaining issues to user
- **MUST** skip plan/cook/recursive-call when all reviews PASS
- **MUST** execute two review rounds per iteration (Round 1: understand, Round 2: catch missed issues)
