# Easy.Platform - Code Instructions

<!-- SECTION:tldr -->

> **Project:** Easy.Platform — A .NET 9 framework for building microservices with CQRS, event-driven architecture, and multi-database support. Includes PlatformExampleApp (TextSnippet) as reference implementation.
>
> **Tech Stack:** csharp, typescript + Easy.Platform
>
> **Apps/Services:** Easy.Platform, Easy.Platform.AspNetCore, Easy.Platform.MongoDB, Easy.Platform.EfCore, Easy.Platform.RabbitMQ, Easy.Platform.RedisCache, Easy.Platform.AutomationTest, Easy.Platform.AzureFileStorage, Easy.Platform.FirebasePushNotification, Easy.Platform.HangfireBackgroundJob, TextSnippet.Api, TextSnippet.Application, TextSnippet.Domain, TextSnippet.Infrastructure, TextSnippet.Persistence, TextSnippet.Persistence.Mongo, TextSnippet.Persistence.PostgreSql, PlatformExampleApp.Shared, TextSnippet.Persistence.MultiDbDemo.Mongo, PlatformExampleApp.Ids, PlatformExampleApp.IntegrationTests, PlatformExampleApp.Test.Shared, PlatformExampleApp.Test, PlatformExampleApp.Test.BDD, PlatformExampleApp.Benchmark, Easy.Platform.Benchmark, Easy.Platform.CustomAnalyzers, Easy.Platform.Tests.Unit, playground-text-snippet, platform-core, text-snippet-domain, apps-domains-components, apps-shared-components, platform-components

<!-- /SECTION:tldr -->

## Contents

- [TL;DR — What You Must Know Before Writing Any Code](#tldr--what-you-must-know-before-writing-any-code)
- [Naming Conventions](#naming-conventions)
- [Key File Locations](#key-file-locations)
- [Development Commands](#development-commands)
- [API Ports](#api-ports)
- [Local System Startup](#local-system-startup)
- [Integration Testing](#integration-testing)
- [E2E Testing](#e2e-testing)
- [Documentation Index](#documentation-index)
- [Doc Lookup — What to Read When](#doc-lookup--what-to-read-when)

## TL;DR — What You Must Know Before Writing Any Code

<!-- SECTION:golden-rules -->

Read the relevant project convention before changing these files.

| Files | Project reference |
|---|---|
| src[\\/]PlatformExampleApp[\\/], src[\\/]Platform[\\/]; extensions: .cs, .csproj | `docs/project-reference/backend-patterns-reference.md` |
| src[\\/]PlatformExampleAppWeb[\\/]; extensions: .ts, .html, .scss | `docs/project-reference/frontend-patterns-reference.md` |

<!-- /SECTION:golden-rules -->

**Architecture Hierarchy** — Place logic in LOWEST layer: `Entity/Model > Service > Component/Handler`

**First Principles (Code Quality in AI Era):**

1. **Understanding > Output** — Never ship code you can't explain. AI generates candidates; humans validate intent.
2. **Design Before Mechanics** — Document WHY before WHAT. A 3-sentence rationale prevents 3-day debugging sessions.
3. **Own Your Abstractions** — Every dependency, framework, and runtime/provider decision is YOUR responsibility.
4. **Operational Awareness** — Code that works but can't be debugged, monitored, or rolled back is technical debt in disguise.
5. **Depth Over Breadth** — One well-understood solution beats ten AI-generated variants.

<!-- SECTION:decision-quick-ref -->

**Decision Quick-Ref:**

| Task | Pattern |
|---|---|
| Backend conventions | Read `docs/project-reference/backend-patterns-reference.md` |
| Frontend conventions | Read `docs/project-reference/frontend-patterns-reference.md` |
| Message consumer convention | PlatformApplicationMessageBusConsumer<TMessage> |

<!-- /SECTION:decision-quick-ref -->

## Naming Conventions

| Type        | Convention       | Example                                |
| ----------- | ---------------- | -------------------------------------- |
| Constants   | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`                      |
| Booleans    | Prefix with verb | `isActive`, `hasPermission`, `canEdit` |
| Collections | Plural           | `users`, `items`, `orders`             |

---

## Key File Locations

<!-- SECTION:key-locations -->

```
src/Platform/Easy\.Platform/             # Core framework library — CQRS, entities, validation, repositories, message bus abstractions
src/Platform/Easy\.Platform\.AspNetCore/ # ASP.NET Core integration — controllers, middleware, DI
src/Platform/Easy\.Platform\.MongoDB/    # MongoDB persistence provider
src/Platform/Easy\.Platform\.EfCore/     # EF Core persistence provider (PostgreSQL, SQL Server)
src/Platform/Easy\.Platform\.RabbitMQ/   # RabbitMQ message bus implementation
src/Platform/Easy\.Platform\.RedisCache/ # Redis caching provider
src/Platform/Easy\.Platform\.AutomationTest/ # Test framework — integration test base classes and helpers
src/Platform/Easy\.Platform\.AzureFileStorage/ # Azure Blob Storage file storage provider
src/Platform/Easy\.Platform\.FireBasePushNotification/ # Firebase push notification provider
src/Platform/Easy\.Platform\.HangfireBackgroundJob/ # Hangfire background job integration
src/PlatformExampleApp/PlatformExampleApp\.TextSnippet\.Api/ # Example app API host — controllers, DI modules, startup
src/PlatformExampleApp/PlatformExampleApp\.TextSnippet\.Application/ # Example app application layer — CQRS commands, queries, DTOs, event handlers
src/PlatformExampleApp/PlatformExampleApp\.TextSnippet\.Domain/ # Example app domain layer — entities, repositories, domain events
src/PlatformExampleApp/PlatformExampleApp\.TextSnippet\.Infrastructure/ # Example app infrastructure — external service integrations
src/PlatformExampleApp/PlatformExampleApp\.TextSnippet\.Persistence/ # Example app EF Core persistence (SQL Server/PostgreSQL)
src/PlatformExampleApp/PlatformExampleApp\.TextSnippet\.Persistence\.Mongo/ # Example app MongoDB persistence
src/PlatformExampleApp/PlatformExampleApp\.TextSnippet\.Persistence\.PostgreSql/ # Example app PostgreSQL-specific persistence
src/PlatformExampleApp/PlatformExampleApp\.Shared/  # Shared DTOs and message contracts across example app services
src/PlatformExampleApp/PlatformExampleApp\.TextSnippet\.Persistence\.MultiDbDemo\.Mongo/ # Example app multi-database demo MongoDB persistence
src/PlatformExampleApp/PlatformExampleApp\.Ids/     # Identity server — authentication and authorization
src/PlatformExampleApp/PlatformExampleApp\.IntegrationTests/ # Integration test suite for example app
src/PlatformExampleApp/PlatformExampleApp\.Test\.Shared/ # Shared test utilities and helpers across test projects
src/PlatformExampleApp/PlatformExampleApp\.Test/    # Unit test project for example app
src/PlatformExampleApp/PlatformExampleApp\.Test\.BDD/ # BDD test project for example app
src/PlatformExampleApp/PlatformExampleApp\.Benchmark/ # Benchmarking project
src/Platform/Easy\.Platform\.Benchmark/  # Benchmarking project for Platform framework
src/Platform/Easy\.Platform\.CustomAnalyzers/ # Custom Roslyn analyzers for code quality enforcement
src/Platform/Easy\.Platform\.Tests\.Unit/ # Unit tests for Platform framework
src/PlatformExampleAppWeb/apps/playground-text-snippet/ # Angular frontend app for TextSnippet example
src/PlatformExampleAppWeb/libs/platform-core/         # Frontend framework core — base components, stores, API services, utilities
src/PlatformExampleAppWeb/libs/apps-domains/text-snippet-domain/ # Frontend domain library for TextSnippet
src/PlatformExampleAppWeb/libs/apps-domains-components/ # Domain-specific UI components
src/PlatformExampleAppWeb/libs/apps-shared-components/ # Shared UI components across apps
src/PlatformExampleAppWeb/libs/platform-components/   # Platform-level reusable UI components
```

<!-- /SECTION:key-locations -->

## Development Commands

<!-- SECTION:dev-commands -->

```bash
dotnet test src/PlatformExampleApp/PlatformExampleApp.Test/ # backend-unit
dotnet test src/PlatformExampleApp/PlatformExampleApp.IntegrationTests/ # backend-integration
dotnet test src/PlatformExampleApp/PlatformExampleApp.Test.BDD/ # backend-bdd
cd src/PlatformExampleAppWeb && npm test                   # frontend-unit
cd src/PlatformExampleAppWeb/e2e && npx playwright test    # e2e
```

<!-- /SECTION:dev-commands -->

## API Ports

<!-- SECTION:api-ports -->

| API Service | Port |
|---|---|
| TextSnippet.Api | 5000 |

<!-- /SECTION:api-ports -->

## Local System Startup

Start order: **Infrastructure → Backend API → Frontend**. Docker compose files in `src/`.

### Quick Start

| Goal                     | Command                                                 |
| ------------------------ | ------------------------------------------------------- |
| **Full system (Docker)** | `src/start-dev-platform-example-app.cmd`                |
| **MongoDB variant**      | `src/start-dev-platform-example-app-mongodb.cmd`        |
| **PostgreSQL variant**   | `src/start-dev-platform-example-app-postgres.cmd`       |
| **SQL Server variant**   | `src/start-dev-platform-example-app-usesql.cmd`         |
| **No rebuild**           | `src/start-dev-platform-example-app-NO-REBUILD.cmd`     |
| **Reset all data**       | `src/start-dev-platform-example-app-RESET-DATA.cmd`     |
| **Infra only**           | `src/start-dev-platform-example-app.infrastructure.cmd` |

**Notes:** Docker port mappings use bare `HOST:CONTAINER` form (e.g. `27017:27017`, `54320:5432`, `5672:5672`), so Docker binds them to `0.0.0.0` — dev infra (MongoDB/PostgreSQL/SQL Server/RabbitMQ/Redis) is reachable from the local network, not just localhost. To restrict to localhost, prefix host ports with `127.0.0.1:` in `src/platform-example-app.docker-compose.override.yml`. See that file for full configuration.

## Integration Testing

<!-- SECTION:integration-testing -->

See [integration-test-reference.md](docs/project-reference/integration-test-reference.md) for integration test patterns and setup.

<!-- /SECTION:integration-testing -->

## E2E Testing

<!-- SECTION:e2e-testing -->

Full guide: [e2e-test-reference.md](docs/project-reference/e2e-test-reference.md) for E2E test patterns, test organization, and execution configuration.

<!-- /SECTION:e2e-testing -->

---

## Documentation Index

<!-- SECTION:doc-index -->

```
docs/project-reference/  (19 files)
docs/templates/  (1 files)
```

<!-- /SECTION:doc-index -->

## Doc Lookup — What to Read When

<!-- SECTION:doc-lookup -->

Match the question or task to a row and read that doc before answering, planning, or editing; every row names a file or folder that exists in this repo.

| If user prompt mentions... | Read first |
|---|---|
| Any project question or task — start here: paths, commands, modules, conventions | `docs/project-config.json` |
| Where a topic is documented — keyword-to-doc routing | `docs/project-reference/docs-index-reference.md` |
| Any non-trivial task — learned project guardrails | `docs/project-reference/lessons.md` |
| Feature specs, capability behavior, business rules, test cases | `docs/project-reference/feature-spec-reference.md` |
| Spec paths, TC format, canonical vs derived spec artifacts | `docs/project-reference/spec-system-reference.md` |
| Spec quality, AI-implementability, tech-agnostic prose | `docs/project-reference/spec-principles.md` |
| Behavior or public contract changes, spec-test-code sync | `docs/project-reference/workflow-spec-test-code-cycle-reference.md` |
| Backend patterns, CQRS, validation | `docs/project-reference/backend-patterns-reference.md` |
| Frontend patterns, components, stores | `docs/project-reference/frontend-patterns-reference.md` |
| Where code lives, modules, stack, setup — before planning or investigating. Holds: Project directory structure, tech stack overview | `docs/project-reference/project-structure-reference.md` |
| Seeding or reviewing development/test data. Holds: Seed test data patterns: idempotent seeder architecture, DI scope safety, command dispatch, and config-driven counts | `docs/project-reference/seed-test-data-reference.md` |
| Writing, fixing, or reviewing integration tests. Holds: Integration testing patterns and base classes | `docs/project-reference/integration-test-reference.md` |
| Before editing or reviewing code — rules, anti-patterns, checklists. Holds: Code review standards and checklists | `docs/project-reference/code-review-rules.md` |
| Style files — styling conventions, theming, responsive rules. Holds: SCSS styling conventions, BEM naming, theming | `docs/project-reference/scss-styling-guide.md` |
| UI design — tokens, components, app-to-doc map. Holds: Design system index: app-to-doc mapping, design tokens overview, component inventory | `docs/project-reference/design-system/README.md` |
| Writing, running, or reviewing E2E / user-flow tests. Holds: E2E testing with Playwright — page objects, fixtures, config | `docs/project-reference/e2e-test-reference.md` |
| Domain concepts, entities, relationships, data ownership — before planning or design. Holds: Domain entity catalog and relationships | `docs/project-reference/domain-entities-reference.md` |

<!-- /SECTION:doc-lookup -->
