# Composite modular-monolith host

`PlatformExampleApp.ModularMonolith.Api` is the proof-of-concept composition root for running TextSnippet and TaskManagement in one ASP.NET Core process.

## What the root owns

`ModularMonolithApiAspNetCoreModule` explicitly owns the host seam:

-   both application modules and their typed Mongo persistence modules;
-   both controller assemblies (`TextSnippet.Api` and `TaskManagement.Api`);
-   one RabbitMQ provider and one Redis provider for the process;
-   two logical message-bus store bindings: `TextSnippet` and `TaskManagement`;
-   the auxiliary TextSnippet MultiDb demo context, which is not a runtime message-bus store contribution; and
-   strict composition validation plus the host-controlled automatic-seeding switch.

The API adapter projects are referenced for controller discovery and reusable module types. The composite root does not register `TaskManagementStandaloneModule` or `TextSnippetApiAspNetCoreModule` wholesale, because those standalone roots own providers that would be duplicated in one process.

## Routes

-   TextSnippet: `POST /api/TextSnippet/save`, `GET /api/TextSnippet/search`
-   TaskManagement: `POST /api/task-board`, `GET /api/task-board`

Both route families are served by the same host. Each command/query remains in its owning application module and resolves its own typed repository and event lane.

## Shared versus isolated Mongo placement

The default `appsettings.json` demonstrates shared placement. `appsettings.Development.json` demonstrates isolated TaskManagement placement through:

```json
{
    "TaskManagement": {
        "PersistenceMode": "Isolated",
        "Mongo": {
            "Database": "<module-owned-database>"
        }
    }
}
```

Use `Shared` when both contexts may live in one physical database and the module namespaces remain distinct. Use `Isolated` when TaskManagement requires its own database; the module rejects an isolated configuration without its own database name. Neither mode provides a distributed transaction across contexts.

## Lifecycle and events

The platform initializes the composed module graph and, when automatic seeding is enabled, runs each application module's declared seeder. The integration-test factory sets `ModularMonolith:EnableAutomaticDataSeedingOnInit=false`; the composition test then invokes the TaskManagement application module's public `SeedData` method twice to verify deterministic repeated lifecycle calls. Production may keep the default enabled.

Internal domain events use the owning module's local unit-of-work path; the TaskManagement projection handler is local and explicitly not inbox-backed. When messaging is enabled, integration events use the module-keyed outbox/inbox path. The local business write and outbox record can share a provider-supported unit of work; RabbitMQ delivery remains separate and at-least-once. Consumers must tolerate replay and transient failure. The proof asserts final module-owned state, never inbox/outbox bookkeeping. There is no guaranteed DLQ or exactly-once contract.

## Future split

The future extraction seam is the module graph, not a controller copy:

```text
TaskManagement.Api -> TaskManagement.Application -> TaskManagement.Domain
                    -> TaskManagement.Persistence.Mongo
```

A new service host can reuse this graph, register its own API module and provider set, choose `Shared` only while co-located or `Isolated` after extraction, and preserve the `TaskManagement` store key. A real split still needs deployment/configuration, broker ownership, data migration, observability, and an explicit eventual-consistency/recovery design.

## Verification

From the repository root:

```powershell
dotnet build src/Backend/PlatformExampleApp.ModularMonolith.Api/PlatformExampleApp.ModularMonolith.Api.csproj --nologo
dotnet test src/Backend/PlatformExampleApp.IntegrationTests/PlatformExampleApp.IntegrationTests.csproj --no-restore --nologo --filter "FullyQualifiedName~PlatformExampleApp.IntegrationTests.ModularMonolith"
```

The integration test requires the repository's configured local infrastructure. Use the preflight in `docs/project-config.json` before broker-backed runs; store disposable reports under `tmp/`.
