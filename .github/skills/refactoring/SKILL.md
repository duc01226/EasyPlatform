---
name: refactoring
description: Use when restructuring code without changing behavior - extract method, extract class, rename, move, inline.
---

# Code Refactoring for EasyPlatform

## Refactoring Catalog

### Extract Patterns

| Pattern               | When to Use                  | Example                               |
| --------------------- | ---------------------------- | ------------------------------------- |
| **Extract Method**    | Long method, duplicated code | Move logic to private method          |
| **Extract Class**     | Multiple responsibilities    | Create Helper, Service, Strategy      |
| **Extract to DTO**    | Mapping logic in handler     | Use `PlatformEntityDto.MapToEntity()` |
| **Extract to Entity** | Business logic in handler    | Add static expression or method       |

### Move Patterns

| Pattern               | When to Use               | Example                        |
| --------------------- | ------------------------- | ------------------------------ |
| **Move to Extension** | Reusable repository logic | `{Entity}RepositoryExtensions` |
| **Move to Helper**    | Reused logic in handlers  | Create `{Entity}Helper` class  |
| **Move to Entity**    | Business rules            | Static expression method       |

## Workflow

1. **Identify Target**: Locate code to refactor
2. **Map Dependencies**: Find all usages with Grep
3. **Assess Impact**: List affected files/tests
4. **Execute**: Make incremental changes
5. **Verify**: Run tests, confirm behavior unchanged

## Handler to Helper

```csharp
// BEFORE: Reused logic in handlers
var employee = await repo.FirstOrDefaultAsync(Employee.UniqueExpr(userId, companyId), ct)
    ?? await CreateEmployeeAsync(userId, companyId, ct);

// AFTER: Extracted to Helper
public class EmployeeHelper
{
    public async Task<Employee> GetOrCreateAsync(string userId, string companyId, CancellationToken ct)
    {
        return await repo.FirstOrDefaultAsync(Employee.UniqueExpr(userId, companyId), ct)
            ?? await CreateEmployeeAsync(userId, companyId, ct);
    }
}
```

## Handler to Repository Extension

```csharp
// BEFORE: Query logic in handler
var employees = await repo.GetAllAsync(
    e => e.CompanyId == companyId && e.Status == Status.Active, ct);

// AFTER: Extracted to extension
public static class EmployeeRepositoryExtensions
{
    public static async Task<List<Employee>> GetActiveByCompanyAsync(
        this IPlatformQueryableRootRepository<Employee> repo, string companyId, CancellationToken ct)
    {
        return await repo.GetAllAsync(
            Employee.OfCompanyExpr(companyId).AndAlso(Employee.IsActiveExpr()), ct);
    }
}
```

## Mapping to DTO

```csharp
// BEFORE: Mapping in handler
var config = new AuthConfig { ClientId = req.Dto.ClientId };

// AFTER: DTO owns mapping
public class AuthConfigDto : PlatformDto<AuthConfig>
{
    public override AuthConfig MapToObject() => new AuthConfig { ClientId = ClientId };
}

// Handler uses dto.MapToObject()
var config = req.Dto.MapToObject().With(c => c.Secret = encryptService.Encrypt(c.Secret));
```

## Extract to Entity Expression

```csharp
// BEFORE: Logic in handler
var isValid = entity.Status == Status.Active && entity.User?.IsActive == true && !entity.IsDeleted;

// AFTER: Extracted to entity
public static Expression<Func<Entity, bool>> IsActiveExpr()
    => e => e.Status == Status.Active && e.User != null && e.User.IsActive && !e.IsDeleted;

// Handler uses expression
var entity = await repository.FirstOrDefaultAsync(Entity.IsActiveExpr(), ct).EnsureFound();
```

## Safety Checklist

- [ ] Searched all usages (static + dynamic)?
- [ ] Test coverage exists?
- [ ] Changes are incremental?
- [ ] No behavior change verified?

## Code Responsibility Refactoring

**Identify and move logic to the LOWEST appropriate layer:**

| Wrong Location | Move To           | Example                                     |
| -------------- | ----------------- | ------------------------------------------- |
| Component      | Entity/Model      | Dropdown options, display helpers, defaults |
| Component      | Service (Factory) | Command building, data transformation       |
| Handler        | Entity            | Business rules, static expressions          |
| Handler        | Helper            | Reused logic across multiple handlers       |

```typescript
// Component → Entity refactoring
// BEFORE: Logic in component
readonly providerTypes = this.getProviderTypes().map(t => ({ value: t, label: this.getLabel(t) }));
getStatusClass(c) { return !c.isEnabled ? 'disabled' : c.syncState.isHealthy() ? 'healthy' : 'warning'; }

// AFTER: Logic in entity (enables reuse, no duplication)
readonly providerTypes = JobBoardProviderConfiguration.getApiProviderTypeOptions();
getStatusClass(c) { return c.getStatusCssClass(); }
```

## Component HTML Template Standard (BEM Classes)

**All UI elements in component templates MUST have BEM classes, even without styling needs.** This makes HTML self-documenting like OOP class hierarchy.

```html
<!-- ✅ CORRECT: All elements have BEM classes -->
<div class="config-form">
    <div class="config-form__header">
        <h2 class="config-form__title">Configuration</h2>
    </div>
    <div class="config-form__body">
        <div class="config-form__field">
            <label class="config-form__label">Name</label>
            <input class="config-form__input" formControlName="name" />
        </div>
    </div>
</div>

<!-- ❌ WRONG: Missing BEM classes -->
<div class="config-form">
    <div>
        <h2>Configuration</h2>
    </div>
    <div>
        <div>
            <label>Name</label>
            <input formControlName="name" />
        </div>
    </div>
</div>
```

**Refactoring Action**: When refactoring components, ensure all HTML elements have proper BEM classes.

## Component SCSS Standard

Always style both the **host element** (Angular selector) and the **main wrapper class**:

```scss
@import '~assets/scss/variables';

// Host element styling - ensures Angular element is a proper block container
my-component {
    display: flex;
    flex-direction: column;
}

// Main wrapper class with full styling
.my-component {
    display: flex;
    flex-direction: column;
    width: 100%;
    flex-grow: 1;

    &__header {
        // BEM child elements...
    }

    &__content {
        flex: 1;
        overflow-y: auto;
    }
}
```

**Why both?**

- **Host element**: Makes the Angular element a real layout element (not an unknown element without display)
- **Main class**: Contains the full styling, matches the wrapper div in HTML

## Anti-Patterns

- **Big Bang Refactoring**: Make small, incremental changes
- **Refactoring Without Tests**: Ensure coverage first
- **Mixing with Features**: Do one or the other
- **Logic in Wrong Layer**: Move to lowest layer that makes sense (entity > service > component)
