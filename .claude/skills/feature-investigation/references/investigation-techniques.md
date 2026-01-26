# Investigation Techniques

Search strategies, grep patterns, and dependency tracing for feature investigation.

---

## Discovery Search Patterns

### File Discovery by Feature Name

```
.*EventHandler.*{FeatureName}|{FeatureName}.*EventHandler
.*BackgroundJob.*{FeatureName}|{FeatureName}.*BackgroundJob
.*Consumer.*{FeatureName}|{FeatureName}.*Consumer
.*Service.*{FeatureName}|{FeatureName}.*Service
.*Component.*{FeatureName}|{FeatureName}.*Component
```

### Priority Order for Analysis

1. **Domain Entities** - Core business objects
2. **Commands/Queries** - CQRS entry points (`UseCaseCommands/`, `UseCaseQueries/`)
3. **Event Handlers** - Side effects (`UseCaseEvents/`, `*EventHandler.cs`)
4. **Controllers** - API endpoints (`Controllers/`, `*Controller.cs`)
5. **Consumers** - Cross-service (`*Consumer.cs`, `*BusMessage.cs`)
6. **Background Jobs** - Scheduled processing (`*BackgroundJob*.cs`, `*Job.cs`)
7. **Components/Stores** - Frontend (`*.component.ts`, `*.store.ts`)
8. **Services/Helpers** - Supporting logic (`*Service.cs`, `*Helper.cs`)

---

## Dependency Tracing

### Backend (C#)

| Looking for | Search pattern |
|---|---|
| Who calls this method | Grep method name across `*.cs` |
| Who injects this service | Grep interface name in constructors |
| What events this entity raises | Grep `PlatformCqrsEntityEvent<EntityName>` |
| Cross-service consumers | Grep `*BusMessage` type across all services |
| Repository usage | Grep `IRepository<EntityName>` or `IPlatformQueryableRootRepository<EntityName` |

### Frontend (TypeScript)

| Looking for | Search pattern |
|---|---|
| Who uses this component | Grep selector `app-component-name` in `*.html` |
| Who imports this service | Grep service class name in `*.ts` |
| Store effects chain | Trace `effectSimple` -> API call -> `tapResponse` -> state update |
| Route entry | Grep component name in `*routing*.ts` |

---

## Data Flow Mapping

Document flow as text diagram:

```
[Entry Point] --> [Step 1: Validation] --> [Step 2: Processing] --> [Step 3: Persistence]
                                                  |
                                                  v
                                          [Side Effect: Event]
```

### Flow Documentation Checklist

1. **Entry Points** - API endpoint, UI action, scheduled job, message bus
2. **Processing Pipeline** - Step-by-step through handlers
3. **Data Transformations** - How data changes at each step
4. **Persistence Points** - Where data is saved/loaded
5. **Exit Points** - Responses, events, side effects
6. **Cross-Service Flows** - Message bus boundaries

---

## Common Investigation Scenarios

### "How does feature X work?"

1. Find entry points (API, UI, job)
2. Trace through command/query handlers
3. Document entity changes
4. Map side effects (events, notifications)

### "Where is the logic for Y?"

1. Search keywords in commands, queries, entities
2. Check event handlers for side effect logic
3. Look in helper/service classes
4. Check frontend stores and components

### "What happens when Z occurs?"

1. Identify trigger (user action, event, schedule)
2. Trace the handler chain
3. Document all side effects
4. Map error handling

### "Why does A behave like B?"

1. Find the relevant code path
2. Identify decision points
3. Check configuration/feature flags
4. Document business rules

---

## Platform Pattern Recognition

### Backend Patterns

- `PlatformCqrsCommand` / `PlatformCqrsQuery` - CQRS entry points
- `PlatformCqrsEntityEventApplicationHandler` - Side effects
- `PlatformApplicationMessageBusConsumer` - Cross-service consumers
- `IPlatformQueryableRootRepository` - Data access
- `PlatformValidationResult` - Validation logic
- `[PlatformAuthorize]` - Authorization

### Frontend Patterns

- `AppBaseVmStoreComponent` - State management components
- `PlatformVmStore` - Store implementations
- `effectSimple` / `tapResponse` - Effect handling
- `observerLoadingErrorState` - Loading/error states
- API services extending `PlatformApiService`
