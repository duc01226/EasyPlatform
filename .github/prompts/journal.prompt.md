---
description: "Write development journal entries for team knowledge"
---

# Development Journal

Write concise journal entries documenting key changes, decisions, and learnings.

## Location

Journal files: `docs/journals/YYYY-MM-DD-{slug}.md`

## When to Write

- After completing significant features
- When making architectural decisions
- After debugging complex issues
- When discovering important patterns
- After team discussions/decisions

## Journal Structure

```markdown
# Journal: [Title]

**Date:** YYYY-MM-DD
**Author:** [Name]
**Tags:** #feature #debugging #architecture

## Summary

One paragraph overview of what happened.

## Context

Why was this work needed? What problem were we solving?

## Key Changes

- [Change 1] - [Impact]
- [Change 2] - [Impact]

## Decisions Made

### Decision: [Title]

**Options Considered:**
1. Option A - [pros/cons]
2. Option B - [pros/cons]

**Chosen:** Option B because [rationale]

## Learnings

- [Learning 1]
- [Learning 2]

## Impact

- Performance: [impact]
- User Experience: [impact]
- Maintainability: [impact]

## Follow-up Items

- [ ] [Item 1]
- [ ] [Item 2]

## References

- [Link to PR/Issue]
- [Link to related docs]
```

## Entry Types

### Feature Entry

```markdown
# Journal: Employee Export Feature

**Date:** 2026-01-10
**Tags:** #feature #employee

## Summary
Implemented bulk export functionality for employee data with Excel and CSV support.

## Key Changes
- Added ExportEmployeesCommand with pagination
- Created Excel generator using ClosedXML
- Added download endpoint with streaming

## Decisions Made
### Decision: Export Format
**Chosen:** Excel (.xlsx) as default because most users prefer it for further analysis.
```

### Debugging Entry

```markdown
# Journal: N+1 Query Fix

**Date:** 2026-01-10
**Tags:** #debugging #performance

## Summary
Identified and fixed N+1 query issue in employee listing causing 500ms+ response times.

## Root Cause
Missing `Include()` for Department navigation property.

## Solution
Added eager loading: `.Include(e => e.Department)`

## Learnings
- Always check query logs during feature development
- Use `loadRelatedEntities` parameter in repository methods
```

## Best Practices

- Write immediately after work (context is fresh)
- Be concise but complete
- Include code snippets where helpful
- Link to related PRs/issues
- Tag for searchability

## Important

- Focus on WHY, not just WHAT
- Document decisions for future reference
- Keep entries searchable
- Review journals during onboarding
