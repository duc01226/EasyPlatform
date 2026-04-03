<!-- Last scanned: 2026-04-03 -->
<!-- CRITICAL: Logic in LOWEST layer: Entity/Model > Service > Component/Handler. Search 3+ patterns before writing code. -->

# Project Structure Reference

Easy.Platform is a .NET 9 framework for microservices with CQRS, event-driven architecture, and multi-database support. PlatformExampleApp (TextSnippet) is the reference implementation. Solution file: `src/Easy.Platform.sln`.

## Service Architecture

| Service                             | Type                           | Port                          | Dockerfile                                                  |
| ----------------------------------- | ------------------------------ | ----------------------------- | ----------------------------------------------------------- |
| text-snippet-api                    | .NET 9 API                     | 5001 (host) -> 80 (container) | `src/Backend/PlatformExampleApp.TextSnippet.Api/Dockerfile` |
| text-snippet-webspa                 | Angular SPA                    | 4001 (host) -> 80 (container) | `src/Frontend/apps/playground-text-snippet/Dockerfile`      |
| text-snippet-automation-test        | Selenium test runner           | --                            | `src/Backend/PlatformExampleApp.Test/Dockerfile`            |
| text-snippet-automation-test-bdd-\* | BDD test (Chrome/Edge/Firefox) | --                            | `src/Backend/PlatformExampleApp.Test.BDD/Dockerfile`        |

**API launch profiles** (`src/Backend/PlatformExampleApp.TextSnippet.Api/Properties/launchSettings.json`): Default, UsePostgres, UseSql, UseMongoDb -- all on `http://localhost:5001`.

## Infrastructure Ports

| Service      | Image                      | Host Port               | Container Port | Credentials         |
| ------------ | -------------------------- | ----------------------- | -------------- | ------------------- |
| MongoDB      | mongo:7                    | 27017                   | 27017          | root / rootPassXXX  |
| PostgreSQL   | postgres:16                | 54320                   | 5432           | postgres / postgres |
| SQL Server   | custom FTS image           | 14330                   | 1433           | sa / 123456Abc      |
| RabbitMQ     | rabbitmq:3.12.4-management | 5672 (AMQP), 15672 (UI) | 5672, 15672    | guest / guest       |
| Redis        | redis:6.2.5                | 6379                    | 6379           | --                  |
| Pyroscope    | grafana/pyroscope          | 4040                    | 4040           | --                  |
| Selenium Hub | selenium/hub:4.8.3         | 4444                    | 4444           | --                  |

Docker compose files: `src/platform-example-app.docker-compose.yml` + `src/platform-example-app.docker-compose.override.yml`. Network: `platform-example-app-network`.

## Project Directory Layout

Path convention: `src/Platform/{module}/` (framework) | `src/Backend/{project}/` (example app) | `src/Frontend/apps/{app}/` + `src/Frontend/libs/{lib}/` (Angular).

### Platform Framework (`src/Platform/`)

| Module                                 | Purpose                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------ |
| Easy.Platform                          | Core: CQRS, entities, validation, repositories, message bus abstractions |
| Easy.Platform.AspNetCore               | ASP.NET Core integration: controllers, middleware, DI                    |
| Easy.Platform.EfCore                   | EF Core persistence provider (PostgreSQL, SQL Server)                    |
| Easy.Platform.MongoDB                  | MongoDB persistence provider                                             |
| Easy.Platform.RabbitMQ                 | RabbitMQ message bus implementation                                      |
| Easy.Platform.RedisCache               | Redis distributed caching                                                |
| Easy.Platform.AutomationTest           | Integration/automation test base classes                                 |
| Easy.Platform.AzureFileStorage         | Azure Blob Storage provider                                              |
| Easy.Platform.FireBasePushNotification | Firebase push notification provider                                      |
| Easy.Platform.HangfireBackgroundJob    | Hangfire background job integration                                      |
| Easy.Platform.CustomAnalyzers          | Roslyn code analyzers                                                    |
| Easy.Platform.Benchmark                | Framework benchmarking                                                   |
| Easy.Platform.Tests.Unit               | Framework unit tests                                                     |

### Example App Backend (`src/Backend/`)

| Project                                   | Layer          | Purpose                                        |
| ----------------------------------------- | -------------- | ---------------------------------------------- |
| TextSnippet.Api                           | Host           | Controllers, DI modules, startup configuration |
| TextSnippet.Application                   | Application    | CQRS commands, queries, DTOs, event handlers   |
| TextSnippet.Domain                        | Domain         | Entities, repositories, domain events          |
| TextSnippet.Infrastructure                | Infrastructure | External service integrations                  |
| TextSnippet.Persistence                   | Persistence    | EF Core persistence (SQL Server)               |
| TextSnippet.Persistence.Mongo             | Persistence    | MongoDB persistence                            |
| TextSnippet.Persistence.PostgreSql        | Persistence    | PostgreSQL-specific persistence                |
| TextSnippet.Persistence.MultiDbDemo.Mongo | Persistence    | Multi-database demo (MongoDB)                  |
| PlatformExampleApp.Ids                    | Host           | Identity server (auth)                         |
| PlatformExampleApp.Shared                 | Shared         | DTOs, message contracts across services        |
| PlatformExampleApp.IntegrationTests       | Test           | Integration test suite                         |
| PlatformExampleApp.Test                   | Test           | Unit/automation tests                          |
| PlatformExampleApp.Test.BDD               | Test           | BDD tests (SpecFlow)                           |
| PlatformExampleApp.Test.Shared            | Test           | Shared test utilities                          |
| PlatformExampleApp.Benchmark              | Test           | Benchmarking                                   |

### Frontend (`src/Frontend/`)

| Path                                     | Purpose                                                   |
| ---------------------------------------- | --------------------------------------------------------- |
| `apps/playground-text-snippet/`          | TextSnippet Angular app (default Nx project)              |
| `libs/platform-core/`                    | Frontend framework: base components, stores, API services |
| `libs/platform-components/`              | Platform-level reusable UI components                     |
| `libs/apps-shared-components/`           | Shared UI components across apps                          |
| `libs/apps-domains-components/`          | Domain-specific UI components                             |
| `libs/apps-domains/text-snippet-domain/` | TextSnippet frontend domain library                       |
| `e2e/`                                   | Playwright E2E tests (config: `e2e/playwright.config.ts`) |

Package manager: yarn. Monorepo tool: Nx. Default dev port: 4001.

## Tech Stack

### Backend

| Technology            | Version | Purpose                        |
| --------------------- | ------- | ------------------------------ |
| .NET                  | 9.0     | Runtime and SDK                |
| MediatR               | 12.4.1  | CQRS command/query dispatching |
| FluentValidation      | 11.11.0 | Input validation               |
| Entity Framework Core | 9.0.2   | Relational DB ORM              |
| MongoDB.Driver        | 3.2.0   | MongoDB client                 |
| RabbitMQ.Client       | 7.1.0   | Message broker client          |
| Serilog               | 4.2.0   | Structured logging             |
| Polly                 | 8.5.2   | Resilience and retry policies  |
| OpenTelemetry         | 1.12.0  | Distributed tracing            |
| Pyroscope             | 0.9.4   | Continuous profiling           |
| BenchmarkDotNet       | 0.14.0  | Performance benchmarking       |

### Frontend

| Technology           | Version      | Purpose                |
| -------------------- | ------------ | ---------------------- |
| Angular              | 19.0.6       | SPA framework          |
| Angular Material     | 19.0.5       | UI component library   |
| Nx                   | 20.3.1       | Monorepo build system  |
| NgRx Component Store | 19.0.0       | State management       |
| RxJS                 | 7.8.1        | Reactive programming   |
| TypeScript           | 5.6.0        | Language               |
| Bootstrap            | 5.2.3        | CSS grid/utilities     |
| Highcharts           | 11.4.3       | Charting               |
| Jest                 | 29.5.0       | Unit testing           |
| Playwright           | --           | E2E testing            |
| ESLint + Prettier    | 8.57 / 3.1.1 | Linting and formatting |
| Stylelint            | 16.26.1      | SCSS linting           |

### Infrastructure

| Technology       | Version | Purpose                            |
| ---------------- | ------- | ---------------------------------- |
| Docker + Compose | --      | Containerization and orchestration |
| MongoDB          | 7       | Document database (primary)        |
| PostgreSQL       | 16      | Relational database (alternative)  |
| SQL Server       | --      | Relational database (alternative)  |
| RabbitMQ         | 3.12.4  | Message broker                     |
| Redis            | 6.2.5   | Distributed cache                  |
| Selenium Grid    | 4.8.3   | Browser automation (BDD tests)     |

## Module Codes

| Code                                   | Kind            | Path                                                                 |
| -------------------------------------- | --------------- | -------------------------------------------------------------------- |
| Easy.Platform                          | framework       | `src/Platform/Easy.Platform/`                                        |
| Easy.Platform.AspNetCore               | framework       | `src/Platform/Easy.Platform.AspNetCore/`                             |
| Easy.Platform.EfCore                   | framework       | `src/Platform/Easy.Platform.EfCore/`                                 |
| Easy.Platform.MongoDB                  | framework       | `src/Platform/Easy.Platform.MongoDB/`                                |
| Easy.Platform.RabbitMQ                 | framework       | `src/Platform/Easy.Platform.RabbitMQ/`                               |
| Easy.Platform.RedisCache               | framework       | `src/Platform/Easy.Platform.RedisCache/`                             |
| Easy.Platform.AutomationTest           | framework       | `src/Platform/Easy.Platform.AutomationTest/`                         |
| Easy.Platform.AzureFileStorage         | framework       | `src/Platform/Easy.Platform.AzureFileStorage/`                       |
| Easy.Platform.FirebasePushNotification | framework       | `src/Platform/Easy.Platform.FireBasePushNotification/`               |
| Easy.Platform.HangfireBackgroundJob    | framework       | `src/Platform/Easy.Platform.HangfireBackgroundJob/`                  |
| TextSnippet.Api                        | backend-service | `src/Backend/PlatformExampleApp.TextSnippet.Api/`                    |
| TextSnippet.Application                | backend-service | `src/Backend/PlatformExampleApp.TextSnippet.Application/`            |
| TextSnippet.Domain                     | backend-service | `src/Backend/PlatformExampleApp.TextSnippet.Domain/`                 |
| TextSnippet.Persistence                | backend-service | `src/Backend/PlatformExampleApp.TextSnippet.Persistence/`            |
| TextSnippet.Persistence.Mongo          | backend-service | `src/Backend/PlatformExampleApp.TextSnippet.Persistence.Mongo/`      |
| TextSnippet.Persistence.PostgreSql     | backend-service | `src/Backend/PlatformExampleApp.TextSnippet.Persistence.PostgreSql/` |
| PlatformExampleApp.Ids                 | backend-service | `src/Backend/PlatformExampleApp.Ids/`                                |
| PlatformExampleApp.Shared              | library         | `src/Backend/PlatformExampleApp.Shared/`                             |
| playground-text-snippet                | frontend-app    | `src/Frontend/apps/playground-text-snippet/`                         |
| platform-core                          | library         | `src/Frontend/libs/platform-core/`                                   |
| text-snippet-domain                    | library         | `src/Frontend/libs/apps-domains/text-snippet-domain/`                |

## Quick Start Commands

| Goal                 | Command                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Build backend        | `dotnet build src/Easy.Platform.sln`                                                                                                  |
| Run API (default)    | `dotnet run --project src/Backend/PlatformExampleApp.TextSnippet.Api`                                                                 |
| Run API (PostgreSQL) | `dotnet run --project src/Backend/PlatformExampleApp.TextSnippet.Api --launch-profile PlatformExampleApp.TextSnippet.Api.UsePostgres` |
| Frontend install     | `cd src/Frontend && yarn install`                                                                                                     |
| Frontend dev server  | `cd src/Frontend && npm run dev-start:playground-text-snippet`                                                                        |
| Full system (Docker) | `src/start-dev-platform-example-app.cmd`                                                                                              |
| Infrastructure only  | `src/start-dev-platform-example-app.infrastructure.cmd`                                                                               |
| E2E tests            | `cd src/Frontend/e2e && npx playwright test`                                                                                          |

<!-- CRITICAL: Logic in LOWEST layer: Entity/Model > Service > Component/Handler. PlatformExampleApp is the reference implementation. -->
