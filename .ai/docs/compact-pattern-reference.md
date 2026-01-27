# EasyPlatform Code Pattern Quick Reference

> Compact reference for planning, investigation, and architecture decisions.
> Full code examples: `.ai/docs/backend-code-patterns.md` and `.ai/docs/frontend-code-patterns.md`

## Backend Patterns
| #   | Pattern            | Key Interface/Contract                                                                             |
| --- | ------------------ | -------------------------------------------------------------------------------------------------- |
| 1   | Clean Architecture | Domain → Application → Persistence → Api layers                                                    |
| 2   | Repository         | `IPlatformQueryableRootRepository<TEntity, TKey>` + static expression extensions                   |
| 3   | Repository API     | `CreateAsync`, `GetByIdAsync`, `GetAllAsync`, `FirstOrDefaultAsync`, `CountAsync`                  |
| 4   | Validation         | `PlatformValidationResult.And().AndAsync()` fluent chain, never throw                              |
| 5   | Cross-Service      | `PlatformCqrsEntityEventBusMessageProducer` + `PlatformApplicationMessageBusConsumer`              |
| 6   | Full-Text Search   | `searchService.Search(q, text, Entity.SearchColumns())` in query builder                           |
| 7   | CQRS Command       | Command + Result + Handler in ONE file, `PlatformCqrsCommandApplicationHandler`                    |
| 8   | Query              | `PlatformCqrsPagedQuery` + `GetQueryBuilder()` + parallel count/items                              |
| 9   | Side Effects       | Entity Event Handlers in `UseCaseEvents/`, never in command handlers                               |
| 10  | Entity             | `RootEntity<T, TKey>`, static expressions, `[TrackFieldUpdatedDomainEvent]`, navigation properties |
| 11  | DTO                | `PlatformEntityDto<T, TKey>.MapToEntity()`, DTO owns mapping, constructor from entity              |
| 12  | Fluent Helpers     | `.With()`, `.Then()`, `.EnsureFound()`, `.EnsureValid()`, `.ParallelAsync()`                       |
| 13  | Background Jobs    | `PlatformApplicationPagedBackgroundJobExecutor`, `[PlatformRecurringJob("cron")]`                  |
| 14  | Message Bus        | `PlatformApplicationMessageBusConsumer<TMessage>`, `TryWaitUntilAsync()` for deps                  |
| 15  | Data Migration     | `PlatformDataMigrationExecutor<TDbContext>`, `OnlyForDbsCreatedBeforeDate`                         |
| 16  | Multi-Database     | `PlatformEfCorePersistenceModule` / `PlatformMongoDbPersistenceModule`                             |

## Frontend Patterns
| #   | Pattern             | Key Interface/Contract                                                                 |
| --- | ------------------- | -------------------------------------------------------------------------------------- |
| 1   | Component Hierarchy | `PlatformComponent → AppBaseComponent → Feature` (never extend Platform* directly)     |
| 2   | Component API       | `observerLoadingErrorState()`, `untilDestroyed()`, `tapResponse()`, `isLoading$()`     |
| 3   | State Store         | `PlatformVmStore<T>`, `effectSimple()`, `updateState()`, `select()`                    |
| 4   | API Service         | Extend `PlatformApiService`, `get apiUrl`, typed CRUD methods                          |
| 5   | Forms               | `PlatformFormComponent`, `initialFormConfig()`, `validateForm()`, FormArray support    |
| 6   | Advanced            | `@Watch`, `skipDuplicates()`, `distinctUntilObjectValuesChanged()`, platform utilities |

## Authorization
- Backend: `[PlatformAuthorize(roles)]`, `RequestContext.HasRole()`, entity access expressions
- Frontend: `hasRole()`, `@if (hasRole(...))`, route guards

## Anti-Patterns (Critical Rules)
- Backend: No direct cross-service DB access, no side effects in handlers, no manual validation throw, DTO owns mapping
- Frontend: No direct HttpClient, no manual signals, always `untilDestroyed()`, all elements need BEM classes
