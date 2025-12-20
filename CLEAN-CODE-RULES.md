# EasyPlatform Clean Code Rules

## Architecture & Design Principles

### Team Communication & Concepts

- All team members must understand current project concepts (What, Why, Responsibility)
- Confirm with team before creating NEW CONCEPTS to maintain consistency
- Follow SOLID principles and Clean Architecture patterns

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

## Repository Pattern Rules

### Repository Pattern Priority

- Use generic platform repository interfaces: `IPlatformQueryableRootRepository<TEntity, TKey>`
- When working in a microservice, search for repository interfaces in the `{ServiceName}.Domain` project that inherit from `IPlatformQueryableRepository` or `IPlatformQueryableRootRepository`
- Use `GetAllAsync()` for returning lists (not `GetAsync()`)
- Use explicit parameter names: `cancellationToken: cancellationToken`
- Use `CreateOrUpdateAsync(entity, cancellationToken: cancellationToken)` for upserts
- Use `DeleteAsync(entityId, cancellationToken: cancellationToken)` for deletions by ID

### Repository Extensions Pattern

- Extend functionality by creating repository extension methods instead of custom repository interfaces
- Naming Convention: `{Entity}RepositoryExtensions` (e.g., `EmployeeRepositoryExtensions`, `UserRepositoryExtensions`)
- Use static expressions for reusable query logic

## Database & Persistence Rules

### MongoDB Persistence Guidance

- Use `PlatformMongoMigrationExecutor<TDbContext>` for MongoDB data migrations instead of EF Core migrations
- Create MongoDB indexes in migration files using `CreateIndexModel<TEntity>` pattern
- Access MongoDB collections through the `DbContext.{Entity}Collection` properties
- Use timestamp-based naming for migrations: `YYYYMMDDHHMM_DescriptiveName.cs`

### Data Seeder Pattern

- Each microservice application should include one main application data seeder with name equal to the project microservice name
- Centralized Seeding: This main seeder should seed all entity data needed in that project domain
- Naming Convention: `{ServiceName}ApplicationDataSeeder` (e.g., `GrowthApplicationDataSeeder`, `CandidateApplicationDataSeeder`)
- Follow Growth Example: Reference `GrowthApplicationDataSeeder` as the standard implementation pattern
- Avoid multiple small seeders - consolidate all domain seeding into the main seeder for better maintainability

## Universal Clean Code Principles

### Naming Conventions

- Use meaningful, descriptive names that explain intent
- Classes/Interfaces: PascalCase (`UserService`, `IRepository`)
- Methods/Functions: PascalCase (C#), camelCase (TypeScript) (`GetUserById`, `getUserById`)
- Variables/Fields: camelCase (`userName`, `isActive`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- Boolean variables: Use `is`, `has`, `can`, `should` prefixes (`isVisible`, `hasPermission`)

### Method Design

- Single Responsibility: One method = one purpose
- Pure functions: Avoid side effects when possible
- Early returns: Reduce nesting with guard clauses
- Consistent abstraction level: Don't mix high-level and low-level operations

### Code Organization

- Group related functionality together
- Separate concerns (business logic, data access, presentation)
- Use meaningful file/folder structure
- Keep dependencies flowing inward (Dependency Inversion)

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

## Backend Code Review Checklist

### Validation Standards

- Use PlatformValidationResult pattern for fluent validation chains
- Validation Methods: `Validate[Context]Valid`, `Has[Property]`, `Is[State]`, `Not[Condition]`
- Ensure Methods: `Ensure[Context]Valid` (returns object or throws)
- Collections: Always use plural names (`users`, `orders`, `items`)
- Context-Specific Names: Avoid generic names, use domain context

### Code Flow Principles

- Clear separation between steps with blank lines
- Group parallel operations (no dependencies) together
- Input → Process → Output pattern
- Early validation and guard clauses

### Commands/Queries Best Practices

- Commands: `PlatformCqrsCommand<TResult>`
- Queries: `PlatformCqrsQuery<TResult>`, `PlatformCqrsPagedQuery<TResult>`
- Results: `PlatformCqrsCommandResult`, `PlatformCqrsQueryResult`, `PlatformCqrsQueryPagedResult<T>`
- Handlers: `PlatformCqrsCommandApplicationHandler`, `PlatformCqrsQueryApplicationHandler`
- Naming Convention: `[Verb][Entity][Command]` → `SaveLeaveRequestCommand`, `ApproveOrderCommand`
- Queries: `Get[Entity][Query]` → `GetActiveUsersQuery`, `GetOrdersByStatusQuery`
- Handlers: `[CommandName]Handler` → `SaveLeaveRequestCommandHandler`

### Performance Considerations

- Use `ConfigureAwait(false)` in library code
- Prefer `IAsyncEnumerable<T>` for streaming data
- Use `ValueTask<T>` for frequently called async methods
- Implement proper caching strategies

### Security Guidelines

- Always validate user input
- Use parameterized queries (Entity Framework handles this)
- Implement proper authorization checks
- Log security-relevant events

## Anti-Patterns & Common Mistakes

### Backend Anti-Patterns to Avoid

- Cross-Service Direct Dependencies: Don't access other service databases directly
- Custom Repositories Instead of Platform Repositories: Use platform repository with extensions
- Manual Validation Logic: Use Platform Validation Fluent API instead
- Logic in Controllers: Use CQRS with Command Handlers
- Mixing Abstraction Levels: Keep consistent abstraction levels in methods

### Frontend Anti-Patterns to Avoid

- Direct HTTP Client Usage: Use Platform API Service instead
- Manual State Management: Use Platform Store Pattern
- Assuming method names without checking base class APIs
- Creating variations of existing methods without verification
- Using outdated patterns from other codebases without verification

## Custom Analyzer Rules (Platform Enforced)

### Code Flow Rules

- Missing blank line between dependent statements (EASY_PLATFORM_ANALYZERS_STEP001)
- Unexpected blank line within a step (EASY_PLATFORM_ANALYZERS_STEP002)
- Step must consume all previous outputs (EASY_PLATFORM_ANALYZERS_STEP003)

### Usage Rules

- Disallow 'using static' directive (EASY_PLATFORM_ANALYZERS_DISALLOW_USING_STATIC)

### Performance Rules

- Avoid O(n) LINQ inside loops (EASY_PLATFORM_ANALYZERS_PERF001)
- Avoid 'await' inside loops (EASY_PLATFORM_ANALYZERS_PERF002)

### Code Style Rules

- Nested conditional expression can be simplified (EASY_PLATFORM_ANALYZERS_CODESTYLE001)

## Decision Trees for Common Tasks

### Repository Pattern Decision

- Simple CRUD operations → Use IPlatformQueryableRootRepository<TEntity, TKey>
- Complex queries needed → Create RepositoryExtensions with static expressions
- Legacy custom repository exists → Gradually migrate to platform repository
- Cross-service data access → Use message bus instead

### Validation Pattern Decision

- Simple property validation → Command.Validate() method
- Async validation (DB check) → Handler.ValidateRequestAsync()
- Business rule validation → Entity.ValidateForXXX() method
- Cross-field validation → PlatformValidators.dateRange(), etc.

### Event Pattern Decision

- Within same service and Entity changed → EntityEventApplicationHandler
- Within same service and Command completed → CommandEventApplicationHandler
- Within same service and Domain event → DomainEventApplicationHandler
- Cross-service communication and Data sync needed → EntityEventBusMessageProducer/Consumer
- Cross-service communication and Notification needed → ApplicationBusMessageProducer
- Cross-service communication and Background processing → PlatformApplicationBackgroundJob

### Data Migration Pattern Decision

- New indexes only → PlatformMongoMigrationExecutor
- Large data migration → Use ExecuteInjectScopedPagingAsync()
- Continuous scrolling → Use ExecuteInjectScopedScrollingPagingAsync()
- Cross-database sync → Cross-database context (ForCrossDbMigrationOnly = true)
- One-time seeding → PlatformApplicationDataSeeder

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
