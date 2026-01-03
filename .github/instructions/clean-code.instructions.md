---
applyTo: '**'
---

# EasyPlatform Clean Code Rules

### IMPORTANT UNIVERSAL CLEAN CODE RULES

- Do not repeat code logic or patterns. Reuse code.
- Follow SOLID principles and Clean Architecture patterns
- Method Design: Single Responsibility; Consistent abstraction level: Don't mix high-level and low-level operations; Dont mix infrastructure or technical logic into application, domain layer like QueryHandler/CommandHandler.
- Use meaningful, descriptive names that explain intent
- Classes/Interfaces: PascalCase (UserService, IRepository)
- Methods/Functions: PascalCase (C#), camelCase (TypeScript) (GetUserById, getUserById)
- Variables/Fields: camelCase (userName, isActive)
- Constants: UPPER_SNAKE_CASE (MAX_RETRY_COUNT)
- Boolean variables: Use is, has, can, should prefixes (isVisible, hasPermission)
- Code Organization: Group related functionality together; Separate concerns (business logic, data access, presentation); Use meaningful file/folder structure; Keep dependencies flowing inward (Dependency Inversion)
- Code Flow (Step-by-Step Pattern): Clear step-by-step flow with spacing; Group parallel operations (no dependencies) together; Follow Input → Process → Output pattern; Use early validation and guard clauses;
- Responsibility Placement: Business logic belongs to domain entities. Use static expressions for queries in entities. Instance validation methods in entities. DTO creation belongs to DTO classes.
- Validation Patterns: Use PlatformValidationResult fluent API. Chain validation with .And(), .AndAsync(), .AndNot() methods. Return validation results with meaningful error messages. Methods starting with `Validate` (e.g., `Validate[Context]()`) return `PlatformValidationResult`, never throw. Methods starting with `Ensure` (e.g., `Ensure[Context]Valid()`) throw if invalid. At call site: Use `Validate...().EnsureValid()` instead of creating wrapper methods.
- Collections: Always use plural names (users, orders, items)

### Microservices Architecture Rules

- Service Independence: Each microservice (TextSnippet, TextSnippet, TextSnippet, TextSnippet, Accounts, etc.) is a distinct feature subdomain
- No Direct Dependencies: Services CANNOT directly depend on each other's assemblies or reference each other's domain/application layers
- Message Bus Communication: Cross-service communication MUST use message bus patterns only
- Shared Components: Only shared infrastructure components (Easy.Platform, PlatformExampleApp.Shared) can be referenced across services
- Data Duplication: Each service maintains its own data models - data synchronization happens via message bus events
- Domain Boundaries: Each service owns its domain concepts and business logic - no cross-service domain logic

### Backend Layer Structure

- Domain Layer: Entity, Repository, ValueObject, DomainService, Exceptions, Helpers, Constants
- Application Layer: ApplicationService, InfrastructureService, DTOs, CQRS Commands/Queries, BackgroundJobs, CachingService, MessageBus, DataSeeder, RequestContext
- Infrastructure Layer: External service implementations, data access, file storage, messaging
- Presentation Layer: Controllers, API endpoints, middleware, authentication

## Platform-Specific Rules (EasyPlatform)

### Validation Patterns

- Use PlatformValidationResult fluent API
- Chain validation with `.And()`, `.AndAsync()`, `.AndNot()` methods
- Return validation results with meaningful error messages

### Code Flow (Step-by-Step Pattern)

- Clear step-by-step flow with spacing
- Group parallel operations (no dependencies) together
- Follow Input → Process → Output pattern
- Use early validation and guard clauses

### Responsibility Placement

- Business logic belongs to domain entities
- Use static expressions for queries in entities
- Instance validation methods in entities
- DTO creation belongs to DTO classes

### Code Responsibility Hierarchy (CRITICAL)

**Place logic in the LOWEST appropriate layer to enable reuse and prevent duplication:**

```
Entity/Model (Lowest)  →  Service  →  Component/Handler (Highest)
```

| Layer            | Responsibility                                                             |
| ---------------- | -------------------------------------------------------------------------- |
| **Entity/Model** | Business logic, display helpers, static factory methods, defaults, options |
| **Service**      | API calls, command factories, data transformation                          |
| **Component**    | UI event handling ONLY - delegates all logic to lower layers               |

**Anti-Pattern**: Logic in component/handler that should be in entity → leads to duplicated code.

#### Backend Violations and Fixes

```csharp
// ❌ WRONG: Mapping in Handler - violates class responsibility
internal sealed class SaveEntityCommandHandler : PlatformCqrsCommandApplicationHandler<SaveEntityCommand, SaveEntityCommandResult>
{
    protected override async Task<SaveEntityCommandResult> HandleAsync(SaveEntityCommand request, CancellationToken ct)
    {
        var entity = await repository.GetByIdAsync(request.Id, ct).EnsureFound();
        // ❌ This mapping logic should NOT be in Handler
        entity.Name = request.Name;
        entity.Value = request.Value;
        entity.UpdatedDate = Clock.UtcNow;
        await repository.UpdateAsync(entity, ct);
        return new SaveEntityCommandResult { Entity = new EntityDto(entity) };
    }
}

// ✅ CORRECT: Mapping belongs to Command class
public sealed class SaveEntityCommand : PlatformCqrsCommand<SaveEntityCommandResult>
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Value { get; set; } = "";

    // ✅ Command owns the mapping responsibility
    public Entity UpdateEntity(Entity entity)
    {
        entity.Name = Name;
        entity.Value = Value;
        entity.UpdatedDate = Clock.UtcNow;
        return entity;
    }
}

internal sealed class SaveEntityCommandHandler : PlatformCqrsCommandApplicationHandler<SaveEntityCommand, SaveEntityCommandResult>
{
    protected override async Task<SaveEntityCommandResult> HandleAsync(SaveEntityCommand request, CancellationToken ct)
    {
        var entity = await repository.GetByIdAsync(request.Id, ct).EnsureFound();
        request.UpdateEntity(entity); // ✅ Delegates to Command
        await repository.UpdateAsync(entity, ct);
        return new SaveEntityCommandResult { Entity = new EntityDto(entity) };
    }
}
```

#### Frontend Violations and Fixes

```typescript
// ❌ WRONG: Constants at module level or in component - violates class responsibility
const ADMIN_ROLES = ['Admin', 'Manager', 'Supervisor']; // ❌ Module-level constant
const STATUS_TYPES = [{ value: 1, label: 'Active' }, { value: 2, label: 'Inactive' }]; // ❌ Module-level

@Component({ ... })
export class KudosListComponent extends AppBaseVmStoreComponent<KudosListVm, KudosListStore> {
    // ❌ These should NOT be in Component
    readonly displayedColumns = ['name', 'date', 'status', 'actions'];
    readonly adminRoles = ADMIN_ROLES;

    // ❌ Display logic should NOT be in Component
    getStatusCssClass(status: KudosStatus): string {
        switch (status) {
            case KudosStatus.Approved: return 'badge--success';
            case KudosStatus.Pending: return 'badge--warning';
            case KudosStatus.Rejected: return 'badge--danger';
            default: return 'badge--default';
        }
    }
}

// ✅ CORRECT: Constants and display logic in domain model class
export class EntityCompanySetting {
    // ✅ Static constants in Model
    public static readonly adminRoles = ['Admin', 'Manager', 'Supervisor'];
}

export class KudosTransaction {
    id: string = '';
    status: KudosStatus = KudosStatus.Pending;

    // ✅ Static list columns in Model
    public static readonly listColumns = ['name', 'date', 'status', 'actions'];

    // ✅ Static method for status display
    public static getStatusCssClass(status: KudosStatus): string {
        const statusMap: Record<KudosStatus, string> = {
            [KudosStatus.Approved]: 'badge--success',
            [KudosStatus.Pending]: 'badge--warning',
            [KudosStatus.Rejected]: 'badge--danger'
        };
        return statusMap[status] ?? 'badge--default';
    }

    // ✅ Instance getter for convenience
    public get statusCssClass(): string {
        return KudosTransaction.getStatusCssClass(this.status);
    }
}

export class EntityType {
    // ✅ Dropdown options in Model
    public static readonly dropdownOptions = [
        { value: 1, label: 'Standard' },
        { value: 2, label: 'Premium' }
    ];

    public static getDisplayLabel(value: number): string {
        return this.dropdownOptions.find(x => x.value === value)?.label ?? '';
    }
}

@Component({ ... })
export class KudosListComponent extends AppBaseVmStoreComponent<KudosListVm, KudosListStore> {
    // ✅ Component just references Model
    readonly displayedColumns = KudosTransaction.listColumns;
    readonly adminRoles = EntityCompanySetting.adminRoles;
    readonly entityTypes = EntityType.dropdownOptions;
}
```

#### Pattern Summary Tables

**Frontend Patterns:**

| Pattern | Where | Example |
|---------|-------|---------|
| Dropdown options | static property in model | `Entity.dropdownOptions` |
| Display logic | instance getter in model | `entity.statusCssClass` |
| Table columns | static property in model | `Entity.listColumns` |
| Role constants | static property in model | `Entity.adminRoles` |
| Default values | static method in model | `Entity.getDefaultValue()` |
| Command building | method in ViewModel | `vm.buildCommand()` |

**Backend Patterns:**

| Pattern | Where | Example |
|---------|-------|---------|
| Query conditions | static expression in entity | `Entity.IsActiveExpr()` |
| Validation rules | instance method in entity | `entity.Validate()` |
| Entity mapping | method in Command | `command.UpdateEntity(entity)` |
| Entity mapping | method in DTO | `dto.MapToEntity(entity)` |
| Reused logic | Helper class or Repository extension | `repo.GetByCodeAsync(code)` |

## Frontend Component Rules

### Component Hierarchy Decision

- Simple UI display → Extend `AppBaseComponent`
- Complex state management → Extend `AppBaseVmStoreComponent<State, Store>`
- Form with validation → Extend `AppBaseFormComponent<FormVm>`
- Component with store and form → Extend `AppBaseVmStoreComponent` + inject form service
- Platform library component → Extend `PlatformComponent` (rare)

### Component Reuse vs New Component Decision

- Can the requirement be met by passing additional generic, optional inputs to an existing component/form without leaking foreign domain logic? → Reuse existing component
- Can we compose a thin wrapper (template-only/minimal TS) around existing store/components instead of introducing a new store/component? → Create wrapper
- Do not inject other domain's concepts into a component → Enhance with neutral inputs
- Existing components cannot reasonably fulfill the requirement even with generic enhancements → Create new component
- The new behavior would complicate existing components with unrelated concerns or violate separation of concerns → Create new component
- Prefer a thin tab/wrapper + reused store/components over a full new panel with its own store
- Keep new inputs optional and backward-compatible

### Component Method Verification Pattern

- Always verify component base class methods before using them
- Check inheritance chain - Read the actual base class before using methods
- Verify through IntelliSense - Let TypeScript guide available methods
- Search existing usage - Look for patterns in working components
- Prefer composition over assumptions - Use what exists rather than inventing

## Cross-Service Data Synchronization Rules

### Entity Event Producers and Consumers

- Sync data between microservices via entity event producers and consumers, not background jobs
- Each microservice has its own database and maintains data consistency through event-driven architecture
- Producer Naming: `[Entity]EntityEventBusMessageProducer`
- Consumer Naming: `UpsertOrDelete[Entity]InfoOn[SourceEntity]EntityEventBusConsumer`
- Message Naming: `[Entity]EntityEventBusMessage`
- Consumers don't need to sync all properties from the producer - they can define only the subset of properties they need

### Cross-Database Migration Guidelines

- Use cross-database migrations for first-time setup only
- Use pagination for large data migrations
- Cross-database contexts should be read-only (`ForCrossDbMigrationOnly = true`)
- Filter events based on business criteria using `HandleWhen`
