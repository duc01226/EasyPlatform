---
agent: 'agent'
description: 'Implement a new feature following EasyPlatform development workflow'
tools: ['read', 'edit', 'search', 'execute']
---

# Implement New Feature

Implement a new feature following the EasyPlatform development workflow.

## Feature
${input:feature}

## Workflow

### Phase 1: Understanding

1. **Parse Requirements**
   - Extract functional requirements
   - Identify non-functional requirements (performance, security)
   - Note constraints and dependencies

2. **Search Existing Patterns**
   - Look for similar features in codebase
   - Identify reusable components
   - Check platform patterns in `docs/claude/`

### Phase 2: Design

1. **Backend Design**
   - Entity structure (Domain layer)
   - Commands/Queries (Application layer)
   - Repository extensions if needed
   - Event handlers for side effects

2. **Frontend Design**
   - Component hierarchy
   - State management approach
   - API service methods
   - Form validation

### Phase 3: Implementation

**Backend First:**
1. Create/update Entity in `Domain/Entities/`
2. Create Command in `UseCaseCommands/{Feature}/`
3. Create Query in `UseCaseQueries/{Feature}/`
4. Add event handlers in `UseCaseEvents/` if needed
5. Create DTOs with mapping logic
6. Add controller endpoints

**Frontend Next:**
1. Create API service methods
2. Create store/state management
3. Create components (list, detail, form)
4. Add routing
5. Create unit tests

### Phase 4: Testing

1. **Backend Tests**
   - Command handler tests
   - Query handler tests
   - Validation tests

2. **Frontend Tests**
   - Component tests
   - Service tests
   - Store tests

### Phase 5: Review & Finalize

1. **Code Review Checklist**
   - [ ] Follows architecture layers
   - [ ] Uses platform patterns
   - [ ] Has proper validation
   - [ ] No security issues
   - [ ] Tests are comprehensive

2. **Documentation**
   - Update API documentation if needed
   - Add inline comments for complex logic

## Files to Create/Modify Template

| Layer | File Pattern | Purpose |
|-------|--------------|---------|
| Entity | `Domain/Entities/{Feature}.cs` | Business entity |
| Command | `UseCaseCommands/{Feature}/Save{Feature}Command.cs` | Create/Update |
| Query | `UseCaseQueries/{Feature}/Get{Feature}ListQuery.cs` | List retrieval |
| DTO | `Dtos/{Feature}Dto.cs` | Data transfer |
| API | `libs/apps-domains/src/lib/{feature}/{feature}-api.service.ts` | Frontend API |
| Component | `libs/apps-domains/src/lib/{feature}/{feature}-list.component.ts` | UI |

**IMPORTANT**: Wait for user approval at each major phase before proceeding.
