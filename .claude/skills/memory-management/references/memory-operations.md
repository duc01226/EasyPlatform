# MCP Memory Operations Reference

## Create Entity

```javascript
mcp__memory__create_entities([{
    name: 'EmployeeValidationPattern',
    entityType: 'Pattern',
    observations: [
        'Use PlatformValidationResult fluent API',
        'Chain with .And() and .AndAsync()',
        'Location: Growth.Application/UseCaseCommands/'
    ]
}]);
```

## Create Relationships

```javascript
mcp__memory__create_relations([
    { from: 'TextSnippetService', to: 'AccountsService', relationType: 'depends_on' },
    { from: 'EmployeeEntity', to: 'UserEntity', relationType: 'syncs_from' }
]);
```

## Add Observations

```javascript
mcp__memory__add_observations([{
    entityName: 'EmployeeValidationPattern',
    contents: ['Also supports .AndNot() for negative validation']
}]);
```

## Search & Retrieve

```javascript
mcp__memory__search_nodes({ query: 'validation pattern' });
mcp__memory__open_nodes({ names: ['EmployeeValidationPattern', 'TextSnippetService'] });
mcp__memory__read_graph();
```

## Delete Operations

```javascript
// Delete entities
mcp__memory__delete_entities({ entityNames: ['OutdatedPattern'] });

// Delete specific observations
mcp__memory__delete_observations([{
    entityName: 'EmployeeValidationPattern',
    observations: ['Outdated observation text']
}]);

// Delete relations
mcp__memory__delete_relations([
    { from: 'OldService', to: 'NewService', relationType: 'depends_on' }
]);
```

## Session Summary Template

```javascript
mcp__memory__create_entities([{
    name: `Session_${taskName}_${date}`,
    entityType: 'SessionSummary',
    observations: [
        `Task: ${taskDescription}`,
        `Completed: ${completedItems.join(', ')}`,
        `Remaining: ${remainingItems.join(', ')}`,
        `Key Files: ${keyFiles.join(', ')}`,
        `Discoveries: ${discoveries.join(', ')}`,
        `Next Steps: ${nextSteps.join(', ')}`
    ]
}]);
```

## Retrieval Patterns

### Session Start Protocol
```javascript
// 1. Search for related context
mcp__memory__search_nodes({ query: 'current feature keywords' });
// 2. Check for incomplete sessions
mcp__memory__search_nodes({ query: 'SessionSummary Remaining' });
```

### Before Implementation
```javascript
mcp__memory__search_nodes({ query: 'CQRS command pattern' });
mcp__memory__search_nodes({ query: 'AntiPattern command' });
```

### After Bug Fix
```javascript
mcp__memory__create_entities([{
    name: `BugFix_${bugName}`,
    entityType: 'BugFix',
    observations: [`Symptom: ...`, `Root Cause: ...`, `Solution: ...`, `Prevention: ...`]
}]);
```

## Maintenance

### Consolidation
When multiple observations cover same topic:
1. Read existing entity via `open_nodes`
2. Delete fragmented observations via `delete_observations`
3. Add consolidated observation via `add_observations`

### Cleanup
Find old session summaries (>30 days), delete with `delete_entities`.
