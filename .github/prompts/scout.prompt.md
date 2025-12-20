---
description: "Fast codebase exploration to find relevant files"
---

# Scout Prompt

## Overview

Quickly search the codebase to find files and code relevant to a specific task. Designed for fast, token-efficient exploration.

## Purpose

When you need to:
- Find files related to a feature
- Locate implementations of a pattern
- Understand where code lives
- Gather context for a task

## Workflow

### Step 1: Understand the Goal

What are we looking for?

| Goal Type | Search Strategy |
|-----------|-----------------|
| Feature code | Search by domain terms |
| Pattern usage | Search for base class/interface |
| API endpoints | Search controllers, routes |
| Data models | Search entities, DTOs |
| Configuration | Search appsettings, env files |
| Tests | Search *Tests.cs, *.spec.ts |

### Step 2: Search Strategy

Use multiple search approaches in parallel:

#### File Pattern Search
```
# Find by file name pattern
*.Entity.cs - Domain entities
*Controller.cs - API controllers
*Command*.cs - CQRS commands
*Query*.cs - CQRS queries
*.component.ts - Angular components
*.service.ts - Angular services
*.store.ts - State stores
```

#### Content Search
```
# Search for specific terms
ClassName - Find class definition
MethodName - Find method usage
InterfaceName - Find implementations
```

#### Directory Focus
```
# Backend
src/PlatformExampleApp/ - Example app
src/Platform/ - Framework code

# Frontend
src/PlatformExampleAppWeb/apps/ - Applications
src/PlatformExampleAppWeb/libs/ - Libraries
```

### Step 3: Parallel Exploration

Divide search into parallel tasks:

```markdown
## Search Tasks

### Task 1: Domain/Entity Layer
- Search: src/**/Domain/**/*.cs
- Look for: Entity definitions, domain events

### Task 2: Application Layer
- Search: src/**/Application/**/*.cs
- Look for: Commands, queries, handlers

### Task 3: API Layer
- Search: src/**/*Controller.cs
- Look for: Endpoints, routes

### Task 4: Frontend
- Search: src/**/*.component.ts
- Look for: UI components, templates
```

### Step 4: Report Findings

Compile results concisely:

```markdown
## Scout Report

### Relevant Files Found

| File | Purpose | Relevance |
|------|---------|-----------|
| path/to/file.cs | Entity definition | High |
| path/to/other.ts | Component | Medium |

### Key Patterns Identified
- Pattern 1: How X is implemented
- Pattern 2: Where Y is used

### Recommended Entry Points
1. Start with: [file]
2. Then explore: [related file]

### Unresolved Questions
- Could not find: [what was missing]
- Need clarification: [what's unclear]
```

## Search Tips

### Backend (.NET)

| Looking For | Search Pattern |
|-------------|----------------|
| Entity | `*Entity.cs`, `class * : RootEntity` |
| Command | `*Command.cs`, `: PlatformCqrsCommand` |
| Query | `*Query.cs`, `: PlatformCqrsQuery` |
| Handler | `*Handler.cs`, `ApplicationHandler` |
| Repository | `Repository`, `GetAllAsync` |
| Event | `*Event*.cs`, `EntityEvent` |
| Job | `*Job*.cs`, `BackgroundJob` |
| Migration | `*Migration*.cs` |

### Frontend (Angular)

| Looking For | Search Pattern |
|-------------|----------------|
| Component | `*.component.ts` |
| Store | `*.store.ts`, `PlatformVmStore` |
| Service | `*.service.ts`, `PlatformApiService` |
| Model | `*.model.ts`, `*.dto.ts` |
| Form | `FormComponent`, `FormGroup` |

### Cross-Cutting

| Looking For | Search Pattern |
|-------------|----------------|
| Configuration | `appsettings*.json`, `environment.ts` |
| Tests | `*Tests.cs`, `*.spec.ts` |
| Constants | `*Constants*`, `*Enum*` |
| Shared | `Shared`, `Common` |

## Output Guidelines

- **Be concise** - Sacrifice grammar for brevity
- **Prioritize** - High relevance first
- **Link files** - Include full paths
- **Note gaps** - List what wasn't found
- **Suggest next** - Recommend where to look next

## Example Report

```markdown
## Scout: User Authentication

### Files Found (8)

**High Relevance**
- `src/Domain/User/UserEntity.cs` - User entity
- `src/Application/Auth/LoginCommand.cs` - Login logic
- `src/Api/AuthController.cs` - Auth endpoints

**Medium Relevance**
- `src/Application/Auth/TokenService.cs` - Token handling
- `libs/auth/auth.service.ts` - Frontend auth

**Related**
- `src/Domain/User/UserRole.cs` - Roles enum
- `libs/auth/auth.guard.ts` - Route protection

### Patterns
- Uses JWT tokens
- Roles stored in claims
- Frontend uses interceptor

### Unresolved
- Password reset flow not found
- MFA implementation unclear
```

## Important

- Focus on finding, not implementing
- Use parallel searches for speed
- Report concisely
- Note what's missing or unclear

**IMPORTANT:** This is a discovery tool. Quick exploration, not deep analysis.
