# TaskManagement module and standalone host

TaskManagement is a self-contained example application module. Its Domain, Application, Mongo Persistence, and API projects can be composed into the composite host or reused by the standalone `Program.cs`.

## Ownership

-   `PlatformExampleApp.TaskManagement.Domain` owns `TaskBoardItemEntity`, domain events, and repository ports.
-   `PlatformExampleApp.TaskManagement.Application` owns CQRS commands/queries, projection handlers, integration producers/consumers, typed settings, and `TaskManagementApplicationDataSeeder`.
-   `PlatformExampleApp.TaskManagement.Persistence.Mongo` owns `TaskManagementDbContext`, repository implementations, Mongo configuration, and the `TaskManagement_` platform system-collection namespace.
-   `PlatformExampleApp.TaskManagement.Api` owns the thin `TaskBoardController` adapter and controller discovery.
-   `TaskManagementStandaloneModule` is the standalone composition root and conditionally adds `TaskManagementRabbitMqMessageBusModule`.

The module does not reference TextSnippet. `TaskManagementModuleBoundaryTests` guards this extraction boundary by checking project references and source symbols.

## Standalone versus composite composition

Standalone host:

```text
TaskManagementStandaloneModule (extends TaskManagementApiAspNetCoreModule)
  -> dependencies inherited from TaskManagementApiAspNetCoreModule:
     -> TaskManagementApplicationModule
        -> TaskManagementDomainModule
     -> TaskManagementMongoPersistenceModule
  + TaskManagementRabbitMqMessageBusModule when messaging is enabled
```

Composite host:

```text
ModularMonolithApiAspNetCoreModule
  -> TaskManagementApplicationModule
  -> TaskManagementMongoPersistenceModule
  -> shared RabbitMQ/Redis providers
  -> TaskBoardController assembly
```

The reusable API module intentionally does not own RabbitMQ. This lets a composite root provide one process-wide transport while the standalone root provides its own adapter.

## Configuration

`TaskManagement:Messaging:Enabled`, `InboxEnabled`, and `OutboxEnabled` control the module's message paths. `TaskManagement:PersistenceMode` accepts `Shared` or `Isolated`:

-   `Shared` uses `TaskManagement:Mongo:Database` when supplied, otherwise `MongoDB:Database`.
-   `Isolated` requires `TaskManagement:Mongo:Database`.
-   In both modes the connection uses `TaskManagement:Mongo:ConnectionString` when supplied, otherwise `MongoDB:ConnectionString`.
-   Any other non-empty `TaskManagement:PersistenceMode` value fails module registration with `ArgumentException`.

The logical `TaskManagement` message-bus store key remains stable in both modes. It identifies the module lane; it is not a physical database name.

## HTTP and event flow

-   `GET /api/task-board?SkipCount=&MaxResultCount=` sends the paged `GetTaskBoardItemsQuery`. It reads the TaskManagement-owned projection and returns `Items` plus `TotalCount`. `MaxResultCount` defaults to `GetTaskBoardItemsQuery.DefaultPageSize` (50) and must be between 1 and `GetTaskBoardItemsQuery.MaxPageSize` (200). Each item carries its `ConcurrencyUpdateToken`.
-   `POST /api/task-board` sends `SaveTaskBoardItemCommand`. Without a submitted `Id` it creates a task. With a submitted `Id` (and a required `ConcurrencyUpdateToken`) it loads the aggregate, checks the supplied `ConcurrencyUpdateToken`, and applies `ChangeTitle` and `ChangeStatus`. A stale token is rejected, and persistence issues a new token after a successful update.
-   `TaskBoardItemProjectionEventHandler` owns the projection. It handles both created and updated aggregate events, is not inbox-backed, and captures the projection row version before reloading the latest committed aggregate. Existing rows use optimistic concurrency; missing rows use insert-only writes. A conflicting handler retries the whole read/compute/write path, preventing concurrent or late delivery from overwriting newer state. The projection stores its own row version separately from the aggregate token returned to API clients.
-   When messaging is enabled, `TaskBoardItemCreatedIntegrationEventConsumer` demonstrates the keyed outbox/inbox transport path. It shares the same upsert path but only materializes a missing projection and never overwrites an existing one.

Local business writes and their outbox records can be atomic inside one provider-supported local unit of work. Broker delivery is at-least-once, so replay-safe deterministic projection identity/upsert behavior is required. Retries support transient recovery, but no DLQ or exactly-once guarantee is provided by this sample/platform contract.

## Run and verify

From the repository root, start the local infrastructure if required and run:

```powershell
dotnet build src/Backend/PlatformExampleApp.TaskManagement.Api/PlatformExampleApp.TaskManagement.Api.csproj --nologo
dotnet run --project src/Backend/PlatformExampleApp.TaskManagement.Api/PlatformExampleApp.TaskManagement.Api.csproj
dotnet test src/Backend/PlatformExampleApp.IntegrationTests/PlatformExampleApp.IntegrationTests.csproj --no-restore --nologo --filter "FullyQualifiedName~PlatformExampleApp.IntegrationTests.ModularMonolith"
```

The standalone run uses the host configuration/environment for MongoDB and RabbitMQ. Keep connection strings and credentials outside source control. For the composite proof and deterministic test database naming, see `../PlatformExampleApp.ModularMonolith.Api/README.md` and `../PlatformExampleApp.IntegrationTests/ModularMonolithPersistenceIntegrationTests.cs`.
