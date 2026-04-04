---
name: tdd-spec-review
version: 1.0.0
description: '[Code Quality] Review test specifications for coverage, completeness, and correctness before implementation. AI self-review gate after /tdd-spec.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

> **Evidence Gate:** MANDATORY IMPORTANT MUST — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

> **OOP & DRY Enforcement:** MANDATORY IMPORTANT MUST — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group or suffix (ex *Entity, *Dto, \*Service, etc...) MUST inherit a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

<!-- SYNC:double-round-trip-review -->

> **Double Round-Trip Review** — TWO mandatory independent rounds. NEVER combine.
>
> **Round 1:** Normal review building understanding. Read all files, note issues.
> **Round 2:** MANDATORY re-read ALL files from scratch. Focus on:
>
> - Cross-cutting concerns missed in Round 1
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces (what should exist but doesn't)
>
> **Rules:** NEVER rely on Round 1 memory for Round 2. Final verdict must incorporate BOTH rounds.
> **Report must include `## Round 2 Findings` section.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:graph-impact-analysis -->

> **Graph Impact Analysis** — When `.code-graph/graph.db` exists, run `blast-radius --json` to detect ALL files affected by changes (7 edge types: CALLS, MESSAGE_BUS, API_ENDPOINT, TRIGGERS_EVENT, PRODUCES_EVENT, TRIGGERS_COMMAND_EVENT, INHERITS). Compute gap: impacted_files - changed_files = potentially stale files. Risk: <5 Low, 5-20 Medium, >20 High. Use `trace --direction downstream` for deep chains on high-impact files.

<!-- /SYNC:graph-impact-analysis -->

- `docs/test-specs/` — Test specifications by module (cross-reference during review to verify TC completeness and avoid duplicates)

## Quick Summary

**Goal:** Auto-review test specifications for coverage completeness, TC format correctness, and no missing test cases before implementation proceeds.

**Key distinction:** AI self-review (automatic), NOT user interview.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Workflow

1. **Locate test specs** — Find TCs in feature doc Section 17 or `docs/test-specs/`
2. **Load source** — Read stories/PBI/acceptance criteria that TCs should cover
3. **Evaluate checklist** — Score each check
4. **Calculate coverage** — % of stories/AC with corresponding TCs
5. **Classify** — PASS/WARN/FAIL
6. **Output verdict**

## Checklist

### Required (all must pass)

- [ ] **TC ID format** — All TCs follow `TC-{FEATURE}-{NNN}` format
- [ ] **Story coverage** — Every user story has at least one corresponding TC
- [ ] **AC coverage** — Every acceptance criterion has a test case
- [ ] **Happy path** — Each story has at least one happy path TC
- [ ] **Error path** — Each story has at least one error/failure TC
- [ ] **No duplicates** — No duplicate TCs testing the same scenario
- [ ] **Testable assertions** — Each TC has clear expected result (not vague "should work")
- [ ] **Authorization TCs** — At least 1 TC per story verifying unauthorized access is rejected (ref: `.claude/skills/shared/cross-cutting-quality-concerns-protocol.md` §1)

### Recommended (>=50% should pass)

- [ ] **Edge cases** — Boundary values, empty inputs, max limits tested
- [ ] **Integration points** — Cross-service scenarios covered
- [ ] **Performance TCs** — Response time or throughput expectations where relevant; production-like data volume TCs if >1000 records expected (ref: protocol §4)
- [ ] **Security TCs** — Auth, authorization, input validation tested
- [ ] **Seed data TCs** — If feature needs reference data, TCs verify data exists and seeder runs correctly (ref: protocol §2)
- [ ] **Data migration TCs** — If schema changes exist, TCs verify data transforms correctly, rollback works, no data loss (ref: protocol §5)

## Output

```markdown
## Test Spec Review Result

**Status:** PASS | WARN | FAIL
**TCs reviewed:** {count}
**Coverage:** {X}% of stories, {Y}% of acceptance criteria

### Coverage Matrix

| Story/AC | TC IDs | Happy | Error | Edge |
| -------- | ------ | ----- | ----- | ---- |

### Required ({X}/{Y})

- ✅/❌ Check description

### Recommended ({X}/{Y})

- ✅/⚠️ Check description

### Missing Coverage

- {Stories/AC without TCs}

### Verdict

{PROCEED | REVISE_FIRST}
```

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

## Key Rules

- **FAIL blocks workflow** — If FAIL, do NOT proceed to implementation.
- **Coverage >= 100% required** — Every story and AC must have at least one TC.
- **No guessing** — Reference specific TC IDs and story references.
- **Quality over quantity** — Flag duplicate TCs, prefer fewer meaningful tests.

---

## Next Steps

**MANDATORY IMPORTANT MUST — NO EXCEPTIONS** after completing this skill, you MUST use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/plan (Recommended)"** — Create implementation plan with validated test specs
- **"/tdd-spec"** — Re-generate specs if FAIL verdict
- **"/integration-test"** — Generate integration test code from specs
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST** READ the following files before starting:

<!-- SYNC:double-round-trip-review:reminder -->

- **MUST** execute TWO independent review rounds. Report must include `## Round 2 Findings`.
    <!-- /SYNC:double-round-trip-review:reminder -->
    <!-- SYNC:graph-impact-analysis:reminder -->
- **MUST** run graph blast-radius on changed files to find potentially stale consumers/handlers (when graph.db exists).
    <!-- /SYNC:graph-impact-analysis:reminder -->
