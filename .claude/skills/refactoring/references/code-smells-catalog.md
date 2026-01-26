# Code Smells Catalog & Refactoring Patterns

Platform-specific refactoring examples for EasyPlatform.

---

## Extract Patterns

| Pattern | When to Use | Platform Example |
| --- | --- | --- |
| **Extract Method** | Long method, duplicated code | Move logic to private method |
| **Extract Class** | Class has multiple responsibilities | Create Helper, Service, or Strategy class |
| **Extract Interface** | Need abstraction for testing/DI | Create `I{ClassName}` interface |
| **Extract Expression** | Complex inline expression | Move to Entity static expression |
| **Extract Validator** | Repeated validation logic | Create validator extension method |

## Move Patterns

| Pattern | When to Use | Platform Example |
| --- | --- | --- |
| **Move Method** | Method belongs to different class | Move from Handler to Helper/Entity |
| **Move to Extension** | Reusable repository logic | Create `{Entity}RepositoryExtensions` |
| **Move to DTO** | Mapping logic in handler | Use `PlatformEntityDto.MapToEntity()` |
| **Move to Entity** | Business logic in handler | Add instance method or static expression |

## Simplify Patterns

| Pattern | When to Use | Platform Example |
| --- | --- | --- |
| **Inline Variable** | Temporary variable used once | Remove intermediate variable |
| **Inline Method** | Method body is obvious | Replace call with body |
| **Replace Conditional** | Complex if/switch | Use Strategy pattern or expression |
| **Introduce Parameter Obj** | Method has many parameters | Create Command/Query DTO |

---

## Platform-Specific Refactoring Examples

### Handler to Helper

```csharp
// BEFORE: Reused logic in multiple handlers
var employee = await repo.FirstOrDefaultAsync(Employee.UniqueExpr(userId, companyId), ct)
    ?? await CreateEmployeeAsync(userId, companyId, ct);

// AFTER: Extracted to Helper
// In EmployeeHelper.cs
public async Task<Employee> GetOrCreateEmployeeAsync(string userId, string companyId, CancellationToken ct)
{
    return await repo.FirstOrDefaultAsync(Employee.UniqueExpr(userId, companyId), ct)
        ?? await CreateEmployeeAsync(userId, companyId, ct);
}
```

### Handler to Repository Extension

```csharp
// BEFORE: Query logic in handler
var employees = await repo.GetAllAsync(
    e => e.CompanyId == companyId && e.Status == Status.Active && e.DepartmentIds.Contains(deptId), ct);

// AFTER: Extracted to extension
// In EmployeeRepositoryExtensions.cs
public static async Task<List<Employee>> GetActiveByDepartmentAsync(
    this IPlatformQueryableRootRepository<Employee> repo, string companyId, string deptId, CancellationToken ct)
{
    return await repo.GetAllAsync(
        Employee.OfCompanyExpr(companyId)
            .AndAlso(Employee.IsActiveExpr())
            .AndAlso(e => e.DepartmentIds.Contains(deptId)), ct);
}
```

### Mapping to DTO

```csharp
// BEFORE: Mapping in handler
var config = new AuthConfig
{
    ClientId = req.Dto.ClientId,
    Secret = encryptService.Encrypt(req.Dto.Secret)
};

// AFTER: DTO owns mapping
// In AuthConfigDto.cs : PlatformDto<AuthConfig>
public override AuthConfig MapToObject() => new AuthConfig
{
    ClientId = ClientId,
    Secret = Secret  // Handler applies encryption
};

// In Handler
var config = req.Dto.MapToObject()
    .With(c => c.Secret = encryptService.Encrypt(c.Secret));
```

### Expression Extraction

```csharp
// BEFORE: Logic in handler
var isValid = entity.Status == Status.Active &&
              entity.User?.IsActive == true &&
              !entity.IsDeleted;
if (!isValid) throw new Exception();

// AFTER: Extracted to entity static expression
// In Entity.cs
public static Expression<Func<Entity, bool>> IsActiveExpr()
    => e => e.Status == Status.Active &&
            e.User != null && e.User.IsActive &&
            !e.IsDeleted;

// In Handler
var entity = await repository.FirstOrDefaultAsync(Entity.IsActiveExpr(), ct)
    .EnsureFound("Entity not active");
```

---

## Code Responsibility Refactoring (Priority Check)

**Before any refactoring, verify logic is in the LOWEST appropriate layer:**

```
Entity/Model (Lowest)  ->  Service  ->  Component/Handler (Highest)
```

| Wrong Location | Move To | Example |
| --- | --- | --- |
| Component | Entity/Model | Dropdown options, display helpers, defaults |
| Component | Service (Factory) | Command building, data transformation |
| Handler | Entity | Business rules, static expressions |
| Handler | Repository Ext | Reusable query patterns |

### Frontend Example

```typescript
// BEFORE: Logic in component (causes duplication)
readonly statusTypes = [{ value: 1, label: 'Active' }, { value: 2, label: 'Inactive' }];
getStatusClass(config) { return !config.isEnabled ? 'disabled' : 'active'; }

// AFTER: Logic in entity (enables reuse)
readonly statusTypes = EntityConfiguration.getStatusTypeOptions();
getStatusClass(config) { return config.getStatusCssClass(); }
```

---

## Component HTML Template Standard (BEM Classes)

**All UI elements MUST have BEM classes, even without styling needs.**

```html
<!-- CORRECT: All elements have BEM classes -->
<div class="settings-panel">
    <div class="settings-panel__header">
        <h2 class="settings-panel__title">Settings</h2>
    </div>
    <div class="settings-panel__body">
        <div class="settings-panel__section">
            <label class="settings-panel__label">Option</label>
            <input class="settings-panel__input" formControlName="option" />
        </div>
    </div>
</div>
```

## Component SCSS Standard

Always style both the **host element** and the **main wrapper class**:

```scss
@import '~assets/scss/variables';

// Host element styling
my-component {
    display: flex;
    flex-direction: column;
}

// Main wrapper class
.my-component {
    display: flex;
    flex-direction: column;
    width: 100%;
    flex-grow: 1;

    &__header { /* BEM child */ }
    &__content { flex: 1; overflow-y: auto; }
}
```
