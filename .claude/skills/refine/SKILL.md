---
name: refine
description: Transform ideas into Product Backlog Items with acceptance criteria. Use when converting ideas to PBIs, adding acceptance criteria, or refining requirements. Triggers on keywords like "create pbi", "refine idea", "convert to pbi", "acceptance criteria", "make actionable".
allowed-tools: Read, Write, Edit, Grep, Glob, TodoWrite
---

# Idea Refinement to PBI

Transform captured ideas into actionable Product Backlog Items.

## When to Use
- Idea artifact ready for refinement
- Need to add acceptance criteria
- Converting concept to implementable item

## Quick Reference

### Workflow
1. Read idea artifact
2. Load business context (entities, existing features)
3. Define acceptance criteria (GIVEN/WHEN/THEN)
4. Identify dependencies and out-of-scope
5. Create PBI artifact
6. Save to `team-artifacts/pbis/`
7. Suggest next: `/story {pbi-file}`

### Output
- **Path:** `team-artifacts/pbis/{YYMMDD}-pbi-{slug}.md`
- **ID Pattern:** `PBI-{YYMMDD}-{NNN}`

### Acceptance Criteria Format
```
GIVEN {precondition}
WHEN {action}
THEN {expected outcome}
```

### Related
- **Role Skill:** `business-analyst`
- **Command:** `/refine`
- **Input:** `/idea` output
- **Next Step:** `/story`

## Template
See: `team-artifacts/templates/pbi-template.md`
