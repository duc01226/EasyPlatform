---
name: story-review
version: 1.0.0
description: '[Code Quality] Review user stories for completeness, coverage, dependencies, and quality before implementation. AI self-review gate after /story.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

> **Evidence Gate:** MANDATORY IMPORTANT MUST — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

> **OOP & DRY Enforcement:** MANDATORY IMPORTANT MUST — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group or suffix (ex *Entity, *Dto, \*Service, etc...) MUST inherit a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

<!-- SYNC:double-round-trip-review -->

> **Deep Multi-Round Review** — THREE mandatory escalating-depth rounds. NEVER combine. NEVER PASS after Round 1 alone.
>
> **Round 1:** Normal review building understanding. Read all files, note issues.
> **Round 2:** MANDATORY re-read ALL files from scratch. Focus on:
>
> - Cross-cutting concerns missed in Round 1
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces (what should exist but doesn't)
>
> **Round 3:** MANDATORY adversarial simulation (for >3 files or cross-cutting changes). Pretend you are using/running this code RIGHT NOW:
>
> - "What input causes failure? What error do I get?"
> - "1000 concurrent users — what breaks?"
> - "After deployment rollback — backward compatible?"
> - "Can I debug issues from logs/monitoring output?"
>
> **Rules:** NEVER rely on prior round memory — re-read everything. NEVER declare PASS after Round 1. Final verdict must incorporate ALL rounds.
> **Report must include `## Round 2 Findings` and `## Round 3 Findings` sections.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:graph-impact-analysis -->

> **Graph Impact Analysis** — When `.code-graph/graph.db` exists, run `blast-radius --json` to detect ALL files affected by changes (7 edge types: CALLS, MESSAGE_BUS, API_ENDPOINT, TRIGGERS_EVENT, PRODUCES_EVENT, TRIGGERS_COMMAND_EVENT, INHERITS). Compute gap: impacted_files - changed_files = potentially stale files. Risk: <5 Low, 5-20 Medium, >20 High. Use `trace --direction downstream` for deep chains on high-impact files.

<!-- /SYNC:graph-impact-analysis -->

## Quick Summary

**Goal:** Auto-review user stories for completeness, acceptance criteria coverage, dependency ordering, and quality before implementation proceeds.

**Key distinction:** AI self-review (automatic), NOT user interview.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

### Frontend/UI Context (if applicable)

> When this task involves frontend or UI changes,

<!-- SYNC:ui-system-context -->

> **UI System Context** — For ANY task touching `.ts`, `.html`, `.scss`, or `.css` files:
>
> **MUST READ before implementing:**
>
> 1. `docs/project-reference/frontend-patterns-reference.md` — component base classes, stores, forms
> 2. `docs/project-reference/scss-styling-guide.md` — BEM methodology, SCSS variables, mixins, responsive
> 3. `docs/project-reference/design-system/README.md` — design tokens, component inventory, icons
>
> Reference `docs/project-config.json` for project-specific paths.

<!-- /SYNC:ui-system-context -->

- Component patterns: `docs/project-reference/frontend-patterns-reference.md` (content auto-injected by hook — check for [Injected: ...] header before reading)
- Styling/BEM guide: `docs/project-reference/scss-styling-guide.md`
- Design system tokens: `docs/project-reference/design-system/README.md`

## Workflow

1. **Locate stories** — Find story artifacts in `team-artifacts/stories/` or plan context
2. **Load source PBI** — Read the parent PBI to cross-reference acceptance criteria
3. **Evaluate checklist** — Score each check
4. **Classify** — PASS/WARN/FAIL
5. **Output verdict**

## Checklist

### Required (all must pass)

- [ ] **AC coverage** — Every acceptance criterion from PBI has at least one corresponding story
- [ ] **GIVEN/WHEN/THEN** — Each story has minimum 3 BDD scenarios (happy, edge, error)
- [ ] **INVEST criteria** — Stories are Independent, Negotiable, Valuable, Estimable, Small, Testable
- [ ] **Story points** — All stories have SP <=8 (>8 must be split)
- [ ] **Dependency table** — Story set includes dependency ordering table (must-after, can-parallel, independent)
- [ ] **No overlapping scope** — Stories don't duplicate functionality
- [ ] **Vertical slices** — Each story delivers end-to-end value (not horizontal layers)
- [ ] **Authorization scenarios** — Every story includes at least 1 authorization scenario (unauthorized access → rejection) per PBI roles table
- [ ] **UI Wireframe section** — If story involves UI: has `## UI Wireframe` section per UI wireframe protocol (wireframe + component tree + interaction flow + states + responsive). If backend-only: explicit "N/A"

### Recommended (>=50% should pass)

- [ ] **Edge cases** — Boundary values, empty states, max limits addressed
- [ ] **Error scenarios** — Failure paths explicitly covered in stories
- [ ] **API contract** — If API changes needed, story specifies contract
- [ ] **UI/UX visualization** — Frontend stories have component decomposition tree with EXISTING/NEW classification, design token mapping, and responsive breakpoint behavior per UI wireframe protocol
- [ ] **Seed data stories** — If PBI has seed data requirements, Sprint 0 seed data story exists
- [ ] **Data migration stories** — If PBI has schema changes, data migration story exists

## Output

```markdown
## Story Review Result

**Status:** PASS | WARN | FAIL
**Stories reviewed:** {count}
**Source PBI:** {pbi-path}

### AC Coverage Matrix

| Acceptance Criterion | Covered By Story | Status |
| -------------------- | ---------------- | ------ |

### Required ({X}/{Y})

- ✅/❌ Check description

### Recommended ({X}/{Y})

- ✅/⚠️ Check description

### Missing Stories

- {Any PBI AC not covered}

### Dependency Issues

- {Circular deps, missing ordering}

### Verdict

{PROCEED | REVISE_FIRST}
```

## Round 2: Focused Re-Review (MANDATORY)

> **Protocol:** Deep Multi-Round Review (inlined via SYNC:double-round-trip-review above)

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

- **FAIL blocks workflow** — If FAIL, do NOT proceed. List specific fixes.
- **Cross-reference PBI** — Every check against stories MUST trace back to PBI acceptance criteria.
- **No guessing** — Reference specific story content as evidence.
- **Flag missing stories** — If a PBI acceptance criterion has no covering story, that's a FAIL.

---

## Next Steps

**MANDATORY IMPORTANT MUST — NO EXCEPTIONS** after completing this skill, you MUST use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/plan (Recommended)"** — Create implementation plan from validated stories
- **"/story"** — Re-create stories if FAIL verdict
- **"/prioritize"** — Prioritize stories in backlog
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
      <!-- SYNC:ui-system-context:reminder -->
- **MUST** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.
      <!-- /SYNC:ui-system-context:reminder -->
