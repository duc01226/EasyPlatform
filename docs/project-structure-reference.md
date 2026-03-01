# Project Structure Reference

## EasyPlatform Architecture Overview

EasyPlatform is a .NET 9 framework for building microservices with CQRS, event-driven architecture, and multi-database support. The repository contains two main codebases:

1. **Easy.Platform** -- the reusable framework (NuGet-packageable)
2. **PlatformExampleApp** -- a reference implementation (TextSnippet app) demonstrating all framework patterns

| Layer           | Project                 | Port | Database | Directory                                         |
| --------------- | ----------------------- | ---- | -------- | ------------------------------------------------- |
| API             | TextSnippet.Api         | 5001 | Multi-DB | `src/Backend/PlatformExampleApp.TextSnippet.Api/` |
| Frontend        | playground-text-snippet | 4001 | --       | `src/Frontend/apps/playground-text-snippet/`      |
| Identity Server | PlatformExampleApp.Ids  | --   | --       | `src/Backend/PlatformExampleApp.Ids/`             |

### Persistence Providers (swappable via config)

| Provider              | Project                                     | Default Port |
| --------------------- | ------------------------------------------- | ------------ |
| SQL Server (EF Core)  | `TextSnippet.Persistence`                   | 14330        |
| MongoDB               | `TextSnippet.Persistence.Mongo`             | 27017        |
| PostgreSQL (EF Core)  | `TextSnippet.Persistence.PostgreSql`        | 54320        |
| Multi-DB Demo (Mongo) | `TextSnippet.Persistence.MultiDbDemo.Mongo` | 27017        |

## Infrastructure Ports

| Service       | Port                               | Credentials         |
| ------------- | ---------------------------------- | ------------------- |
| MongoDB       | 127.0.0.1:27017                    | root / rootPassXXX  |
| Elasticsearch | 127.0.0.1:9200                     | (no auth)           |
| RabbitMQ      | 127.0.0.1:5672 (AMQP), :15672 (UI) | guest / guest       |
| Redis         | 127.0.0.1:6379                     | --                  |
| PostgreSQL    | 127.0.0.1:54320                    | postgres / postgres |
| SQL Server    | 127.0.0.1:14330 (optional)         | sa / 123456Abc      |

## Project Directory Tree

```
EasyPlatform/
├── src/
│   ├── Platform/                                    # Easy.Platform framework (reusable core)
│   │   ├── Easy.Platform/                           #   Core: CQRS, entities, validation, DI, events
│   │   ├── Easy.Platform.AspNetCore/                #   ASP.NET Core integration (controllers, middleware)
│   │   ├── Easy.Platform.AutomationTest/            #   Test framework (integration test base classes)
│   │   ├── Easy.Platform.AzureFileStorage/          #   Azure Blob Storage provider
│   │   ├── Easy.Platform.Benchmark/                 #   Benchmarking utilities
│   │   ├── Easy.Platform.CustomAnalyzers/           #   Roslyn analyzers for code quality
│   │   ├── Easy.Platform.EfCore/                    #   Entity Framework Core persistence
│   │   ├── Easy.Platform.FireBasePushNotification/  #   Firebase push notification provider
│   │   ├── Easy.Platform.HangfireBackgroundJob/     #   Hangfire background job integration
│   │   ├── Easy.Platform.IntegrationTest/           #   Integration test infrastructure
│   │   ├── Easy.Platform.MongoDB/                   #   MongoDB persistence
│   │   ├── Easy.Platform.RabbitMQ/                  #   RabbitMQ message bus
│   │   └── Easy.Platform.RedisCache/                #   Redis caching
│   │
│   ├── Backend/                                     # PlatformExampleApp (TextSnippet reference app)
│   │   ├── PlatformExampleApp.TextSnippet.Api/      #   API layer: controllers, startup, config
│   │   │   └── Controllers/                         #     TextSnippetController, TaskItemController
│   │   ├── PlatformExampleApp.TextSnippet.Application/  # Application layer: CQRS handlers, DTOs
│   │   │   ├── UseCaseCommands/                     #     Command + Result + Handler (one file each)
│   │   │   ├── UseCaseQueries/                      #     Query handlers
│   │   │   ├── UseCaseEvents/                       #     Entity event handlers (side effects)
│   │   │   ├── Dtos/                                #     EntityDtos (DTO owns mapping)
│   │   │   ├── MessageBus/                          #     Consumers, Producers, FreeFormatMessages
│   │   │   ├── BackgroundJob/                       #     Background job executors
│   │   │   ├── Caching/                             #     Cache key providers, configuration
│   │   │   ├── DataSeeders/                         #     Initial data seeding
│   │   │   ├── Context/                             #     Application context
│   │   │   ├── CqrsPipelineMiddleware/              #     CQRS pipeline middleware
│   │   │   ├── Persistence/                         #     Persistence abstractions
│   │   │   └── RequestContext/                      #     Request context (user, tenant)
│   │   ├── PlatformExampleApp.TextSnippet.Domain/   #   Domain layer: entities, repositories, events
│   │   │   ├── Entities/                            #     TextSnippetEntity, User, TaskItemEntity, etc.
│   │   │   ├── Repositories/                        #     ITextSnippetRootRepository, IUserRootRepository
│   │   │   ├── Events/                              #     Domain events
│   │   │   ├── Services/                            #     Domain services
│   │   │   ├── ValueObjects/                        #     Value objects (ExampleAddressValueObject)
│   │   │   └── Helpers/                             #     Domain helpers
│   │   ├── PlatformExampleApp.TextSnippet.Infrastructure/  # External services (email, etc.)
│   │   ├── PlatformExampleApp.TextSnippet.Persistence/     # EF Core (SQL Server) persistence
│   │   │   ├── EntityConfigurations/                #     EF entity configurations
│   │   │   ├── Migrations/                          #     EF migrations
│   │   │   └── DataMigrations/                      #     Platform data migrations
│   │   ├── PlatformExampleApp.TextSnippet.Persistence.Mongo/    # MongoDB persistence
│   │   ├── PlatformExampleApp.TextSnippet.Persistence.PostgreSql/  # PostgreSQL (EF Core) persistence
│   │   ├── PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo/  # Multi-DB demo
│   │   ├── PlatformExampleApp.Tests.Integration/    #   Integration tests (subcutaneous CQRS)
│   │   │   ├── TextSnippet/                         #     TextSnippet command/query tests
│   │   │   ├── TaskItem/                            #     TaskItem tests
│   │   │   ├── Smoke/                               #     Smoke tests
│   │   │   └── Infrastructure/                      #     Test infrastructure, fixtures
│   │   ├── PlatformExampleApp.TextSnippet.ContractTests/  # Contract/schema tests
│   │   ├── PlatformExampleApp.Shared/               #   Shared code across backend projects
│   │   ├── PlatformExampleApp.Ids/                  #   Identity Server (auth)
│   │   ├── PlatformExampleApp.Test.Shared/          #   Shared test utilities
│   │   ├── PlatformExampleApp.Test.BDD/             #   BDD tests
│   │   └── PlatformExampleApp.Benchmark/            #   Benchmark tests
│   │
│   ├── Frontend/                                    # Angular + Nx workspace
│   │   ├── apps/
│   │   │   └── playground-text-snippet/             #   Example frontend app (port 4001)
│   │   │       └── src/app/                         #     App component, routes, store, events
│   │   └── libs/
│   │       ├── platform-core/                       #   Frontend framework core
│   │       │   └── src/lib/
│   │       │       ├── components/                  #     Base components (PlatformComponent, etc.)
│   │       │       ├── api-services/                #     PlatformApiService base
│   │       │       ├── domain/                      #     PlatformVmStore, state management
│   │       │       ├── helpers/                     #     Utility functions
│   │       │       ├── directives/                  #     Platform directives
│   │       │       ├── pipes/                       #     Platform pipes
│   │       │       ├── decorators/                  #     @Watch and other decorators
│   │       │       ├── rxjs/                        #     RxJS utilities
│   │       │       ├── http-services/               #     HTTP service abstractions
│   │       │       └── form-validators/             #     Form validation
│   │       ├── platform-components/                 #   Reusable UI components library
│   │       ├── apps-shared-components/              #   Shared components across apps
│   │       ├── apps-domains/                        #   Domain API/model libraries
│   │       │   └── text-snippet-domain/             #     TextSnippet APIs, data models, repositories
│   │       └── apps-domains-components/             #   Domain-specific UI components
│   │
│   ├── Learning/                                    # Learning/example projects
│   └── Easy.Platform.sln                            # Solution file
│
├── docs/                                            # Documentation
│   ├── backend-patterns-reference.md                #   Backend code patterns (MUST READ)
│   ├── frontend-patterns-reference.md               #   Frontend code patterns (MUST READ)
│   ├── code-review-rules.md                         #   Code review standards
│   ├── codebase-summary.md                          #   High-level project overview
│   ├── lessons.md                                   #   Learned lessons
│   ├── project-structure-reference.md               #   This file
│   ├── design-system/                               #   Design tokens, BEM, SCSS
│   ├── architecture-decisions/                      #   ADRs
│   ├── test-specs/                                  #   Test specifications
│   ├── templates/                                   #   Doc templates
│   └── claude/                                      #   AI dev docs
│
└── .claude/                                         # Claude Code configuration
    ├── skills/                                      #   155+ skills
    ├── hooks/                                       #   Automation hooks
    └── agents/                                      #   AI agents
```

## Tech Stack Summary

- **Backend:** .NET 9 + Easy.Platform framework + CQRS + MongoDB / SQL Server / PostgreSQL
- **Frontend:** Angular + Nx monorepo + TypeScript
- **Messaging:** RabbitMQ (cross-service event-driven communication)
- **Search:** Elasticsearch
- **Caching:** Redis
- **Background Jobs:** Hangfire
- **File Storage:** Azure Blob Storage
- **Push Notifications:** Firebase
- **Testing:** xUnit + PlatformServiceIntegrationTestWithAssertions (subcutaneous CQRS)
- **Containerization:** Docker + Docker Compose

## Clean Architecture Layers

Each backend feature follows strict layered architecture. Dependencies flow inward only.

```
Api → Application → Domain ← Persistence
                  ↑
              Infrastructure
```

| Layer              | Responsibility                                                | Key Base Classes                                                      |
| ------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Domain**         | Entities, repository interfaces, domain events, value objects | `RootEntity<T, TKey>`, `IPlatformQueryableRootRepository`             |
| **Application**    | CQRS commands/queries, DTOs, event handlers, message bus      | `PlatformCqrsCommandApplicationHandler`, `PlatformCqrsPagedQuery`     |
| **Persistence**    | Repository implementations, DB context, migrations            | `PlatformEfCorePersistenceModule`, `PlatformMongoDbPersistenceModule` |
| **Infrastructure** | External services (email, file storage)                       | Service-specific modules                                              |
| **Api**            | Controllers, startup, config                                  | `PlatformBaseController`                                              |

## Domain Entities

| Entity                | Key Type | Description                                       |
| --------------------- | -------- | ------------------------------------------------- |
| `TextSnippetEntity`   | `string` | Core demo entity -- text snippets with categories |
| `User`                | `string` | User entity                                       |
| `TaskItemEntity`      | `string` | Task/todo item entity                             |
| `MultiDbDemoEntity`   | `string` | Multi-database demo entity                        |
| `TextSnippetCategory` | --       | Category value/enum for text snippets             |

## Repository Interfaces

| Interface                             | Entity            | Location                           |
| ------------------------------------- | ----------------- | ---------------------------------- |
| `ITextSnippetRootRepository<TEntity>` | TextSnippetEntity | `TextSnippet.Domain/Repositories/` |
| `IUserRootRepository<TEntity>`        | User              | `TextSnippet.Domain/Repositories/` |

Both extend `IPlatformQueryableRootRepository<TEntity, string>`.

## Module Codes

Used in test case IDs (`TC-{MOD}-{NNN}`):

| Code | Module/Layer              |
| ---- | ------------------------- |
| TXT  | TextSnippet (Application) |
| TSK  | TaskItem                  |
| USR  | User                      |
| PLT  | Platform Framework Core   |
| PER  | Persistence               |
| MSG  | MessageBus                |
| BGJ  | BackgroundJobs            |
| INT  | Integration Tests         |
| FE   | Frontend                  |

## Quick Start Commands

| Goal                     | Command                                                               |
| ------------------------ | --------------------------------------------------------------------- |
| **Full system (Docker)** | `src/start-dev-platform-example-app.cmd`                              |
| **MongoDB variant**      | `src/start-dev-platform-example-app-mongodb.cmd`                      |
| **PostgreSQL variant**   | `src/start-dev-platform-example-app-postgres.cmd`                     |
| **SQL Server variant**   | `src/start-dev-platform-example-app-usesql.cmd`                       |
| **No rebuild**           | `src/start-dev-platform-example-app-NO-REBUILD.cmd`                   |
| **Reset all data**       | `src/start-dev-platform-example-app-RESET-DATA.cmd`                   |
| **Infra only**           | `src/start-dev-platform-example-app.infrastructure.cmd`               |
| **Build backend**        | `dotnet build Easy.Platform.sln`                                      |
| **Run API**              | `dotnet run --project src/Backend/PlatformExampleApp.TextSnippet.Api` |
| **Frontend install**     | `cd src/Frontend && npm install`                                      |
| **Frontend dev**         | `cd src/Frontend && npm start`                                        |

## Module Detection Keywords

### TextSnippet (TXT)

text snippet, snippet, save snippet, search snippet, text content, snippet category, CRUD demo, example app, reference implementation

### TaskItem (TSK)

task, task item, todo, checklist, task management

### Platform Framework (PLT)

platform, framework, CQRS, command handler, query handler, entity event, validation, repository, background job, message bus, data migration, persistence module, unit of work

### Frontend (FE)

angular, component, store, vm store, form, api service, platform-core, directive, pipe, decorator, BEM, SCSS

### Persistence (PER)

database, EF Core, MongoDB, PostgreSQL, SQL Server, migration, db context, entity configuration, persistence module, repository implementation

### MessageBus (MSG)

RabbitMQ, message bus, consumer, producer, event bus, cross-service, message, pub/sub

### Integration Tests (INT)

integration test, test fixture, test assertion, subcutaneous test, CQRS test, command test, query test
