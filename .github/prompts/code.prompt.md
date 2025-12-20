---
description: "Code implementation workflow with planning and verification"
---

# Code Implementation Prompt

## Overview

Structured workflow for implementing code changes based on a defined plan or task. Emphasizes understanding before coding, following patterns, and verification.

## Workflow

### Step 0: Context Gathering

Before writing any code:

1. **Understand the requirement**
   - What is being asked?
   - What is the expected outcome?
   - What are the acceptance criteria?

2. **Explore existing patterns**
   - Search for similar implementations
   - Identify established patterns to follow
   - Find relevant base classes/utilities

3. **Identify scope**
   - Which files will be affected?
   - What dependencies exist?
   - What could break?

### Step 1: Design Approach

1. **Choose implementation strategy**
   - Follow existing patterns (preferred)
   - Extend existing functionality
   - Create new components (only when necessary)

2. **Plan file changes**
   ```markdown
   | File | Change Type | Description |
   |------|-------------|-------------|
   | X.cs | Modify | Add new method |
   | Y.ts | Create | New component |
   ```

3. **Identify risks**
   - Breaking changes?
   - Performance impact?
   - Security considerations?

### Step 2: Implementation

Follow these principles:

#### Backend (.NET)

- Use platform repositories and patterns
- Follow CQRS with Command + Result + Handler in one file
- Use `PlatformValidationResult` fluent API
- Place side effects in Entity Event Handlers
- DTOs own mapping via `MapToObject()`/`MapToEntity()`

#### Frontend (Angular)

- Extend appropriate base class (AppBaseComponent, AppBaseVmStoreComponent, etc.)
- Use `PlatformVmStore` for state management
- Extend `PlatformApiService` for HTTP calls
- Always use `.pipe(this.untilDestroyed())`
- All elements must have BEM classes

### Step 3: Code Quality

Ensure code follows standards:

| Aspect | Requirement |
|--------|-------------|
| Naming | PascalCase (C#), camelCase (TS) |
| Single Responsibility | One purpose per method/class |
| DRY | No duplication - search for existing |
| YAGNI | No speculative features |
| KISS | Simplest solution that works |

### Step 4: Testing

1. **Unit tests for new logic**
   - Test happy path
   - Test edge cases
   - Test error conditions

2. **Integration tests if needed**
   - API endpoint tests
   - Cross-component tests

3. **Manual verification**
   - Run the feature
   - Check expected behavior

### Step 5: Build Verification

```bash
# Backend
dotnet build
dotnet test

# Frontend
npm run build
npm run test
npm run lint
```

### Step 6: Review Checklist

Before considering complete:

- [ ] Code follows existing patterns
- [ ] No code duplication
- [ ] Tests added/updated
- [ ] Build passes
- [ ] Lint passes
- [ ] Manual verification done
- [ ] No security issues introduced

## Implementation Guidelines

### Code Responsibility Hierarchy

Place logic in the LOWEST appropriate layer:

```
Entity/Model (Lowest) → Service → Component/Handler (Highest)
```

| Layer | Contains |
|-------|----------|
| Entity/Model | Business logic, display helpers, factory methods |
| Service | API calls, command factories, data transformation |
| Component | UI event handling ONLY |

### Pattern Selection

```
Need backend feature?
├── API endpoint → PlatformBaseController + CQRS Command
├── Business logic → Command Handler in Application layer
├── Data access → Repository Extensions
├── Cross-service → Entity Event Consumer
├── Scheduled task → PlatformApplicationBackgroundJob
└── Migration → PlatformDataMigrationExecutor

Need frontend feature?
├── Simple component → PlatformComponent
├── Complex state → PlatformVmStoreComponent + Store
├── Forms → PlatformFormComponent
├── API calls → PlatformApiService
└── Reusable → platform-core library
```

## Output Format

```markdown
## Implementation Summary

### Files Changed
| File | Change | Description |
|------|--------|-------------|
| ... | ... | ... |

### Key Decisions
- [Why certain approach was chosen]

### Testing
- [Tests added/modified]
- [Manual verification steps]

### Build Status
- Build: ✅/❌
- Tests: ✅/❌
- Lint: ✅/❌
```

## Important

- Always search for existing patterns before creating new code
- Follow the platform framework conventions
- Keep changes minimal and focused
- Verify everything works before marking complete

**IMPORTANT:** Do not implement without understanding. Research existing patterns first.
