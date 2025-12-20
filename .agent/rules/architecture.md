# Architecture Rules

## Clean Architecture Layers

### Layer Structure (Inner to Outer)
1. **Domain Layer** - Business entities, domain events, static expressions
2. **Application Layer** - CQRS handlers, validators, DTOs, use case events
3. **Persistence Layer** - Repository implementations, database contexts
4. **Service Layer** - API controllers, external service integrations

### Layer Dependencies
- Domain has NO external dependencies
- Application depends only on Domain
- Persistence depends on Application and Domain
- Service depends on all layers

## Microservices Architecture

### Service Boundaries
- Each microservice owns its domain and database
- NEVER access another service's database directly
- Use RabbitMQ message bus for cross-service communication
- Use Entity Event Bus for data synchronization

### Example Application
| Application | Domain | Database |
|-------------|--------|----------|
| PlatformExampleApp.TextSnippet | Text Snippet CRUD Example | SQL Server/PostgreSQL |

This is a framework workspace with only the example application. Use `PlatformExampleApp.TextSnippet` patterns as reference for building new services.

## File Organization

### Backend Structure
```
src/PlatformExampleApp/
├── PlatformExampleApp.TextSnippet.Domain/       # Entities, Events, Expressions
├── PlatformExampleApp.TextSnippet.Application/  # Commands, Queries, Handlers
├── PlatformExampleApp.TextSnippet.Persistence/  # DbContext, Repositories
└── PlatformExampleApp.TextSnippet.Api/          # Controllers, Startup
```

### Frontend Structure
```
src/PlatformExampleAppWeb/
├── apps/                           # Micro frontend applications
│   └── playground-text-snippet/   # Text snippet example app
└── libs/                          # Shared libraries
    ├── platform-core/             # Base components, stores, utilities
    ├── apps-domains/              # Application domain models
    ├── share-styles/              # SCSS themes
    └── share-assets/              # Static assets
```

## Event-Driven Communication

### Cross-Service Sync Pattern
- Publisher: `PlatformCqrsEntityEventBusMessageProducer<TMessage, TEntity, TKey>`
- Consumer: `PlatformApplicationMessageBusConsumer<TMessage>`
- Always use `LastMessageSyncDate` to handle race conditions
- Wait for dependencies with `TryWaitUntilAsync()` before processing

### Entity Events (Automatic)
- Platform auto-raises `PlatformCqrsEntityEvent` on repository CRUD
- NO manual `AddDomainEvent()` needed
- Handle side effects in `PlatformCqrsEntityEventApplicationHandler<TEntity>`

## Investigation Protocol

### Before Any Implementation
1. Extract domain concepts from requirements
2. Search for existing implementations
3. Verify service ownership through code analysis
4. Check for established patterns in Platform framework
5. Never assume - always verify with code evidence
