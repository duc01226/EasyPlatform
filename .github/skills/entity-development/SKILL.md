---
name: entity-development
description: Use when creating or modifying domain entities with static expressions, computed properties, field tracking, and validation.
---

# Entity Development for EasyPlatform

## Required Reading

**For comprehensive C# backend patterns, you MUST read:**

**`docs/claude/backend-csharp-complete-guide.md`** - Complete patterns for entities, repositories, validation, expressions, DTOs

---

## Entity Type Selection

```csharp
// Non-Audited (Basic)
public class Employee : RootEntity<Employee, string> { }

// Audited (With Audit Trail)
public class AuditedEmployee : RootAuditedEntity<AuditedEmployee, string, string> { }
```

## Complete Entity Pattern

```csharp
[TrackFieldUpdatedDomainEvent]
public sealed class Entity : RootEntity<Entity, string>
{
    // ═══════════════════════════════════════════════════════════════
    // CORE PROPERTIES
    // ═══════════════════════════════════════════════════════════════

    [TrackFieldUpdatedDomainEvent]
    public string Name { get; set; } = "";
    public string Code { get; set; } = "";
    public string CompanyId { get; set; } = "";
    public EntityStatus Status { get; set; }

    // ═══════════════════════════════════════════════════════════════
    // NAVIGATION PROPERTIES
    // ═══════════════════════════════════════════════════════════════

    [JsonIgnore]
    public Company? Company { get; set; }

    [JsonIgnore]
    public List<EntityChild>? Children { get; set; }

    // ═══════════════════════════════════════════════════════════════
    // COMPUTED PROPERTIES (MUST have empty set { })
    // ═══════════════════════════════════════════════════════════════

    [ComputedEntityProperty]
    public bool IsActive
    {
        get => Status == EntityStatus.Active && !IsDeleted;
        set { }  // Required for EF Core
    }

    [ComputedEntityProperty]
    public string DisplayName
    {
        get => $"{Code} - {Name}".Trim();
        set { }  // Required
    }

    // ═══════════════════════════════════════════════════════════════
    // STATIC EXPRESSIONS (For Repository Queries)
    // ═══════════════════════════════════════════════════════════════

    public static Expression<Func<Entity, bool>> OfCompanyExpr(string companyId)
        => e => e.CompanyId == companyId;

    public static Expression<Func<Entity, bool>> UniqueExpr(string companyId, string code)
        => e => e.CompanyId == companyId && e.Code == code;

    public static Expression<Func<Entity, bool>> FilterByStatusExpr(List<EntityStatus> statuses)
    {
        var statusSet = statuses.ToHashSet();
        return e => e.Status.HasValue && statusSet.Contains(e.Status.Value);
    }

    // Composite expression
    public static Expression<Func<Entity, bool>> ActiveInCompanyExpr(string companyId)
        => OfCompanyExpr(companyId).AndAlso(e => e.IsActive);

    // Full-text search columns
    public static Expression<Func<Entity, object?>>[] DefaultFullTextSearchColumns()
        => [e => e.Name, e => e.Code, e => e.Description];

    // ═══════════════════════════════════════════════════════════════
    // VALIDATION METHODS
    // ═══════════════════════════════════════════════════════════════

    public PlatformValidationResult ValidateCanBeUpdated()
    {
        return PlatformValidationResult.Valid()
            .And(() => !IsDeleted, "Entity is deleted")
            .And(() => Status != EntityStatus.Locked, "Entity is locked");
    }

    public async Task<PlatformValidationResult> ValidateAsync(
        IRepository<Entity> repository, CancellationToken ct = default)
    {
        return await PlatformValidationResult.Valid()
            .And(() => Name.IsNotNullOrEmpty(), "Name is required")
            .AndNotAsync(async () => await repository.AnyAsync(
                e => e.Id != Id && e.CompanyId == CompanyId && e.Code == Code, ct),
                "Code already exists");
    }
}
```

## Expression Composition

| Pattern     | Usage            | Example                             |
| ----------- | ---------------- | ----------------------------------- |
| `AndAlso`   | Combine with AND | `expr1.AndAlso(expr2)`              |
| `OrElse`    | Combine with OR  | `expr1.OrElse(expr2)`               |
| `AndAlsoIf` | Conditional AND  | `.AndAlsoIf(condition, () => expr)` |

```csharp
var expr = Entity.OfCompanyExpr(companyId)
    .AndAlso(Entity.FilterByStatusExpr(statuses))
    .AndAlsoIf(deptIds.Any(), () => Entity.FilterByDeptExpr(deptIds));
```

## Computed Property Rules

```csharp
// CORRECT - Has empty setter
[ComputedEntityProperty]
public bool IsRoot
{
    get => Id == RootId;
    set { }  // Required for EF Core
}

// WRONG - No setter (causes EF Core issues)
[ComputedEntityProperty]
public bool IsRoot => Id == RootId;
```

## Checklist

- [ ] Correct base class (RootEntity or RootAuditedEntity)
- [ ] Computed properties have `[ComputedEntityProperty]` and empty `set { }`
- [ ] Navigation properties have `[JsonIgnore]`
- [ ] Static expressions follow `{Purpose}Expr` naming
- [ ] Validation methods return `PlatformValidationResult`
- [ ] `[TrackFieldUpdatedDomainEvent]` on tracked fields
