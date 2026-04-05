---
name: review-artifact
version: 1.0.0
description: '[Code Quality] Review artifact quality before handoff. Use to verify PBIs, designs, stories meet quality standards.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** before executing:

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->
<!-- SYNC:graph-impact-analysis -->

> **Graph Impact Analysis** — When `.code-graph/graph.db` exists, run `blast-radius --json` to detect ALL files affected by changes (7 edge types: CALLS, MESSAGE_BUS, API_ENDPOINT, TRIGGERS_EVENT, PRODUCES_EVENT, TRIGGERS_COMMAND_EVENT, INHERITS). Compute gap: impacted_files - changed_files = potentially stale files. Risk: <5 Low, 5-20 Medium, >20 High. Use `trace --direction downstream` for deep chains on high-impact files.

<!-- /SYNC:graph-impact-analysis -->

> **OOP & DRY Enforcement:** MANDATORY IMPORTANT MUST — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group or suffix (ex *Entity, *Dto, \*Service, etc...) MUST inherit a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

## Quick Summary

**Goal:** Review an artifact (PBI, design spec, story, test spec) for completeness and quality before handoff.

**Workflow:**

1. **Identify** — What artifact type is being reviewed
2. **Checklist** — Apply type-specific quality criteria
3. **Verdict** — READY or NEEDS WORK with specific items

**Key Rules:**

- Use type-specific checklists
- Every NEEDS WORK item must be actionable
- Never block on stylistic preferences — focus on completeness

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Type-Specific Checklists

### PBI Review

- [ ] Problem statement is clear
- [ ] Acceptance criteria are testable and measurable
- [ ] Scope is well-defined (what's in and out)
- [ ] Dependencies are identified
- [ ] Business value is articulated
- [ ] Priority is assigned

### User Story Review

- [ ] Follows GIVEN/WHEN/THEN format
- [ ] Is independent (not dependent on other stories)
- [ ] Is estimable (team can size it)
- [ ] Is small enough for one sprint
- [ ] Has acceptance criteria

### Design Spec Review

- [ ] All component states covered (default, hover, active, disabled, error, loading)
- [ ] Design tokens specified (colors, spacing, typography)
- [ ] Responsive behavior defined
- [ ] Accessibility requirements noted
- [ ] Interaction patterns documented

### Test Spec Review

- [ ] Coverage adequate for acceptance criteria
- [ ] Edge cases included
- [ ] Test data requirements specified
- [ ] GIVEN/WHEN/THEN format used
- [ ] Negative test cases included

## Readability Checklist (MUST evaluate)

Before approving, verify the code is **easy to read, easy to maintain, easy to understand**:

- **Schema visibility** — If a function computes a data structure (object, map, config), a comment should show the output shape so readers don't have to trace the code
- **Non-obvious data flows** — If data transforms through multiple steps (A → B → C), a brief comment should explain the pipeline
- **Self-documenting signatures** — Function params should explain their role; flag unused params
- **Magic values** — Unexplained numbers/strings should be named constants or have inline rationale
- **Naming clarity** — Variables/functions should reveal intent without reading the implementation

## Output Format

```
## Artifact Review

**Artifact Type:** [PBI | Story | Design | Test Spec]
**Artifact:** [Reference/title]
**Date:** {date}
**Verdict:** READY | NEEDS WORK

### Checklist Results
- [pass] [Item] — [evidence]
- [fail] [Item] — [what's missing/wrong]

### Action Items (if NEEDS WORK)
1. [Specific actionable item]
```

## Round 2: Focused Re-Review (MANDATORY)

> **Protocol:** Deep Multi-Round Review (inlined via SYNC:double-round-trip-review above)

After completing Round 1 evaluation, execute a **second full review round**:

1. **Re-read** the Round 1 verdict and findings
2. **Re-evaluate** ALL quality checklist items — do NOT rely on Round 1 memory
3. **Challenge** Round 1 READY items: "Is this truly ready? Did I verify with evidence?"
4. **Focus on** what Round 1 typically misses:
    - Implicit assumptions in the artifact
    - Missing coverage of edge cases or error scenarios
    - Cross-references that weren't verified
    - Completeness gaps only visible on second reading
5. **Update verdict** if Round 2 found new issues
6. **Final verdict** must incorporate findings from BOTH rounds

## IMPORTANT Task Planning Notes (MUST FOLLOW)

- Always plan and break work into many small todo tasks using `TaskCreate`
- Always add a final review todo task to verify work quality and identify fixes/enhancements

---

## Systematic Review Protocol (for 10+ artifacts)

> **When reviewing many artifacts at once, categorize by type, fire parallel `code-reviewer` sub-agents per category, then synchronize findings.** See `review-changes/SKILL.md` § "Systematic Review Protocol" for the full 4-step protocol (Categorize → Parallel Sub-Agents → Synchronize → Holistic Assessment).

---

## AI Agent Integrity Gate (NON-NEGOTIABLE)

> **Completion ≠ Correctness.** Before reporting ANY work done, prove it:
>
> 1. **Grep every removed name.** Extraction/rename/delete touched N files? Grep confirms 0 dangling refs across ALL file types.
> 2. **Ask WHY before changing.** Existing values are intentional until proven otherwise. No "fix" without traced rationale.
> 3. **Verify ALL outputs.** One build passing ≠ all builds passing. Check every affected stack.
> 4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints.
> 5. **New artifact = wired artifact.** Created something? Prove it's registered, imported, and reachable by all consumers.

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
- **MUST** execute two review rounds (Round 1: understand, Round 2: catch missed issues)
      <!-- SYNC:understand-code-first:reminder -->
- **MUST** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
  <!-- /SYNC:understand-code-first:reminder -->
  <!-- SYNC:graph-impact-analysis:reminder -->
- **MUST** run `blast-radius` when graph.db exists. Flag impacted files NOT in changeset as potentially stale.
      <!-- /SYNC:graph-impact-analysis:reminder -->
