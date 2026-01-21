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
7. **Validate refinement** (MANDATORY) - Interview user to confirm assumptions, decisions, concerns
8. Suggest next: `/story {pbi-file}`

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

## Validation Step (MANDATORY)

After creating the PBI, validate with user:

### Question Categories

| Category        | Example Question                                         |
| --------------- | -------------------------------------------------------- |
| **Assumptions** | "The PBI assumes X. Is this correct?"                    |
| **Scope**       | "Should Y be included or deferred?"                      |
| **Risks**       | "This depends on Z. Is that available?"                  |
| **Acceptance**  | "Is criterion X complete or are there edge cases?"       |
| **Entities**    | "Create new entity or extend existing X?"                |

### Process

1. Generate 3-5 questions from assumptions, scope decisions, dependencies
2. Use `AskUserQuestion` tool to interview
3. Document in PBI under `## Validation Summary`
4. Update PBI based on answers

### Validation Output Format

```markdown
## Validation Summary

**Validated:** {date}

### Confirmed Decisions
- {decision}: {user choice}

### Assumptions Confirmed
- {assumption}: Confirmed/Modified

### Open Items
- [ ] {follow-up items}
```

## Task Planning Notes

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
