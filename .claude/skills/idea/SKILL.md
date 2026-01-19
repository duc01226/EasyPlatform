---
name: idea
description: Capture and structure product ideas as backlog artifacts. Use when capturing new ideas, feature requests, or concepts for future refinement. Triggers on keywords like "capture idea", "new idea", "feature idea", "add to backlog", "quick idea".
allowed-tools: Read, Write, Grep, Glob, TodoWrite
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
6. Suggest next: `/refine {idea-file}`

### Output
- **Path:** `team-artifacts/ideas/{YYMMDD}-{role}-idea-{slug}.md`
- **ID Pattern:** `IDEA-{YYMMDD}-{NNN}`

### Related
- **Role Skill:** `product-owner`
- **Command:** `/idea`
- **Next Step:** `/refine`

## Template
See: `team-artifacts/templates/idea-template.md`
