<!-- Last scanned: 2026-03-07 -->

# Feature Docs Reference

> Business feature index for PlatformExampleApp (TextSnippet). Auto-populated by `/scan-feature-docs`.

## App-to-Service Mapping

| Frontend App              | Backend Service                              | Domain Library        | Doc Directory                         |
| ------------------------- | -------------------------------------------- | --------------------- | ------------------------------------- |
| `playground-text-snippet` | `PlatformExampleApp.TextSnippet.Application` | `text-snippet-domain` | `docs/business-features/TextSnippet/` |

**Single-service project.** PlatformExampleApp is a reference implementation with one service (TextSnippet). The Platform framework lives under `src/Platform/` and is not a business feature.

## Feature Index

### TextSnippet Module

Core CRUD and demo features for text snippets with categories, task items, and platform pattern demonstrations.

#### Domain Entities

| Entity                | Path                                                     | Description                                                    |
| --------------------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| `TextSnippetEntity`   | `src/Backend/.../Domain/Entities/TextSnippetEntity.cs`   | Primary entity -- text snippet with title, full text, category |
| `TextSnippetCategory` | `src/Backend/.../Domain/Entities/TextSnippetCategory.cs` | Hierarchical categories (self-referential ParentCategory)      |
| `TaskItemEntity`      | `src/Backend/.../Domain/Entities/TaskItemEntity.cs`      | Task/todo items with status tracking                           |
| `MultiDbDemoEntity`   | `src/Backend/.../Domain/Entities/MultiDbDemoEntity.cs`   | Demo entity for multi-database scenarios                       |
| `User`                | `src/Backend/.../Domain/Entities/User.cs`                | User entity                                                    |

#### Commands (Write Operations)

| Command                                    | Path                                                         | Description                               |
| ------------------------------------------ | ------------------------------------------------------------ | ----------------------------------------- |
| `SaveSnippetTextCommand`                   | `UseCaseCommands/SaveSnippetTextCommand.cs`                  | Create or update a text snippet           |
| `CreateTextSnippetWithCurrentUserCommand`  | `UseCaseCommands/CreateTextSnippetWithCurrentUserCommand.cs` | Create snippet using current user context |
| `SaveSnippetCategoryCommand`               | `UseCaseCommands/Category/SaveSnippetCategoryCommand.cs`     | Create or update a snippet category       |
| `BulkUpdateSnippetStatusCommand`           | `UseCaseCommands/Snippet/BulkUpdateSnippetStatusCommand.cs`  | Bulk status update for snippets           |
| `CloneSnippetCommand`                      | `UseCaseCommands/Snippet/CloneSnippetCommand.cs`             | Clone an existing snippet                 |
| `SaveTaskItemCommand`                      | `UseCaseCommands/TaskItem/SaveTaskItemCommand.cs`            | Create or update a task item              |
| `DemoScheduleBackgroundJobManuallyCommand` | `UseCaseCommands/OtherDemos/...`                             | Demo: manually schedule a background job  |
| `DemoSendFreeFormatEventBusMessageCommand` | `UseCaseCommands/OtherDemos/...`                             | Demo: send free-format event bus message  |
| `DemoUseCreateOrUpdateManyCommand`         | `UseCaseCommands/OtherDemos/...`                             | Demo: batch create/update pattern         |
| `DemoUseDemoDomainServiceCommand`          | `UseCaseCommands/OtherDemos/...`                             | Demo: domain service usage                |

#### Queries (Read Operations)

| Query                         | Path                                                | Description                         |
| ----------------------------- | --------------------------------------------------- | ----------------------------------- |
| `SearchSnippetTextQuery`      | `UseCaseQueries/SearchSnippetTextQuery.cs`          | Search/filter snippets with caching |
| `GetMyTextSnippetsQuery`      | `UseCaseQueries/GetMyTextSnippetsQuery.cs`          | Get current user's snippets         |
| `GetTaskListQuery`            | `UseCaseQueries/TaskItem/GetTaskListQuery.cs`       | Paginated task list with filtering  |
| `GetTaskStatisticsQuery`      | `UseCaseQueries/TaskItem/GetTaskStatisticsQuery.cs` | Task aggregate statistics           |
| `TestGetAllDataAsStreamQuery` | `UseCaseQueries/TestGetAllDataAsStreamQuery.cs`     | Demo: IAsyncEnumerable streaming    |

#### API Controllers

| Controller              | Route             | Endpoints                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Description                                |
| ----------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `TextSnippetController` | `api/TextSnippet` | `GET search`, `POST save`, `GET demoScheduleBackgroundJobManuallyCommand`, `GET DemoUseDemoDomainServiceCommand`, `POST demoSendFreeFormatEventBusMessageCommand`, `GET testHandleInternalException`, `GET testGetAllDataAsIAsyncEnumerableStream`, `GET testGetAllDataAsIEnumerableStream`, `GET testGetAllDataAsIEnumerableFromAsyncEnumerableStream`, `POST testSaveUsingDirectDbContext`, `GET DemoUseCreateOrUpdateMany`, `GET TestIAsyncEnumerable`, `GET testNavigationLoading`, `GET testReverseNavigationLoading` | Primary snippet CRUD + demo/test endpoints |
| `TaskItemController`    | `api/TaskItem`    | `GET list`, `GET stats`, `POST save`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Task item CRUD + statistics                |

#### Event Handlers (Side Effects)

| Handler                                                                   | Path                            | Trigger                                   |
| ------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------- |
| `ClearCacheOnSaveSnippetTextEntityEventHandler`                           | `UseCaseEvents/ClearCaches/...` | Snippet saved -- clears search cache      |
| `DemoBulkEntitiesEventHandler`                                            | `UseCaseEvents/...`             | Demo: bulk entity operations              |
| `DemoDoSomeDomainEntityLogicActionOnSaveSnippetTextEntityEventHandler`    | `UseCaseEvents/...`             | Demo: domain logic on snippet save        |
| `DemoUsingPropertyValueUpdatedDomainEventOnSnippetTextEntityEventHandler` | `UseCaseEvents/...`             | Demo: property change domain event        |
| `SendNotificationOnPublishSnippetEventHandler`                            | `UseCaseEvents/Snippet/...`     | Snippet published -- sends notification   |
| `UpdateCategoryStatsOnSnippetChangeEventHandler`                          | `UseCaseEvents/Snippet/...`     | Snippet changed -- updates category stats |

#### Background Jobs

| Job                                                             | Path                | Description                    |
| --------------------------------------------------------------- | ------------------- | ------------------------------ |
| `DemoBatchScrollingBackgroundJobExecutor`                       | `BackgroundJob/...` | Demo: batch scrolling pattern  |
| `DemoPagedBackgroundJobExecutor`                                | `BackgroundJob/...` | Demo: paged processing pattern |
| `DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutor` | `BackgroundJob/...` | Demo: manually scheduled job   |
| `TestRecurringBackgroundJobExecutor`                            | `BackgroundJob/...` | Demo: recurring job pattern    |

#### Message Bus Consumers

| Consumer                                                        | Type                | Description                                              |
| --------------------------------------------------------------- | ------------------- | -------------------------------------------------------- |
| `SaveSnippetTextCommandEventBusMessageConsumer`                 | Command Event       | Reacts to SaveSnippetText command events                 |
| `TransferSnippetTextToMultiDbDemoEntityNameDomainEventConsumer` | Domain Event        | Cross-DB demo: transfers snippet text to multi-db entity |
| `SnippetTextEntityEventBusConsumer`                             | Entity Event        | Reacts to snippet entity changes                         |
| `DemoSendFreeFormatEventBusMessageCommandEventBusConsumer`      | Free Format         | Demo: free-format message handling                       |
| `DemoSomethingHappenedEventBusMessageConsumer`                  | Free Format Event   | Demo: event-style free-format message                    |
| `DemoAskDoSomethingRequestBusMessageConsumer`                   | Free Format Request | Demo: request/reply free-format message                  |

#### Frontend Components

| Component                 | Path                                                                          | Description                |
| ------------------------- | ----------------------------------------------------------------------------- | -------------------------- |
| `app-text-snippet-detail` | `apps/playground-text-snippet/.../shared/components/app-text-snippet-detail/` | Snippet detail/edit view   |
| `task-detail`             | `apps/playground-text-snippet/.../shared/components/task-detail/`             | Task item detail/edit view |
| `task-list`               | `apps/playground-text-snippet/.../shared/components/task-list/`               | Task list with store       |
| `nav-loading-test`        | `apps/playground-text-snippet/.../shared/components/nav-loading-test/`        | Navigation loading demo    |

#### Frontend Domain Library

| File                         | Path                                                          | Description             |
| ---------------------------- | ------------------------------------------------------------- | ----------------------- |
| `text-snippet.api.ts`        | `libs/apps-domains/text-snippet-domain/src/lib/apis/`         | TextSnippet API service |
| `task-item.api.ts`           | `libs/apps-domains/text-snippet-domain/src/lib/apis/`         | TaskItem API service    |
| `text-snippet.data-model.ts` | `libs/apps-domains/text-snippet-domain/src/lib/data-models/`  | TextSnippet data model  |
| `task-item.data-model.ts`    | `libs/apps-domains/text-snippet-domain/src/lib/data-models/`  | TaskItem data model     |
| `text-snippet.repository.ts` | `libs/apps-domains/text-snippet-domain/src/lib/repositories/` | TextSnippet repository  |

#### DTOs

| DTO                            | Path                                                    | Maps To                     |
| ------------------------------ | ------------------------------------------------------- | --------------------------- |
| `TextSnippetEntityDto`         | `Application/Dtos/EntityDtos/TextSnippetEntityDto.cs`   | `TextSnippetEntity`         |
| `TextSnippetCategoryDto`       | `Application/Dtos/EntityDtos/TextSnippetCategoryDto.cs` | `TextSnippetCategory`       |
| `TaskItemEntityDto`            | `Application/Dtos/EntityDtos/TaskItemEntityDto.cs`      | `TaskItemEntity`            |
| `ExampleAddressValueObjectDto` | `Application/Dtos/ExampleAddressValueObjectDto.cs`      | `ExampleAddressValueObject` |

## Integration Tests

| Test File                                       | Covers                | Path                                                  |
| ----------------------------------------------- | --------------------- | ----------------------------------------------------- |
| `SaveSnippetTextCommandIntegrationTests.cs`     | Snippet CRUD          | `PlatformExampleApp.IntegrationTests/TextSnippets/`   |
| `SearchSnippetTextQueryIntegrationTests.cs`     | Snippet search/filter | `PlatformExampleApp.IntegrationTests/TextSnippets/`   |
| `SaveSnippetCategoryCommandIntegrationTests.cs` | Category CRUD         | `PlatformExampleApp.IntegrationTests/Categories/`     |
| `MessageBusIntegrationTests.cs`                 | Event bus messaging   | `PlatformExampleApp.IntegrationTests/MessageBus/`     |
| `BatchScrollingJobIntegrationTests.cs`          | Batch scrolling job   | `PlatformExampleApp.IntegrationTests/BackgroundJobs/` |
| `PagedJobIntegrationTests.cs`                   | Paged job             | `PlatformExampleApp.IntegrationTests/BackgroundJobs/` |
| `SimpleRecurringJobIntegrationTests.cs`         | Recurring job         | `PlatformExampleApp.IntegrationTests/BackgroundJobs/` |

## Persistence Providers

| Provider          | Project                                                        | Description                     |
| ----------------- | -------------------------------------------------------------- | ------------------------------- |
| MongoDB           | `PlatformExampleApp.TextSnippet.Persistence.Mongo`             | Primary MongoDB persistence     |
| PostgreSQL        | `PlatformExampleApp.TextSnippet.Persistence.PostgreSql`        | EF Core PostgreSQL persistence  |
| MongoDB (MultiDb) | `PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo` | Multi-database demo persistence |

## Directory Structure

```
src/Backend/
|-- PlatformExampleApp.TextSnippet.Api/          API layer (controllers)
|-- PlatformExampleApp.TextSnippet.Application/  Application layer (CQRS handlers)
|   |-- UseCaseCommands/                         Write operations
|   |-- UseCaseQueries/                          Read operations
|   |-- UseCaseEvents/                           Side-effect handlers
|   |-- BackgroundJob/                           Scheduled/background jobs
|   |-- MessageBus/                              Event bus consumers/producers
|   |-- Dtos/                                    Data transfer objects
|   |-- Caching/                                 Cache key providers
|   +-- Persistence/                             DB context interfaces
|-- PlatformExampleApp.TextSnippet.Domain/       Domain layer (entities, repos)
|-- PlatformExampleApp.TextSnippet.Infrastructure/ Infrastructure layer
|-- PlatformExampleApp.TextSnippet.Persistence/   Base persistence
|-- PlatformExampleApp.TextSnippet.Persistence.Mongo/ MongoDB implementation
|-- PlatformExampleApp.TextSnippet.Persistence.PostgreSql/ PostgreSQL implementation
|-- PlatformExampleApp.IntegrationTests/          Integration tests
|-- PlatformExampleApp.Test/                      E2E/functional tests
+-- PlatformExampleApp.Test.BDD/                  BDD tests

src/Frontend/
|-- apps/playground-text-snippet/                 Example Angular app
|   +-- src/app/shared/components/                UI components
|-- libs/apps-domains/text-snippet-domain/        Domain library
|   |-- src/lib/apis/                             API service classes
|   |-- src/lib/data-models/                      Frontend data models
|   +-- src/lib/repositories/                     Repository pattern
+-- libs/platform-core/                           Framework core (shared)
```

## Templates

| Template                 | Path                                               | Purpose                                   |
| ------------------------ | -------------------------------------------------- | ----------------------------------------- |
| Detailed Feature Doc     | `docs/templates/detailed-feature-docs-template.md` | 26-section business feature documentation |
| Feature Doc AI Companion | `docs/templates/feature-docs-ai-template.md`       | AI-companion summary (300-500 lines)      |
| ADR                      | `docs/templates/adr-template.md`                   | Architecture Decision Record              |
| Changelog Entry          | `docs/templates/changelog-entry-template.md`       | Keep a Changelog format entry             |

## Conventions

- **Backend path prefix:** `src/Backend/PlatformExampleApp.TextSnippet.`
- **Frontend app:** `src/Frontend/apps/playground-text-snippet/`
- **Frontend domain lib:** `src/Frontend/libs/apps-domains/text-snippet-domain/`
- **Feature doc location:** `docs/business-features/{Module}/detailed-features/`
- **CQRS naming:** `{Verb}{Entity}{Command|Query}` (e.g., `SaveSnippetTextCommand`, `SearchSnippetTextQuery`)
- **Event handler naming:** `{Action}On{Trigger}EventHandler` (e.g., `ClearCacheOnSaveSnippetTextEntityEventHandler`)
- **Integration test naming:** `{Command|Query}IntegrationTests` in matching subdirectory

## Coverage Gaps

| Area                              | Status                | Notes                                                                                                              |
| --------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| TextSnippet detailed feature docs | Not created           | `docs/business-features/TextSnippet/detailed-features/` does not exist. Run `/feature-docs TextSnippet` to create. |
| TaskItem feature docs             | Not created           | TaskItem has full CRUD but no standalone feature doc.                                                              |
| E2E test coverage for TaskItem    | Unknown               | No TaskItem-specific integration tests found in `PlatformExampleApp.IntegrationTests/`.                            |
| BDD test coverage                 | Present but unaudited | `PlatformExampleApp.Test.BDD/Features/` exists but not cross-referenced.                                           |
