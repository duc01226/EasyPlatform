# Clean Code Rules

## Core Principles

- **Do not repeat code logic or patterns.** Reuse code.
- **Follow SOLID principles** and Clean Architecture patterns.
- **Single Responsibility:** Each method/class does one thing well.
- **Consistent abstraction level:** Don't mix high-level and low-level operations.
- **Don't mix infrastructure logic** into application/domain layer.

## Naming Conventions

| Type               | Convention                      | Example                      |
| ------------------ | ------------------------------- | ---------------------------- |
| Classes/Interfaces | PascalCase                      | `UserService`, `IRepository` |
| Methods/Functions  | PascalCase (C#), camelCase (TS) | `GetUserById`, `getUserById` |
| Variables/Fields   | camelCase                       | `userName`, `isActive`       |
| Constants          | UPPER_SNAKE_CASE (TS), PascalCase (C#) | `MAX_RETRY_COUNT`, `MaxRetryCount` |
| Booleans           | is, has, can, should prefix     | `isVisible`, `hasPermission` |
| Collections        | Plural                          | `users`, `orders`, `items`   |

## Naming Best Practices

### Core Principles

- **Names reveal intent** - Name describes WHAT, not HOW
- **Clear over clever** - Prefer `getUserById` over `fetchUsr`
- **Consistent** - Same concept = same name across codebase
- **Searchable** - Avoid single-letter names except loop indices

### Naming Anti-Patterns

```csharp
// ❌ BAD: Vague, unclear purpose
var data = GetData();
var temp = Process(data);
var result = Finalize(temp);

// ✅ GOOD: Intent is clear
var userOrders = GetOrdersByUserId(userId);
var validatedOrders = ValidateOrderStatus(userOrders);
var processedOrders = ApplyDiscounts(validatedOrders);
```

```typescript
// ❌ BAD: Abbreviations obscure meaning
const usr = getUsr();
const mgr = getMgr(usr.deptId);
const cnt = items.length;

// ✅ GOOD: Full words are readable
const user = getUser();
const manager = getManager(user.departmentId);
const itemCount = items.length;
```

### Method Naming

| Pattern | Purpose | Example |
|---------|---------|---------|
| `Get*` | Retrieve data | `GetUserById`, `GetActiveOrders` |
| `Find*` | Search (may return null) | `FindByEmail`, `FindMatchingItems` |
| `Create*` / `Build*` | Construct new object | `CreateOrder`, `BuildQuery` |
| `Update*` / `Save*` | Modify existing | `UpdateProfile`, `SaveChanges` |
| `Delete*` / `Remove*` | Remove data | `DeleteUser`, `RemoveItem` |
| `Validate*` | Check validity | `ValidateEmail`, `ValidateOrder` |
| `Is*` / `Has*` / `Can*` | Boolean check | `IsActive`, `HasPermission`, `CanEdit` |
| `To*` | Convert/transform | `ToString`, `ToDto`, `ToEntity` |

### Class/Interface Naming

```csharp
// Services - noun + "Service"
public class UserService { }
public class OrderProcessingService { }

// Repositories - entity + "Repository"
public interface IUserRepository { }
public class OrderRepository { }

// Handlers - action + "Handler"
public class SaveUserCommandHandler { }
public class UserCreatedEventHandler { }

// DTOs - entity + context + "Dto"
public class UserDto { }
public class UserListItemDto { }
public class CreateUserRequestDto { }
```

### Variable Naming Context

```typescript
// Include context when scope is large
// ❌ BAD in large scope
const name = user.name;
const date = order.createdDate;

// ✅ GOOD: Context included
const userName = user.name;
const orderCreatedDate = order.createdDate;

// OK in small, obvious scope (lambdas, short methods)
users.filter(u => u.isActive);
orders.map(o => o.total);
```

## Code Organization

- Group related functionality together
- Separate concerns (business logic, data access, presentation)
- Use meaningful file/folder structure
- Keep dependencies flowing inward (Dependency Inversion)

## Code Flow Pattern

- Clear step-by-step flow with spacing
- Group parallel operations (no dependencies) together
- Follow Input → Process → Output pattern
- Use early validation and guard clauses

## Responsibility Placement

- **Business logic** belongs to domain entities
- **Static expressions** for queries in entities
- **Instance validation** methods in entities
- **DTO creation** belongs to DTO classes

## DTO Mapping Responsibility (CRITICAL)

Mapping from DTO to entity/value object is **ALWAYS** the DTO's responsibility, NOT the command/query handler.

```csharp
// ✅ CORRECT: DTO owns mapping
public sealed class AuthConfigDto : PlatformDto<AuthConfigValue>
{
    public override AuthConfigValue MapToObject() => new AuthConfigValue
    {
        ClientId = ClientId,
        ClientSecret = ClientSecret
    };
}

// Handler calls dto.MapToObject() and uses .With() for transformations
var config = req.Dto.MapToObject()
    .With(p => p.ClientSecret = encryptionService.Encrypt(p.ClientSecret));
```

Internal command/query-specific objects (result DTOs, request-specific models) remain the handler's responsibility.

## 90% Logic Rule

If 90% of the logic belongs to class A, the logic should be placed in class A, not in a third-party class B.

Only when logic spans multiple classes (A, B, C) and doesn't fit any as main responsibility, place it in an orchestrator (helper, service, or handler).

## Code Reuse & Duplication Prevention

- Before writing new code, **search for existing implementations**
- If similar logic exists, **extract and reuse**
- Never duplicate mapping logic, validation logic, or business rules across handlers

## Validation Patterns

| Pattern                  | Return Type                   | Behavior                     |
| ------------------------ | ----------------------------- | ---------------------------- |
| `Validate[Context]()`    | `PlatformValidationResult<T>` | Never throws, returns result |
| `Ensure[Context]Valid()` | `void` or `T`                 | Throws if invalid            |

```csharp
// Chain validation
return base.Validate()
    .And(_ => Name.IsNotNullOrEmpty(), "Name required")
    .AndAsync(async _ => await ValidateUniqueAsync())
    .AndNot(_ => IsExternal, "Externals not allowed");
```

## Method Design

- Single Responsibility per method
- Consistent abstraction level within method
- Clear, descriptive names that explain intent
- Early return for guard clauses
- Avoid deep nesting (max 2-3 levels)

## No Magic Numbers Rule

Magic numbers are unexplained numeric or string literals in code that lack semantic meaning. They make code harder to understand, maintain, and refactor.

### Bad Examples

```csharp
// ❌ Magic numbers - what do these values mean?
if (status == 3) { /* ... */ }
var timeout = 30000;
if (retryCount > 5) { /* ... */ }
```

```typescript
// ❌ Magic numbers - unclear intent
if (response.code === 401) { handleUnauthorized(); }
const delay = 1000;
if (items.length > 50) { paginate(); }
```

### Good Examples

```csharp
// ✅ Named constants explain intent
private const int StatusApproved = 3;
private const int DefaultTimeoutMs = 30000;
private const int MaxRetryCount = 5;

if (status == StatusApproved) { /* ... */ }
var timeout = DefaultTimeoutMs;
if (retryCount > MaxRetryCount) { /* ... */ }
```

```typescript
// ✅ Constants or enums with clear names
const HTTP_UNAUTHORIZED = 401;
const ANIMATION_DELAY_MS = 1000;
const MAX_ITEMS_PER_PAGE = 50;

if (response.code === HTTP_UNAUTHORIZED) { handleUnauthorized(); }
const delay = ANIMATION_DELAY_MS;
if (items.length > MAX_ITEMS_PER_PAGE) { paginate(); }
```

### Exceptions

- Array indices (0, 1) in obvious contexts
- Math operations (multiply by 2, divide by 100 for percentage)
- Simple loops with clear intent
- Test data where the value itself is tested

## Comments

- Explain **why**, not **what**
- Don't state the obvious
- Keep documentation close to code
- Use `// TODO:`, `// FIXME:`, `// NOTE:` appropriately
