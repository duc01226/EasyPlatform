# Project Structure Reference

<!-- Last scanned: 2026-03-15 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

## Quick Summary

**Goal:** Single-source map of every service, library, port, and directory in the Easy.Platform monorepo.

**Key Structure:**

| Layer        | Root Path       | What Lives Here                                              |
| ------------ | --------------- | ------------------------------------------------------------ |
| **Platform** | `src/Platform/` | Framework core (CQRS, persistence, messaging, caching)       |
| **Backend**  | `src/Backend/`  | PlatformExampleApp (TextSnippet) -- reference implementation |
| **Frontend** | `src/Frontend/` | Angular 19 + Nx workspace, Playwright E2E                    |

**Navigation:**

- [Service Architecture](#service-architecture) -- deployable services and ports
- [Backend Libraries](#backend-libraries-platformexampleapp) -- application layers
- [Platform Framework](#platform-framework-libraries) -- reusable framework projects
- [Frontend Libraries](#frontend-libraries-nx) -- Angular libs
- [Test Projects](#test-projects) -- all test suites
- [Infrastructure Ports](#infrastructure-ports) -- Docker service ports and credentials
- [Directory Tree](#project-directory-tree) -- visual folder layout
- [Tech Stack](#tech-stack) -- versions and purposes
- [Module Codes](#module-codes) -- short codes for each project
- [Startup Scripts](#startup-scripts) -- Docker compose launchers

---

## Service Architecture

| Service                            | Type                   | Port         | Path                                            |
| ---------------------------------- | ---------------------- | ------------ | ----------------------------------------------- |
| PlatformExampleApp.TextSnippet.Api | API (ASP.NET Core)     | 5001         | src/Backend/PlatformExampleApp.TextSnippet.Api/ |
| PlatformExampleApp.Ids             | API (Identity Server)  | 5001 (HTTPS) | src/Backend/PlatformExampleApp.Ids/             |
| playground-text-snippet            | Frontend App (Angular) | 4001         | src/Frontend/apps/playground-text-snippet/      |

### Backend Libraries (PlatformExampleApp)

| Project                                   | Layer                       | Path                                                                      |
| ----------------------------------------- | --------------------------- | ------------------------------------------------------------------------- |
| TextSnippet.Application                   | Application (CQRS)          | src/Backend/PlatformExampleApp.TextSnippet.Application/                   |
| TextSnippet.Domain                        | Domain (Entities)           | src/Backend/PlatformExampleApp.TextSnippet.Domain/                        |
| TextSnippet.Infrastructure                | Infrastructure              | src/Backend/PlatformExampleApp.TextSnippet.Infrastructure/                |
| TextSnippet.Persistence                   | Persistence (SQL Server/EF) | src/Backend/PlatformExampleApp.TextSnippet.Persistence/                   |
| TextSnippet.Persistence.Mongo             | Persistence (MongoDB)       | src/Backend/PlatformExampleApp.TextSnippet.Persistence.Mongo/             |
| TextSnippet.Persistence.PostgreSql        | Persistence (PostgreSQL/EF) | src/Backend/PlatformExampleApp.TextSnippet.Persistence.PostgreSql/        |
| TextSnippet.Persistence.MultiDbDemo.Mongo | Persistence (Multi-DB Demo) | src/Backend/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo/ |
| PlatformExampleApp.Shared                 | Shared utilities            | src/Backend/PlatformExampleApp.Shared/                                    |
| PlatformExampleApp.Ids                    | Identity Server             | src/Backend/PlatformExampleApp.Ids/                                       |

### Platform Framework Libraries

| Project                                | Purpose                                            | Path                                                 |
| -------------------------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| Easy.Platform                          | Core: CQRS, validation, repos, bus abstractions    | src/Platform/Easy.Platform/                          |
| Easy.Platform.AspNetCore               | ASP.NET Core integration (middleware, controllers) | src/Platform/Easy.Platform.AspNetCore/               |
| Easy.Platform.EfCore                   | EF Core persistence provider                       | src/Platform/Easy.Platform.EfCore/                   |
| Easy.Platform.MongoDB                  | MongoDB persistence provider                       | src/Platform/Easy.Platform.MongoDB/                  |
| Easy.Platform.RabbitMQ                 | RabbitMQ message bus implementation                | src/Platform/Easy.Platform.RabbitMQ/                 |
| Easy.Platform.RedisCache               | Redis caching provider                             | src/Platform/Easy.Platform.RedisCache/               |
| Easy.Platform.HangfireBackgroundJob    | Hangfire background job provider                   | src/Platform/Easy.Platform.HangfireBackgroundJob/    |
| Easy.Platform.AzureFileStorage         | Azure Blob Storage integration                     | src/Platform/Easy.Platform.AzureFileStorage/         |
| Easy.Platform.FirebasePushNotification | Firebase push notification provider                | src/Platform/Easy.Platform.FireBasePushNotification/ |
| Easy.Platform.AutomationTest           | Integration test framework base classes            | src/Platform/Easy.Platform.AutomationTest/           |
| Easy.Platform.Tests.Unit               | Unit tests (xUnit + AutoFixture + Moq)             | src/Platform/Easy.Platform.Tests.Unit/               |
| Easy.Platform.CustomAnalyzers          | Roslyn custom code analyzers (netstandard2.0)      | src/Platform/Easy.Platform.CustomAnalyzers/          |

### Frontend Libraries (Nx)

| Library                 | Purpose                                            | Path                                       |
| ----------------------- | -------------------------------------------------- | ------------------------------------------ |
| platform-core           | Framework core: base components, stores, API utils | src/Frontend/libs/platform-core/           |
| platform-components     | Reusable Angular UI components                     | src/Frontend/libs/platform-components/     |
| apps-domains            | Shared domain models and services                  | src/Frontend/libs/apps-domains/            |
| apps-domains-components | Domain-specific UI components                      | src/Frontend/libs/apps-domains-components/ |
| apps-shared-components  | Generic shared UI components across apps           | src/Frontend/libs/apps-shared-components/  |

### Test Projects

| Project                             | Type                              | Path                                             |
| ----------------------------------- | --------------------------------- | ------------------------------------------------ |
| PlatformExampleApp.IntegrationTests | Integration (xUnit)               | src/Backend/PlatformExampleApp.IntegrationTests/ |
| PlatformExampleApp.Test             | E2E/Automation (xUnit + Selenium) | src/Backend/PlatformExampleApp.Test/             |
| PlatformExampleApp.Test.BDD         | BDD (xUnit + Selenium)            | src/Backend/PlatformExampleApp.Test.BDD/         |
| PlatformExampleApp.Test.Shared      | Shared test utilities             | src/Backend/PlatformExampleApp.Test.Shared/      |
| PlatformExampleApp.Benchmark        | Benchmarks (BenchmarkDotNet)      | src/Backend/PlatformExampleApp.Benchmark/        |
| Easy.Platform.Benchmark             | Framework benchmarks              | src/Platform/Easy.Platform.Benchmark/            |
| E2E (Playwright)                    | Frontend E2E                      | src/Frontend/e2e/                                |

## Infrastructure Ports

| Service               | Port            | Credentials         | Docker Service             |
| --------------------- | --------------- | ------------------- | -------------------------- |
| MongoDB 7             | 127.0.0.1:27017 | root / rootPassXXX  | mongo-data                 |
| PostgreSQL 16         | 127.0.0.1:54320 | postgres / postgres | postgres-sql               |
| SQL Server            | 127.0.0.1:14330 | sa / 123456Abc      | sql-data                   |
| RabbitMQ (AMQP)       | 127.0.0.1:5672  | guest / guest       | rabbitmq                   |
| RabbitMQ (Mgmt UI)    | 127.0.0.1:15672 | guest / guest       | rabbitmq                   |
| Redis                 | 127.0.0.1:6379  | -                   | redis-cache                |
| Pyroscope (profiling) | 127.0.0.1:4040  | -                   | pyroscope-agent.monitoring |
| Selenium Hub          | 127.0.0.1:4444  | -                   | selenium-hub               |

**Docker compose files:** `src/platform-example-app.docker-compose.yml` + `.override.yml`
**Docker network:** platform-example-app-network (external)

## Project Directory Tree

```
src/
├── Platform/                          # Easy.Platform Framework (11 libraries + 2 tools + 1 test)
│   ├── Easy.Platform/                 #   Core framework
│   ├── Easy.Platform.AspNetCore/      #   ASP.NET Core integration
│   ├── Easy.Platform.AutomationTest/  #   Test framework
│   ├── Easy.Platform.AzureFileStorage/
│   ├── Easy.Platform.Benchmark/
│   ├── Easy.Platform.CustomAnalyzers/
│   ├── Easy.Platform.EfCore/          #   EF Core persistence
│   ├── Easy.Platform.FireBasePushNotification/
│   ├── Easy.Platform.HangfireBackgroundJob/
│   ├── Easy.Platform.MongoDB/         #   MongoDB persistence
│   ├── Easy.Platform.RabbitMQ/        #   Message bus
│   ├── Easy.Platform.RedisCache/      #   Caching
│   └── Easy.Platform.Tests.Unit/      #   Unit tests
│
├── Backend/                           # PlatformExampleApp (TextSnippet)
│   ├── PlatformExampleApp.TextSnippet.Api/          # API host (port 5001)
│   ├── PlatformExampleApp.TextSnippet.Application/  # CQRS commands, queries, DTOs
│   ├── PlatformExampleApp.TextSnippet.Domain/       # Entities, repository interfaces
│   ├── PlatformExampleApp.TextSnippet.Infrastructure/
│   ├── PlatformExampleApp.TextSnippet.Persistence/  # SQL Server (EF Core)
│   ├── PlatformExampleApp.TextSnippet.Persistence.Mongo/
│   ├── PlatformExampleApp.TextSnippet.Persistence.PostgreSql/
│   ├── PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo/
│   ├── PlatformExampleApp.IntegrationTests/
│   ├── PlatformExampleApp.Test/        # E2E/Automation tests
│   ├── PlatformExampleApp.Test.BDD/    # BDD tests
│   ├── PlatformExampleApp.Test.Shared/
│   ├── PlatformExampleApp.Shared/
│   ├── PlatformExampleApp.Ids/         # Identity Server
│   └── PlatformExampleApp.Benchmark/
│
├── Frontend/                          # Angular 19 + Nx 20.3 Workspace
│   ├── apps/playground-text-snippet/  # Main app (port 4001)
│   ├── libs/platform-core/           # Framework core lib
│   ├── libs/platform-components/     # UI components lib
│   ├── libs/apps-domains/            # Domain models lib
│   ├── libs/apps-domains-components/ # Domain components lib
│   ├── libs/apps-shared-components/  # Shared components lib
│   ├── e2e/                          # Playwright E2E tests
│   └── scripts/                      # Build/deploy scripts
│
└── Learning/                          # Learning/reference projects (not production)
```

## Tech Stack

### Backend

| Technology            | Version | Purpose                      |
| --------------------- | ------- | ---------------------------- |
| .NET                  | 9.0     | Runtime                      |
| MediatR               | 12.4.1  | CQRS dispatching             |
| FluentValidation      | 11.11.0 | Request validation           |
| Entity Framework Core | 9.0.2   | ORM (PostgreSQL, SQL Server) |
| MongoDB.Driver        | 3.2.0   | MongoDB client               |
| RabbitMQ.Client       | 7.1.0   | Message bus client           |
| Serilog               | 4.2.0   | Structured logging           |
| OpenTelemetry         | 1.12.0  | Observability/tracing        |
| Polly                 | 8.5.2   | Resilience/retry             |
| Hangfire              | -       | Background job scheduling    |
| Pyroscope             | 0.9.4   | Continuous profiling         |
| SonarAnalyzer.CSharp  | 10.6.0  | Static code analysis         |
| JWT Bearer            | 9.0.2   | Authentication               |

### Frontend

| Technology            | Version | Purpose                             |
| --------------------- | ------- | ----------------------------------- |
| Angular               | 19.0.6  | UI framework (standalone, zoneless) |
| Nx                    | 20.3.1  | Monorepo orchestration              |
| TypeScript            | ~5.6.0  | Language                            |
| Angular Material      | 19.0.5  | UI component library                |
| @ngrx/component-store | 19.0.0  | State management                    |
| RxJS                  | 7.8.1   | Reactive programming                |
| Bootstrap             | 5.2.3   | CSS framework                       |
| Highcharts            | 11.4.3  | Charts/graphs                       |
| ngx-translate         | 14.0.0  | i18n                                |
| Jest                  | 29.5.0  | Unit testing                        |
| Playwright            | -       | E2E testing                         |
| ESLint                | 8.57.0  | Linting                             |
| Stylelint             | 16.26.1 | SCSS linting                        |

### Infrastructure

| Technology              | Version      | Purpose                   |
| ----------------------- | ------------ | ------------------------- |
| Docker + docker-compose | -            | Containerization          |
| Azure Pipelines         | -            | CI/CD                     |
| MongoDB                 | 7            | Document database         |
| PostgreSQL              | 16           | Relational database       |
| SQL Server              | Custom image | Relational database (alt) |
| RabbitMQ                | 3.12.4       | Message broker            |
| Redis                   | 6.2.5        | Distributed cache         |
| Selenium Grid           | 4.8.3        | Browser automation        |
| Grafana Pyroscope       | -            | Performance profiling     |

## Module Codes

| Code     | Module                                 | Service Path                                                       |
| -------- | -------------------------------------- | ------------------------------------------------------------------ |
| PLT      | Easy.Platform (Core)                   | src/Platform/Easy.Platform/                                        |
| PLT-ASP  | Easy.Platform.AspNetCore               | src/Platform/Easy.Platform.AspNetCore/                             |
| PLT-EF   | Easy.Platform.EfCore                   | src/Platform/Easy.Platform.EfCore/                                 |
| PLT-MDB  | Easy.Platform.MongoDB                  | src/Platform/Easy.Platform.MongoDB/                                |
| PLT-RMQ  | Easy.Platform.RabbitMQ                 | src/Platform/Easy.Platform.RabbitMQ/                               |
| PLT-RDS  | Easy.Platform.RedisCache               | src/Platform/Easy.Platform.RedisCache/                             |
| PLT-HF   | Easy.Platform.HangfireBackgroundJob    | src/Platform/Easy.Platform.HangfireBackgroundJob/                  |
| PLT-AZ   | Easy.Platform.AzureFileStorage         | src/Platform/Easy.Platform.AzureFileStorage/                       |
| PLT-FB   | Easy.Platform.FirebasePushNotification | src/Platform/Easy.Platform.FireBasePushNotification/               |
| PLT-AT   | Easy.Platform.AutomationTest           | src/Platform/Easy.Platform.AutomationTest/                         |
| PLT-UT   | Easy.Platform.Tests.Unit               | src/Platform/Easy.Platform.Tests.Unit/                             |
| PLT-CA   | Easy.Platform.CustomAnalyzers          | src/Platform/Easy.Platform.CustomAnalyzers/                        |
| PLT-BM   | Easy.Platform.Benchmark                | src/Platform/Easy.Platform.Benchmark/                              |
| TS-API   | TextSnippet API                        | src/Backend/PlatformExampleApp.TextSnippet.Api/                    |
| TS-APP   | TextSnippet Application                | src/Backend/PlatformExampleApp.TextSnippet.Application/            |
| TS-DOM   | TextSnippet Domain                     | src/Backend/PlatformExampleApp.TextSnippet.Domain/                 |
| TS-INF   | TextSnippet Infrastructure             | src/Backend/PlatformExampleApp.TextSnippet.Infrastructure/         |
| TS-PER   | TextSnippet Persistence                | src/Backend/PlatformExampleApp.TextSnippet.Persistence/            |
| TS-MDB   | TextSnippet Persistence.Mongo          | src/Backend/PlatformExampleApp.TextSnippet.Persistence.Mongo/      |
| TS-PG    | TextSnippet Persistence.PostgreSql     | src/Backend/PlatformExampleApp.TextSnippet.Persistence.PostgreSql/ |
| FE-APP   | playground-text-snippet                | src/Frontend/apps/playground-text-snippet/                         |
| FE-CORE  | platform-core                          | src/Frontend/libs/platform-core/                                   |
| FE-COMP  | platform-components                    | src/Frontend/libs/platform-components/                             |
| FE-DOM   | apps-domains                           | src/Frontend/libs/apps-domains/                                    |
| FE-DCOMP | apps-domains-components                | src/Frontend/libs/apps-domains-components/                         |
| FE-SCOMP | apps-shared-components                 | src/Frontend/libs/apps-shared-components/                          |
| TS-SHR   | PlatformExampleApp.Shared              | src/Backend/PlatformExampleApp.Shared/                             |
| TS-IDS   | PlatformExampleApp.Ids                 | src/Backend/PlatformExampleApp.Ids/                                |
| TS-TSHR  | PlatformExampleApp.Test.Shared         | src/Backend/PlatformExampleApp.Test.Shared/                        |
| TS-BM    | PlatformExampleApp.Benchmark           | src/Backend/PlatformExampleApp.Benchmark/                          |
| FE-E2E   | E2E Tests (Playwright)                 | src/Frontend/e2e/                                                  |

## Startup Scripts

| Script                                            | Purpose              | DB Type  |
| ------------------------------------------------- | -------------------- | -------- |
| start-dev-platform-example-app.cmd                | Default (PostgreSQL) | Postgres |
| start-dev-platform-example-app-mongodb.cmd        | MongoDB variant      | MongoDB  |
| start-dev-platform-example-app-postgres.cmd       | PostgreSQL explicit  | Postgres |
| start-dev-platform-example-app-usesql.cmd         | SQL Server variant   | SQL      |
| start-dev-platform-example-app.infrastructure.cmd | Infrastructure only  | -        |
| start-dev-platform-example-app-NO-REBUILD.cmd     | Skip Docker build    | -        |
| start-dev-platform-example-app-RESET-DATA.cmd     | Clear volumes        | -        |

---

## Closing Reminders

- **Framework code** lives in `src/Platform/Easy.Platform/` -- always check here for base classes, CQRS abstractions, and persistence interfaces
- **Reference implementation** is PlatformExampleApp (TextSnippet) under `src/Backend/` -- use it as the pattern source for any new backend feature
- **Frontend framework core** is `src/Frontend/libs/platform-core/` -- base components, stores, and API services live here, not in the app
- **All Docker ports bind to 127.0.0.1** -- compose files are in `src/platform-example-app.docker-compose.yml`
- **Module codes** (PLT, TS-APP, FE-CORE, etc.) are the canonical short identifiers used across docs and tooling
