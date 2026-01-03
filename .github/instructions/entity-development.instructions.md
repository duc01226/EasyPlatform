---
applyTo: 'src/Services/**/Domain/**/*.cs'
---

# Entity Development Instructions

## Entity Base Classes

### Non-Audited Entity
```csharp
public class Entity : RootEntity<Entity, string>
{
    // Use when audit trail (CreatedBy, UpdatedBy, CreatedDate) is NOT needed
}
```

### Audited Entity (With Audit Trail)
```csharp
public class AuditedEntity : RootAuditedEntity<AuditedEntity, string, string>
{
    // Includes: CreatedBy, UpdatedBy, CreatedDate, UpdatedDate
    // Use for entities requiring audit history
}
```

## Entity Structure Template

```csharp
[TrackFieldUpdatedDomainEvent]  // Track all field changes
public sealed class Entity : RootEntity<Entity, string>
{
    // ═══════════════════════════════════════════════════════════════════════════
    // CORE PROPERTIES
    // ═══════════════════════════════════════════════════════════════════════════

    [TrackFieldUpdatedDomainEvent]  // Track specific field changes
    public string Name { get; set; } = "";

    public string Code { get; set; } = "";
    public string CompanyId { get; set; } = "";
    public EntityStatus Status { get; set; }
    public DateTime? EffectiveDate { get; set; }

    // ═══════════════════════════════════════════════════════════════════════════
    // NAVIGATION PROPERTIES
    // ═══════════════════════════════════════════════════════════════════════════

    [JsonIgnore]
    public Company? Company { get; set; }

    [JsonIgnore]
    public List<EntityChild>? Children { get; set; }

    // ═══════════════════════════════════════════════════════════════════════════
    // COMPUTED PROPERTIES (MUST have empty set { })
    // ═══════════════════════════════════════════════════════════════════════════

    [ComputedEntityProperty]
    public bool IsActive
    {
        get => Status == EntityStatus.Active && !IsDeleted;
        set { }  // Required empty setter for EF Core
    }

    [ComputedEntityProperty]
    public string DisplayName
    {
        get => $"{Code} - {Name}".Trim();
        set { }  // Required empty setter
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATIC EXPRESSIONS (For Repository Queries)
    // ═══════════════════════════════════════════════════════════════════════════

    // Simple filter expression
    public static Expression<Func<Entity, bool>> OfCompanyExpr(string companyId)
        => e => e.CompanyId == companyId;

    // Unique constraint expression
    public static Expression<Func<Entity, bool>> UniqueExpr(string companyId, string code)
        => e => e.CompanyId == companyId && e.Code == code;

    // Filter by status list
    public static Expression<Func<Entity, bool>> FilterByStatusExpr(List<EntityStatus> statuses)
    {
        var statusSet = statuses.ToHashSet();
        return e => e.Status.HasValue && statusSet.Contains(e.Status.Value);
    }

    // Composite expression with conditional
    public static Expression<Func<Entity, bool>> ActiveInCompanyExpr(string companyId, bool includeInactive = false)
        => OfCompanyExpr(companyId).AndAlsoIf(!includeInactive, () => e => e.IsActive);

    // Full-text search columns
    public static Expression<Func<Entity, object?>>[] DefaultFullTextSearchColumns()
        => [e => e.Name, e => e.Code, e => e.Description];

    // ═══════════════════════════════════════════════════════════════════════════
    // ASYNC EXPRESSIONS (When External Dependencies Needed)
    // ═══════════════════════════════════════════════════════════════════════════

    public static async Task<Expression<Func<Entity, bool>>> FilterWithLicenseExprAsync(
        IRepository<License> licenseRepo,
        string companyId,
        CancellationToken ct = default)
    {
        var hasLicense = await licenseRepo.HasLicenseAsync(companyId, ct);
        return hasLicense ? PremiumFilterExpr() : StandardFilterExpr();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VALIDATION METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    public PlatformValidationResult ValidateCanBeUpdated()
    {
        return PlatformValidationResult.Valid()
            .And(() => !IsDeleted, "Entity is deleted")
            .And(() => Status != EntityStatus.Locked, "Entity is locked");
    }

    public async Task<PlatformValidationResult> ValidateAsync(
        IRepository<Entity> repository,
        CancellationToken ct = default)
    {
        return await PlatformValidationResult.Valid()
            .And(() => Name.IsNotNullOrEmpty(), "Name is required")
            .And(() => Code.IsNotNullOrEmpty(), "Code is required")
            .AndNotAsync(async () => await repository.AnyAsync(
                e => e.Id != Id && e.CompanyId == CompanyId && e.Code == Code, ct),
                "Code already exists");
    }

    // Static validation method
    public static List<string> ValidateEntity(Entity? e)
        => e == null ? ["Not found"] : !e.IsActive ? ["Inactive"] : [];

    // ═══════════════════════════════════════════════════════════════════════════
    // INSTANCE METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    public void Activate() => Status = EntityStatus.Active;
    public void Deactivate() => Status = EntityStatus.Inactive;
}
```

## Expression Composition

### Operators

| Pattern | Usage | Example |
|---------|-------|---------|
| `AndAlso` | Combine with AND | `expr1.AndAlso(expr2)` |
| `OrElse` | Combine with OR | `expr1.OrElse(expr2)` |
| `AndAlsoIf` | Conditional AND | `.AndAlsoIf(condition, () => expr)` |
| `OrElseIf` | Conditional OR | `.OrElseIf(condition, () => expr)` |

### Examples

```csharp
// Composing multiple expressions
var expr = Entity.OfCompanyExpr(companyId)
    .AndAlso(Entity.FilterByStatusExpr(statuses))
    .AndAlsoIf(deptIds.Any(), () => Entity.FilterByDeptExpr(deptIds))
    .AndAlsoIf(searchText.IsNotNullOrEmpty(), () => Entity.SearchExpr(searchText));

// Complex expression with async dependency
public static Expression<Func<E, bool>> ComplexExpr(int s, string c, int? m)
    => BaseExpr(s, c)
        .AndAlso(e => e.User!.IsActive)
        .AndAlsoIf(m != null, () => e => e.Start <= Clock.UtcNow.AddMonths(-m!.Value));
```

## Computed Property Rules

**CRITICAL: Computed properties MUST have empty setter `set { }`**

```csharp
// ✅ CORRECT
[ComputedEntityProperty]
public bool IsRoot
{
    get => Id == RootId;
    set { }  // Required for EF Core mapping
}

// ❌ WRONG - No setter causes EF Core issues
[ComputedEntityProperty]
public bool IsRoot => Id == RootId;
```

## DTO Mapping

### Entity DTO
```csharp
public class EmployeeDto : PlatformEntityDto<Employee, string>
{
    public EmployeeDto() { }
    public EmployeeDto(Employee e, User? u) : base(e) { FullName = e.FullName ?? u?.FullName ?? ""; }

    public string? Id { get; set; }
    public string FullName { get; set; } = "";
    public OrganizationDto? Company { get; set; }

    public EmployeeDto WithCompany(OrganizationalUnit c) { Company = new OrganizationDto(c); return this; }

    protected override object? GetSubmittedId() => Id;
    protected override string GenerateNewId() => Ulid.NewUlid().ToString();
    protected override Employee MapToEntity(Employee e, MapToEntityModes mode) { e.FullName = FullName; return e; }
}

// Usage
var dtos = employees.SelectList(e => new EmployeeDto(e, e.User).WithCompany(e.Company!));
```

### Value Object DTO
```csharp
public sealed class ConfigDto : PlatformDto<ConfigValue>
{
    public string ClientId { get; set; } = "";
    public override ConfigValue MapToObject() => new() { ClientId = ClientId };
}
```

## Key Rules

### Change Tracking
- Use `[TrackFieldUpdatedDomainEvent]` on class for all field changes
- Use `[TrackFieldUpdatedDomainEvent]` on specific properties for granular tracking

### Navigation Properties
- Always add `[JsonIgnore]` to navigation properties
- Prevents circular serialization references
- Collections should be nullable: `List<Child>?`

### Static Expressions
- Return `Expression<Func<T, bool>>` for query filters
- Use descriptive names ending with `Expr`
- Compose using `.AndAlso()`, `.OrElse()`, `.AndAlsoIf()`
- For full-text search, return `Expression<Func<T, object?>>[]`

### Computed Properties
- MUST use `[ComputedEntityProperty]` attribute
- MUST have empty setter `set { }`
- Should NOT have complex logic (extract to methods)

### Validation
- Sync validation: Return `PlatformValidationResult`
- Async validation: Return `Task<PlatformValidationResult>`
- Static validation: Return `List<string>`
- Chain with `.And()`, `.AndNot()`, `.AndAsync()`, `.AndNotAsync()`

## Anti-Patterns

| ❌ Don't | ✅ Do |
|---------|------|
| Business logic in property getters | Extract to methods |
| Missing `[JsonIgnore]` on navigation properties | Add `[JsonIgnore]` |
| Complex logic in computed properties | Extract to method |
| Computed property without `set { }` | Add empty setter |
| Direct field validation in setters | Use validation methods |
