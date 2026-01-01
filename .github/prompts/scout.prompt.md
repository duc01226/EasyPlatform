---
agent: agent
description: Quickly locate relevant files across the codebase for a specific task. Fast, token-efficient file search.
---

# Scout Codebase

Search the codebase for files needed to complete the task.

## Search Request
$input

## Core Mission

Rapidly locate relevant files across the EasyPlatform codebase using efficient search strategies.

## Search Process

### Step 1: Analyze Request
- Understand what files the user needs
- Identify key directories that likely contain relevant files
- Consider project structure

### Step 2: Key Directories

**Backend:**
- `src/PlatformExampleApp/` - Example microservice (TextSnippet)
- `src/Platform/Easy.Platform/` - Framework core

**Frontend:**
- `src/PlatformExampleAppWeb/apps/` - Angular applications
- `src/PlatformExampleAppWeb/libs/platform-core/` - Frontend framework
- `src/PlatformExampleAppWeb/libs/apps-domains/` - Business domain (APIs, models)

### Step 3: Search Patterns

Use these patterns based on what you're looking for:

**Commands/Handlers:**
```
**/UseCaseCommands/**/*{keyword}*.cs
**/Save{Entity}Command.cs
```

**Queries:**
```
**/UseCaseQueries/**/*{keyword}*.cs
**/Get{Entity}*Query.cs
```

**Events:**
```
**/UseCaseEvents/**/*.cs
**/*EntityEventHandler.cs
```

**Entities:**
```
**/Domain/Entities/**/*.cs
**/{Entity}.cs
```

**Frontend Components:**
```
**/*{keyword}*.component.ts
**/*{keyword}*.store.ts
**/*{keyword}*.service.ts
```

**API Services:**
```
**/services/**/*api*.ts
**/*-api.service.ts
```

### Step 4: Execute Search

Use glob patterns for file names:
```
**/payment*.{cs,ts}
**/Employee*.cs
```

Use grep for content search:
```
class SaveEmployeeCommand
interface IEmployeeApiService
@Component.*employee
```

### Step 5: Synthesize Results

Present results organized by category:

```markdown
## Search Results: {query}

### Backend Files
**Commands:**
- `src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Application/UseCaseCommands/TextSnippet/SaveTextSnippetCommand.cs`

**Queries:**
- `src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Application/UseCaseQueries/TextSnippet/GetTextSnippetListQuery.cs`

**Entities:**
- `src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Domain/Entities/TextSnippetEntity.cs`

### Frontend Files
**Components:**
- `src/PlatformExampleAppWeb/libs/apps-domains/src/lib/text-snippet/text-snippet-list.component.ts`

**Services:**
- `src/PlatformExampleAppWeb/libs/apps-domains/src/lib/text-snippet/text-snippet-api.service.ts`

### Related Files
- [Additional relevant files]

### Suggested Starting Points
1. [Most relevant file] - [Why to start here]
2. [Second most relevant] - [Why]
```

## Quality Standards

- **Speed:** Complete searches quickly
- **Accuracy:** Return only files directly relevant
- **Coverage:** Search all likely directories
- **Efficiency:** Minimum tool calls needed
- **Clarity:** Organized, actionable results

## Common Searches

| Looking for... | Search in... |
|---------------|--------------|
| Entity CRUD | `UseCaseCommands/`, `UseCaseQueries/` |
| Business logic | `Domain/Entities/`, `*Service.cs` |
| API endpoints | `Controllers/`, `*Controller.cs` |
| Frontend feature | `libs/apps-domains/`, `apps/` |
| Shared code | `libs/platform-core/` |
| Platform patterns | `src/Platform/`, `libs/platform-core/` |
