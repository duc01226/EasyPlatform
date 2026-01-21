---
name: team-sync
description: Generate team sync meeting agenda with status and action items
allowed-tools: Read, Write, Grep, Glob, TodoWrite
arguments:
  - name: type
    description: daily | weekly | sprint-review | sprint-planning
    required: false
    default: daily
---

# Generate Team Sync Agenda

Create meeting agenda with relevant status items.

## Pre-Workflow

### Activate Skills

- Activate `project-manager` skill for meeting facilitation best practices

## Workflow

1. **Gather Context**
   - Recent activity (git, artifacts)
   - Open blockers
   - Pending handoffs

2. **Generate Agenda**
   Based on meeting type:

   **Daily Standup:**
   ```markdown
   ## Daily Standup - {Date}

   ### Sprint Progress
   - Day {N} of {Total}
   - Points: {completed}/{planned}

   ### Yesterday
   - {completed items}

   ### Today
   - {planned items}

   ### Blockers
   - {blockers}
   ```

   **Weekly Sync:**
   ```markdown
   ## Weekly Team Sync - {Date}

   ### Sprint Progress (10 min)

   ### Cross-Role Updates (15 min)
   | Role | Update |
   |------|--------|
   | PO | |
   | BA | |
   | Dev | |
   | QA | |
   | Design | |

   ### Risks & Blockers (10 min)

   ### Action Items (5 min)
   ```

   **Sprint Review:**
   ```markdown
   ## Sprint {N} Review - {Date}

   ### Demo Items
   | Feature | Demo By |
   |---------|---------|
   | | |

   ### Sprint Goal: {goal}
   - Status: {achieved/partial/not}

   ### Metrics
   - Velocity: {points}
   - Commitment: {%}

   ### Feedback
   ```

3. **Output Agenda**
   - Console or save to file

## Example

```bash
/team-sync daily
/team-sync sprint-review
```

## Task Planning Notes

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
