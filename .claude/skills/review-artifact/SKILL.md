---
name: review-artifact
version: 1.0.0
description: '[Code Quality] Review artifact quality before handoff. Use to verify PBIs, designs, stories meet quality standards.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** before executing:

> **Understand Code First** — Search codebase for 3+ similar implementations BEFORE writing any code. Read existing files, validate assumptions with grep evidence, map dependencies via graph trace. Never invent new patterns when existing ones work.
> MUST READ `.claude/skills/shared/understand-code-first-protocol.md` for full protocol and checklists.
> **Graph Impact Analysis** — Use `trace --direction downstream` on changed files to find all impacted consumers, bus message handlers, event subscribers. Verify each needs updating.
> MUST READ `.claude/skills/shared/graph-impact-analysis-protocol.md` for full protocol and checklists.

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

> **Protocol:** `.claude/skills/shared/double-round-trip-review-protocol.md`

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
  **MANDATORY IMPORTANT MUST** READ the following files before starting:
- **MUST** READ `.claude/skills/shared/understand-code-first-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/graph-impact-analysis-protocol.md` before starting
