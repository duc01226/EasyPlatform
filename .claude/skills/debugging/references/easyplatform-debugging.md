# EasyPlatform Debugging Reference

Platform-specific debugging patterns for the Easy.Platform .NET 9 + Angular 19 monorepo.

## Platform Error Patterns

### Backend (.NET/C#)

| Error Type                           | Source            | Investigation                                |
| ------------------------------------ | ----------------- | -------------------------------------------- |
| `PlatformValidationResult.Invalid()` | Validation layer  | Check `.And()` chain, find failing condition |
| `PlatformException`                  | Business logic    | Read exception message, trace to handler     |
| `EnsureFound()` failures             | Repository calls  | Verify entity exists, check query predicates |
| `EnsureValidAsync()` failures        | Entity validation | Check entity's `ValidateAsync()` method      |

### Frontend (Angular)

| Error Type                  | Source         | Investigation                        |
| --------------------------- | -------------- | ------------------------------------ |
| `observerLoadingErrorState` | API calls      | Check network tab, verify endpoint   |
| Signal update errors        | Store state    | Verify store initialization order    |
| Form validation             | Reactive forms | Check `initialFormConfig` validators |
| Missing `untilDestroyed()`  | Subscriptions  | Memory leak - add cleanup operator   |

## Common Bug Categories

### Backend

1. **Validation Failures**
    - Missing `.And()` in validation chain
    - Async validation not awaited
    - Wrong entity expression filter

2. **Repository Issues**
    - Using wrong repository type
    - Missing `loadRelatedEntities` parameter
    - N+1 query patterns

3. **Event Handler Problems**
    - Handler not registered
    - `HandleWhen` returning false
    - Missing `await` in async handler

4. **Message Bus**
    - Consumer not receiving messages
    - Serialization issues with message payload
    - Missing `TryWaitUntilAsync` for dependencies

### Frontend

1. **Component Lifecycle**
    - Missing `super.ngOnInit()` call
    - Store not provided in component
    - Missing `untilDestroyed()` cleanup

2. **State Management**
    - Stale VM state after navigation
    - Race conditions in `effectSimple`
    - Missing `observerLoadingErrorState` key

3. **Form Issues**
    - `initialFormConfig` not returning controls
    - Async validators not checking `isViewMode`
    - Missing `dependentValidations`

## Investigation Workflow

### Step 1: Identify Layer

```
Error location?
├── Controller → Check authorization, request binding
├── Command Handler → Check validation, business logic
├── Repository → Check query, entity state
├── Entity Event → Check HandleWhen, async operations
├── Message Consumer → Check message format, dependencies
├── Angular Component → Check store, subscriptions
├── Angular Service → Check API URL, request format
└── Angular Store → Check state updates, effects
```

### Step 2: Platform-Specific Checks

**Backend checklist:**

- [ ] Is the correct repository type used? (`IPlatformQueryableRootRepository`)
- [ ] Is validation using `PlatformValidationResult` fluent API?
- [ ] Are side effects in entity event handlers (not command handlers)?
- [ ] Is message bus used for cross-service communication?

**Frontend checklist:**

- [ ] Does component extend correct base class?
- [ ] Is store provided in component decorator?
- [ ] Are subscriptions cleaned up with `untilDestroyed()`?
- [ ] Is `observerLoadingErrorState` used for API calls?

### Step 3: Find Working Example

Search codebase for similar working patterns:

```bash
# Find similar command handlers
grep -r "PlatformCqrsCommandApplicationHandler" src/Backend/

# Find similar entity events
grep -r "PlatformCqrsEntityEventApplicationHandler" src/Backend/

# Find similar Angular components
grep -r "AppBaseVmStoreComponent" src/Frontend/
```

### Step 4: Compare Differences

Common differences causing bugs:

- Missing `await` keyword
- Wrong parameter order
- Missing base class method call
- Different constructor injection
- Missing decorator or attribute

## Verification Commands

```bash
# Backend build
dotnet build EasyPlatform.sln

# Backend tests
dotnet test src/Backend/PlatformExampleApp.TextSnippet.UnitTests/

# Frontend build
cd src/Frontend && nx build playground-text-snippet

# Frontend tests
cd src/Frontend && nx test platform-core
```

## Related Documentation

- [backend-patterns.md](../../../docs/claude/backend-patterns.md) - All 13 backend patterns
- [frontend-patterns.md](../../../docs/claude/frontend-patterns.md) - Angular/platform-core patterns
- [troubleshooting.md](../../../docs/claude/troubleshooting.md) - Investigation protocol
