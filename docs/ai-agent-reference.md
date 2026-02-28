# AI Agent Quick Reference

> Guidelines for AI coding agents working with BravoSUITE

## Investigation Workflow

**ALWAYS follow this sequence:**

```
📋 Read Requirement
       ↓
🔍 Extract Domain Concepts
       ↓
🔎 Semantic Search for Context
       ↓
🔍 Grep Search for Patterns
       ↓
🕵️ Service Discovery via Endpoints
       ↓
📊 Evidence Assessment
       ↓
🏗️ Use Platform Patterns
       ↓
✅ Ready to Code
```

---

## Decision Trees

### Backend Feature Development

```
Need to add backend feature?
├── New API endpoint?      → PlatformBaseController + CQRS Command
├── Business logic?        → Command Handler in Application layer
├── Data access?           → Extend microservice-specific repository
├── Cross-service sync?    → Create Entity Event Consumer
├── Scheduled task?        → PlatformApplicationBackgroundJob
├── MongoDB migration?     → PlatformMongoMigrationExecutor
└── Data migration?        → PlatformDataMigrationExecutor
```

### Frontend Development

```
Need to add frontend feature?
├── Simple component?      → Extend AppBaseComponent
├── Complex state?         → AppBaseVmStoreComponent + PlatformVmStore
├── Forms?                 → Extend AppBaseFormComponent
├── API calls?             → Service extending PlatformApiService
├── Cross-domain logic?    → Add to bravo-domain shared
├── Domain-specific?       → Add to bravo-domain/{domain}/
└── Cross-app reusable?    → Add to bravo-common
```

### Repository Pattern Priority

**Always use microservice-specific repositories:**

1. `ICandidatePlatformRootRepository<T>` (bravoTALENTS)
2. `IGrowthRootRepository<T>` (bravoGROWTH)
3. `ISurveysPlatformRootRepository<T>` (bravoSURVEYS)
4. **Last resort:** Generic `IPlatformQueryableRootRepository<T, TKey>`

---

## Quick Code Templates

### Backend - Entity

```csharp
public class Employee : RootEntity<Employee, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string Name { get; set; } = "";

    [ComputedEntityProperty]
    public string FullName { get => $"{FirstName} {LastName}".Trim(); set { } }

    public static Expression<Func<Employee, bool>> OfCompanyExpr(string companyId)
        => e => e.CompanyId == companyId;
}
```

### Backend - CQRS Command

```csharp
public sealed class SaveEntityCommand : PlatformCqrsCommand<SaveEntityCommandResult>
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
        => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Name required");
}

internal sealed class SaveEntityCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveEntityCommand, SaveEntityCommandResult>
{
    protected override async Task<SaveEntityCommandResult> HandleAsync(
        SaveEntityCommand req, CancellationToken ct)
    {
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repository.GetByIdAsync(req.Id, ct).Then(e => req.UpdateEntity(e));

        await repository.CreateOrUpdateAsync(entity, ct);
        return new SaveEntityCommandResult { Entity = new EntityDto(entity) };
    }
}
```

### Backend - Entity Event Handler

```csharp
// Location: UseCaseEvents/[Feature]/
internal sealed class SendNotificationOnCreateEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Entity>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> @event)
        => @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<Entity> @event, CancellationToken ct)
        => await notificationService.SendAsync(@event.EntityData);
}
```

### Frontend - Store

```typescript
@Injectable()
export class EntityStore extends PlatformVmStore<EntityVm> {
    protected cachedStateKeyName = () => 'EntityStore';

    loadEntities = this.effectSimple(() =>
        this.api.getEntities().pipe(
            this.tapResponse(items => this.updateState({ items }))
        )
    );

    readonly items$ = this.select(state => state.items);
}
```

### Frontend - Component

```typescript
@Component({
    selector: 'app-entity-list',
    providers: [EntityStore]
})
export class EntityListComponent extends AppBaseVmStoreComponent<EntityVm, EntityStore> {
    constructor(store: EntityStore) {
        super(store);
    }

    ngOnInit() {
        this.store.loadEntities();
    }
}
```

### Frontend - Form

```typescript
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
    protected initialFormConfig = () => ({
        controls: {
            email: new FormControl(this.currentVm().email,
                [Validators.required, Validators.email],
                [ifAsyncValidator(() => !this.isViewMode, checkEmailUniqueValidator(...))]
            )
        },
        dependentValidations: { email: ['firstName'] }
    });

    onSubmit() {
        if (this.validateForm()) { /* process */ }
    }
}
```

---

## Common Mistakes to Avoid

| DON'T | DO |
|-------|-----|
| Direct cross-service DB access | Use Entity Event Bus |
| Custom repository interfaces | Extend platform repos with static methods |
| Manual validation logic | Use PlatformValidationResult fluent API |
| Direct HttpClient | Create services extending PlatformApiService |
| Side effects in command handler | Use Entity Event Handlers in UseCaseEvents/ |
| `throw new ValidationException()` | Use `.EnsureFound()` / `.EnsureValid()` |
| Manual signals for state | Use PlatformVmStore patterns |
| DTO mapping in handler | Use PlatformDto.MapToObject() |

---

## Success Factors

1. **Evidence-Based** - Verify patterns with grep/search before implementing
2. **Platform-First** - Use Easy.Platform patterns over custom solutions
3. **Service Boundaries** - Verify through code analysis, never assume
4. **Check Base Classes** - Use IntelliSense to verify available methods

## Workflow

```
Task → Investigate → Plan → Get Approval → Implement
```

## Key Rules

- Always use TodoWrite to track tasks
- Always plan before implementing non-trivial changes
- Always verify code exists before assuming removal is safe
- Declare confidence level when uncertain

---

**See also:** [CLAUDE.md](../CLAUDE.md) | [Backend Patterns](./claude/backend-patterns.md) | [Frontend Patterns](./claude/frontend-patterns.md)
