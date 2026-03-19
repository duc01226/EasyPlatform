# Double Round-Trip Review Protocol

> **Purpose:** Enforce two full review rounds for every review skill to maximize issue detection.
> **Applies to:** ALL review skills (code-review, review-changes, review-post-task, sre-review, refine-review, story-review, tdd-spec-review, plan-review, why-review, review-artifact, knowledge-review) and the `code-reviewer` agent.

## The Rule

Every review execution completes **two full rounds** before delivering the final verdict:

1. **Round 1: Full Review** — Normal review execution with all phases/checklists
2. **Round 2: Focused Re-Review** — Re-execute the review with fresh eyes, focusing on what Round 1 missed

<HARD-GATE>
Round 2 is MANDATORY. Do NOT skip Round 2. Do NOT combine Round 1 and Round 2 into a single pass.
A single-round review misses issues that only surface on a second reading with accumulated context.
</HARD-GATE>

## Why Two Rounds Matter

- **Round 1** builds understanding — you learn the codebase, the intent, the patterns
- **Round 2** leverages that understanding — with full context loaded, you catch subtle issues that were invisible on first reading
- Studies show code review effectiveness increases 30-50% with a second pass
- First-pass bias (anchoring on obvious issues) causes tunnel vision — second pass breaks it

## Round 1: Full Review

Execute the review skill's normal workflow completely:

- All phases (file-by-file, holistic, etc.)
- All checklists (architecture, DRY, YAGNI, KISS, etc.)
- All evidence gathering (file:line references, grep verification)
- Produce findings, fix issues if applicable
- Write report or verdict as defined by the skill

## Round 2: Focused Re-Review

After Round 1 completes, **re-execute the review from scratch** with these focus areas:

### 2a. Re-Read, Don't Recall

- Re-read ALL reviewed files/artifacts again — do NOT rely on Round 1 memory
- Re-read the Round 1 report/findings to understand what was already caught
- Approach each file as if seeing it for the first time

### 2b. Focus Areas (What Round 1 Typically Misses)

- **Cross-cutting concerns** — issues that span multiple files but are invisible file-by-file
- **Subtle edge cases** — null handling, empty collections, boundary values, off-by-one
- **Naming and readability** — names that seemed fine individually but are inconsistent across files
- **Missing pieces** — what SHOULD exist but doesn't (missing error handling, missing validation, missing tests)
- **Interaction bugs** — how components interact, data flow correctness, event ordering
- **Convention drift** — patterns that deviate slightly from codebase conventions (grep to verify)
- **Over-engineering** — abstractions that seemed justified in Round 1 but aren't on reflection
- **Doc staleness** — documentation references that Round 1 didn't cross-check

### 2c. Verify Round 1 Fixes

If Round 1 made changes or fixes:

- Verify fixes are correct and complete
- Verify fixes didn't introduce new issues
- Verify fixes follow codebase conventions

### 2d. Update Report

- Add **"## Round 2 Findings"** section to the report (or update the verdict)
- List new issues found in Round 2 that Round 1 missed
- Note "Round 2 verified: no additional issues" if Round 2 found nothing new
- Final verdict must incorporate findings from BOTH rounds

## Integration by Review Type

### Code Quality Reviews (code-review, review-changes, review-post-task)

- Round 1: Full Phase 1 (file-by-file) → Phase 2 (holistic) → Phase 3 (report)
- Round 2: Re-scan all files → focus on cross-cutting concerns and Round 1 blind spots → update report with Round 2 section

### Gate Reviews (refine-review, story-review, tdd-spec-review, plan-review, why-review)

- Round 1: Full checklist evaluation → verdict (PASS/WARN/FAIL)
- Round 2: Re-evaluate all checklist items → challenge Round 1 PASS items ("is this really PASS?") → update verdict if new issues found

### Production Reviews (sre-review)

- Round 1: Full scoring across all criteria → score
- Round 2: Re-score all criteria → verify scoring accuracy → check for missed operational concerns

### Artifact Reviews (review-artifact, knowledge-review)

- Round 1: Full quality checklist → verdict
- Round 2: Re-check with fresh eyes → verify completeness claims → update verdict

## Todo Task Pattern

When planning review tasks, always include Round 2:

```
- [Review Round 1] Full review execution
- [Review Round 2] Focused re-review (MANDATORY - do not skip)
- [Review Final] Consolidate findings from both rounds
```

## Red Flags — STOP

If you're thinking:

- "Round 1 was thorough enough, skip Round 2" — Round 1 always feels thorough. Round 2 always finds more.
- "No time for Round 2, let's move on" — Shipping bugs is more expensive than one more review pass.
- "Round 2 won't find anything new" — This is exactly when Round 2 finds the most surprising issues.
- "I'll do a quick Round 2" — Quick ≠ focused. Follow the protocol fully.

## Cross-Reference

- **Related:** `.claude/skills/shared/two-stage-task-review-protocol.md` — Spec compliance before code quality (orthogonal to this protocol)
- **Related:** `.claude/skills/shared/rationalization-prevention-protocol.md` — Prevents evasion of review thoroughness
- **Related:** `.claude/skills/shared/evidence-based-reasoning-protocol.md` — Proof requirements for all findings
