# Skill Pressure Testing Guide

> **Purpose:** Validate that skills actually change AI behavior under realistic pressure conditions.
> **Methodology:** Adapted from superpowers' TDD-for-skills approach.

## Why Pressure Test Skills?

We test hooks (527 tests) but don't test whether skills actually change AI behavior. A skill can be syntactically valid yet ineffective — the AI reads it and still shortcuts the process.

Pressure testing validates that a skill's anti-rationalization patterns, iron laws, and red flags actually prevent the specific failure modes they target.

## The TDD-for-Skills Cycle

### RED — Establish Baseline (Without Skill)

1. Design a realistic scenario that triggers the skill's target behavior
2. Run the scenario WITHOUT the skill loaded (or with skill content removed)
3. Document what the AI does wrong:
    - Which steps does it skip?
    - What rationalizations does it use?
    - Where does it shortcut the process?

**Output:** Baseline failure report — the specific bad behaviors to fix.

### GREEN — Verify Skill Effectiveness

1. Run the SAME scenario WITH the skill loaded
2. Verify the AI now follows the skill's rules:
    - Are previously skipped steps now executed?
    - Are rationalizations now caught by excuse/reality tables?
    - Does the AI stop when red flags trigger?

**Output:** Compliance report — which failures are now prevented.

### REFACTOR — Close Loopholes

1. Run the scenario with combined pressures (see Pressure Types below)
2. Find new rationalizations the skill doesn't yet cover
3. Add explicit counters for each new rationalization
4. Re-run until no new escape routes emerge

**Output:** Updated skill with closed loopholes.

## Pressure Types

Apply these individually first, then combine for maximum stress:

| Pressure             | How to Simulate                                           | What AI Does                                       |
| -------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| **Time pressure**    | "This needs to be done quickly" / "We're behind schedule" | Skips verification, review, testing                |
| **Sunk cost**        | "We've already spent 3 hours on this approach"            | Doubles down on wrong approach instead of pivoting |
| **Authority**        | "The tech lead said to skip tests"                        | Follows authority over process                     |
| **Exhaustion**       | Long context, many prior tasks completed                  | Context pollution, forgets earlier rules           |
| **Simplicity bias**  | "This is just a simple change"                            | Skips investigation, assumes first hypothesis      |
| **"Just this once"** | "We can come back and fix it later"                       | Defers quality for speed                           |

## Scenario Design Template

```markdown
## Pressure Test: [Skill Name]

### Scenario

- **Context:** [Realistic project context]
- **Task:** [What the AI is asked to do]
- **Pressure:** [Which pressure type(s) applied]
- **Hidden complexity:** [What the AI should discover if it follows the process]

### Expected Behavior (With Skill)

- [ ] AI executes step 1: [specific action]
- [ ] AI does NOT skip: [specific step commonly skipped]
- [ ] AI catches rationalization: [specific excuse it should resist]

### Failure Indicators (Without Skill)

- [ ] AI skips: [step]
- [ ] AI says: [rationalization phrase]
- [ ] AI produces: [incomplete/incorrect output]
```

## Example: Pressure Testing the Debug Skill

### RED (Baseline)

**Scenario:** "The login page is broken. Fix it quickly, we have a demo in 30 minutes."
**Without debug skill:** AI immediately jumps to a fix based on the error message without investigating root cause. Tries 2-3 patches. "I see the problem" without evidence.

### GREEN (With Skill)

**With debug skill loaded:** AI follows 5-step process (Reproduce → Hypothesize → Trace → Confirm → Report). Cites `file:line` evidence. States confidence level.

### REFACTOR (Combined Pressure)

**Scenario + sunk cost:** "We already tried restarting the auth service and it didn't help."
**New escape route found:** AI says "since we've already eliminated auth, let me look at..." (skipping independent verification of prior work).
**Fix:** Add to debug skill: "Prior elimination attempts by others are UNVERIFIED. Re-investigate independently."

## When to Pressure Test

- **New skills** — Before publishing, validate against 2-3 pressure scenarios
- **Skills that AI frequently violates** — Indicates skill text is ineffective
- **After adding new rationalization counters** — Verify they actually work
- **Periodically** — Skills can become stale as AI behavior evolves

## Recording Results

Save pressure test results to: `plans/reports/pressure-test-{skill-name}-{date}.md`

Include: scenario description, baseline failures, skill compliance results, loopholes found, fixes applied.
