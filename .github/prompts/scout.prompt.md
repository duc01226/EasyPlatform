---
agent: agent
description: Quickly locate relevant files across the codebase with priority-based categorization and cross-service analysis. Fast, token-efficient file search.
---

# Scout Codebase

Search the codebase for files needed to complete the task with **priority-based categorization**.

## Search Request

$input

## Core Mission

Rapidly locate relevant files across the large EasyPlatform codebase using efficient search strategies, then present results in a **numbered, priority-categorized format**.

---

## PHASE 1: ANALYZE REQUEST

### Step 1: Parse Search Intent

Extract from search request:
- **Keywords**: Entity names, feature names, patterns
- **Intent**: CRUD, investigation, debugging, implementation
- **Scope**: Backend, Frontend, Cross-service, Full-stack

### Step 2: Generate Search Patterns

**HIGH PRIORITY (Always Search):**
```
# Domain Entities
**/Domain/Entities/**/*{keyword}*.cs
**/{Entity}.cs

# CQRS Commands & Queries
**/UseCaseCommands/**/*{keyword}*.cs
**/UseCaseQueries/**/*{keyword}*.cs
**/Save{Entity}Command.cs
**/Get{Entity}*Query.cs

# Event Handlers & Consumers
**/UseCaseEvents/**/*{keyword}*.cs
**/*{keyword}*EventHandler.cs
**/*{keyword}*Consumer.cs

# Controllers & Jobs
**/Controllers/**/*{keyword}*.cs
**/*{keyword}*BackgroundJob*.cs
```

**MEDIUM PRIORITY:**
```
# Services, Helpers, DTOs
**/*{keyword}*Service.cs
**/*{keyword}*Helper.cs
**/*{keyword}*Dto.cs

# Frontend
**/*{keyword}*.component.ts
**/*{keyword}*.store.ts
**/*{keyword}*-api.service.ts
```

**LOW PRIORITY:**
```
# Tests & Config
**/*{keyword}*.spec.ts
**/*{keyword}*Test*.cs
```

---

## PHASE 2: EXECUTE SEARCH

### Directory Prioritization

| Priority | Directories |
|----------|-------------|
| HIGH | `Domain/Entities/`, `UseCaseCommands/`, `UseCaseQueries/`, `UseCaseEvents/`, `Controllers/` |
| MEDIUM | `*Service.cs`, `*Helper.cs`, `libs/apps-domains/`, `*.component.ts` |
| LOW | `*Test*.cs`, `*.spec.ts`, `appsettings*.json` |

### Search Execution

1. **Glob** for file names matching patterns
2. **Grep** for content matching keywords
3. **Read** key files to understand purpose (if needed)

### Cross-Service Analysis (CRITICAL)

For `*Consumer.cs` files found:
1. Identify `*BusMessage` type consumed
2. Grep ALL services for files that **publish** this message
3. Document producer → consumer relationships

---

## PHASE 3: OUTPUT FORMAT

```markdown
## Scout Results: [Search Query]

### Summary
- **Total Files Found**: X
- **HIGH Priority**: X files
- **MEDIUM Priority**: X files
- **Coverage**: [areas searched]

---

### HIGH PRIORITY (Analyze First)

#### Domain Entities
| # | File | Purpose |
|---|------|---------|
| 1 | `path/Entity.cs` | Core domain entity |

#### Commands & Handlers
| # | File | Purpose |
|---|------|---------|
| 2 | `path/SaveEntityCommand.cs` | Create/Update logic |

#### Queries
| # | File | Purpose |
|---|------|---------|
| 3 | `path/GetEntityListQuery.cs` | List retrieval |

#### Event Handlers
| # | File | Purpose |
|---|------|---------|
| 4 | `path/EntityEventHandler.cs` | Side effect handling |

#### Consumers (Cross-Service)
| # | File | Message Type | Producer Service |
|---|------|--------------|------------------|
| 5 | `path/EntityConsumer.cs` | `EntityBusMessage` | [source service] |

#### Controllers
| # | File | Purpose |
|---|------|---------|
| 6 | `path/EntityController.cs` | API endpoints |

#### Background Jobs
| # | File | Purpose |
|---|------|---------|
| 7 | `path/EntityJob.cs` | Scheduled processing |

---

### MEDIUM PRIORITY

#### Services & Helpers
| # | File | Purpose |
|---|------|---------|
| 8 | `path/EntityService.cs` | Business logic |

#### Frontend Components
| # | File | Purpose |
|---|------|---------|
| 9 | `path/entity-list.component.ts` | UI component |

#### API Services
| # | File | Purpose |
|---|------|---------|
| 10 | `path/entity-api.service.ts` | HTTP client |

---

### Suggested Starting Points

1. **[File #X]** - [Why start here]
2. **[File #Y]** - [Why]
3. **[File #Z]** - [Why]

### Cross-Service Integration

| Source Service | Message | Target Service | Consumer |
|----------------|---------|----------------|----------|
| ServiceA | `EntityBusMessage` | ServiceB | `EntityConsumer.cs` |

### Unresolved Questions

- [Any gaps or uncertainties]
```

---

## OUTPUT: Handoff to Investigate

**When followed by `@workspace /investigate`:**

Your numbered file list becomes the analysis target. The Investigate prompt will:
1. **Use your HIGH PRIORITY files** as primary analysis targets
2. **Reference your file numbers** (e.g., "File #3 from Scout")
3. **Skip redundant discovery** - trusts your search results
4. **Follow your Suggested Starting Points** for analysis order

**Ensure your output includes:**
- ✅ Numbered files in priority tables
- ✅ Clear "Suggested Starting Points" section
- ✅ Cross-Service Integration table (for message bus flows)
- ✅ Purpose column explaining each file's role

---

## EasyPlatform Key Directories

### Backend
| Directory | Contains |
|-----------|----------|
| `src/PlatformExampleApp/*/Domain/Entities/` | Domain entities |
| `src/PlatformExampleApp/*/Application/UseCaseCommands/` | CQRS commands |
| `src/PlatformExampleApp/*/Application/UseCaseQueries/` | CQRS queries |
| `src/PlatformExampleApp/*/Application/UseCaseEvents/` | Entity event handlers |
| `src/PlatformExampleApp/*/Api/Controllers/` | API controllers |
| `src/Platform/Easy.Platform/` | Framework core |

### Frontend
| Directory | Contains |
|-----------|----------|
| `src/PlatformExampleAppWeb/apps/` | Angular applications |
| `src/PlatformExampleAppWeb/libs/platform-core/` | Frontend framework |
| `src/PlatformExampleAppWeb/libs/apps-domains/` | Business domain (APIs, models) |

---

## Quality Standards

| Metric | Target |
|--------|--------|
| Speed | < 3 minutes |
| Accuracy | Only directly relevant files |
| Coverage | All HIGH priority directories |
| Structure | Numbered, categorized output |
| Actionable | Clear starting points |

---

## Common Searches Quick Reference

| Looking for... | Search in... |
|----------------|--------------|
| Entity CRUD | `UseCaseCommands/`, `UseCaseQueries/` |
| Business logic | `Domain/Entities/`, `*Service.cs` |
| Side effects | `UseCaseEvents/`, `*EventHandler.cs` |
| Cross-service | `*Consumer.cs`, `*BusMessage.cs` |
| API endpoints | `Controllers/`, `*Controller.cs` |
| Frontend feature | `libs/apps-domains/`, `apps/` |
| Shared code | `libs/platform-core/`, `*.Shared/` |
| Platform patterns | `src/Platform/`, `libs/platform-core/` |
| Background processing | `*BackgroundJob*.cs`, `*Job.cs` |
