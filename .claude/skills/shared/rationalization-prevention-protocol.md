# Rationalization Prevention Protocol

**Version:** 1.0.0 | **Last Updated:** 2026-03-10

AI agents consistently rationalize skipping steps. This protocol lists common evasions and rebuttals — reference it when AI attempts to bypass mandatory phases.

---

## Common AI Evasions & Rebuttals

| Evasion                                   | Rebuttal                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| "This is too simple for a plan"           | Simple tasks with wrong assumptions waste more time than complex planned ones. Plan anyway. |
| "I'll write tests after implementation"   | Tests passing on first run prove nothing — RED before GREEN. Write test first.              |
| "I already searched, no existing pattern" | Show grep evidence with file:line references. "I searched" without proof = no search.       |
| "The user said 'just do it'"              | Still need TaskCreate for tracking. Skip planning depth, never skip task management.        |
| "This is just a small fix"                | Small fixes in wrong location cascade. Verify file:line before editing.                     |
| "I'll refactor later"                     | Later never comes. Apply KISS now or document tech debt explicitly.                         |
| "Tests aren't relevant for this change"   | If it modifies behavior, it needs verification. No exceptions.                              |
| "The code is self-explanatory"            | To YOU now. Future AI/human readers need evidence trail.                                    |
| "I can combine these steps to save time"  | Combined steps dilute focus. Each step has a distinct purpose.                              |
| "The existing pattern is close enough"    | "Close enough" = subtle bugs. Match exactly or document deviation with rationale.           |

## When to Apply

Reference this table in skills where AI commonly skips steps:

| Skill                              | Common Evasion                                |
| ---------------------------------- | --------------------------------------------- |
| `/plan`, `/cook`                   | "Too simple for a plan"                       |
| `/tdd-spec`, `/integration-test`   | "Tests aren't relevant", "I'll test after"    |
| `/code-review`, `/review-changes`  | "Code is self-explanatory", "Combine reviews" |
| `/scout`, `/feature-investigation` | "Already searched", "Pattern is close enough" |

## How to Use

When AI output contains language matching an evasion pattern above:

1. **Recognize** the rationalization
2. **Cite** the rebuttal from this table
3. **Execute** the skipped step before proceeding

---

## Cross-Reference

- **Consumed by:** `/cook`, `/cook-fast`, `/cook-auto`, `/cook-auto-fast`, `/cook-auto-parallel`, `/cook-parallel`, `/plan`, `/code-review`, `/tdd-spec`, `/integration-test`, `/scout`
- **Related:** `.claude/skills/shared/two-stage-task-review-protocol.md` (review rationalization prevention)
- **Related:** `.claude/skills/shared/red-flag-stop-conditions-protocol.md` (when to abandon approach)
