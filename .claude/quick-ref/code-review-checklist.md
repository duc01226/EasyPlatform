# Code Review Quick Checklist

> One-page reference for consistent code reviews

## Architecture Compliance

```
[ ] Follows Clean Architecture layers?
[ ] Uses platform base classes (not custom)?
[ ] Repository pattern for data access?
[ ] No direct cross-service DB access?
[ ] Message bus for cross-service communication?
```

---

## Backend Checklist

### Commands/Queries

```
[ ] Command + Handler + Result in ONE file?
[ ] Uses PlatformValidationResult fluent API?
[ ] No side effects in handlers (use event handlers)?
[ ] Proper async/await patterns?
[ ] Uses microservice-specific repository?
```

### Entities

```
[ ] Extends correct base (RootEntity/RootAuditedEntity)?
[ ] Static expressions for queries?
[ ] [TrackFieldUpdatedDomainEvent] on tracked fields?
[ ] [ComputedEntityProperty] has empty set { }?
[ ] Validation methods return PlatformValidationResult?
```

### DTOs

```
[ ] Extends PlatformEntityDto<TEntity, TKey>?
[ ] Constructor maps core properties?
[ ] With* fluent methods for optional loading?
[ ] Overrides GetSubmittedId(), MapToEntity()?
[ ] DTO owns mapping responsibility (not handler)?
```

---

## Frontend Checklist

### Components

```
[ ] Extends AppBase* (not Platform* directly)?
[ ] Uses store for complex state?
[ ] untilDestroyed() on all subscriptions?
[ ] trackByItem for @for loops?
[ ] No inline styles (use SCSS)?
```

### Forms

```
[ ] Extends AppBaseFormComponent?
[ ] initialFormConfig() properly defined?
[ ] Async validators wrapped with ifAsyncValidator?
[ ] dependentValidations configured?
[ ] Uses validateForm() before submit?
```

### State Management

```
[ ] Store extends PlatformVmStore?
[ ] effectSimple() for API calls?
[ ] observerLoadingErrorState() for tracking?
[ ] tapResponse() for side effects?
[ ] Selectors use this.select()?
```

---

## Security Review

```
[ ] [PlatformAuthorize] on protected endpoints?
[ ] Input validation at entry points?
[ ] No secrets in code or logs?
[ ] SQL/NoSQL injection prevention?
[ ] XSS protection in frontend?
```

---

## Performance Review

```
[ ] No N+1 query patterns?
[ ] No O(n²) nested loops on large datasets?
[ ] Pagination for large datasets (never GetAll without paging)?
[ ] Project only needed properties in query (not GetAll then Select)?
[ ] Parallel queries where possible?
[ ] Proper indexing suggested?
[ ] No unnecessary eager loading?
```

### Performance Anti-Patterns

```csharp
// ❌ BAD: O(n²) - nested loop
foreach (var user in users)
    foreach (var order in orders)
        if (order.UserId == user.Id) { }

// ❌ BAD: GetAll then Select one property
var ids = repo.GetAllAsync().Select(x => x.Id).ToList();

// ❌ BAD: No pagination
var allUsers = await repo.GetAllAsync(x => x.IsActive);
```

```csharp
// ✅ GOOD: Use dictionary for O(n)
var ordersByUser = orders.ToLookup(o => o.UserId);
foreach (var user in users)
    var userOrders = ordersByUser[user.Id];

// ✅ GOOD: Project in query
var ids = await repo.GetAllAsync(q => q.Select(x => x.Id));

// ✅ GOOD: Always paginate
var users = await repo.GetAllAsync(q => q.Where(x => x.IsActive).PageBy(skip, take));
```

---

## Code Quality

```
[ ] No magic numbers - use named constants?
[ ] No hardcoded strings for config values?
[ ] Consistent abstraction levels?
[ ] Single responsibility per method?
```

---

## Naming Best Practices

```
[ ] Names reveal intent? (what, not how)
[ ] Booleans use is/has/can/should prefix?
[ ] Collections use plural form?
[ ] Methods describe action (verb + noun)?
[ ] No abbreviations except common ones (Id, Url, Api)?
[ ] Consistent naming across codebase?
```

### Convention Quick Reference

| Type | C# | TypeScript |
|------|----|----|
| Class/Interface | `UserService`, `IRepository` | `UserService`, `IRepository` |
| Method | `GetUserById` | `getUserById` |
| Variable | `userName` | `userName` |
| Constant | `MaxRetryCount` | `MAX_RETRY_COUNT` |
| Boolean | `isActive`, `hasPermission` | `isActive`, `hasPermission` |

---

## Anti-Patterns to Flag

| Pattern                     | Instead Do                        |
| --------------------------- | --------------------------------- |
| Direct HttpClient           | Use PlatformApiService            |
| Custom repository interface | Use service-specific + extensions |
| Side effects in handler     | Use entity event handlers         |
| Manual state management     | Use PlatformVmStore               |
| DTO mapping in handler      | Let DTO own mapping               |
| Magic numbers (e.g., `if (status == 3)`) | Use named constants or enums |
| Hardcoded config values     | Use constants or configuration    |
| Vague names (`data`, `temp`, `val`) | Descriptive names (`userData`, `cachedValue`) |
| Abbreviations (`usr`, `mgr`, `cnt`) | Full words (`user`, `manager`, `count`) |

---

## Approval Criteria

**Approve** if:

- All critical items checked
- No security issues
- Follows platform patterns

**Request Changes** if:

- Architecture violations
- Security vulnerabilities
- Missing validation
- Anti-patterns present
