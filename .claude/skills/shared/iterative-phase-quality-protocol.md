# Iterative Phase Quality Protocol

> **Single source of truth** for task decomposition and per-phase quality cycles.
> Referenced by: plan, plan-hard, plan-fast, planning, cook, tdd-spec.

## 1. Complexity Assessment (MANDATORY before planning)

Evaluate BEFORE creating any plan. Sum applicable signals:

| Signal                     | Score |
| -------------------------- | ----- |
| Touches >5 files           | +2    |
| Cross-service/cross-module | +3    |
| New library/pattern needed | +2    |
| Multiple UI + API changes  | +2    |
| Unknowns or ambiguity      | +2    |
| Database schema changes    | +1    |

**Routing:**

- Score 0-5: Single-phase plan OK
- Score 6+: MUST decompose into smaller phases

<HARD-GATE>
Score ≥6 → DO NOT create a monolithic plan. Break into phases FIRST.
Each phase MUST be independently implementable and reviewable.
</HARD-GATE>

## 2. Phase Decomposition Rules

Each phase MUST satisfy ALL:

- Touches ≤5 files (prefer fewer)
- Completable in ≤3 hours
- Has clear success criteria (testable)
- Can be reviewed independently
- Has specific test cases mapped to it

If a phase violates any rule → split further.

## 3. Per-Phase Quality Cycle

<HARD-GATE>
EVERY phase follows this cycle. No skipping.

Phase N:

1. PLAN — Detail what this phase does, which files, what tests
2. IMPLEMENT — Code the phase (only files in scope)
3. REVIEW — Run tests, spec-compliance check, self-review
4. FIX — Address any issues found
5. VERIFY — Confirm fix, run tests again, checkpoint with user

DO NOT start Phase N+1 until Phase N passes VERIFY.
</HARD-GATE>

## 4. Mid-Execution Re-Assessment

After completing each phase, check:

- Did this phase take >2x estimated effort? → Re-plan remaining phases
- Did new requirements emerge? → Add new phases, re-estimate
- Are remaining phases still valid? → Adjust or remove stale phases

If any trigger fires → STOP, report to user, re-plan before continuing.
