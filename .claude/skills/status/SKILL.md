---
name: status
description: Generate status reports for sprints or projects. Use when creating status reports, checking progress, or summarizing sprint metrics. Triggers on keywords like "status report", "sprint status", "progress", "how are we doing".
allowed-tools: Read, Write, Grep, Glob, Bash, TodoWrite
---

# Status Report

Generate project/sprint status reports with metrics.

## When to Use
- Sprint status needed
- Project progress report
- Stakeholder update

## Quick Reference

### Workflow
1. Read PBIs in scope
2. Check git log for recent commits
3. Find open issues/PRs
4. Calculate metrics
5. Generate report
6. Save to `plans/reports/`

### Metrics
- Completed vs Planned
- Velocity (if sprint)
- Bug count
- Blocker count

### Report Structure
```markdown
## Status Report - {Date}
### Sprint: {Name} | Day {N}/{Total}

#### Progress
| Metric | Planned | Actual | Status |
|--------|---------|--------|--------|

#### Completed
| Item | Owner |

#### In Progress
| Item | Status | Blocker |

#### Blockers
| Blocker | Impact | Action |

#### Risks
| Risk | Probability | Impact |
```

### Output
- **Path:** `plans/reports/{YYMMDD}-status-{scope}.md`

### Related
- **Role Skill:** `project-manager`
- **Command:** `/status`
