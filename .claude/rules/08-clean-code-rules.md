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
| Constants          | UPPER_SNAKE_CASE                | `MAX_RETRY_COUNT`            |
| Booleans           | is, has, can, should prefix     | `isVisible`, `hasPermission` |
| Collections        | Plural                          | `users`, `orders`, `items`   |

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

## Comments

- Explain **why**, not **what**
- Don't state the obvious
- Keep documentation close to code
- Use `// TODO:`, `// FIXME:`, `// NOTE:` appropriately
