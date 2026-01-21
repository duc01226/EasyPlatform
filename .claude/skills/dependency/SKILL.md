---
name: dependency
description: Map and visualize feature dependencies. Use when analyzing dependencies, identifying blockers, or creating dependency graphs. Triggers on keywords like "dependencies", "blockers", "what blocks", "dependency map".
allowed-tools: Read, Write, Grep, Glob, TodoWrite
---

# Dependency Mapping

Map and visualize dependencies between features and work items.

## When to Use
- Planning feature sequencing
- Identifying blockers
- Understanding critical path

## Quick Reference

### Workflow
1. Read target PBI/feature or all items
2. Extract dependency fields
3. Build dependency graph
4. Identify critical path
5. Output visualization

### Dependency Types
| Type | Description |
|------|-------------|
| Blocked by | Cannot start until X completes |
| Blocks | X cannot start until this completes |
| Related to | Shares code/design elements |
| Depends on | Needs external (API, service) |

### Output Format
```
A -> B -> C (critical path)
     \-> D

Legend:
-> blocks
=> related
```

### Related
- **Role Skill:** `project-manager`
- **Command:** `/dependency`

## Task Planning Notes

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
