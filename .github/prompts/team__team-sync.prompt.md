---
description: Generate team sync meeting agenda with action items and discussion topics
argument-hint: [meeting-type: standup|sprint-review|retro|planning]
---

# Team Sync

Generate meeting agendas and facilitate team coordination.

**Meeting Type**: $ARGUMENTS

## Pre-Workflow

### Activate Skills

- Activate `team-sync` skill for meeting facilitation and agenda generation

## Workflow

### 1. Detect Meeting Type

- **standup** - Daily progress, blockers, plans
- **sprint-review** - Demo items, stakeholder feedback
- **retro** - What went well, improvements, actions
- **planning** - Backlog review, capacity, sprint goals

### 2. Gather Context

- Review recent git activity and commits
- Scan `team-artifacts/` for current work items
- Identify blockers and dependencies

### 3. Generate Agenda

- Create structured agenda with time allocations
- Include discussion topics based on context
- Add action items from previous meetings if available

### 4. Save Agenda

- Save to `team-artifacts/meetings/` with date and meeting type

## Output

Structured meeting agenda with time allocations, discussion topics, and action items.

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
