---
name: memory-manager
description: Use when storing or retrieving context across sessions using Memory MCP. Helps maintain continuity for long-running features.
---

# Memory Manager Skill

## Purpose

Manage persistent memory across Claude Code sessions for:

- Feature progress tracking
- Architectural decision recording
- Pattern discovery and reuse
- User preference learning

## Memory Entity Schema

### 1. ProjectContext

Stores overall codebase understanding.

```json
{
  "name": "ProjectContext",
  "entityType": "Context",
  "observations": [
    "EasyPlatform is a .NET 9 + Angular 19 development framework",
    "Uses Clean Architecture with CQRS pattern",
    "Backend: src/PlatformExampleApp/, Frontend: src/PlatformExampleAppWeb/",
    "Key patterns: PlatformCqrsCommand, PlatformVmStore, IPlatformQueryableRootRepository"
  ]
}
```

### 2. UserPreferences

Stores discovered user preferences.

```json
{
  "name": "UserPreferences",
  "entityType": "Preference",
  "observations": [
    "Prefers detailed explanations before implementation",
    "Uses Hungarian notation for private fields",
    "Prefers parallel tuple queries over sequential calls",
    "Values evidence-based debugging approach"
  ]
}
```

### 3. FeatureProgress\_{branch}

Stores per-branch implementation status.

```json
{
  "name": "FeatureProgress_task-management",
  "entityType": "FeatureProgress",
  "observations": [
    "Created TaskItemEntity with Status, Priority, DueDate fields",
    "Implemented SaveTaskItemCommand with validation",
    "Frontend: task-list component completed with store",
    "Pending: task-detail form, statistics query"
  ]
}
```

### 4. PatternHistory

Stores successfully used patterns.

```json
{
  "name": "PatternHistory",
  "entityType": "Pattern",
  "observations": [
    "Batch scrolling job pattern works well for cross-company processing",
    "WithFullTextSearch extension pattern for reusable search",
    "Entity event handler pattern for side effects (not direct calls)",
    "Tuple await pattern for parallel queries"
  ]
}
```

### 5. Decision\_{timestamp}

Stores architectural decisions.

```json
{
  "name": "Decision_20251219",
  "entityType": "ArchitecturalDecision",
  "observations": [
    "Context: Choosing between WebSocket and SSE for real-time updates",
    "Decision: Using SSE for server-to-client notifications",
    "Reason: Simpler implementation, sufficient for use case, better browser support",
    "Trade-off: No bidirectional communication, acceptable for notifications"
  ]
}
```

## Operations

### Store New Learning

After completing significant work:

```
mcp__memory__create_entities({
  entities: [{
    name: "Decision_[date]",
    entityType: "ArchitecturalDecision",
    observations: [
      "Context: [problem being solved]",
      "Decision: [what was decided]",
      "Reason: [why this approach]",
      "Files: [key files modified]"
    ]
  }]
})
```

### Update Feature Progress

When completing a task:

```
mcp__memory__add_observations({
  observations: [{
    entityName: "FeatureProgress_[branch]",
    contents: [
      "Completed: [task description]",
      "Files: [files created/modified]",
      "Pending: [remaining tasks]"
    ]
  }]
})
```

### Recall Context

At session start or when resuming work:

```
# Search for relevant context
mcp__memory__search_nodes({ query: "[feature-name] OR [task-type]" })

# Get specific entities
mcp__memory__open_nodes({ names: ["FeatureProgress_[branch]", "PatternHistory"] })

# Get full knowledge graph
mcp__memory__read_graph()
```

### Clean Up Old Context

When feature is complete or context is stale:

```
mcp__memory__delete_entities({ entityNames: ["FeatureProgress_old-branch"] })
```

## Workflow Integration

### Session Start

1. Check current branch
2. Search for `FeatureProgress_{branch}`
3. Load relevant decisions and patterns
4. Summarize context for continuity

### During Work

1. After major decisions, create Decision entity
2. After completing tasks, update FeatureProgress
3. When discovering useful patterns, add to PatternHistory
4. When learning preferences, update UserPreferences

### Session End / Feature Complete

1. Update FeatureProgress with final status
2. Record key learnings in PatternHistory
3. Clean up temporary entities if needed

## Example: Complete Workflow

```markdown
## Starting Work on Task Management Feature

1. Load existing context:
   mcp**memory**search_nodes({ query: "task-management" })
   Result: Found FeatureProgress_task-management

2. Open specific entities:
   mcp**memory**open_nodes({ names: ["FeatureProgress_task-management", "PatternHistory"] })

3. Review and continue from last state

## After Completing TaskItemController

mcp**memory**add_observations({
observations: [{
entityName: "FeatureProgress_task-management",
contents: [
"Completed: TaskItemController with GetList and Save endpoints",
"Pattern used: SaveTaskItemCommand with validation",
"Next: Frontend task-list component"
]
}]
})

## Making Architectural Decision

mcp**memory**create_entities({
entities: [{
name: "Decision_20251219_TaskPriority",
entityType: "ArchitecturalDecision",
observations: [
"Context: Representing task priority",
"Decision: Using enum (Low, Medium, High, Critical)",
"Reason: Simple, type-safe, sufficient for requirements",
"Alternative considered: Numeric priority with ordering"
]
}]
})
```

## Memory Cleanup Guidelines

- Delete branch-specific entities when branches are merged
- Archive old decisions (>30 days) if no longer relevant
- Keep PatternHistory and UserPreferences long-term
- ProjectContext should be updated, not duplicated
