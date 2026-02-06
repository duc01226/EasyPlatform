# ADR-001: CQRS Over Plain CRUD

**Status:** Accepted
**Date:** 2026-02-06

## Context

EasyPlatform needs a consistent pattern for all data operations across microservices. The framework provides `PlatformCqrsCommandApplicationHandler` and `PlatformCqrsPagedQuery` base classes with built-in validation pipelines, authorization, and event dispatching. All operations flow through Command + Result + Handler organized in a single file per use case.

## Decision

Use CQRS (Command Query Responsibility Segregation) for all operations. Every mutation is a Command with a dedicated Handler; every read is a Query with an independent query builder. Command, Result, and Handler live in ONE file.

## Alternatives Rejected

- **Plain CRUD controllers:** Simpler initial setup but couples read and write paths. No natural place for validation pipelines, authorization checks, or domain event dispatching. Leads to fat controllers.
- **MediatR pipeline:** Adds an external dependency for request dispatching that duplicates what `PlatformCqrsCommandApplicationHandler` already provides. No benefit when the Platform framework includes handler base classes, validation, and event infrastructure.

## Consequences

- **Positive:** Independent read/write optimization. Each handler is independently testable. Framework-provided validation pipeline runs automatically. Domain events dispatch after successful command execution.
- **Negative:** Additional boilerplate for simple CRUD scenarios (create command, result, handler even for trivial saves). Learning curve for developers unfamiliar with CQRS.

## Revisit When

Most operations are simple CRUD with no divergence between read and write models, or when handler boilerplate consistently outweighs the architectural benefits.
