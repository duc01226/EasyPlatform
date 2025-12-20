# Code Conventions & Style Guide

## Naming Conventions

### C# (Backend)
- Classes/Interfaces: PascalCase (`UserService`, `IRepository`)
- Methods: PascalCase (`GetUserById`, `SaveAsync`)
- Variables/Fields: camelCase (`userName`, `isActive`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- Private fields: camelCase with no prefix (`private readonly repository`)
- Boolean: Use `is`, `has`, `can`, `should` prefixes (`isVisible`, `hasPermission`)

### TypeScript (Frontend)
- Classes/Interfaces: PascalCase (`UserService`, `UserModel`)
- Methods/Functions: camelCase (`getUserById`, `saveEmployee`)
- Variables: camelCase (`userName`, `isActive`)
- Constants: UPPER_SNAKE_CASE or camelCase (`MAX_RETRY_COUNT`, `defaultPageSize`)
- Angular Components: PascalCase class, kebab-case selector (`UserListComponent`, `app-user-list`)

## File Naming

### Backend
- Commands: `{Action}{Entity}Command.cs` (e.g., `SaveEmployeeCommand.cs`)
- Queries: `Get{Entity}[List|Detail]Query.cs` (e.g., `GetEmployeeListQuery.cs`)
- Event Handlers: `{Action}On{Event}{Entity}EntityEventHandler.cs`
- Repository Extensions: `{Entity}RepositoryExtensions.cs`
- Entities: `{Entity}.cs` (e.g., `Employee.cs`)
- DTOs: `{Entity}EntityDto.cs` or `{Entity}Dto.cs`

### Frontend
- Components: `{feature}.component.ts` (e.g., `employee-list.component.ts`)
- Stores: `{feature}.store.ts` (e.g., `employee-list.store.ts`)
- Services: `{domain}-api.service.ts` (e.g., `employee-api.service.ts`)
- Models: `{entity}.model.ts` (e.g., `employee.model.ts`)

## Code Organization

### Single Responsibility
- Each class/function should do ONE thing
- Keep methods short (< 30 lines preferred)
- Extract complex logic into helper methods

### Code Flow Pattern
1. Input validation (guard clauses)
2. Get dependencies/data
3. Process business logic
4. Return result

### Backend Handler Pattern
```csharp
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    // 1. Get or create entity
    var entity = req.Id.IsNullOrEmpty()
        ? req.MapToNewEntity()
        : await repository.GetByIdAsync(req.Id, ct);

    // 2. Apply changes
    entity = req.UpdateEntity(entity);

    // 3. Validate
    await entity.ValidateAsync().EnsureValidAsync();

    // 4. Save and return
    var saved = await repository.CreateOrUpdateAsync(entity, ct);
    return new Result { Entity = new EntityDto(saved) };
}
```

## Clean Code Rules

### SOLID Principles
- **S**ingle Responsibility: One reason to change per class
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes must be substitutable
- **I**nterface Segregation: Small, focused interfaces
- **D**ependency Inversion: Depend on abstractions

### 90% Logic Rule
If 90% of logic belongs to class A, place it in class A, not a third-party class B.

### DTO Mapping Responsibility
- Mapping from DTO to entity/value object is ALWAYS the DTO's responsibility
- Handler only calls `dto.MapToObject()` and uses `.With()` for post-mapping transformations

### Code Reuse
- Before writing new code, search for existing implementations
- Never duplicate mapping, validation, or business logic across handlers
- Extract common patterns into helpers or utilities

## Comments & Documentation

### When to Comment
- Complex business logic that isn't self-evident
- Workarounds with explanation of why
- Public APIs (XML docs for C#, JSDoc for TypeScript)

### When NOT to Comment
- Self-explanatory code
- Code you didn't modify
- Obvious getter/setter methods

## Error Handling

### Use Platform Validation
```csharp
// Prefer
return base.Validate().And(condition, "Error message");

// Avoid
if (!condition) throw new Exception("Error message");
```

### Use Ensure Methods
```csharp
await repository.GetByIdAsync(id).EnsureFound($"Not found: {id}");
```

## Avoid Over-Engineering

- Don't add features beyond what was asked
- Don't create abstractions for one-time operations
- Don't add error handling for impossible scenarios
- Don't design for hypothetical future requirements
- Three similar lines is better than premature abstraction
