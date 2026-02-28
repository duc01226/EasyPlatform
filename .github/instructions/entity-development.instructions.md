---
applyTo: '**/Entities/**/*.cs,**/Domain/**/*.cs'
---

# Entity & Domain Development Patterns

> Auto-loads when editing Entity/Domain files. See `docs/backend-patterns-reference.md` for full reference.

## Entity Types

```csharp
// Standard entity
public class Employee : RootEntity<Employee, string> { }

// Audited entity (tracks Created/Updated metadata)
public class AuditedEmployee : RootAuditedEntity<AuditedEmployee, string, string> { }
```

## Field Tracking

```csharp
// Track changes for event-driven updates
[TrackFieldUpdatedDomainEvent]
public string Name { get; set; } = "";
```

## Computed Properties

```csharp
// MUST have empty set for serialization
[ComputedEntityProperty]
public string FullName { get => $"{FirstName} {LastName}".Trim(); set { } }
```

## Navigation Properties (MongoDB/Non-EF)

```csharp
// Pattern 1: Forward navigation (FK on THIS entity)
public string DepartmentId { get; set; } = "";
[PlatformNavigationProperty(nameof(DepartmentId))]
public Department? Department { get; set; }

// Pattern 2: Collection via FK List
public List<string> ProjectIds { get; set; } = [];
[PlatformNavigationProperty(nameof(ProjectIds), Cardinality = Collection)]
public List<Project>? Projects { get; set; }

// Pattern 3: Reverse navigation (child has FK pointing to parent)
[PlatformNavigationProperty(ReverseForeignKeyProperty = nameof(Employee.ManagerId))]
public List<Employee>? DirectReports { get; set; }
```

## Static Expressions (CRITICAL)

Entity classes own their query expressions:

```csharp
public static Expression<Func<Entity, bool>> UniqueExpr(string companyId, string code)
    => e => e.CompanyId == companyId && e.Code == code;

public static Expression<Func<Entity, bool>> CompositeExpr(string companyId, bool includeInactive = false)
    => OfCompanyExpr(companyId).AndAlsoIf(!includeInactive, () => e => e.IsActive);

public static Expression<Func<Entity, object?>>[] DefaultFullTextSearchColumns()
    => [e => e.Name, e => e.Code, e => e.Email];

// Async expression with external dependency
public static async Task<Expression<Func<Entity, bool>>> FilterWithLicenseExprAsync(
    IRepository<License> licenseRepo, string companyId, CancellationToken ct = default)
{
    var hasLicense = await licenseRepo.HasLicenseAsync(companyId, ct);
    return hasLicense ? PremiumFilterExpr() : StandardFilterExpr();
}
```

## Entity Validation

```csharp
// Static validation method in entity
public static List<string> ValidateEntity(Entity? e)
    => e == null ? ["Not found"] : !e.IsActive ? ["Inactive"] : [];

// Fluent ensure pattern
await repo.GetByIdAsync(id, ct).EnsureFound($"Not found: {id}").Then(x => x.Validate().EnsureValid());
```

## Code Responsibility Hierarchy (CRITICAL)

**Place logic in the LOWEST appropriate layer:**

```
Entity/Model (Lowest)  ->  Service  ->  Component/Handler (Highest)
```

| Layer       | Contains                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------ |
| **Entity**  | Business logic, validation, display helpers, static factory methods, dropdown options, constants |
| **Service** | API calls, command factories, data transformation                                                |
| **Handler** | Orchestration ONLY - delegates logic to entity/service                                           |

## Anti-Patterns

- **NEVER** put validation logic in handlers that belongs in entity
- **NEVER** create custom repository interfaces - use platform repos + extensions
- **NEVER** duplicate entity logic across handlers - put it in the entity
- **NEVER** use magic strings/numbers - use named constants or static expressions
