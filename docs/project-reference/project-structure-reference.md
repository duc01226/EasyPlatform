<!-- Last scanned: 2026-06-12 -->
<!-- CRITICAL: Logic in LOWEST layer: Entity/Model > Service > Component/Handler. Search 3+ patterns before writing code. -->

# Project Structure Reference

**Purpose:** Authoritative map of services, ports, directories, tech-stack versions, and module codes — so AI places code in the right project, uses correct ports/commands, and never invents paths. Every port + path is `file:line`-cited; trust this doc over memory.

Easy.Platform is a .NET 9 framework for microservices with CQRS, event-driven architecture, and multi-database support. PlatformExampleApp (TextSnippet) is the reference implementation. Solution file: `src/Easy.Platform.sln`.

**Architecture:** Reusable framework library set (`src/Platform/`) + a layered microservices-style example app (`src/Backend/PlatformExampleApp.*`, Api/Application/Domain/Infrastructure/Persistence split) + Nx-monorepo Angular frontend (`src/Frontend/`). Orchestration: Docker Compose (no Kubernetes/Helm). `src/Learning/` holds standalone ASP.NET tutorial samples — NOT part of the product (absent from `docs/project-config.json`).

## Service Architecture

| Service                             | Type                           | Port                          | Dockerfile                                                  |
| ----------------------------------- | ------------------------------ | ----------------------------- | ----------------------------------------------------------- |
| text-snippet-api                    | .NET 9 HTTP API                | 5001 (host) -> 80 (container) | `src/Backend/PlatformExampleApp.TextSnippet.Api/Dockerfile` |
| text-snippet-webspa                 | Angular SPA                    | 4001 (host) -> 80 (container) | `src/Frontend/apps/playground-text-snippet/Dockerfile`      |
| text-snippet-automation-test        | Selenium test runner           | --                            | `src/Backend/PlatformExampleApp.Test/Dockerfile`            |
| text-snippet-automation-test-bdd-\* | BDD test (Chrome/Edge/Firefox) | --                            | `src/Backend/PlatformExampleApp.Test.BDD/Dockerfile`        |

**Two HTTP API hosts** (`Glob src/Backend/**/Program.cs` -> only Api, Ids, Benchmark): `TextSnippet.Api` (controllers via `MapControllers`, hosts in-process Hangfire background jobs — there is NO standalone worker service) and `PlatformExampleApp.Ids` (IdentityServer; `UseStartup<Startup>`). Ids is NOT in docker-compose and runs standalone; its `launchSettings.json:9` URL `https://localhost:5001` numerically collides with the API but the two are never run together.

**API host port mapping** lives ONLY in `src/platform-example-app.docker-compose.override.yml:86` (`5001:80`) — the base compose file declares no `ports:` for the API. `Dockerfile:82` exposes `80 443`.

**API launch profiles** (`src/Backend/PlatformExampleApp.TextSnippet.Api/Properties/launchSettings.json:20`): Default, UsePostgres, UseSql, UseMongoDb -- all on `http://localhost:5001`.

## Infrastructure Ports

All infra port mappings + credentials live in the **override** file (`src/platform-example-app.docker-compose.override.yml`); the base file declares the images/services. `file:line` below points at the override unless noted.

| Service        | Image                                     | Host Port               | Container Port | Credentials         | Source           |
| -------------- | ----------------------------------------- | ----------------------- | -------------- | ------------------- | ---------------- |
| MongoDB        | mongo:7                                   | 27017                   | 27017          | root / rootPassXXX  | override:17      |
| PostgreSQL     | postgres:16                               | 54320                   | 5432           | postgres / postgres | override:55      |
| SQL Server     | custom FTS image                          | 14330                   | 1433           | sa / 123456Abc      | override:11      |
| RabbitMQ       | rabbitmq:3.12.4-management                | 5672 (AMQP), 15672 (UI) | 5672, 15672    | guest / guest       | override:39-40   |
| Redis          | redis:6.2.5                               | 6379                    | 6379           | --                  | override:46      |
| Pyroscope      | grafana/pyroscope (latest)                | 4040                    | 4040           | --                  | base:23          |
| Selenium Hub   | selenium/hub (see note)                   | 4442, 4443, 4444        | 4442/4443/4444 | --                  | override:201     |
| Selenium nodes | selenium/node-{chrome,edge,firefox}:111.0 | network_mode: host      | --             | --                  | override:107-192 |

**Selenium Hub version drift:** base compose pins `selenium/hub:4.8.3` (base:57) but the override re-declares `selenium/hub:4.4.0-20220831` (override:195) — the override wins, so `4.4.0-20220831` is what actually runs.

Docker compose files: `src/platform-example-app.docker-compose.yml` (base) + `src/platform-example-app.docker-compose.override.yml` (ports/creds/volumes). Network: `platform-example-app-network` (`external: true` — must be pre-created by start scripts).

> **Note (corrected):** earlier docs claimed all ports bind `127.0.0.1`. Not supported by evidence — every compose mapping uses bare `HOST:CONTAINER` short form (e.g. override:17,40,86) with no host-IP prefix, so Docker defaults to `0.0.0.0` (all interfaces).

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

Verified via `Glob src/Frontend/**/project.json` — exactly ONE app and TWO libraries exist:

| Path                                     | Purpose                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `apps/playground-text-snippet/`          | TextSnippet Angular app (only app; serve port 4001 — `project.json:94`) |
| `libs/platform-core/`                    | Frontend framework: base components, stores, API services (foundation)  |
| `libs/apps-domains/text-snippet-domain/` | TextSnippet frontend domain library (depends on platform-core)          |
| `e2e/`                                   | Playwright E2E tests (config: `e2e/playwright.config.ts`)               |

Dependency direction (verified by import grep): app -> both libs; `text-snippet-domain` -> `platform-core`. Path aliases in `src/Frontend/tsconfig.base.json:20-21`.

**Reserved (placeholder) lib slots** — `libs/platform-components/`, `libs/apps-shared-components/`, `libs/apps-domains-components/` exist as README-only stubs (no `project.json`, no `@libs/*` alias, no source). They document intended future lib boundaries (common non-domain components / app-shared UI / domain components) but are NOT built Nx libraries yet.

Monorepo tool: Nx (`^20.3.1`, `nx.json`). Default dev port: 4001 (`apps/playground-text-snippet/project.json:94`, `package.json:100`). Package manager: `nx.json:7` declares `yarn`, but `src/Frontend/package.json` has no `packageManager` field and both `yarn.lock` and `package-lock.json` are present — npm is also in active use (CLAUDE.md dev commands use npm). E2E `@playwright/test` lives in a SEPARATE workspace `src/Frontend/e2e/package.json:16`, not the root.

## Tech Stack

### Backend

| Technology             | Version | Purpose                         |
| ---------------------- | ------- | ------------------------------- |
| .NET                   | 9.0     | Runtime and SDK                 |
| MediatR                | 12.4.1  | CQRS command/query dispatching  |
| FluentValidation       | 11.11.0 | Input validation                |
| Entity Framework Core  | 9.0.2   | Relational DB ORM               |
| MongoDB.Driver         | 3.2.0   | MongoDB client                  |
| RabbitMQ.Client        | 7.1.0   | Message broker client           |
| Serilog                | 4.2.0   | Structured logging              |
| Polly                  | 8.5.2   | Resilience and retry policies   |
| OpenTelemetry          | 1.12.0  | Distributed tracing             |
| Pyroscope              | 0.9.4   | Continuous profiling            |
| BenchmarkDotNet        | 0.14.0  | Performance benchmarking        |
| Microsoft.Identity.Web | 3.14.1  | Azure AD / OIDC auth on the API |
| Ulid                   | 1.3.4   | Sortable unique identifiers     |

No central package management — there is NO `Directory.Packages.props`/`Directory.Build.props`; versions live per-`.csproj` (most pinned in `src/Platform/Easy.Platform/Easy.Platform.csproj`). Target framework `net9.0` (`Easy.Platform.csproj:4`); Azure pipeline pins SDK `9.0.x`.

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

| Technology         | Version         | Purpose                                                                                |
| ------------------ | --------------- | -------------------------------------------------------------------------------------- |
| Docker + Compose   | --              | Containerization and orchestration                                                     |
| MongoDB            | 7               | Document database (primary)                                                            |
| PostgreSQL         | 16              | Relational database (alternative)                                                      |
| SQL Server         | --              | Relational database (alternative)                                                      |
| RabbitMQ           | 3.12.4          | Message broker                                                                         |
| Redis              | 6.2.5           | Distributed cache                                                                      |
| Selenium Grid      | 4.4.0 (runtime) | Browser automation (BDD tests) — override pins `4.4.0-20220831`, base declares `4.8.3` |
| Pyroscope (server) | latest          | Continuous-profiling backend                                                           |
| CI/CD              | Azure Pipelines | Build / IntegrationTests / E2ETests (see CI/CD section)                                |

## Module Codes

| Code                                      | Kind            | Path                                                                        |
| ----------------------------------------- | --------------- | --------------------------------------------------------------------------- |
| Easy.Platform                             | framework       | `src/Platform/Easy.Platform/`                                               |
| Easy.Platform.AspNetCore                  | framework       | `src/Platform/Easy.Platform.AspNetCore/`                                    |
| Easy.Platform.EfCore                      | framework       | `src/Platform/Easy.Platform.EfCore/`                                        |
| Easy.Platform.MongoDB                     | framework       | `src/Platform/Easy.Platform.MongoDB/`                                       |
| Easy.Platform.RabbitMQ                    | framework       | `src/Platform/Easy.Platform.RabbitMQ/`                                      |
| Easy.Platform.RedisCache                  | framework       | `src/Platform/Easy.Platform.RedisCache/`                                    |
| Easy.Platform.AutomationTest              | framework       | `src/Platform/Easy.Platform.AutomationTest/`                                |
| Easy.Platform.AzureFileStorage            | framework       | `src/Platform/Easy.Platform.AzureFileStorage/`                              |
| Easy.Platform.FirebasePushNotification    | framework       | `src/Platform/Easy.Platform.FireBasePushNotification/`                      |
| Easy.Platform.HangfireBackgroundJob       | framework       | `src/Platform/Easy.Platform.HangfireBackgroundJob/`                         |
| TextSnippet.Api                           | backend-service | `src/Backend/PlatformExampleApp.TextSnippet.Api/`                           |
| TextSnippet.Application                   | backend-service | `src/Backend/PlatformExampleApp.TextSnippet.Application/`                   |
| TextSnippet.Domain                        | backend-service | `src/Backend/PlatformExampleApp.TextSnippet.Domain/`                        |
| TextSnippet.Infrastructure                | backend-service | `src/Backend/PlatformExampleApp.TextSnippet.Infrastructure/`                |
| TextSnippet.Persistence                   | backend-service | `src/Backend/PlatformExampleApp.TextSnippet.Persistence/`                   |
| TextSnippet.Persistence.Mongo             | backend-service | `src/Backend/PlatformExampleApp.TextSnippet.Persistence.Mongo/`             |
| TextSnippet.Persistence.PostgreSql        | backend-service | `src/Backend/PlatformExampleApp.TextSnippet.Persistence.PostgreSql/`        |
| TextSnippet.Persistence.MultiDbDemo.Mongo | backend-service | `src/Backend/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo/` |
| PlatformExampleApp.Ids                    | backend-service | `src/Backend/PlatformExampleApp.Ids/`                                       |
| PlatformExampleApp.Shared                 | library         | `src/Backend/PlatformExampleApp.Shared/`                                    |
| playground-text-snippet                   | frontend-app    | `src/Frontend/apps/playground-text-snippet/`                                |
| platform-core                             | library         | `src/Frontend/libs/platform-core/`                                          |
| text-snippet-domain                       | library         | `src/Frontend/libs/apps-domains/text-snippet-domain/`                       |

## CI/CD

**Azure Pipelines only** — single `azure-pipelines.yml` at repo root. No GitHub Actions (`.github/` holds only Copilot instructions), no Jenkinsfile. Trigger: `main` branch; pool `ubuntu-latest`; build config Release; SDK `9.0.x`.

| Stage            | Depends on | What it does                                                                                                                                                         |
| ---------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build            | --         | `dotnet build` of TextSnippet.Api (`azure-pipelines.yml:17-40`)                                                                                                      |
| IntegrationTests | Build      | Spins infra via compose, runs `PlatformExampleApp.TextSnippet.ContractTests` + `PlatformExampleApp.Tests.Integration`, coverage check (`azure-pipelines.yml:42-137`) |
| E2ETests         | Build      | Node 20 + Playwright (chromium), full stack, waits webspa :4001, runs E2E in `src/Frontend/e2e` (`azure-pipelines.yml:139-218`)                                      |

> CI references test projects (`*.ContractTests`, `*.Tests.Integration`) whose names differ from the local dev/project-config naming (`PlatformExampleApp.IntegrationTests`) — confirm which is canonical when wiring new tests.

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
