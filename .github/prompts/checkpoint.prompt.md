---
description: "Save memory checkpoint to preserve analysis context"
---

# Memory Checkpoint

Save current analysis, findings, and progress to prevent context loss during long-running tasks.

## When to Use

- Working on complex multi-step tasks
- Before expected context limits
- At key milestones during feature development
- After completing significant analysis phases

## Checkpoint Location

Files saved to: `plans/reports/checkpoint-{YYMMDD-HHMM}-{slug}.md`

## Workflow

### Step 1: Gather Context

Collect and document:
- Current task and objective
- Key findings and discoveries
- Files analyzed and modified
- Progress (completed vs remaining)
- Important decisions and rationale
- Next steps

### Step 2: Create Checkpoint File

```markdown
# Memory Checkpoint: [Task Description]

## Session Info
- **Created:** [timestamp]
- **Task:** [description]
- **Branch:** [git branch]
- **Phase:** [current phase]

## Current Task Summary
[Brief description of what you're working on]

## Key Findings
- [Finding 1]
- [Finding 2]

## Files Context

### Analyzed Files
| File | Purpose | Relevance |
|------|---------|-----------|
| path/to/file | [purpose] | High/Medium/Low |

### Modified Files
- `path/to/file` - [change description]

## Progress Summary

### Completed
- [x] [Item 1]

### In Progress
- [ ] [Current item]

### Remaining
- [ ] [Item 1]

## Important Context

### Decisions Made
- [Decision] - [rationale]

### Assumptions
- [Assumption 1]

## Next Steps
1. [Immediate action]
2. [Following action]

## Open Questions
- [ ] [Question 1]

## Recovery Instructions
To resume after context reset:
1. Read this checkpoint file
2. Review [specific files]
3. Continue from [specific point]
```

## Best Practices

- Save checkpoints frequently (every 30-60 min)
- Be specific with file paths and line numbers
- Document WHY decisions were made
- Include recovery steps for easy resumption

## Related

- `/compact` - Compress conversation context
- `/watzup` - Generate progress summary
