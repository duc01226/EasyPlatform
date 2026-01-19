---
name: status
description: Generate status report for sprint or project
allowed-tools: Read, Write, Grep, Glob, Bash, TodoWrite
arguments:
  - name: scope
    description: sprint | project | feature-{name}
    required: false
    default: sprint
---

# Generate Status Report

Create status report from current artifacts and activity.

## Pre-Workflow

### Activate Skills

- Activate `project-manager` skill for status reporting and metrics analysis

## Workflow

1. **Gather Data**
   - Read PBIs in scope
   - Check git log for recent commits
   - Find open issues/PRs
   - Identify blockers

2. **Calculate Metrics**
   - Completed vs planned
   - Velocity (if sprint)
   - Bug count
   - Blocker count

3. **Generate Report**
   ```markdown
   ## Status Report - {Date}

   ### Sprint: {Name} | Day {N}/{Total}

   #### Progress Summary
   | Metric | Planned | Actual | Status |
   |--------|---------|--------|--------|
   | Stories | X | Y | 🟢🟡🔴 |
   | Points | X | Y | |

   #### Completed
   | Item | Owner |
   |------|-------|
   | | |

   #### In Progress
   | Item | Status | Blocker |
   |------|--------|---------|
   | | | |

   #### Blockers
   | Blocker | Impact | Action |
   |---------|--------|--------|
   | | | |

   #### Risks
   | Risk | Probability | Impact |
   |------|-------------|--------|
   | | | |
   ```

4. **Save Report**
   - Path: `plans/reports/{YYMMDD}-status-{scope}.md`

## Example

```bash
/status sprint
/status feature-dark-mode
```
