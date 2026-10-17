<!-- Last scanned: 2026-08-21 -->
<!-- CRITICAL: Logic in LOWEST layer: Entity/Model > Service > Component/Handler. Search 3+ patterns before writing code. -->
<!-- MUST ATTENTION: Verify current source/config before changing this reference. -->
<!-- NEVER copy secret values; record names and mechanisms only. -->
<!-- ALWAYS cite paths, ports, versions, and module codes with current file:line evidence. -->

# Project Structure Reference

**Purpose:** Authoritative map of services, ports, directories, tech-stack versions, and module codes — so AI places code in the right project, uses correct ports/commands, and never invents paths. Every port + path is `file:line`-cited; trust this doc over memory.

## Contents

- [Quick Summary](#quick-summary)
- [Architecture Overview](#architecture-overview)
- [Service Architecture](#service-architecture)
- [Infrastructure Ports](#infrastructure-ports)
- [Key Directories](#key-directories)
- [Deployment & Delivery](#deployment--delivery)
- [Environment Configuration](#environment-configuration)
- [Frontend Apps](#frontend-apps)
- [Tech Stack](#tech-stack)
- [Module Codes](#module-codes)
- [CI/CD (Delivery Detail)](#cicd-delivery-detail)
- [Quick Start Commands](#quick-start-commands)
- [Closing Reminders](#closing-reminders)

## Quick Summary

**Goal:** Keep architecture, service boundaries, local ports, delivery stages, environment keys, and module paths synchronized with the current repository.

**Summary:**

1. Read Architecture Overview and Service Architecture to place backend, identity, frontend, and test work in the correct project.
2. Use Infrastructure Ports and Environment Configuration for local mappings and keys; values stay omitted.
3. Use Frontend Apps, Tech Stack, Key Directories, and Module Codes for current app/library paths, versions, and configured names.
4. Use Deployment & Delivery and Quick Start for evidenced CI/test stages and local commands; verify the documented pipeline and Docker build-context warnings before relying on delivery.

## Architecture Overview

Easy.Platform is a .NET 9 framework for microservices with CQRS, event-driven architecture, and multi-database support (`src/Platform/Easy.Platform/Easy.Platform.csproj:1-5`). PlatformExampleApp (TextSnippet) is the reference implementation. The repository is a layered .NET multi-project backend plus an Nx Angular frontend, not a one-project or one-container application (`docs/project-config.json:32-318`; `src/Frontend/nx.json:2-9`).

- `src/Platform/` contains reusable framework and provider projects; `src/Backend/` separates API, application, domain, infrastructure, persistence, identity, and test projects (`docs/project-config.json:32-232`).
- `src/Frontend/` is an Nx workspace with one active app and two configured buildable libraries (`src/Frontend/nx.json:2-9`; `src/Frontend/apps/playground-text-snippet/project.json:3-5`).
- `src/Learning/` contains tutorial/sample projects and is outside the configured product module catalog (`docs/project-config.json:32-318`).
- Local orchestration is Docker Compose base plus override; the external network is `platform-example-app-network` (`src/platform-example-app.docker-compose.yml:1-25,149-152`).
- Azure Pipelines provides the repository-local build, integration-test, and E2E stages; no repository-local deployment/promotion/rollback stage is evidenced (`azure-pipelines.yml:5-218`).

## Service Architecture

| Service / project                                         | Type                                     | Local or container port                 | Dockerfile / evidence                                                                                                                                                                                      |
| --------------------------------------------------------- | ---------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text-snippet-api` / `PlatformExampleApp.TextSnippet.Api` | .NET 9 HTTP API                          | `5001` host → `80` container            | `src/Backend/PlatformExampleApp.TextSnippet.Api/Dockerfile:80-96`; Compose mapping `src/platform-example-app.docker-compose.override.yml:62-86`                                                            |
| `platform-example-app-ids` / `PlatformExampleApp.Ids`     | Standalone Identity HTTP host            | `https://localhost:5001` launch profile | `src/Backend/PlatformExampleApp.Ids/Program.cs:68-76`; `src/Backend/PlatformExampleApp.Ids/Properties/launchSettings.json:3-9`; no Dockerfile found                                                        |
| `text-snippet-webspa` / `playground-text-snippet`         | Angular SPA                              | `4001` host → `80` container            | `src/Frontend/apps/playground-text-snippet/project.json:82-95`; `src/Frontend/apps/playground-text-snippet/Dockerfile:1-10`; Compose mapping `src/platform-example-app.docker-compose.override.yml:98-105` |
| `text-snippet-automation-test`                            | Selenium-backed automation test runner   | No product port                         | `src/Backend/PlatformExampleApp.Test/Dockerfile:1-41`; Compose build `src/platform-example-app.docker-compose.yml:59-77`                                                                                   |
| `text-snippet-automation-test-bdd-*`                      | BDD test runners for Chrome/Edge/Firefox | No product port                         | `src/Backend/PlatformExampleApp.Test.BDD/Dockerfile:1-41`; Compose services `src/platform-example-app.docker-compose.yml:78-147`                                                                           |

The API host creates a web application, registers controllers, and maps controller endpoints (`src/Backend/PlatformExampleApp.TextSnippet.Api/Program.cs:31-34,64-69,147-160`). The Ids host uses `UseStartup<Startup>` (`src/Backend/PlatformExampleApp.Ids/Program.cs:68-76`). Hangfire is hosted inside the API module, so no standalone product worker is documented (`src/Backend/PlatformExampleApp.TextSnippet.Api/TextSnippetHangfireBackgroundJobModule.cs:17-32`). The two standalone launch profiles both use port 5001, so they are not a simultaneous local service set (`src/Backend/PlatformExampleApp.TextSnippet.Api/Properties/launchSettings.json:7-8`; `src/Backend/PlatformExampleApp.Ids/Properties/launchSettings.json:3-9`).

## Infrastructure Ports

All infra port mappings and environment-key declarations live in the **override** file (`src/platform-example-app.docker-compose.override.yml`); the base file declares the images/services. Secret values are intentionally omitted. `file:line` below points at the override unless noted.

| Service        | Host : container port | Auth mechanism / reference names                                                               | Source                            |
| -------------- | --------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------- |
| MongoDB        | 27017 : 27017         | Compose keys MONGO_INITDB_ROOT_USERNAME / MONGO_INITDB_ROOT_PASSWORD; values omitted           | override:15-24                    |
| PostgreSQL     | 54320 : 5432          | Compose keys POSTGRES_USER / POSTGRES_PASSWORD; values omitted                                 | override:50-60                    |
| SQL Server     | 14330 : 1433          | Compose key SA_PASSWORD; value omitted                                                         | override:5-13                     |
| RabbitMQ       | 5672 AMQP; 15672 UI   | App keys RabbitMqOptions:UserName / RabbitMqOptions:Password; no Compose secret value recorded | override:37-42; appsettings:47-50 |
| Redis          | 6379 : 6379           | App key RedisCacheOptions:Connection; no auth key evidenced                                    | override:44-48; appsettings:53-54 |
| Pyroscope      | 4040 : 4040           | No auth key evidenced                                                                          | base:20-23                        |
| Selenium Hub   | 4442, 4443, 4444      | No auth key evidenced                                                                          | override:194-201                  |
| Selenium nodes | host network          | No auth key evidenced                                                                          | override:107-192                  |

**Selenium Hub version drift:** base Compose pins the image selenium/hub:4.8.3 (base:57) but the override re-declares image selenium/hub:4.4.0-20220831 (override:195) — the override wins, so 4.4.0-20220831 is what actually runs.

Docker Compose files: `src/platform-example-app.docker-compose.yml` (base) + `src/platform-example-app.docker-compose.override.yml` (ports/environment keys/volumes). Network: `platform-example-app-network` (`external: true` — must be pre-created by start scripts; `src/platform-example-app.docker-compose.yml:149-152`).

> **Note (corrected):** earlier docs claimed all ports bind `127.0.0.1`. Not supported by evidence — every compose mapping uses bare `HOST:CONTAINER` short form (e.g. override:17,40,86) with no host-IP prefix, so Docker defaults to `0.0.0.0` (all interfaces).

## Key Directories

Path convention: `src/Platform/{module}/` (framework) | `src/Backend/{project}/` (example app) | `src/Frontend/apps/{app}/` + `src/Frontend/libs/{lib}/` (Angular). The configured module catalog is maintained in `docs/project-config.json:32-318`; detailed codes are listed below.

| Directory                 | Role                                                                    | Evidence                                                                                                                    |
| ------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `src/Platform/`           | Framework core and persistence/message-bus providers                    | `docs/project-config.json:32-127`                                                                                           |
| `src/Backend/`            | Layered TextSnippet backend, identity host, shared contracts, and tests | `docs/project-config.json:128-232`                                                                                          |
| `src/Frontend/apps/`      | Angular application roots                                               | `src/Frontend/apps/playground-text-snippet/project.json:3-5`                                                                |
| `src/Frontend/libs/`      | Frontend framework/domain libraries and reserved library slots          | `src/Frontend/libs/platform-core/project.json:2-13`; `src/Frontend/libs/apps-domains/text-snippet-domain/project.json:3-23` |
| `docs/project-reference/` | Generated/reference documentation catalog                               | `docs/project-config.json:437`                                                                                              |

`src/Learning/` contains standalone tutorial samples and is not in the configured product module catalog (`docs/project-config.json:32-318`).

## Deployment & Delivery

The repository-local delivery path is Azure Pipelines. It builds and tests the application, publishes E2E artifacts, and tears down Compose services; no deployment target, environment promotion, or rollback mechanism is evidenced in the repository (`azure-pipelines.yml:5-218`).

| Stage            | Behavior                                                                                                                           | Evidence                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Build            | Uses `ubuntu-latest`, Release, and .NET `9.0.x`; builds the TextSnippet API                                                        | `azure-pipelines.yml:5-40`    |
| IntegrationTests | Creates the external Compose network, starts infrastructure, starts the API, runs tests, publishes results, and tears down volumes | `azure-pipelines.yml:42-137`  |
| E2ETests         | Uses Node 20, starts API/web services, installs/runs Playwright, publishes reports/screenshots, and tears down services            | `azure-pipelines.yml:139-218` |

**Actionable pipeline mismatch:** the pipeline references `src/Backend/PlatformExampleApp.TextSnippet.ContractTests` and `src/Backend/PlatformExampleApp.Tests.Integration` (`azure-pipelines.yml:64-69,111-116`), while the configured/current integration project is `src/Backend/PlatformExampleApp.IntegrationTests` (`docs/project-config.json:370-378`). This document records the mismatch; it does not change source or pipeline files.

**Docker build-context warning:** the API, automation-test, and BDD Dockerfiles contain COPY entries rooted at `PlatformExampleApp/` (`src/Backend/PlatformExampleApp.TextSnippet.Api/Dockerfile:61-75`; `src/Backend/PlatformExampleApp.Test/Dockerfile:35-41`; `src/Backend/PlatformExampleApp.Test.BDD/Dockerfile:35-41`), while Compose supplies `context: .` from `src` for those builds (`src/platform-example-app.docker-compose.yml:25-35,59-63,78-84`). Current backend projects are under `src/Backend/PlatformExampleApp.*`; validate this context/path alignment before relying on container builds. This scan does not alter source or Compose files.

## Environment Configuration

| Surface               | Scope/purpose                                                                           | Keys or references (values omitted)                                                                                                    | Evidence                                                                                                                                                                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compose base          | Images, build contexts, service dependencies, network                                   | Registry/platform/tag interpolation; service names                                                                                     | `src/platform-example-app.docker-compose.yml:1-147,149-152`                                                                                                                                                                                                   |
| Compose override      | Local development ports and container environment                                       | `ASPNETCORE_ENVIRONMENT`, `ASPNETCORE_URLS`, `ConnectionStrings__*`, `MongoDB__*`, `RedisCacheOptions__Connection`, database auth keys | `src/platform-example-app.docker-compose.override.yml:5-24,50-85`                                                                                                                                                                                             |
| API appsettings       | Runtime configuration and provider selection                                            | `ConnectionStrings`, `MongoDB`, `UseDbType`, `RabbitMqOptions`, `RedisCacheOptions`, `BackgroundJob`, `Serilog`                        | `src/Backend/PlatformExampleApp.TextSnippet.Api/appsettings.json:2-67`                                                                                                                                                                                        |
| API settings variants | Development, Docker development, provider-specific development, and production overlays | `appsettings.Development*.json`, `appsettings.Production.json`                                                                         | `src/Backend/PlatformExampleApp.TextSnippet.Api/appsettings.Development.json:1-7`; `src/Backend/PlatformExampleApp.TextSnippet.Api/appsettings.Development.Docker.json:1-2`; `src/Backend/PlatformExampleApp.TextSnippet.Api/appsettings.Production.json:1-9` |
| Test settings         | Automation and BDD runtime configuration                                                | `AutomationTestSettings`                                                                                                               | `src/Backend/PlatformExampleApp.Test/appsettings.json:1-2`; `src/Backend/PlatformExampleApp.Test.BDD/appsettings.json:1-2`                                                                                                                                    |
| Local env files       | Developer/Compose variable inputs                                                       | Key names only; do not copy values                                                                                                     | `.env:1-4`; `.env.sample.md:1-7`; `src/.env:3-16`                                                                                                                                                                                                             |

No repository-local vault, key-management service, or production secret injection mechanism was evidenced in this scan. Treat the referenced keys as configuration contracts and supply values through the appropriate local/CI environment.

The frontend Playwright workspace is absent in the current changes. Existing CI and project configuration still name its retired commands; those declarations do not prove an executable harness. Read `docs/project-reference/e2e-test-reference.md` before browser verification.

## Frontend Apps

| Path                                                                                            | Kind                             | Build/serve behavior                                                           | Evidence                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/Frontend/apps/playground-text-snippet/`                                                    | Active Angular application       | Nx build output is `dist/apps/playground-text-snippet`; dev server port `4001` | `src/Frontend/apps/playground-text-snippet/project.json:34-45,82-95`                                                                                                       |
| `src/Frontend/libs/platform-core/`                                                              | Built library                    | No serve target; frontend framework foundation                                 | `src/Frontend/libs/platform-core/project.json:2-13`                                                                                                                        |
| `src/Frontend/libs/apps-domains/text-snippet-domain/`                                           | Built library                    | No serve target; TextSnippet domain library                                    | `src/Frontend/libs/apps-domains/text-snippet-domain/project.json:3-23`                                                                                                     |
| `src/Frontend/libs/platform-components/`, `apps-shared-components/`, `apps-domains-components/` | Reserved README-only directories | No `project.json` or build target evidenced                                    | `src/Frontend/libs/platform-components/README.md:1-3`; `src/Frontend/libs/apps-shared-components/README.md:1-3`; `src/Frontend/libs/apps-domains-components/README.md:1-3` |

The app imports both configured libraries, and the domain library depends on `platform-core` (`src/Frontend/apps/playground-text-snippet/src/app/app.config.ts:7-15,34-56`; `src/Frontend/tsconfig.base.json:18-22`). Nx declares Yarn as its CLI package manager (`src/Frontend/nx.json:7`); both root lockfiles are present, so follow the command surface in the current package scripts and pipeline.

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
| OpenTelemetry          | 1.16.0  | Distributed tracing             |
| Pyroscope              | 0.9.4   | Continuous profiling            |
| BenchmarkDotNet        | 0.14.0  | Performance benchmarking        |
| Microsoft.Identity.Web | 3.14.1  | Azure AD / OIDC auth on the API |
| Ulid                   | 1.3.4   | Sortable unique identifiers     |

No central package management — there is NO `Directory.Packages.props`/`Directory.Build.props`; versions live per-`.csproj` (most pinned in `src/Platform/Easy.Platform/Easy.Platform.csproj`). Target framework `net9.0` (`Easy.Platform.csproj:4`); Azure pipeline pins SDK `9.0.x`.

Backend version evidence: core dependencies are pinned in `src/Platform/Easy.Platform/Easy.Platform.csproj:4,22-56`; EF Core in `src/Platform/Easy.Platform.EfCore/Easy.Platform.EfCore.csproj:16-21`; MongoDB.Driver in `src/Platform/Easy.Platform.MongoDB/Easy.Platform.MongoDB.csproj:16-19`; and RabbitMQ.Client in `src/Platform/Easy.Platform.RabbitMQ/Easy.Platform.RabbitMQ.csproj:12-14`.

### Frontend

| Technology           | Version        | Purpose                |
| -------------------- | -------------- | ---------------------- |
| Angular              | 19.0.6         | SPA framework          |
| Angular Material     | 19.0.5         | UI component library   |
| Nx                   | 20.8.3         | Monorepo build system  |
| NgRx Component Store | 19.0.0         | State management       |
| RxJS                 | 7.8.1          | Reactive programming   |
| TypeScript           | 5.6.3          | Language               |
| Bootstrap            | 5.3.2          | CSS grid/utilities     |
| Highcharts           | 11.4.8         | Charting               |
| Jest                 | 29.7.0         | Unit testing           |
| ESLint + Prettier    | 8.57.1 / 3.1.1 | Linting and formatting |
| Stylelint            | 16.26.1        | SCSS linting           |

Frontend resolved versions are from `src/Frontend/package-lock.json:541-542,673-674,769-770,5600-5601,11091-11092,13675-13676,16086-16087,17522-17523,20624-20625,23362-23363,24213-24214,25503-25504,27151-27152`; the formerly separate Playwright workspace has been removed from the current tree.

### Infrastructure

| Technology         | Version                     | Purpose                                                 |
| ------------------ | --------------------------- | ------------------------------------------------------- |
| Docker + Compose   | --                          | Containerization and orchestration                      |
| MongoDB            | 7                           | Document database (primary)                             |
| PostgreSQL         | 16                          | Relational database (alternative)                       |
| SQL Server         | Local build image           | Relational database (alternative)                       |
| RabbitMQ           | 3.12.4                      | Message broker                                          |
| Redis              | 6.2.5                       | Distributed cache                                       |
| Selenium Grid      | 4.4.0 override / 4.8.3 base | Browser automation (BDD tests); override image wins     |
| Pyroscope (server) | Image tag omitted           | Continuous-profiling backend                            |
| CI/CD              | Azure Pipelines             | Build / IntegrationTests / E2ETests (see CI/CD section) |

Infrastructure image evidence is in `src/platform-example-app.docker-compose.yml:1-25,45-57` and the effective local Selenium override is in `src/platform-example-app.docker-compose.override.yml:194-201`.

## Module Codes

| Code                                      | Kind                  | Path                                                                        |
| ----------------------------------------- | --------------------- | --------------------------------------------------------------------------- |
| Easy.Platform                             | framework             | `src/Platform/Easy.Platform/`                                               |
| Easy.Platform.AspNetCore                  | framework             | `src/Platform/Easy.Platform.AspNetCore/`                                    |
| Easy.Platform.MongoDB                     | framework             | `src/Platform/Easy.Platform.MongoDB/`                                       |
| Easy.Platform.EfCore                      | framework             | `src/Platform/Easy.Platform.EfCore/`                                        |
| Easy.Platform.RabbitMQ                    | framework             | `src/Platform/Easy.Platform.RabbitMQ/`                                      |
| Easy.Platform.RedisCache                  | framework             | `src/Platform/Easy.Platform.RedisCache/`                                    |
| Easy.Platform.AutomationTest              | framework             | `src/Platform/Easy.Platform.AutomationTest/`                                |
| Easy.Platform.AzureFileStorage            | framework             | `src/Platform/Easy.Platform.AzureFileStorage/`                              |
| Easy.Platform.FirebasePushNotification    | framework             | `src/Platform/Easy.Platform.FireBasePushNotification/`                      |
| Easy.Platform.HangfireBackgroundJob       | framework             | `src/Platform/Easy.Platform.HangfireBackgroundJob/`                         |
| Easy.Platform.CustomAnalyzers             | framework             | `src/Platform/Easy.Platform.CustomAnalyzers/`                               |
| Easy.Platform.Benchmark                   | framework             | `src/Platform/Easy.Platform.Benchmark/`                                     |
| Easy.Platform.Tests.Unit                  | framework             | `src/Platform/Easy.Platform.Tests.Unit/`                                    |
| TextSnippet.Api                           | backend-service       | `src/Backend/PlatformExampleApp.TextSnippet.Api/`                           |
| TextSnippet.Application                   | backend-service       | `src/Backend/PlatformExampleApp.TextSnippet.Application/`                   |
| TextSnippet.Domain                        | backend-service       | `src/Backend/PlatformExampleApp.TextSnippet.Domain/`                        |
| TextSnippet.Infrastructure                | backend-service       | `src/Backend/PlatformExampleApp.TextSnippet.Infrastructure/`                |
| TextSnippet.Persistence                   | backend-service       | `src/Backend/PlatformExampleApp.TextSnippet.Persistence/`                   |
| TextSnippet.Persistence.Mongo             | backend-service       | `src/Backend/PlatformExampleApp.TextSnippet.Persistence.Mongo/`             |
| TextSnippet.Persistence.PostgreSql        | backend-service       | `src/Backend/PlatformExampleApp.TextSnippet.Persistence.PostgreSql/`        |
| TextSnippet.Persistence.MultiDbDemo.Mongo | backend-service       | `src/Backend/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo/` |
| PlatformExampleApp.Ids                    | backend-service       | `src/Backend/PlatformExampleApp.Ids/`                                       |
| PlatformExampleApp.IntegrationTests       | library               | `src/Backend/PlatformExampleApp.IntegrationTests/`                          |
| PlatformExampleApp.Test.Shared            | library               | `src/Backend/PlatformExampleApp.Test.Shared/`                               |
| PlatformExampleApp.Test                   | library               | `src/Backend/PlatformExampleApp.Test/`                                      |
| PlatformExampleApp.Test.BDD               | library               | `src/Backend/PlatformExampleApp.Test.BDD/`                                  |
| PlatformExampleApp.Benchmark              | library               | `src/Backend/PlatformExampleApp.Benchmark/`                                 |
| PlatformExampleApp.Shared                 | library               | `src/Backend/PlatformExampleApp.Shared/`                                    |
| playground-text-snippet                   | frontend-app          | `src/Frontend/apps/playground-text-snippet/`                                |
| platform-core                             | library               | `src/Frontend/libs/platform-core/`                                          |
| text-snippet-domain                       | library               | `src/Frontend/libs/apps-domains/text-snippet-domain/`                       |
| apps-domains-components                   | library (placeholder) | `src/Frontend/libs/apps-domains-components/`                                |
| apps-shared-components                    | library (placeholder) | `src/Frontend/libs/apps-shared-components/`                                 |
| platform-components                       | library (placeholder) | `src/Frontend/libs/platform-components/`                                    |

The 34 codes above mirror the configured module list in `docs/project-config.json:32-318`; placeholder status is verified by the README-only directories cited in Frontend Apps.

## CI/CD (Delivery Detail)

**Azure Pipelines only:** the root `azure-pipelines.yml` triggers on `main`, uses `ubuntu-latest`, Release, and .NET `9.0.x` (`azure-pipelines.yml:5-16`). The detailed stage behavior and unresolved integration-test path mismatch are documented under Deployment & Delivery.

| Stage            | Depends on | What it does                                                                                                                                                  |
| ---------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build            | —          | Builds the TextSnippet API (`azure-pipelines.yml:17-40`)                                                                                                      |
| IntegrationTests | Build      | Starts Compose infrastructure/API, runs the configured pipeline paths, publishes test results, checks coverage, and tears down (`azure-pipelines.yml:42-137`) |
| E2ETests         | Build      | Starts the full local stack, runs Playwright against the web SPA, publishes artifacts, and tears down (`azure-pipelines.yml:139-218`)                         |

No repository-local deployment stage, promotion gate, rollback script, or alternate CI provider was evidenced in this scan. External release configuration remains unverified.

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
| Framework unit tests | `dotnet test src/Platform/Easy.Platform.Tests.Unit/`                                                                                  |
| Browser test availability | Read `docs/project-reference/e2e-test-reference.md`                                                                                          |

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Keep this reference synchronized with current source/config so contributors choose the correct project, port, dependency, environment key, and evidenced delivery path without inventing structure.

**IMPORTANT MUST ATTENTION Summary:** 1. Place work using Architecture Overview and Service Architecture. 2. Use Infrastructure Ports and Environment Configuration with secret values omitted. 3. Resolve paths, versions, and module names through Frontend Apps, Tech Stack, Key Directories, and Module Codes. 4. Follow only evidenced Deployment & Delivery and Quick Start behavior; verify the pipeline and Docker build-context warnings. 5. Recheck source/config and all `file:line` claims before changing or relying on this document.

**IMPORTANT MUST ATTENTION** Keep logic in the lowest appropriate layer: Entity/Model > Service > Component/Handler; use PlatformExampleApp as the reference implementation.
**IMPORTANT MUST ATTENTION** Verify claims, paths, ports, versions, module parity, and delivery signals against current source/config before handoff; report unresolved mismatches.
**IMPORTANT MUST ATTENTION** Record secret names/mechanisms only, never values; re-run the claim, path, and secret backstops after updates.
