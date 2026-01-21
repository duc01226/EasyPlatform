---
name: idea
description: Capture and structure product ideas as backlog artifacts. Use when capturing new ideas, feature requests, or concepts for future refinement. Triggers on keywords like "capture idea", "new idea", "feature idea", "add to backlog", "quick idea".
allowed-tools: Read, Write, Grep, Glob, TodoWrite, AskUserQuestion
---

# Idea Capture

Capture raw ideas as structured artifacts for backlog consideration.

## When to Use
- User has new feature concept
- Stakeholder request needs documentation
- Quick capture without full refinement

## Quick Reference

### Workflow
1. Detect related business module (dynamic discovery)
2. Load business context from `docs/business-features/`
3. Gather idea details (problem, value, scope)
4. Create artifact using template
5. Save to `team-artifacts/ideas/`
6. **Quick Validation** (MANDATORY) - 2-3 sanity check questions
7. Suggest next: `/refine {idea-file}`

### Output
- **Path:** `team-artifacts/ideas/{YYMMDD}-{role}-idea-{slug}.md`
- **ID Pattern:** `IDEA-{YYMMDD}-{NNN}`

### Related
- **Role Skill:** `product-owner`
- **Command:** `/idea`
- **Next Step:** `/refine`

## Template

See: `team-artifacts/templates/idea-template.md`

## Quick Validation (MANDATORY)

After creating idea artifact, ask 2-3 quick questions to validate before handoff.

### Question Selection (pick 2-3 most relevant)

| Category            | Question                                                           |
| ------------------- | ------------------------------------------------------------------ |
| **Problem Clarity** | "Is the problem statement clear? What's the root cause?"           |
| **Value**           | "Who benefits most? What's the business impact if NOT built?"      |
| **Scope**           | "Is this one feature or multiple? Should it be split?"             |
| **Timing**          | "Is this urgent or can it wait? Any deadline drivers?"             |
| **Alternatives**    | "Any existing solutions or workarounds today?"                     |

### Process

1. Select 2-3 questions based on idea complexity
2. Use `AskUserQuestion` with concrete options
3. Update idea artifact with any clarifications
4. Skip validation only for trivial/obvious ideas (single sentence, obvious need)

### Validation Output

Add to idea artifact under `## Quick Validation` section:

```markdown
## Quick Validation

**Validated:** {date}

- **Problem clarity:** {Confirmed/Clarified: notes}
- **Value confirmed:** {Yes/Needs discussion}
- **Scope check:** {Single feature/Needs splitting}
```

## Notes

- Always plan and break many small todo tasks
- Always add a final review todo task to validate the captured idea
- Quick validation is MANDATORY unless idea is trivial

## Task Planning Notes

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
