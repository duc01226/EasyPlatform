---
name: workflow-review
version: 3.0.0
description: '[Workflow] Trigger Code Review workflow — review, fix, and re-review recursively until all issues resolved.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `review` workflow. Run `/workflow-start review` with the user's prompt as context.

**Steps:** /review-architecture → /code-simplifier → /code-review → /performance → /plan → /plan-validate → /cook → **/workflow-review** (recursive) → /watzup → /workflow-end

---

## Mandatory Task Creation (ZERO TOLERANCE)

When this workflow starts, create EXACTLY these 10 tasks in order (source: `workflows.json` → `review.sequence`):

| #   | Task Subject                                                       | Conditional?                   |
| --- | ------------------------------------------------------------------ | ------------------------------ |
| 1   | `[Workflow] /review-architecture — Architecture compliance review` | No                             |
| 2   | `[Workflow] /code-simplifier — Simplify and refine code`           | No                             |
| 3   | `[Workflow] /code-review — Comprehensive code review`              | No                             |
| 4   | `[Workflow] /performance — Performance analysis`                   | No                             |
| 5   | `[Workflow] /plan — Consolidate review findings into fix plan`     | Yes — skip if all reviews PASS |
| 6   | `[Workflow] /plan-validate — Critical questions on fix plan`       | Yes — skip if all reviews PASS |
| 7   | `[Workflow] /cook — Implement fixes from plan`                     | Yes — skip if all reviews PASS |
| 8   | `[Workflow] /workflow-review — Recursive re-review`                | Yes — skip if all reviews PASS |
| 9   | `[Workflow] /watzup — Wrap up and summarize`                       | No                             |
| 10  | `[Workflow] /workflow-end — End workflow`                          | No                             |

**NEVER** consolidate, rename, or omit any step. If reviews PASS, mark conditional tasks as `completed` with note "Skipped — all reviews passed".

---

## Recursive Review Protocol (CRITICAL)

This workflow is **self-recursive**. After fixing issues, it calls itself to re-review the changes made by the fix. The loop continues until all reviews pass clean.

### Flow Diagram

```
┌─────────────────────────────────────────────────┐
│  Phase 1: REVIEW                                │
│  /review-architecture → /code-simplifier →      │
│  /code-review → /performance                    │
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
        │  /workflow-review                       │
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

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** track iteration count — log "Review iteration N/3" at start of each cycle
- **IMPORTANT MUST ATTENTION** stop after max 3 iterations and escalate remaining issues to user
- **IMPORTANT MUST ATTENTION** skip plan/cook/recursive-call when all reviews PASS
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every finding (confidence >80% to act)
