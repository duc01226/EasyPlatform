# ADR-004: Event-Driven Side Effects

**Status:** Accepted
**Date:** 2026-02-06

## Context

Operations like sending notifications, syncing data to other services, and audit logging must happen after successful commands. These side effects should not corrupt the primary operation if they fail, and they should be independently testable and retryable. The framework provides `PlatformCqrsEntityEventApplicationHandler` for handling entity lifecycle events.

## Decision

All side effects go in entity event handlers (in `UseCaseEvents/` folder), never in command handlers. Entity events are raised automatically by the framework on create/update/delete. Each side effect is an independent handler class with its own `HandleWhen()` filter and `HandleAsync()` logic.

## Alternatives Rejected

- **Inline side effects in command handlers:** Creates untestable coupling between primary operation and side effects. A failing email send would roll back a valid entity save. Cannot retry side effects independently. Handler methods grow unbounded.
- **Saga/Orchestrator pattern:** Over-engineered for current needs. Adds state machine complexity when simple fire-and-forget event handlers suffice. Appropriate for multi-step distributed transactions, which are rare in this codebase.

## Consequences

- **Positive:** Primary operation and side effects are decoupled. Each handler is independently testable. Failed side effects do not corrupt the primary operation. Framework provides independent retry per handler. Clean separation of concerns.
- **Negative:** Debugging requires tracing entity event flow (event raised -> handler invoked). Side effects are eventually consistent, not synchronous. No guaranteed ordering between multiple handlers for the same event.

## Revisit When

Need guaranteed ordering of side effects, need synchronous side effects for immediate user feedback, or when moving to long-running sagas that require compensating transactions.
