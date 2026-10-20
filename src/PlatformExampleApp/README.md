# Platform Example App

This folder is the runnable architecture guide for Easy.Platform. It contains two independently owned application modules, a composite ASP.NET Core host, and a standalone TaskManagement host. The sample is intentionally small; the boundaries are the point.

This is a technical, code-first platform-library proof of concept rather than a product capability. It intentionally does not have a saved business Feature Spec or Section 8 test registry; the executable code, tests, and derived technical views are the POC guidance. Business-spec synchronization for this example app is therefore intentionally unverified / not applicable by design.

## Module map

| Boundary       | Domain                                     | Application                                     | Persistence                                                  | HTTP adapter                            |
| -------------- | ------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| TextSnippet    | `PlatformExampleApp.TextSnippet.Domain`    | `PlatformExampleApp.TextSnippet.Application`    | Mongo, PostgreSQL, SQL Server, and the MultiDb demo projects | `PlatformExampleApp.TextSnippet.Api`    |
| TaskManagement | `PlatformExampleApp.TaskManagement.Domain` | `PlatformExampleApp.TaskManagement.Application` | `PlatformExampleApp.TaskManagement.Persistence.Mongo`        | `PlatformExampleApp.TaskManagement.Api` |

Hosts:

-   `PlatformExampleApp.ModularMonolith.Api` is one process with both module graphs and both controller assemblies.
-   `PlatformExampleApp.TaskManagement.Api` is a standalone host that reuses the TaskManagement Domain/Application/Persistence/API projects and owns its RabbitMQ adapter when messaging is enabled.
-   `PlatformExampleApp.IntegrationTests` covers route composition and module lifecycle, and explicitly proves isolated-persistence separation, keyed event replay, worker-lane registration, and the extraction boundary.

## Composite host

`src/PlatformExampleApp/PlatformExampleApp.ModularMonolith.Api/ModularMonolithApiAspNetCoreModule.cs` is the composite host's only composition root. It explicitly registers:

1. `TextSnippetApplicationModule` and `TextSnippetMongoPersistenceModule`;
2. `TaskManagementApplicationModule` and `TaskManagementMongoPersistenceModule`;
3. one shared RabbitMQ provider and one shared Redis provider;
4. the TextSnippet and TaskManagement controller assemblies; and
5. one `PlatformMessageBusStoreBinding` for each runtime application/persistence pair. The auxiliary `TextSnippetMultiDbDemoMongoPersistenceModule` is registered for its typed context but opts out of runtime message-bus store contribution.

The store keys are logical ownership identifiers, not database names. Strict composition validation is enabled so an unqualified message-bus or persistence lookup cannot silently choose the wrong module. The keyed registry is used by producers, consumers, CQRS event handlers, inbox workers, and outbox workers.

### Request and event flow

```text
HTTP request
  -> module controller assembly
  -> module CQRS command/query
  -> module domain + typed repository
  -> local unit of work
  -> local projection/event-handler path
  -> module-keyed outbox (when outbound messaging is enabled)
  -> shared RabbitMQ transport (when messaging is enabled)
  -> module-keyed inbox/consumer (when inbound messaging is enabled)
  -> module-owned projection/business state
```

The two modules can share the same physical Mongo database. They still keep distinct contexts, repository ports, system-collection namespaces, application lanes, and store keys. The sample makes no distributed-transaction claim: an operation spanning two physical databases is eventually consistent and must use explicit integration messages and idempotent handlers.

## Persistence choices

The composite host's default settings are in `src/PlatformExampleApp/PlatformExampleApp.ModularMonolith.Api/appsettings.json`; local development overrides are in `src/PlatformExampleApp/PlatformExampleApp.ModularMonolith.Api/appsettings.Development.json`.

TaskManagement supports two modes:

-   `TaskManagement:PersistenceMode=Shared` uses the configured TaskManagement database when present and otherwise falls back to `MongoDB:Database`.
-   `TaskManagement:PersistenceMode=Isolated` requires `TaskManagement:Mongo:Database` and keeps TaskManagement data in that physical database.

In both modes the connection is read from `TaskManagement:Mongo:ConnectionString` when supplied, otherwise from `MongoDB:ConnectionString`.

The host ships no `launchSettings.json`, so a plain `dotnet run` uses the Production environment: `appsettings.json` only, which selects `Shared`. Set `ASPNETCORE_ENVIRONMENT=Development` to also load `appsettings.Development.json`, which selects `Isolated` (database `BravoSuiteModularMonolith_TaskManagement`) and the local infrastructure credentials.

Messaging is independently configurable with `TaskManagement:Messaging:Enabled`, `InboxEnabled`, and `OutboxEnabled`. Keep module-owned settings in the host configuration; do not copy credentials into application or test source code.

## Standalone extraction seam

`src/PlatformExampleApp/PlatformExampleApp.TaskManagement.Api/TaskManagementApiAspNetCoreModule.cs` is the reusable HTTP adapter. It depends on the TaskManagement application and Mongo persistence modules and discovers only `TaskBoardController`.

`TaskManagementStandaloneModule` adds the standalone RabbitMQ provider only when `TaskManagement:Messaging:Enabled` is true. The composite root does not register this standalone module because it already owns one process-wide transport provider. This separation keeps the module reusable in either topology:

```text
Composite host:       root -> TaskManagement application + persistence + API assembly
Standalone host:      root (extends the TaskManagement API module) -> application + persistence + domain
Future service split: service host reuses the same module graph and selects its own providers
```

Extraction still requires operational work outside this proof of concept: deployment configuration, broker topology, observability, data migration/cutover, and a deliberate consistency/recovery strategy.

## Event semantics

-   Internal domain events are handled inside the owning application boundary and local unit-of-work path. The TaskManagement projection handler is local and not inbox-backed.
-   When messaging is enabled, integration messages use the module's keyed outbox/inbox path and are at-least-once. Duplicate delivery and replay are expected; projections use deterministic identities/upserts.
-   A local business write and outbox record can be committed atomically when they share the provider-supported local unit of work. RabbitMQ delivery is a separate operation.
-   Retry supports transient failure recovery, but this platform/sample does not provide a guaranteed DLQ, poison-message quarantine, or exactly-once delivery. Persistent failures need monitoring and an owning-module recovery/reconciliation policy.

### Projection compatibility

TaskManagement stores two independent versions. `TaskConcurrencyUpdateToken` is the aggregate edit token returned by list responses; `ConcurrencyUpdateToken` is the projection row's compare-and-swap token. The module's Mongo mapping keeps the aggregate token in the legacy BSON `ConcurrencyUpdateToken` field and stores the row token in `ProjectionConcurrencyUpdateToken`. Existing documents retain their genuine edit token without a backfill; transport-only creation state retains a null aggregate token until a local aggregate event supplies it. `TC-PERSIST-108` guards materialization, DTO validation, and the separate compare/update fields.

### Search input

TextSnippet search combines full-text matches with case-insensitive, literal prefixes of `SnippetText`, preserving the reader's ownership and additional filters in both branches. Prefix punctuation is text: `a.b` does not mean `axb`, and `(` is valid input. `TC-MONGO-SEARCH-003` guards metacharacter matching and `TC-SEARCH-072` exercises punctuation through the real Mongo query path.

## Run and verify

Run these commands from the repository root. The `dotnet run` and integration-test commands require the local infrastructure configured by the repository; the disposable test database names are generated by the test factory.

```powershell
# Start the repository's local infrastructure when it is not already running.
cmd /c "dev-infrastructure\start-docker.cmd"

# Build the composite host.
dotnet build src/PlatformExampleApp/PlatformExampleApp.ModularMonolith.Api/PlatformExampleApp.ModularMonolith.Api.csproj --nologo

# Run both modules in one ASP.NET Core process.
dotnet run --project src/PlatformExampleApp/PlatformExampleApp.ModularMonolith.Api/PlatformExampleApp.ModularMonolith.Api.csproj

# Run TaskManagement as a standalone host.
dotnet run --project src/PlatformExampleApp/PlatformExampleApp.TaskManagement.Api/PlatformExampleApp.TaskManagement.Api.csproj

# Run the composite architecture proof.
dotnet test src/PlatformExampleApp/PlatformExampleApp.IntegrationTests/PlatformExampleApp.IntegrationTests.csproj --no-restore --nologo --filter "FullyQualifiedName~PlatformExampleApp.IntegrationTests.ModularMonolith"
```

For the supported infrastructure gate and test-output conventions, see `docs/project-config.json` and `docs/project-reference/integration-test-reference.md`. Test reports, logs, and traces belong under `tmp/` and are disposable.

Unit-level architecture contracts for the example app live in `PlatformExampleApp.Tests.Unit` and need no infrastructure:

```powershell
dotnet test src/PlatformExampleApp/PlatformExampleApp.Tests.Unit/PlatformExampleApp.Tests.Unit.csproj --nologo
```

## Project-reference rules

-   Domain references platform domain abstractions only; it does not reference API or another business module.
-   Application references its own domain and contracts, owns CQRS handlers, event consumers/producers, and seeder ownership.
-   Persistence references its own application contract/domain types and owns the context, repository implementations, provider configuration, and platform system-collection namespace.
-   API is a thin adapter: controllers extend the platform base controller and delegate to CQRS. It does not become the owner of domain or persistence logic.
-   The host is the only place that composes module graphs, controller assemblies, process-wide providers, and keyed store bindings.

The static dependency guard is `TaskManagementModuleBoundaryTests`; use it when adding a reference or moving a module. The runtime proof is in `ModularMonolithCompositionIntegrationTests` and `ModularMonolithPersistenceIntegrationTests`.
