---
agent: agent
description: Auto-review plan for validity, correctness, and best practices before implementation. Use after /plan to validate before coding.
---

# Plan Self-Review

Perform automatic self-review of an implementation plan to ensure it's valid, correct, follows best practices, and identify anything needing fixes before proceeding.

## Task

$input

## Key Distinction

This is **AI self-review** (automatic analysis), NOT user interview. For user validation with questions, use `/plan:validate` instead.

## Plan Resolution

1. If task input provides path -> Use that path
2. Else check workspace for recent plan files in `./plans/`
3. If no plan found -> Error: "No plan to review. Run /plan first."

## Review Workflow

### Step 1: Read Plan Files

Read the plan directory:

-   `plan.md` - Overview, phases list, frontmatter
-   `phase-*.md` - All phase files
-   Extract: requirements, implementation steps, file listings, risks

### Step 2: Evaluate Against Checklist

#### Validity (Required - all must pass)

-   [ ] Has executive summary (clear 1-2 sentence description)
-   [ ] Has defined requirements section
-   [ ] Has implementation steps (actionable tasks)
-   [ ] Has files to create/modify listing

#### Correctness (Required - all must pass)

-   [ ] Steps are specific and actionable (not vague)
-   [ ] File paths follow project patterns
-   [ ] No conflicting or duplicate steps
-   [ ] Dependencies between steps are clear

#### Best Practices (Required - all must pass)

-   [ ] YAGNI: No unnecessary features or over-engineering
-   [ ] KISS: Simplest viable solution chosen
-   [ ] DRY: No planned duplication of logic
-   [ ] Architecture: Follows project patterns from `docs/claude/`

#### Completeness (Recommended - ≥50% should pass)

-   [ ] Risk assessment present with mitigations
-   [ ] Testing strategy defined
-   [ ] Success criteria per phase
-   [ ] Security considerations addressed

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

-   ✅ Check 1
-   ✅ Check 2
-   ❌ Check 3 (if failed)

#### Recommended ({X}/{Y})

-   ✅ Check 1
-   ⚠️ Check 2 (missing)

### Issues Found

-   ❌ FAIL: {critical issue requiring fix}
-   ⚠️ WARN: {minor issue, can proceed}

### Recommendations

1. {specific fix 1}
2. {specific fix 2}

### Verdict

{PROCEED | REVISE_FIRST | BLOCKED}
```

## Next Steps

-   **If PASS**: Announce "Plan review complete. Proceeding with next workflow step."
-   **If WARN**: Announce "Plan review complete with warnings. Proceeding - consider addressing gaps."
-   **If FAIL**: List specific issues. Do NOT proceed. Ask user to fix or regenerate plan.

## Important Notes

-   Be constructive, not pedantic - focus on issues that would cause implementation problems
-   WARN is acceptable for missing optional sections
-   FAIL only for genuinely missing required content
-   If plan is simple and valid, quick review is fine
