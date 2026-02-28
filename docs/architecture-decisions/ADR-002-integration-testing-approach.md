# ADR-002: Integration Testing Approach for Microservices

## Status
Accepted

## Date
2026-02-27

## Context
BravoSUITE is a microservices platform with 5 apps (bravoTALENTS, bravoGROWTH, bravoSURVEYS, bravoINSIGHTS, Accounts). Each service needs integration testing that validates the full CQRS pipeline (validation, handler, entity events, persistence) without HTTP overhead. Tests run against real infrastructure (MongoDB, RabbitMQ) to maximize production parity.

Key constraints:
- Complex business logic with async event handlers, message bus consumers, and background jobs
- Data state is the source of truth — tests must verify DB state after commands
- Tests should behave like a QA tester running regression daily
- Generic patterns must be extractable to Platform for reuse across all 5 services

## Decision

### Subcutaneous Testing Pattern
Dispatch CQRS commands/queries via `IPlatformCqrs` through DI scope, bypassing HTTP/controllers. The test project registers the full service module (`GrowthApiAspNetCoreModule`) and acts like the API service itself.

**Rationale:** HTTP testing adds network overhead and controller concerns without testing business logic. The application layer (commands, handlers, entity events) is where the complexity lives.

### Real Infrastructure (MongoDB, RabbitMQ)
Tests connect to localhost instances (not Testcontainers). Infrastructure must be running before test execution.

**Rationale:** Real MongoDB behavior (indexes, concurrency, change streams) differs from in-memory fakes. Testcontainers adds Docker-in-Docker complexity for CI. Local Docker Compose is the simplest reliable approach.

### Accumulative Data Strategy
No teardown between test runs. Each test generates unique data via GUID suffixes (`IntegrationTestHelper.UniqueName`). Data accumulates across runs.

**Rationale:** Teardown is fragile (foreign keys, event handlers, cascading deletes). Accumulative strategy mirrors real-world database state and enables running tests repeatedly without cleanup.

### WaitUntil for All DB Assertions
ALL database state assertions use `PlatformIntegrationTestHelper.WaitUntilAsync` internally (default 5s timeout, 100ms polling). This is baked into `PlatformAssertDatabaseState` — individual tests do NOT need WaitUntil wrappers.

**Rationale:** Commands trigger async event handlers and message bus consumers that update data asynchronously. Without polling, tests intermittently fail depending on async processing timing. Baking polling into the assertion infrastructure makes this transparent.

### xUnit ICollectionFixture + IAsyncLifetime
One fixture per service (`GrowthIntegrationTestFixture`) shared via `[Collection]`. Fixture implements `IAsyncLifetime` for async data seeding. Tests within a collection execute sequentially.

**Rationale:** `IAsyncLifetime` eliminates deadlock risk from `.GetAwaiter().GetResult()` in constructors. Sequential execution within a collection prevents race conditions on shared state.

### Platform-First Extraction
Generic patterns live in `Easy.Platform.AutomationTest` with virtual extension points. Service-specific code overrides virtual methods.

**Rationale:** Enables bravoTALENTS, bravoSURVEYS, and other services to adopt integration testing by extending platform base classes without duplicating infrastructure code.

### Static ServiceProvider per Generic Type
`PlatformServiceIntegrationTestBase<T>` uses static fields intentionally. Each closed generic gets its own static fields — thread-safe with xUnit's `[Collection]` sequential execution.

### Front-Door Seeding
Seed reference data via repositories (not raw DB inserts). Idempotent `FirstOrDefault + create-if-missing` pattern.

**Rationale:** Seed methods exercise the same persistence layer as production code. Raw SQL/Mongo inserts bypass entity validation, event handlers, and indexes.

## Consequences

### Positive
- Faster execution than WebApplicationFactory + HTTP
- Tests validate the full CQRS pipeline including entity events and async side-effects
- Platform abstractions enable reuse across all 5 services
- Accumulative data strategy eliminates teardown complexity
- WaitUntil assertions handle eventual consistency transparently

### Negative
- Tests require running infrastructure (Docker or local services)
- No coverage of HTTP routing, middleware, or controller-level concerns
- Accumulative data means test DB grows over time (manual purge acceptable)
- Static ServiceProvider design requires documentation (Sonar S2743 suppression)

### Neutral
- Background jobs cannot execute `ProcessAsync` without Hangfire storage — tests verify DI resolution and business logic directly
- Message bus consumer tests are limited to repository connectivity smoke tests (full consumer testing deferred)

## References
- [Quality Evaluation Report](../../plans/260227-2124-integration-testing-poc-audit/reports/evaluation-260227-2124-integration-testing-quality-audit.md)
- [.NET Integration Testing Best Practices Research](../../plans/260227-2124-integration-testing-poc-audit/research/researcher-01-dotnet-integration-testing-best-practices.md)
