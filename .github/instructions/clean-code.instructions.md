---
applyTo: "**/*.cs,**/*.ts"
---

# Clean Code Principles

> Auto-loads when editing code files. See `docs/code-review-rules.md` for full reference.

## Core Principles

- **YAGNI** - Don't implement features until needed
- **KISS** - Simplest solution that works
- **DRY** - Extract shared logic, no duplication

## 90% Rule (Class Responsibility)

**Logic belongs in the LOWEST appropriate layer:**

```
Entity/Model (Lowest)  →  Service  →  Component/Handler (Highest)
```

| Layer | Contains |
|-------|----------|
| **Entity/Model** | Business logic, validation, display helpers, static factory methods, dropdown options, constants |
| **Service** | API calls, command factories, data transformation |
| **Component/Handler** | UI events ONLY - delegates all logic to lower layers |

```typescript
// WRONG: Logic in component
readonly providerTypes = [{ value: 1, label: 'ITViec' }, ...];

// CORRECT: Logic in entity/model
export class JobProvider {
  static readonly dropdownOptions = [{ value: 1, label: 'ITViec' }, ...];
  static getDisplayLabel(value: number): string {
    return this.dropdownOptions.find(x => x.value === value)?.label ?? '';
  }
}
```

## Method Design

- **Single Responsibility**: One method = one purpose
- **Pure functions**: Avoid side effects when possible
- **Early returns**: Reduce nesting with guard clauses
- **Consistent abstraction level**: Don't mix high-level and low-level operations

## Code Flow (Step-by-Step Pattern)

```csharp
public async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    // Step 1: Validate input
    req.Validate().EnsureValid();

    // Step 2: Load dependencies (parallel)
    var (entity, company) = await Util.TaskRunner.WhenAll(
        repository.GetByIdAsync(req.Id, ct),
        companyRepo.GetByIdAsync(req.CompanyId, ct)
    );

    // Step 3: Apply business logic
    entity.UpdateFrom(req).EnsureValid();

    // Step 4: Persist changes
    await repository.UpdateAsync(entity, ct);

    // Step 5: Return result
    return new Result { Entity = new EntityDto(entity) };
}
```

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Classes/Interfaces | PascalCase | `UserService`, `IRepository` |
| Methods (C#) | PascalCase | `GetUserById()` |
| Methods (TS) | camelCase | `getUserById()` |
| Variables/Fields | camelCase | `userName`, `isActive` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Booleans | is/has/can/should | `isVisible`, `hasPermission` |
| Commands | `[Verb][Entity]Command` | `SaveLeaveRequestCommand` |
| Queries | `Get[Entity][Query]` | `GetActiveUsersQuery` |
| Collections | Plural | `users`, `orders`, `items` |

## No Magic Numbers/Strings

```csharp
// WRONG
if (status == 1) { ... }

// CORRECT
public static class EntityStatus { public const int Active = 1; }
if (status == EntityStatus.Active) { ... }
```

## Mandatory Type Annotations (TypeScript)

```typescript
// WRONG
function getUser(id) { ... }

// CORRECT
function getUser(id: string): Promise<User> { ... }
```

## Anti-Patterns Catalog

### Backend

| Anti-Pattern | Correct Pattern |
|--------------|----------------|
| Direct cross-service DB access | Message bus communication |
| Custom repository interfaces | Platform repos with extensions |
| Manual validation with exceptions | PlatformValidationResult fluent API |
| Side effects in command handler | Entity Event Handlers |
| DTO mapping in handler | DTO owns mapping via MapToObject() |
| Logic in controllers | CQRS Command Handlers |
| Fetch-then-delete | `DeleteByIdAsync(id)` |

### Frontend

| Anti-Pattern | Correct Pattern |
|--------------|----------------|
| Direct `HttpClient` | `PlatformApiService` |
| Manual signals for state | `PlatformVmStore` |
| Manual destroy Subject | `this.untilDestroyed()` |
| `ngOnChanges` | `@Watch` decorator |
| `implements OnInit, OnDestroy` | Extend platform base class |
| Elements without BEM classes | All elements have BEM classes |

### Architecture

| Anti-Pattern | Correct Pattern |
|--------------|----------------|
| Skip planning | Always EnterPlanMode for non-trivial |
| Create without searching | Search for existing implementations first |
| Logic in component | Logic in lowest layer (entity/model) |
