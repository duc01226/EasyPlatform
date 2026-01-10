---
description: "Summarize and compact conversation context for continuity"
---

# Compact Context

Compress current conversation context to optimize token usage and maintain continuity.

## When to Use

- Before starting a new task in a long session
- When working on multiple unrelated features
- At natural workflow checkpoints
- When context usage is high

## Workflow

### Step 1: Summarize Completed Work

Document what was accomplished:
- Features implemented
- Bugs fixed
- Decisions made
- Files modified

### Step 2: Preserve Essential Context

Keep track of:
- Current branch
- Uncommitted changes
- Active file paths
- Current task/objective
- Error messages (if debugging)

### Step 3: Clear Redundant History

Remove:
- Old exploration paths
- Superseded plans
- Resolved discussions
- Temporary debugging info

### Step 4: Update Memory

Save important patterns to persistent memory:
- Discovered patterns
- Important file locations
- Key decisions

## Context Summary Format

```markdown
## Session Summary
- Implemented [feature]
- Fixed [bug]
- Created [files]

## Active Context
- Branch: feature/xyz
- Files: path/to/file.ts
- Current task: [description]

## Cleared
- Exploration of [topic]
- Old approach for [feature]

## Ready to Continue
[Next steps]
```

## Preservation Checklist

Before compacting, ensure you've noted:
- [ ] Current branch name
- [ ] Uncommitted changes status
- [ ] Active file paths being modified
- [ ] Error messages or stack traces
- [ ] Key decisions and rationale
- [ ] Pending todo items

## Example

```
## Session Summary
- Implemented employee export feature
- Fixed validation bug in SaveEmployeeCommand
- Created unit tests for EmployeeHelper

## Active Context
- Branch: feature/employee-export
- Files: Employee.Application/Commands/ExportEmployees/
- Current task: Add pagination to export

## Cleared
- Exploration of unrelated notification code
- Superseded implementation approaches

Ready to continue with pagination implementation.
```

## Important

- Compact at natural breakpoints, not mid-task
- After compacting, briefly restate current objective
- Verify critical file paths are still accessible
