---
agent: agent
description: Self-review implementation plan for validity, correctness, and best practices before coding begins
---

# Plan Review

Critically review the implementation plan to ensure quality before coding begins.

## Task

$input

## Review Checklist

1. **Structure** - Plan has proper frontmatter, phases numbered and linked?
2. **Logic** - Dependencies mapped, risk assessment present?
3. **Patterns** - Uses platform patterns, files in correct locations?
4. **Completeness** - Success criteria defined, edge cases covered?
5. **Best Practices** - Follows YAGNI/KISS/DRY, no over-engineering?

## Review Process

1. Read plan.md and all phase files in the plan directory
2. Evaluate each checklist item
3. Identify issues with specific fixes
4. Output approval or list revision requirements

## Output Format

**Approved:**
```
✅ Plan Review: APPROVED
- Structure: Valid
- Logic: Sound
- Patterns: Compliant
- Completeness: Adequate

Proceeding to implementation...
```

**Needs Revision:**
```
⚠️ Plan Review: NEEDS REVISION

Issues:
1. [Issue] → [Fix]
2. [Issue] → [Fix]

Update plan before proceeding.
```

## Guidelines

- Focus on major issues impacting implementation
- Provide actionable fix suggestions
- Approve quickly if plan is solid
- Don't nitpick minor formatting
