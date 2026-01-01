---
agent: 'agent'
description: 'Refactor code following EasyPlatform patterns and Clean Code principles'
tools: ['read', 'edit', 'search', 'execute']
---

# Refactor Code

## Required Reading

**Before implementing, you MUST read the appropriate guide:**

- **Backend (C#):** `docs/claude/backend-csharp-complete-guide.md`
- **Frontend (TS):** `docs/claude/frontend-typescript-complete-guide.md`
- **SCSS/CSS:** `docs/claude/scss-styling-guide.md`

---

Refactor the following code to follow EasyPlatform patterns:

**Target:** ${input:target}
**Refactor Type:** ${input:type:Extract Method,Extract Class,Apply Pattern,Simplify,Performance,Remove Duplication}

## Refactoring Workflow

### Step 1: Analysis
1. Read the target code thoroughly
2. Identify current patterns and anti-patterns
3. Search for similar implementations in codebase
4. Document what needs to change

### Step 2: Plan
1. List specific changes needed
2. Identify dependencies and impact
3. Ensure no breaking changes
4. Plan test verification

### Step 3: Execute
1. Make incremental changes
2. Maintain existing functionality
3. Follow platform patterns
4. Update related code if needed

---

## Common Refactoring Patterns

### Extract to Static Expression (Entity)
```csharp
// Before: Logic in handler
.Where(e => e.CompanyId == companyId && e.Status == Status.Active)

// After: Static expression in entity
public static Expression<Func<Entity, bool>> ActiveInCompanyExpr(string companyId)
    => e => e.CompanyId == companyId && e.Status == Status.Active;

// Usage
.Where(Entity.ActiveInCompanyExpr(companyId))
```

### Extract to Repository Extension
```csharp
// Before: Repeated query logic in handlers
var entity = await repository.FirstOrDefaultAsync(
    e => e.CompanyId == companyId && e.Email == email, ct);

// After: Repository extension method
public static async Task<Entity> GetByEmailAsync(
    this IServiceRepository<Entity> repo, string companyId, string email, CancellationToken ct)
    => await repo.FirstOrDefaultAsync(Entity.ByEmailExpr(companyId, email), ct);
```

### Apply GetQueryBuilder Pattern
```csharp
// Before: Duplicate query logic
var count = await repository.CountAsync(q => q.Where(filter).Where(search));
var items = await repository.GetAllAsync(q => q.Where(filter).Where(search).PageBy(skip, take));

// After: Reusable query builder
var queryBuilder = repository.GetQueryBuilder((uow, q) => q
    .Where(filter)
    .PipeIf(searchText.IsNotNullOrEmpty(), q => searchService.Search(q, searchText, Entity.SearchColumns())));

var (count, items) = await (
    repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q).PageBy(skip, take), ct)
);
```

### Move DTO Mapping to DTO Class
```csharp
// Before: Mapping in handler
var config = new AuthConfig { ClientId = dto.ClientId, Secret = dto.Secret };

// After: DTO owns mapping
public class AuthConfigDto : PlatformDto<AuthConfig>
{
    public override AuthConfig MapToObject() => new AuthConfig
    {
        ClientId = ClientId,
        Secret = Secret
    };
}

// Handler uses
var config = dto.MapToObject().With(c => c.Secret = encrypt(c.Secret));
```

### Extract Side Effects to Event Handler
```csharp
// Before: Side effect in command handler
await repository.CreateAsync(entity, ct);
await notificationService.SendAsync(entity); // Wrong!

// After: Event handler
internal sealed class SendNotificationOnCreateEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Entity>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> @event)
        => @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

    protected override async Task HandleAsync(PlatformCqrsEntityEvent<Entity> @event, CancellationToken ct)
        => await notificationService.SendAsync(@event.EntityData);
}
```

---

## Refactoring Checklist

- [ ] No functionality changed
- [ ] All tests still pass
- [ ] Code follows platform patterns
- [ ] No new code duplication
- [ ] Proper naming conventions
- [ ] Dependencies flow correctly
