# Entity Development Patterns Reference

## Entity Base Classes

### Non-Audited Entity

```csharp
public class Employee : RootEntity<Employee, string>
{
    // No CreatedBy, UpdatedBy, CreatedDate, etc.
}
```

### Audited Entity (With Audit Trail)

```csharp
public class AuditedEmployee : RootAuditedEntity<AuditedEmployee, string, string>
{
    // Includes: CreatedBy, UpdatedBy, CreatedDate, UpdatedDate
}
```

---

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

    // ═══════════════════════════════════════════════════════════════════════════
    // INSTANCE METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    public void Activate() => Status = EntityStatus.Active;
    public void Deactivate() => Status = EntityStatus.Inactive;
}
```

---

## Expression Composition

| Pattern | Usage | Example |
|---------|-------|---------|
| `AndAlso` | Combine with AND | `expr1.AndAlso(expr2)` |
| `OrElse` | Combine with OR | `expr1.OrElse(expr2)` |
| `AndAlsoIf` | Conditional AND | `.AndAlsoIf(condition, () => expr)` |
| `OrElseIf` | Conditional OR | `.OrElseIf(condition, () => expr)` |

```csharp
// Composing multiple expressions
var expr = Entity.OfCompanyExpr(companyId)
    .AndAlso(Entity.FilterByStatusExpr(statuses))
    .AndAlsoIf(deptIds.Any(), () => Entity.FilterByDeptExpr(deptIds))
    .AndAlsoIf(searchText.IsNotNullOrEmpty(), () => Entity.SearchExpr(searchText));

// Complex expression
public static Expression<Func<E, bool>> ComplexExpr(int s, string c, int? m)
    => BaseExpr(s, c)
        .AndAlso(e => e.User!.IsActive)
        .AndAlsoIf(m != null, () => e => e.Start <= Clock.UtcNow.AddMonths(-m!.Value));
```

---

## Computed Property Rules

**MUST have empty setter `set { }`**

```csharp
// CORRECT
[ComputedEntityProperty]
public bool IsRoot
{
    get => Id == RootId;
    set { }  // Required for EF Core mapping
}

// WRONG - No setter causes EF Core issues
[ComputedEntityProperty]
public bool IsRoot => Id == RootId;
```

---

## DTO Mapping

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

// Value object DTO
public sealed class ConfigDto : PlatformDto<ConfigValue>
{
    public string ClientId { get; set; } = "";
    public override ConfigValue MapToObject() => new() { ClientId = ClientId };
}

// Usage
var dtos = employees.SelectList(e => new EmployeeDto(e, e.User).WithCompany(e.Company!));
```

---

## Static Validation Method

```csharp
public static List<string> ValidateEntity(Entity? e)
    => e == null ? ["Not found"] : !e.IsActive ? ["Inactive"] : [];
```

---

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Business logic in properties | Use methods |
| Missing `[JsonIgnore]` on navigation | Add `[JsonIgnore]` |
| Complex logic in getters | Extract to method |
| Computed property without `set { }` | Add empty setter |
