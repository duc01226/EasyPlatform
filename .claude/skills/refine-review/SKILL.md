---
name: refine-review
version: 1.0.0
description: '[Code Quality] Review PBI artifact for completeness, missing concerns, and quality before proceeding to story creation. AI self-review gate after /refine.'
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

## Quick Summary

**Goal:** Auto-review a refined PBI artifact for completeness, quality, and correctness before story creation proceeds.

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

1. **Locate PBI** — Find latest PBI artifact in `team-artifacts/pbis/` or active plan context
2. **Evaluate checklist** — Score each check as PASS/FAIL
3. **Classify** — PASS (all Required + >=50% Recommended), WARN (all Required), FAIL (any Required fails)
4. **Output verdict** — Status, issues, recommendations

## Checklist

### Required (all must pass)

- [ ] **Problem statement** — Clear problem defined (not just solution description)
- [ ] **Acceptance criteria** — Minimum 3 GIVEN/WHEN/THEN scenarios
- [ ] **Story points + complexity** — Both fields present with valid values
- [ ] **Dependencies table** — Has dependency table with must-before/can-parallel/blocked-by types
- [ ] **Stakeholder validation** — User interview was conducted (validation section present)
- [ ] **No vague language** — No "should work", "might need", "TBD" in acceptance criteria
- [ ] **Scope boundary** — Clear "out of scope" or "not included" section
- [ ] **Authorization defined** — PBI has "Authorization & Access Control" section with roles × CRUD table (ref: `.claude/skills/shared/cross-cutting-quality-concerns-protocol.md` §1)
- [ ] **UI Layout section** — If PBI involves UI changes: has `## UI Layout` section per `ui-wireframe-protocol.md` (wireframe + components with tiers + states + design tokens). If backend-only: explicit "N/A"

### Recommended (>=50% should pass)

- [ ] **RICE/MoSCoW score** — Prioritization applied
- [ ] **Domain vocabulary** — Uses project-specific terms from domain-entities-reference.md
- [ ] **Risk assessment** — Risks identified with mitigations
- [ ] **Non-functional requirements** — Performance, security, accessibility considered
- [ ] **Production readiness concerns** — PBI includes "Production Readiness Concerns" table with Yes/No/Existing for: code linting, error handling, loading indicators, Docker integration, CI/CD quality gates (ref: `.claude/skills/shared/scaffold-production-readiness-protocol.md`)
- [ ] **Seed data assessed** — PBI addresses seed data needs (reference data, config data, test data) or explicitly states "N/A" (ref: `.claude/skills/shared/cross-cutting-quality-concerns-protocol.md` §2)
- [ ] **Data migration assessed** — PBI addresses schema changes and data migration needs or explicitly states "N/A" (ref: `.claude/skills/shared/cross-cutting-quality-concerns-protocol.md` §5)

## Output

```markdown
## PBI Review Result

**Status:** PASS | WARN | FAIL
**Artifact:** {pbi-path}

### Required ({X}/{Y})

- ✅/❌ Check description

### Recommended ({X}/{Y})

- ✅/⚠️ Check description

### Issues Found

- ❌ FAIL: {issue}
- ⚠️ WARN: {issue}

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

- **FAIL blocks workflow** — If FAIL, do NOT proceed to /story. List specific fixes needed.
- **WARN allows proceeding** — Note gaps but continue.
- **No guessing** — Every check must reference specific content in the PBI artifact.
- **Constructive** — Focus on implementation-blocking issues, not pedantic details.

---

## Next Steps

**MANDATORY IMPORTANT MUST — NO EXCEPTIONS** after completing this skill, you MUST use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/story (Recommended)"** — Create user stories from validated PBI
- **"/refine"** — Re-refine if FAIL verdict
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST** READ the following files before starting:

<!-- SYNC:double-round-trip-review:reminder -->

- **MUST** execute TWO review rounds. Round 2 re-reads from scratch — never skip or combine with Round 1.
      <!-- /SYNC:double-round-trip-review:reminder -->
      <!-- SYNC:graph-impact-analysis:reminder -->
- **MUST** run `blast-radius` when graph.db exists. Flag impacted files NOT in changeset as potentially stale.
      <!-- /SYNC:graph-impact-analysis:reminder -->
      <!-- SYNC:ui-system-context:reminder -->
- **MUST** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.
    <!-- /SYNC:ui-system-context:reminder -->
