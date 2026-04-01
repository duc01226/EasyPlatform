# Plan Granularity Protocol

> **Purpose:** Ensure plan phases are detailed enough to implement directly — no guesswork, no further planning needed at cook/code time.
> **Referenced by:** plan, plan-hard, plan-fast, planning, plan-review, cook, cook-_, code, code-_, iterative-phase-quality-protocol.

## 1. Implementation-Readiness Criteria (5-Point Check)

Every plan phase MUST pass ALL five criteria to be considered implementation-ready:

| #   | Criterion                  | How to Measure                                                                                | PASS                            | FAIL                               |
| --- | -------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------- |
| 1   | Steps name specific files  | Every step includes a file path                                                               | "Modify `src/auth/login.ts`"    | "Implement authentication"         |
| 2   | No planning verbs in steps | Absent: "research", "determine", "figure out", "decide", "evaluate", "explore", "investigate" | "Add `validateToken()` method"  | "Determine the best auth approach" |
| 3   | Each step ≤30 min effort   | No single step is a mini-project                                                              | "Add error handler to endpoint" | "Build the entire auth module"     |
| 4   | Phase totals within limits | ≤5 files AND ≤3h effort                                                                       | 3 files, 2h                     | 12 files, 8h                       |
| 5   | No unresolved decisions    | Zero open questions / TBDs in approach                                                        | All approaches decided          | "TBD: which library to use"        |

## 2. Tiered Decomposition

| Complexity Score | Action             | Mechanism                                                                                        |
| ---------------- | ------------------ | ------------------------------------------------------------------------------------------------ |
| 0-5              | No decomposition   | Current behavior — single-phase plan OK                                                          |
| 6-9              | Refine in-place    | Expand vague phases into detailed steps within the same phase file, or split into sibling phases |
| 10+              | Sub-plan directory | Create `{plan-dir}/sub-plans/phase-{XX}-{name}/plan.md` with its own phases                      |

## 3. Post-Plan Self-Check (for plan skills)

After creating all phase files, BEFORE final /plan-validate and /plan-review tasks:

1. Score each phase against the 5 criteria above
2. For each phase that FAILS any criterion → create a task: "Refine Phase X: {specific failure reason}"
3. Refinement means: rewrite the phase with more specific steps, split it into multiple phases, or create a sub-plan

## 4. Pre-Cook/Pre-Code Granularity Gate

<HARD-GATE>
Before implementing ANY phase, verify it passes all 5 implementation-readiness criteria.
If ANY criterion fails → STOP. Ask user: "Phase X needs more detail before implementation. Refine now? [Y/n]"
If user confirms → run /plan to refine that specific phase, then re-check.
DO NOT implement a phase that contains planning verbs, unnamed files, or unresolved decisions.
</HARD-GATE>

## 5. Worked Example

**FAILS granularity check:**

```markdown
## Phase 2: Data Layer

- Set up database models
- Create repositories
- Implement data access patterns
  Effort: 4h | Files: ~8
```

Failures: No file paths (#1), generic verbs (#2), >3h (#4), >5 files (#4)

**PASSES after refinement (split into 2 phases):**

```markdown
## Phase 2A: Database Schema (1h, 3 files)

- Create `src/models/user.entity.ts` — User: id, email, passwordHash, createdAt
- Create `src/models/session.entity.ts` — Session: id, userId, token, expiresAt
- Create `migrations/001-create-users-sessions.ts`

## Phase 2B: Repository Layer (1.5h, 3 files)

- Create `src/repos/user.repository.ts` — findByEmail(), create(), update()
- Create `src/repos/session.repository.ts` — findByToken(), create(), delete()
- Register in `src/app.module.ts` DI container
```
