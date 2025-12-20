---
applyTo: "**"
description: "Evidence-based debugging protocol for AI agents analyzing bugs and code removal"
---

# AI Debugging Protocol (Quick Reference)

> **MANDATORY** for bug analysis, code removal decisions, and debugging tasks

## Core Principles

- **NEVER assume without evidence** - First impressions are often wrong
- **NEVER trust static analysis alone** - Dynamic property access, string literals create hidden dependencies
- **NEVER proceed when confidence < 90%** - Request user confirmation explicitly
- **ALWAYS search multiple patterns** - Static imports + dynamic usage + string literals
- **ALWAYS read actual implementations** - Don't stop at interfaces or type definitions
- **ALWAYS trace full dependency chains** - Who depends on this? What breaks if removed?

## Quick Verification Checklist

Before analyzing code as "unused" or proposing removal:

```
[ ] Searched static imports/usage?
[ ] Searched string literals in code ('.property', "property")?
[ ] Checked dynamic invocations (element.attr(), element.prop(), runtime calls)?
[ ] Read actual implementation (not just interfaces)?
[ ] Traced dependency chains (who depends on this)?
[ ] Assessed what breaks if removed?
[ ] Checked for framework integration patterns?
[ ] Documented all evidence clearly?
[ ] Declared confidence level (High/Medium/Low)?

If ANY box unchecked -> DO MORE INVESTIGATION
If confidence < 90% -> REQUEST USER CONFIRMATION
```

## Confidence Levels

| Level      | Range   | Action                           |
| ---------- | ------- | -------------------------------- |
| **High**   | 90-100% | Proceed with recommendation      |
| **Medium** | 70-89%  | Proceed with caution + user note |
| **Low**    | <70%    | STOP - Request user guidance     |

## Red Flags (Exercise Caution)

- "This appears to be unused" - Have you checked dynamic usage?
- "No imports found" - Could be polyfill with side effects?
- "Looks like..." or "Probably..." - These are assumptions, not facts
- "Template doesn't use it" - Check TypeScript for dynamic property access
- "Only used in one place" - That place might be critical infrastructure

## Evidence Documentation Format

```markdown
## Evidence Collection Results

### Static Analysis:

- **Command:** `grep -r "ImportName" --include="*.ts"`
- **Results:** [X matches found with file:line references]

### Dynamic Usage:

- **Command:** `grep -r "'propertyName'" --include="*.ts"`
- **Results:** [findings or "NONE FOUND"]

### Implementation Analysis:

- **File:** `src/app/service.ts`
- **Purpose:** [why this code exists]
- **Dependencies:** [what depends on this]

### Confidence: [X%] - [High/Medium/Low]

### Recommendation: [action with justification]
```

## Full Protocol Reference

For complete investigation protocols, templates, and case studies, see:
[.github/AI-DEBUGGING-PROTOCOL.md](../AI-DEBUGGING-PROTOCOL.md)
