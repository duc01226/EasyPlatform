---
applyTo: "**"
description: "Quick reference card for common EasyPlatform patterns - one-liner lookups"
---

# Quick Reference Card

> One-liner patterns for rapid development. See detailed files for full examples.

---

## Backend File Patterns

```
Command:        {Service}.Application/UseCaseCommands/{Feature}/Save{Entity}Command.cs
Query:          {Service}.Application/UseCaseQueries/{Feature}/Get{Entity}ListQuery.cs
Entity Event:   {Service}.Application/UseCaseEvents/{Feature}/{Action}On{Event}{Entity}EntityEventHandler.cs
Consumer:       {Service}.Application/UseCaseEvents/{Feature}/UpsertOrDelete{Entity}On{Source}EntityEventBusConsumer.cs
Background Job: {Service}.Application/BackgroundJobs/{Feature}/{JobName}BackgroundJob.cs
Entity:         {Service}.Domain/Entities/{Entity}.cs
Repository Ext: {Service}.Domain/Repositories/{Entity}RepositoryExtensions.cs
DTO:            {Service}.Application/EntityDtos/{Entity}Dto.cs
```

---

## Frontend File Patterns

```
Component:      apps/{app}/src/app/features/{feature}/{feature}.component.ts
Store:          apps/{app}/src/app/features/{feature}/{feature}.store.ts
API Service:    libs/apps-domains/{domain}/src/lib/api-services/{entity}-api.service.ts
Form Component: apps/{app}/src/app/features/{feature}/{feature}-form.component.ts
```

---

## Command Patterns (One-File Rule)

```csharp
// ALL in ONE file: Command + Result + Handler
public sealed class SaveEntityCommand : PlatformCqrsCommand<SaveEntityCommandResult> { }
public sealed class SaveEntityCommandResult : PlatformCqrsCommandResult { }
internal sealed class SaveEntityCommandHandler : PlatformCqrsCommandApplicationHandler<...> { }
```

---

## Validation Patterns

```csharp
// Sync validation (fluent API)
.Validate(p => condition, "Error message")
.And(p => condition, "Error")
.AndNot(p => condition, "Error")
.Of<IPlatformCqrsRequest>()

// Async validation
.AndAsync(async p => await repo.AnyAsync(...), "Error")
.AndNotAsync(async p => await condition, "Error")

// Ensure patterns
await entity.EnsureFound("Not found");
await list.EnsureFoundAllBy(x => x.Id, ids);
validation.EnsureValid();
```

---

## Repository Patterns

```csharp
// Primary interface
IPlatformQueryableRootRepository<TEntity, string>

// Common operations
await repo.GetByIdAsync(id, ct);
await repo.GetByIdAsync(id, ct, e => e.Related);  // With eager loading
await repo.CreateOrUpdateAsync(entity, ct);
await repo.GetAllAsync(expr, ct);
await repo.FirstOrDefaultAsync(expr, ct);
await repo.AnyAsync(expr, ct);
await repo.CountAsync(expr, ct);

// Query builder (reusable)
var qb = repo.GetQueryBuilder((uow, q) => q.Where(...).OrderBy(...));
await repo.GetAllAsync((uow, q) => qb(uow, q).PageBy(skip, take), ct);
```

---

## Expression Patterns

```csharp
// Static expressions in entity
public static Expression<Func<Entity, bool>> IsActiveExpr() => e => e.IsActive;
public static Expression<Func<Entity, bool>> OfCompanyExpr(string id) => e => e.CompanyId == id;

// Composition
expr1.AndAlso(expr2)
expr1.OrElse(expr2)
expr.AndAlsoIf(condition, () => expr2)

// Usage
await repo.GetAllAsync(Entity.OfCompanyExpr(companyId).AndAlso(Entity.IsActiveExpr()), ct);
```

---

## Fluent Helpers

```csharp
// Mutation
entity.With(e => e.Name = "new")
entity.WithIf(condition, e => e.Status = Active)

// Transformation
await task.Then(result => transform(result))
await task.ThenAsync(async r => await processAsync(r))
await list.ThenSelect(e => e.Id)

// Parallel
var (a, b, c) = await (task1, task2, task3);
await items.ParallelAsync(async i => await process(i), maxConcurrent: 10);

// Conditional query
query.WhereIf(condition, expr)
query.PipeIf(condition, q => transform(q))
```

---

## Entity Event Handler Pattern

```csharp
// Naming: {Action}On{Event}{Entity}EntityEventHandler.cs
internal sealed class SendNotificationOnCreateEmployeeEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Employee>  // Single generic param
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Employee> @event)
        => @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

    protected override async Task HandleAsync(PlatformCqrsEntityEvent<Employee> @event, CancellationToken ct)
        => await service.NotifyAsync(@event.EntityData);
}
```

---

## Consumer Pattern

```csharp
// Naming: UpsertOrDelete{Entity}On{Source}EntityEventBusConsumer.cs
internal sealed class UpsertOrDeleteEmployeeOnEmployeeEntityEventBusConsumer
    : PlatformApplicationMessageBusConsumer<EmployeeEntityEventBusMessage>
{
    public override async Task HandleLogicAsync(EmployeeEntityEventBusMessage msg, string routingKey)
    {
        if (msg.Payload.CrudAction == Deleted) { await repo.DeleteAsync(msg.Payload.EntityData.Id); return; }
        // Upsert logic...
    }
}
```

---

## Angular Component Hierarchy

```
Simple UI          → AppBaseComponent
Complex state      → AppBaseVmStoreComponent<State, Store>
Form + validation  → AppBaseFormComponent<FormVm>
```

---

## Angular Store Pattern

```typescript
@Injectable()
export class EntityStore extends PlatformVmStore<EntityState> {
  public loadData = this.effectSimple(() =>
    this.api.getData().pipe(
      this.observerLoadingErrorState("loadData"),
      this.tapResponse((data) => this.updateState({ data })),
    ),
  );
  public readonly data$ = this.select((s) => s.data);
}
```

---

## Angular Form Pattern

```typescript
protected initialFormConfig = () => ({
  controls: {
    name: new FormControl(this.currentVm().name, [Validators.required]),
    email: new FormControl(this.currentVm().email, [Validators.email],
      [ifAsyncValidator(() => !this.isViewMode, uniqueEmailValidator)])
  },
  dependentValidations: { email: ['name'] }
});
```

---

## API Service Pattern

```typescript
@Injectable({ providedIn: "root" })
export class EntityApiService extends PlatformApiService {
  protected get apiUrl() {
    return environment.apiUrl + "/api/Entity";
  }
  getList(q?: Query) {
    return this.get<Entity[]>("", q);
  }
  save(cmd: SaveCmd) {
    return this.post<Result>("", cmd);
  }
}
```

---

## Key Utilities

```typescript
// Frontend
this.untilDestroyed(); // Auto-unsubscribe
this.observerLoadingErrorState("key"); // Track loading/error
this.isLoading$("key"); // Loading signal
(date_format(), list_groupBy(), string_isEmpty()); // Utils

// Backend
RequestContext.CurrentCompanyId(); // Current company
RequestContext.UserId(); // Current user
Clock.UtcNow; // Current time
PlatformJsonSerializer.Serialize(obj); // JSON serialize
```

---

## Quick Decision Guide

```
Need side effect after save?     → Entity Event Handler (NOT in command handler)
Cross-service data sync?         → Message Bus Consumer
Scheduled recurring task?        → Background Job with [PlatformRecurringJob]
Complex frontend state?          → PlatformVmStore
Form with validation?            → AppBaseFormComponent
```

---

## Anti-Pattern Quick Check

```
❌ Side effects in command handler    → ✅ Use entity event handler
❌ Direct cross-service DB access     → ✅ Use message bus
❌ Custom repository interface        → ✅ Use repository extensions
❌ HttpClient in Angular component    → ✅ Use PlatformApiService
❌ Manual signal state management     → ✅ Use PlatformVmStore
❌ Forgot untilDestroyed()            → ✅ Add .pipe(this.untilDestroyed())
❌ DTO mapping in handler             → ✅ Use dto.MapToEntity()
```
