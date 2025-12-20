---
applyTo: "**"
description: "Instructions specific to GitHub Copilot Coding Agent for autonomous implementation"
forAgent: ["coding-agent"]
---

# Coding Agent Implementation Guidelines

## Pre-Implementation Checklist

Before writing any code:

1. **Search for existing implementations** - Use Grep/Glob to find similar patterns
2. **Identify correct layer** - Domain, Application, Persistence, or API
3. **Check for existing DTOs** - Reuse entity DTOs from `EntityDtos/` folder
4. **Verify repository pattern** - Use `IPlatformQueryableRootRepository<TEntity, TKey>`

## File Organization Rules

### Backend CQRS Commands

```
{Service}.Application/
└── UseCaseCommands/
    └── {Feature}/
        └── Save{Entity}Command.cs  <- Contains Command + Result + Handler
```

**CRITICAL:** Command + Handler + Result = ONE FILE (never separate files)

### Frontend Components

```
apps/{app}/src/app/
└── {feature}/
    ├── {feature}.component.ts      <- Extends AppBaseVmStoreComponent
    ├── {feature}.component.html
    └── {feature}.store.ts          <- Extends PlatformVmStore
```

## Implementation Patterns

### Backend Command Handler

```csharp
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    // 1. Get or create entity
    var entity = req.Id.IsNullOrEmpty()
        ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
        : await repository.GetByIdAsync(req.Id, ct)
            .EnsureFound($"Entity not found: {req.Id}")
            .Then(e => req.UpdateEntity(e));

    // 2. Validate entity
    await entity.ValidateAsync(repository, ct).EnsureValidAsync();

    // 3. Save
    var saved = await repository.CreateOrUpdateAsync(entity, ct);

    return new Result { Entity = new EntityDto(saved) };
}
```

### Frontend Store Pattern

```typescript
@Injectable()
export class FeatureStore extends PlatformVmStore<FeatureState> {
  public loadData = this.effectSimple(() =>
    this.api.getData().pipe(
      this.observerLoadingErrorState("loadData"),
      this.tapResponse((data) => this.updateState({ data })),
    ),
  );

  public readonly data$ = this.select((state) => state.data);
}
```

## Validation Requirements

**Backend:**

```csharp
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name is required")
        .And(_ => StartDate <= EndDate, "Invalid date range");
}
```

**Frontend:**

```typescript
new FormControl(
  "",
  [Validators.required, noWhitespaceValidator],
  [ifAsyncValidator((ctrl) => ctrl.valid, uniqueValidator)],
);
```

## Side Effects Rule

**NEVER call side effects in command handlers!**

Instead, let platform auto-raise entity events and handle in event handlers:

```csharp
// Location: UseCaseEvents/{Feature}/
internal sealed class SendNotificationOnCreateEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Entity>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> @event)
        => @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<Entity> @event, CancellationToken ct)
    {
        await notificationService.SendAsync(@event.EntityData);
    }
}
```

## Post-Implementation Verification

After implementing:

1. **Build check** - Ensure no compilation errors
2. **Pattern compliance** - Verify platform patterns are followed
3. **No anti-patterns** - Check against backend/frontend anti-patterns
4. **Clean code** - Single responsibility, proper naming, no duplication
