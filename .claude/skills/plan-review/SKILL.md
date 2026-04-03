---
name: plan-review
version: 1.0.0
description: '[Planning] Auto-review plan for validity, correctness, and best practices — recursive: review, fix issues, re-review until PASS (max 3 iterations)'
---

> **[BLOCKING]** This is a validation gate. MUST use `AskUserQuestion` to present review findings and get user confirmation. Completing without asking at least one question is a violation.

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

> **Understand Code First** — Search codebase for 3+ similar implementations BEFORE writing any code. Read existing files, validate assumptions with grep evidence, map dependencies via graph trace. Never invent new patterns when existing ones work.
> MUST READ `.claude/skills/shared/understand-code-first-protocol.md` for full protocol and checklists.

> **Double Round-Trip Review** — Every review executes TWO full rounds: Round 1 builds understanding (normal review), Round 2 leverages accumulated context to catch what Round 1 missed. Round 2 is MANDATORY — never skip, never combine into single pass.
> MUST READ `.claude/skills/shared/double-round-trip-review-protocol.md` for full protocol and checklists.

> **Critical Purpose:** Ensure quality — no flaws, no bugs, no missing updates, no stale content. Verify both code AND documentation.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

> **OOP & DRY Enforcement:** MANDATORY IMPORTANT MUST — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group or suffix (ex *Entity, *Dto, \*Service, etc...) MUST inherit a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

## Quick Summary

**Goal:** Auto-review implementation plans for validity, correctness, and best practices. **Recursive:** on FAIL, fix issues directly in plan files and re-review until PASS (max 3 iterations).

**Workflow:**

1. **Resolve Plan** — Use $ARGUMENTS path or active plan from `## Plan Context`
2. **Read Files** — plan.md + all phase-\*.md files, extract requirements/steps/files/risks
3. **Evaluate Checklist** — Validity (summary, requirements, steps, files), Correctness (specific, paths, no conflicts), Best Practices (YAGNI/KISS/DRY, architecture), Completeness (risks, testing, success, security)
4. **Score & Classify** — PASS (all Required + ≥50% Recommended), WARN (all Required + <50% Recommended), FAIL (any Required fails)
5. **Output Result** — Status, checks passed, issues, recommendations, verdict
6. **If FAIL** — Fix issues in plan files directly, then re-review (loop back to step 2, max 3 iterations)

**Key Rules:**

- **PASS**: Proceed to implementation
- **WARN**: Proceed with caution, note gaps
- **FAIL (iteration < 3)**: Fix plan issues directly, then re-review
- **FAIL (iteration = 3)**: STOP - escalate to user
- **Constructive**: Focus on implementation-blocking issues, not pedantic details

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Your mission

Perform automatic self-review of an implementation plan to ensure it's valid, correct, follows best practices, and identify anything needing fixes before proceeding.

**Key distinction**: This is AI self-review (automatic), NOT user interview like `/plan-validate`.

## Plan Resolution

1. If `$ARGUMENTS` provided -> Use that path
2. Else check `## Plan Context` section -> Use active plan path
3. If no plan found -> Error: "No plan to review. Run /plan first."

## Workflow

### Step 1: Read Plan Files

Read the plan directory:

- `plan.md` - Overview, phases list, frontmatter
- `phase-*.md` - All phase files
- Extract: requirements, implementation steps, file listings, risks

### Step 2: Evaluate Against Checklist

#### Validity (Required - all must pass)

- [ ] Has executive summary (clear 1-2 sentence description)
- [ ] Has defined requirements section
- [ ] Has implementation steps (actionable tasks)
- [ ] Has files to create/modify listing

#### Correctness (Required - all must pass)

- [ ] Steps are specific and actionable (not vague)
- [ ] **Implementation-Readiness Granularity Check (5-Point)** — FAIL if any phase fails ANY criterion:

| #   | Criterion                  | How to Measure                                                                                | PASS                            | FAIL                               |
| --- | -------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------- |
| 1   | Steps name specific files  | Every step includes a file path                                                               | "Modify `src/auth/login.ts`"    | "Implement authentication"         |
| 2   | No planning verbs in steps | Absent: "research", "determine", "figure out", "decide", "evaluate", "explore", "investigate" | "Add `validateToken()` method"  | "Determine the best auth approach" |
| 3   | Each step ≤30 min effort   | No single step is a mini-project                                                              | "Add error handler to endpoint" | "Build the entire auth module"     |
| 4   | Phase totals within limits | ≤5 files AND ≤3h effort                                                                       | 3 files, 2h                     | 12 files, 8h                       |
| 5   | No unresolved decisions    | Zero open questions / TBDs in approach                                                        | All approaches decided          | "TBD: which library to use"        |

**Tiered action on failure:**

- Complexity 6-9 → Refine vague phases in-place (expand steps, split into sibling phases)
- Complexity 10+ → Create sub-plan directory `{plan-dir}/sub-plans/phase-{XX}-{name}/plan.md`

**Worked example of FAIL → PASS:**
FAILS: `"Phase 2: Data Layer — Set up database models, Create repositories, Implement data access patterns. Effort: 4h, Files: ~8"`
PASSES after split: `"Phase 2A: Database Schema (1h, 3 files) — Create src/models/user.entity.ts, Create src/models/session.entity.ts, Create migrations/001-create-users-sessions.ts"` + `"Phase 2B: Repository Layer (1.5h, 3 files) — Create src/repos/user.repository.ts, Create src/repos/session.repository.ts, Register in src/app.module.ts"`

- [ ] File paths follow project patterns
- [ ] No conflicting or duplicate steps
- [ ] Dependencies between steps are clear
- [ ] **New Tech/Lib Gate:** If plan introduces new packages/libraries/frameworks not in the project, verify alternatives were evaluated (top 3 compared) and user confirmed the choice. FAIL if new tech is added without evaluation.
- [ ] **Test spec coverage** — Every phase has `## Test Specifications` section with TC mappings per `.claude/skills/shared/plan-quality-protocol.md`. "TBD" is valid for TDD-first mode.
- [ ] **TC-requirement mapping** — Every functional requirement maps to ≥1 TC (or explicit "TBD" with rationale)

#### Best Practices (Required - all must pass)

- [ ] YAGNI: No unnecessary features or over-engineering
- [ ] KISS: Simplest viable solution chosen
- [ ] DRY: No planned duplication of logic
- [ ] Architecture: Follows project patterns from `.claude/docs/`

#### Completeness (Recommended - ≥50% should pass)

- [ ] Risk assessment present with mitigations
- [ ] Testing strategy defined
- [ ] Success criteria per phase
- [ ] Security considerations addressed
- [ ] **Graph dependency check:** If `.code-graph/graph.db` exists, for each file in the plan's "files to modify" list, run `python .claude/scripts/code_graph query importers_of <file> --json`. Flag any importer NOT listed in the plan as "potentially missed dependent". Also run `tests_for` on key functions to verify test coverage is planned.

### Step 3: Score and Classify

| Status   | Criteria                            | Action                            |
| -------- | ----------------------------------- | --------------------------------- |
| **PASS** | All Required pass, ≥50% Recommended | Proceed to implementation         |
| **WARN** | All Required pass, <50% Recommended | Proceed with caution, note gaps   |
| **FAIL** | Any Required check fails            | STOP - must fix before proceeding |

### Step 4: Output Result

```markdown
## Plan Review Result

**Status:** PASS | WARN | FAIL
**Reviewed:** {plan-path}
**Date:** {current-date}

### Summary

{1-2 sentence summary of plan quality}

### Checks Passed ({X}/{Y})

#### Required ({X}/{Y})

- ✅ Check 1
- ✅ Check 2
- ❌ Check 3 (if failed)

#### Recommended ({X}/{Y})

- ✅ Check 1
- ⚠️ Check 2 (missing)

### Issues Found

- ❌ FAIL: {critical issue requiring fix}
- ⚠️ WARN: {minor issue, can proceed}

### Recommendations

1. {specific fix 1}
2. {specific fix 2}

### Verdict

{PROCEED | REVISE_FIRST | BLOCKED}
```

> **Graph-Assisted Investigation** — When `.code-graph/graph.db` exists, MUST run at least ONE graph command on key files before concluding. Pattern: Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details. Use `connections` for 1-hop, `callers_of`/`tests_for` for specific queries, `batch-query` for multiple files.
> MUST READ `.claude/skills/shared/graph-assisted-investigation-protocol.md` for full protocol and checklists.

### Graph-Trace for Plan Coverage

When graph DB is available, verify the plan covers all affected files:

- For each file in the plan's "files to modify" list, run `python .claude/scripts/code_graph trace <file> --direction downstream --json`
- Flag any downstream file NOT listed in the plan as "potentially missed"
- This catches cross-service impact (MESSAGE_BUS consumers, event handlers) that the plan author may have overlooked

## Round 2: Focused Re-Review (MANDATORY)

> **Protocol:** `.claude/skills/shared/double-round-trip-review-protocol.md`

After completing Round 1 checklist evaluation, execute a **second full review round**:

1. **Re-read** the Round 1 verdict and checklist results
2. **Re-evaluate** ALL checklist items — do NOT rely on Round 1 memory
3. **Challenge** Round 1 PASS items: "Is this really PASS? Did I verify with evidence?"
4. **Focus on** what Round 1 typically misses:
    - Implicit assumptions that weren't validated
    - Missing acceptance criteria coverage
    - Edge cases not addressed in the artifact
    - Cross-references that weren't verified
5. **Update verdict** if Round 2 found new issues
6. **Final verdict** must incorporate findings from BOTH rounds

## Recursive Fix-and-Review Protocol (CRITICAL)

When the review results in **FAIL**, plan-review **fixes the issues itself** and re-reviews, looping until PASS or max iterations.

### Flow

```
┌──────────────────────────────────┐
│  Round 1+2: Review plan          │
│  Output: PASS / WARN / FAIL      │
└──────────────┬───────────────────┘
               │
        ┌──────▼──────┐
        │ PASS/WARN?  │──YES──→ Proceed to next workflow step
        └──────┬──────┘
               │ FAIL
        ┌──────▼──────────────────────────────────┐
        │  FIX: Modify plan files to resolve       │
        │  all FAIL issues (edit plan.md/phase-*)  │
        └──────┬──────────────────────────────────┘
               │
        ┌──────▼──────────────────────────────────┐
        │  RE-REVIEW: Full checklist again         │
        │  (both Round 1 + Round 2)                │
        └──────┬──────────────────────────────────┘
               │
               └──→ Loop until PASS/WARN (max 3 iterations)
```

### Iteration Rules

1. **Max 3 iterations** — if issues persist after 3 review-fix cycles, STOP and escalate to user via `AskUserQuestion`
2. **Track iteration count** — log "Plan review iteration N/3" at the start of each cycle
3. **PASS/WARN = exit** — when all Required checks pass, proceed (WARN is acceptable)
4. **Diminishing scope** — each iteration should find FEWER issues. If iteration N finds MORE than N-1, STOP and escalate
5. **Fix scope** — only fix issues flagged as FAIL (Required check failures). Do NOT rewrite the plan.
6. **Fix approach:**
    - Vague steps → expand with specific file paths, concrete actions
    - Missing sections → add them (risks, testing strategy, success criteria)
    - Conflicting steps → resolve conflicts, document rationale
    - Over-engineering → simplify, remove unnecessary complexity
    - Missing TC mappings → add TC references or "TBD" with rationale
7. **After each fix** — re-read the modified plan files before re-reviewing (don't review stale content)

## Next Steps

- **If PASS**: Announce "Plan review complete. Proceeding with next workflow step."
- **If WARN**: Announce "Plan review complete with warnings. Proceeding - consider addressing gaps."
- **If FAIL (iteration < 3)**: Fix the issues directly in plan files, then re-review (recursive).
- **If FAIL (iteration = 3)**: List remaining issues. STOP. Ask user to fix or regenerate plan via `AskUserQuestion`.

## **IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks using `TaskCreate`
- Always add a final review todo task to verify work quality and identify fixes/enhancements
- **MANDATORY FINAL TASKS:** After creating all planning todo tasks, ALWAYS add these two final tasks:
    1. **Task: "Run /plan-validate"** — Trigger `/plan-validate` skill to interview the user with critical questions and validate plan assumptions
    2. **Task: "Run /plan-review"** — Trigger `/plan-review` skill to auto-review plan for validity, correctness, and best practices

## Important Notes

- Be constructive, not pedantic - focus on issues that would cause implementation problems
- WARN is acceptable for missing optional sections
- FAIL only for genuinely missing required content
- If plan is simple and valid, quick review is fine

---

## Skill Interconnection (Standalone: MUST ask user via `AskUserQuestion`. Skip if inside workflow.)

**MANDATORY IMPORTANT MUST — NO EXCEPTIONS** after completing this skill, you MUST use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (plan reviewed). This ensures validation, implementation, testing, and docs steps aren't skipped.
- **"/plan-validate"** — Interview user to confirm plan assumptions
- **"/cook" or "/code"** — If plan is approved and ready for implementation
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST** READ the following files before starting:

- **MUST** READ `.claude/skills/shared/understand-code-first-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/double-round-trip-review-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/graph-assisted-investigation-protocol.md` before starting
