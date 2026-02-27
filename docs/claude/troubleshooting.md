# Troubleshooting & Support

> Common issues and solutions for EasyPlatform development

## Investigation Protocol

### Core Principles

- **NEVER** assume based on first glance
- **ALWAYS** verify with multiple search patterns
- **CHECK** both static AND dynamic code usage
- **READ** actual implementation, not just interfaces
- **TRACE** full dependency chains
- **DECLARE** confidence level and uncertainties
- **REQUEST** user confirmation when confidence < 90%

### Quick Verification Checklist

Before removing/changing ANY code:

- [ ] Searched static imports?
- [ ] Searched string literals in code?
- [ ] Checked dynamic invocations (attr, prop, runtime)?
- [ ] Read actual implementations?
- [ ] Traced who depends on this?
- [ ] Assessed what breaks if removed?
- [ ] Documented evidence clearly?
- [ ] Declared confidence level?

**If ANY unchecked → DO MORE INVESTIGATION**
**If confidence < 90% → REQUEST USER CONFIRMATION**

### Investigation Steps

1. **Context Discovery**
    - Extract domain concepts from requirements
    - Do semantic search to find related entities and components
    - Do grep search to validate patterns and find evidence
    - List code usages to map complete ecosystems
    - Never assume - always verify with code evidence

2. **Service Boundary Verification**
    - Identify which microservice owns the domain concept
    - Verify service responsibilities through actual code analysis
    - Check for existing implementations before creating new ones

3. **Platform Pattern Recognition**
    - Check CLAUDE.md for pattern guidance
    - Use established platform patterns over custom solutions
    - Follow Easy.Platform framework conventions
    - Verify base class APIs before using component methods

### Filesystem Verification Protocol

**Before claiming any file doesn't exist:**

1. Run `glob pattern` or `ls path` to verify
2. Try multiple patterns if first fails (e.g., `todo-*.cjs`, `*-helpers.cjs`)
3. State confidence with evidence: "Verified via glob: X files found"

**Before claiming code is fixed:**

1. Re-read the specific lines mentioned in fix
2. Verify pattern matches expected fix
3. Run any available tests

> **Real Example:** Always verify file existence with `glob` before asserting a file doesn't exist. Example: `glob .claude/hooks/lib/todo-*.cjs` to check for todo-related hook modules.

### Concurrency Verification Protocol

**Detect race conditions in read-modify-write patterns:**

```bash
# Find functions that load AND save without lock
grep -l "load.*\|save" *.cjs | xargs grep -L "withLock"

# Find read-modify-write patterns
grep -B5 -A5 "loadState\|saveState\|writeFileSync" *.cjs
```

**Fix Pattern:**

```javascript
function modifySharedState(input) {
    return withLock(() => {
        const data = loadData();
        // modify data
        saveData(data);
    });
}
```

## Common Issues & Solutions

| Issue                          | Solution                                                               |
| ------------------------------ | ---------------------------------------------------------------------- |
| **Build failures**             | Check platform package versions and run `dotnet restore`               |
| **Missing repositories**       | Search for `IPlatformQueryableRootRepository` in Domain project        |
| **Component not found**        | Verify inheritance chain and check available base class methods        |
| **API calls failing**          | Verify service is running and check endpoint routes                    |
| **Database connection issues** | Ensure infrastructure is started with docker-compose                   |
| **Entity event not firing**    | Verify event handler is in `UseCaseEvents/` folder with correct naming |
| **Validation not working**     | Check if using `PlatformValidationResult` fluent API correctly         |
| **Store not updating UI**      | Ensure using signals and proper change detection                       |
| **FormArray not validating**   | Check `dependentValidations` configuration                             |

## Build & Compilation Errors

### .NET Build Failures

```bash
# Clean and restore
dotnet clean EasyPlatform.sln
dotnet restore EasyPlatform.sln

# Rebuild
dotnet build EasyPlatform.sln
```

### Angular Build Failures

```bash
# Clear cache and reinstall
cd src/Frontend
rm -rf node_modules
npm cache clean --force
npm install

# Rebuild
nx build playground-text-snippet
```

### Missing Dependencies

```bash
# Check Easy.Platform versions
dotnet list package | grep Easy.Platform

# Update platform packages
dotnet add package Easy.Platform --version <latest>
```

## Runtime Errors

### Repository Not Found

```csharp
// Error: Cannot resolve IPlatformQueryableRootRepository<Entity, string>

// Solution: Check registration in DI container
// Ensure entity is registered in DbContext
public class TextSnippetDbContext : PlatformDbContext
{
    public DbSet<Entity> Entities { get; set; }  // Add this
}
```

### Entity Event Handler Not Called

**Causal Reasoning Tree:**

```
Symptom: Entity event handler not firing
├─ Event not raised by entity?
│  ├─ Check: Does the entity method call AddDomainEvent() or use [TrackFieldUpdatedDomainEvent]?
│  │  └─ WHY: Events must be explicitly raised; framework does NOT auto-detect state changes.
│  │     The repository dispatches events only if they exist in the entity's DomainEvents collection.
│  └─ Check: Is the operation going through the Platform repository (not raw DbContext)?
│     └─ WHY: Only PlatformRepository.CreateAsync/UpdateAsync triggers event dispatch.
│        Direct DbContext.SaveChanges() bypasses the event pipeline entirely.
├─ Handler not registered in DI?
│  ├─ Check: Is the handler class in UseCaseEvents/ folder with correct namespace?
│  │  └─ WHY: The module scanner auto-registers handlers by convention. Wrong folder/namespace = not found.
│  └─ Check: Does the handler inherit PlatformCqrsEntityEventApplicationHandler<Entity>?
│     └─ WHY: DI registration scans for this base type. Wrong base class = silent no-op.
├─ HandleWhen() returning false?
│  ├─ Check: Is HandleWhen() public override async Task<bool> (NOT protected bool)?
│  │  └─ WHY: Wrong signature creates a new method instead of overriding, so base returns false.
│  └─ Check: Does the filter logic match the event type (Created, Updated, Deleted)?
│     └─ WHY: HandleWhen() filters which events this handler processes. Mismatched filter = skipped.
└─ Handler throwing silently?
   ├─ Check: Is there a try/catch in HandleAsync() swallowing exceptions?
   │  └─ WHY: Base handler catches exceptions to prevent message bus poisoning.
   │     Check logs for suppressed exceptions.
   └─ Check: Are async operations properly awaited?
      └─ WHY: Fire-and-forget async calls lose exceptions and may complete after handler returns.
```

**Checklist (quick reference):**

```csharp
// 1. Handler in UseCaseEvents/ folder (NOT DomainEventHandlers/)
// 2. Correct naming: [Action]On[Event][Entity]EntityEventHandler
// 3. Single generic parameter: PlatformCqrsEntityEventApplicationHandler<Entity>
// 4. HandleWhen() is public override async Task<bool> (NOT protected bool)
// 5. Check filter logic in HandleWhen()
```

### Message Bus Consumer Not Processing

**Causal Reasoning Tree:**

```
Symptom: Message bus consumer not processing messages
├─ Message never published?
│  ├─ Check: Is the entity event bus message producer registered for this entity?
│  │  └─ WHY: Only entities with PlatformCqrsEntityEventBusMessageProducer configured
│  │     publish events to the bus. Missing producer = events stay local only.
│  └─ Check: Is RabbitMQ running? (localhost:15672 management UI)
│     └─ WHY: If broker is down, messages queue in memory and may be lost on app restart.
│        docker ps | grep rabbit to verify container status.
├─ Message published but consumer not receiving?
│  ├─ Check: Does the consumer's queue binding match the routing key?
│  │  └─ WHY: RabbitMQ routes by exchange+routing key. Mismatched binding = message
│  │     goes to dead letter or is discarded. Check RabbitMQ management UI for bindings.
│  └─ Check: Is the consumer registered in the DI container / module?
│     └─ WHY: Consumer discovery is DI-based. Unregistered consumer = no subscription created.
├─ Consumer receiving but HandleWhen() filtering out?
│  ├─ Check: Does HandleWhen() return true for this specific message type/content?
│  │  └─ WHY: HandleWhen() is the gatekeeper. If it returns false, HandleAsync() never runs.
│  │     Add temporary logging in HandleWhen() to verify.
│  └─ Check: Is LastMessageSyncDate causing race condition filtering?
│     └─ WHY: Consumers may skip messages with timestamps older than last processed.
│        Clock skew between services or out-of-order delivery can trigger this.
└─ Consumer processing but failing silently?
   ├─ Check: Is HandleAsync() throwing an unlogged exception?
   │  └─ WHY: Base consumer catches exceptions for retry/dead-letter. Check application logs.
   └─ Check: Is TryWaitUntilAsync() timing out on a dependency?
      └─ WHY: Consumer may be waiting for a prerequisite that never arrives,
         causing silent timeout and message requeue in an infinite loop.
```

**Checklist (quick reference):**

```csharp
// 1. Consumer registered in DI
// 2. HandleWhen() returns true for the message
// 3. RabbitMQ is running (check localhost:15672)
// 4. Check message routing key matches
// 5. LastMessageSyncDate handling for race conditions
```

## Frontend Issues

### Component State Not Updating

**Causal Reasoning Tree:**

```
Symptom: UI not reflecting state changes
├─ Store state not being updated?
│  ├─ Check: Is updateState() being called with the new value?
│  │  └─ WHY: PlatformVmStore is immutable-update based. Mutating state directly
│  │     does not trigger change detection. Must use updateState().
│  └─ Check: Is the effect/API call completing successfully?
│     └─ WHY: If the observable errors without tapResponse, the stream dies silently.
│        Always use observerLoadingErrorState() + tapResponse() to catch errors.
├─ Store updated but component not receiving?
│  ├─ Check: Is the component using vm$ signal (not reading state directly)?
│  │  └─ WHY: Direct state reads are point-in-time snapshots. vm$ is a reactive signal
│  │     that triggers Angular change detection on updates.
│  └─ Check: Is the subscription piped through untilDestroyed()?
│     └─ WHY: Missing untilDestroyed() does not prevent updates, but if a previous
│        component instance leaked subscriptions, it may consume events meant for
│        the current instance (especially with shared stores).
├─ Component receiving but template not rendering?
│  ├─ Check: Is the component using OnPush change detection?
│  │  └─ WHY: OnPush only re-renders on @Input changes or signal updates.
│  │     Manual state changes require cdr.detectChanges() or markForCheck().
│  └─ Check: Is the template binding correct (e.g., vm().items vs vm.items)?
│     └─ WHY: Signals require function call syntax in templates. Missing () = stale value.
└─ Rendering but wrong data?
   └─ Check: Is the select() selector returning the correct slice of state?
      └─ WHY: Selectors with stale closures or wrong property paths return undefined/old data.
```

**Quick fixes:**

```typescript
// Fix 1: Ensure using signals
public vm = this.store.vm$;  // Not just this.store.state

// Fix 2: Force change detection if needed
this.cdr.detectChanges();

// Fix 3: Verify subscription lifecycle
.pipe(this.untilDestroyed()).subscribe();
```

### Form Validation Not Working

```typescript
// Problem: Async validators not running

// Solution: Use ifAsyncValidator
new FormControl('', [], [
  ifAsyncValidator(() => this.form.valid, asyncValidator)  // Runs only if sync valid
]);

// Problem: Dependent validation not triggering
// Solution: Configure dependentValidations
protected initialFormConfig = () => ({
  controls: { ... },
  dependentValidations: { email: ['firstName'] }  // email revalidates when firstName changes
});
```

### API Service Errors

```typescript
// Problem: Requests failing silently

// Solution: Use proper error handling
this.api
    .getData()
    .pipe(
        this.observerLoadingErrorState('loadData'), // Tracks loading/error state
        this.tapResponse(
            data => this.handleSuccess(data),
            error => this.handleError(error) // Handle errors explicitly
        )
    )
    .subscribe();
```

## Database Issues

### Connection Failures

```bash
# Verify infrastructure is running
docker ps | grep sql
docker ps | grep mongo
docker ps | grep postgres

# Start infrastructure
docker-compose -f src/platform-example-app.docker-compose.yml up -d
```

### Migration Errors

```bash
# EF Core migrations
dotnet ef migrations add NewMigration
dotnet ef database update

# Check pending migrations
dotnet ef migrations list
```

## Performance Issues

### Slow Queries

```csharp
// Problem: N+1 queries

// Solution: Use eager loading
await repository.GetByIdAsync(id, ct,
    loadRelatedEntities: e => e.Company, e => e.Departments);

// Solution: Use projection
await repository.FirstOrDefaultAsync(
    query => query.Where(...).Select(e => new { e.Id, e.Name }), ct);
```

### Memory Issues

```csharp
// Problem: Large data sets

// Solution: Use paging
var queryBuilder = repository.GetQueryBuilder((uow, q) =>
    q.Where(...).OrderBy(e => e.Id).PageBy(skip, take));

// Solution: Use streaming for exports
await foreach (var entity in repository.AsAsyncEnumerable(expr))
{
    yield return entity;
}
```

## Getting Help

1. **Study Platform Example:** `src/PlatformExampleApp` for working patterns
2. **Search Documentation:**
    - Use grep/semantic search tools
    - Check `.ai/docs/prompt-context.md` for solution planning
3. **Check Existing Implementations:**
    - Look for similar features in the codebase
    - Search for patterns in existing handlers/components
4. **Follow Training Materials:**
    - See README.md learning paths section
    - Check ../architecture-overview.md for architecture details

## Debugging Protocol

When debugging issues, follow the [AI Debugging Protocol](.ai/docs/AI-DEBUGGING-PROTOCOL.md):

1. **Never assume** based on first glance
2. **Verify with multiple search patterns**
3. **Check both static AND dynamic code usage**
4. **Read actual implementations**, not just interfaces
5. **Trace full dependency chains**
6. **Declare confidence level** and uncertainties
7. **Request user confirmation** when confidence < 90%

## Quality Checklist

Before considering a task complete:

- [ ] Follows Clean Architecture layers correctly
- [ ] Uses platform validation patterns
- [ ] Implements proper error handling
- [ ] Uses platform repositories correctly
- [ ] Includes unit tests for business logic
- [ ] No direct cross-service dependencies
- [ ] Uses message bus for cross-service communication
- [ ] Proper authorization checks
- [ ] Input validation implemented
