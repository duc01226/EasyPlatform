---
applyTo: "**/*.cs,**/*.ts"
---

# Feature Investigation Protocol

> Auto-loads when editing code files. Use this workflow to understand existing features before implementing changes.

## Investigation Workflow

```
1. Domain Concepts    → Understand business terminology
2. Semantic Search    → Find by feature/domain names
3. Grep Search        → Find by code patterns
4. Service Discovery  → Identify which microservice owns it
5. Platform Patterns  → Understand which patterns are used
6. Implementation     → Read actual code logic
```

## EasyPlatform Service Map

| Service | Domain | Key Entities |
|---------|--------|-------------|
| **TextSnippet** | Example app | TextSnippetEntity, TextSnippetCategory |

## Search Strategy

### Step 1: Find Entry Points
```
Search for: Controller endpoints → [Entity]Controller.cs
Search for: Command/Query files → UseCaseCommands/[Feature]/*.cs
Search for: Frontend components → [feature]-*.component.ts
```

### Step 2: Trace the Stack
```
Backend:  Controller → Command → Handler → Entity → Repository → Events
Frontend: Component → Store → ApiService → Backend API
```

### Step 3: Cross-Service Communication
```
Search for: *EventBusMessageProducer → outgoing messages
Search for: *Consumer.cs → incoming messages
Search for: MessageBus*/ folder → all message definitions
```

## Key Directories

```
src/Services/{Service}.Application/
    UseCaseCommands/{Feature}/    # Commands + Handlers
    UseCaseQueries/{Feature}/     # Queries + Handlers
    UseCaseEvents/{Feature}/      # Event Handlers
    BackgroundJobs/               # Scheduled jobs
    MessageBus/                   # Cross-service consumers/producers

src/Services/{Service}.Domain/
    Entities/                     # Domain entities
    Repositories/                 # Repository extensions

src/WebV2/apps/{app}/src/app/
    pages/{feature}/              # Feature pages
    components/{feature}/         # Feature components

src/Frontend/libs/apps-domains/
    {domain}/                     # Shared API services, models
```

## Platform Pattern Recognition

| Pattern | Files to Check |
|---------|---------------|
| CQRS Command | `UseCaseCommands/{Feature}/{Verb}{Entity}Command.cs` |
| CQRS Query | `UseCaseQueries/{Feature}/Get{Entity}Query.cs` |
| Entity Events | `UseCaseEvents/{Feature}/{Action}On{Event}EventHandler.cs` |
| Message Bus | `MessageBus/{Entity}EventBusMessage*.cs` |
| Background Job | `BackgroundJobs/{JobName}BackgroundJob.cs` |
| Data Migration | `DataMigrations/{Timestamp}_{Description}.cs` |
| Store | `{feature}.store.ts` |
| API Service | `{domain}-api.service.ts` |

## Investigation Checklist

- [ ] Identified which microservice owns the feature?
- [ ] Found all related Command/Query handlers?
- [ ] Checked for Entity Event Handlers (side effects)?
- [ ] Found cross-service message bus producers/consumers?
- [ ] Identified frontend components and stores?
- [ ] Read existing tests for expected behavior?
- [ ] Checked for background jobs related to the feature?
