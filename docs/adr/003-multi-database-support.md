# ADR-003: Multi-Database Support via Repository Abstraction

**Status:** Accepted
**Date:** 2026-02-06

## Context

Different microservices have different data access needs. Document-heavy services benefit from MongoDB; relational services need SQL Server or PostgreSQL. The framework provides `IPlatformQueryableRootRepository<TEntity, TKey>` as a unified interface with engine-specific implementations via `PlatformEfCorePersistenceModule` and `PlatformMongoDbPersistenceModule`.

## Decision

Use a database-agnostic repository interface (`IPlatformQueryableRootRepository`) with engine-specific persistence modules. Each service chooses its database engine at the persistence layer without affecting domain or application layers. Static expression extensions on entities keep query logic portable.

## Alternatives Rejected

- **Single database engine for all services:** Limits team choice. Forces document-oriented workloads into relational schemas or vice versa. Prevents per-service optimization.
- **ORM-specific code in application layer:** Couples business logic to a specific database engine (e.g., EF Core `DbSet` directly in handlers). Prevents switching engines without rewriting application logic. Violates Clean Architecture layer boundaries.

## Consequences

- **Positive:** Each service picks the best engine for its workload. Domain and application layers remain engine-agnostic. Static expression extensions keep query predicates reusable across engines.
- **Negative:** Must test queries on each supported engine when building shared platform features. Some engine-specific features (MongoDB aggregation pipeline, SQL window functions) are unavailable through the abstraction. Minor performance overhead from abstraction layer.

## Revisit When

All services standardize on one database engine, or the abstraction layer blocks critical engine-specific optimizations that cannot be addressed through persistence-layer extensions.
