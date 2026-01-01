---
agent: agent
description: Create comprehensive implementation plan for new features or complex tasks. Use before any significant implementation work.
---

# Implementation Planning

Create a detailed implementation plan for the given task.

## Task
$input

## Pre-Planning Checklist

Before creating a plan:
1. **Understand the request** - Parse requirements, identify scope
2. **Search for existing patterns** - Check if similar implementations exist
3. **Identify affected areas** - Services, components, entities, APIs
4. **Assess complexity** - Simple (1-2 files) vs Complex (multiple services)

## Planning Process

### Step 1: Requirements Analysis
- Parse the task description
- Identify functional and non-functional requirements
- List assumptions and constraints
- Define success criteria

### Step 2: Technical Research
- Search codebase for similar implementations
- Identify relevant platform patterns
- Check existing entities, DTOs, services
- Review related documentation in `docs/claude/`

### Step 3: Design Decisions

For Backend tasks:
- [ ] Entity/DTO design following `PlatformEntityDto` pattern
- [ ] Command/Query structure in `UseCaseCommands/` or `UseCaseQueries/`
- [ ] Validation using `PlatformValidationResult` fluent API
- [ ] Side effects via `UseCaseEvents/` (NOT in handlers)
- [ ] Cross-service communication via message bus

For Frontend tasks:
- [ ] Component hierarchy using `AppBaseComponent` or `AppBaseVmStoreComponent`
- [ ] State management with `PlatformVmStore`
- [ ] API service extending `PlatformApiService`
- [ ] Form handling with `AppBaseFormComponent`

### Step 4: Create Plan Document

Structure the plan as:

```markdown
## Executive Summary
[1-2 sentences describing the change]

## Requirements
- [Requirement 1]
- [Requirement 2]

## Technical Approach
[Describe the implementation strategy]

## Implementation Steps

### Phase 1: [Name]
- [ ] Task 1 - `path/to/file.cs`
- [ ] Task 2 - `path/to/file.ts`

### Phase 2: [Name]
- [ ] Task 1
- [ ] Task 2

## Files to Create/Modify
| File | Action | Purpose |
|------|--------|---------|
| `path/to/file` | Create/Modify | Description |

## Risk Assessment
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Risk 1 | High/Medium/Low | Strategy |

## Testing Strategy
- Unit tests for...
- Integration tests for...

## Questions/Decisions Needed
- [ ] Question 1?
```

## Principles

- **YAGNI** - You Aren't Gonna Need It
- **KISS** - Keep It Simple, Stupid
- **DRY** - Don't Repeat Yourself

## Output

Present the plan and **WAIT for explicit approval** before implementing.
