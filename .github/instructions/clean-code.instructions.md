---
applyTo: '**'
description: 'Universal clean code rules and coding standards for EasyPlatform'
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
- Validation Patterns: Use PlatformValidationResult fluent API. Chain validation with .And(), .AndAsync(), .AndNot() methods. Return validation results with meaningful error messages.
    - Validation Methods: `Validate[Context]()` returns `PlatformValidationResult<T>`, never throws
    - Ensure Methods: `Ensure[Context]Valid()` returns `void` or `T`, throws `PlatformValidationException` if invalid
    - At call site: Use `Validate...().EnsureValid()` instead of creating wrapper `Ensure...` methods
    - `EnsureFound()` - Throws if null; `EnsureFoundAllBy()` - Validates collection completeness
- Collections: Always use plural names (users, orders, items)

### Microservices Architecture Rules

- Service Independence: Each microservice is a distinct feature subdomain
- No Direct Dependencies: Services CANNOT directly depend on each other's assemblies or reference each other's domain/application layers
- Message Bus Communication: Cross-service communication MUST use message bus patterns only
- Shared Components: Only shared infrastructure components (Easy.Platform) can be referenced across services
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

**Frontend Examples:**

- Dropdown options → static method in entity: `Entity.getOptions()`
- Display logic (CSS class, text) → instance method in entity: `entity.getStatusCssClass()`
- Default values → static method in entity: `Entity.getDefaultValue()`
- Command building → factory class in service: `CommandFactory.buildSaveCommand(formValues)`

**Backend Examples:**

- Query conditions → static expression in entity: `Entity.IsActiveExpr()`
- Validation rules → instance method in entity: `entity.Validate()`
- Reused logic → Helper class or Repository extension

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
- Consumers don't need to sync all properties from the producer - they can define only the subset of properties they need

### Message Naming Convention

| Type    | Producer Role | Pattern                                           | Example                                            |
| ------- | ------------- | ------------------------------------------------- | -------------------------------------------------- |
| Event   | Leader        | `<ServiceName><Feature><Action>EventBusMessage`   | `CandidateJobBoardApiSyncCompletedEventBusMessage` |
| Request | Follower      | `<ConsumerServiceName><Feature>RequestBusMessage` | `JobCreateNonexistentJobsRequestBusMessage`        |

- **Event messages**: Producer defines the schema (leader). Named with producer's service name prefix.
- **Request messages**: Consumer defines the schema (leader). Named with consumer's service name prefix.
- **Consumer naming**: Consumer class name matches the message it consumes.

### Cross-Database Migration Guidelines

- Use cross-database migrations for first-time setup only
- Use pagination for large data migrations
- Cross-database contexts should be read-only (`ForCrossDbMigrationOnly = true`)
- Filter events based on business criteria using `HandleWhen`
