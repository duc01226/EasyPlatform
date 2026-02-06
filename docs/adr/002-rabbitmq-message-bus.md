# ADR-002: RabbitMQ Message Bus for Cross-Service Communication

**Status:** Accepted
**Date:** 2026-02-06

## Context

EasyPlatform microservices need to communicate for side effects (notifications, data sync, event propagation) without direct deployment coupling. The framework provides `PlatformCqrsEntityEventBusMessageProducer` for publishing and `PlatformApplicationMessageBusConsumer` for consuming messages. Services must remain independently deployable.

## Decision

Use RabbitMQ with at-least-once delivery semantics for all cross-service communication. Entity events are published to the bus automatically by the framework. Consumers use `PlatformApplicationMessageBusConsumer<TMessage>` with idempotent handlers and `TryWaitUntilAsync()` for dependency ordering.

## Alternatives Rejected

- **Apache Kafka:** Overkill for current scale. Strict message ordering guarantees are not needed. Operational complexity (partitions, consumer groups, offset management) adds burden without proportional benefit.
- **Direct HTTP calls:** Creates deployment coupling -- caller must know target service address. Cascading failures when downstream services are unavailable. No built-in retry or dead-letter handling.
- **Shared database:** Hidden data contracts between services. Schema changes in one service break others. Eliminates independent deployment and scaling.

## Consequences

- **Positive:** Independent deployment per service. Built-in retry and dead-letter queues. Consumers process at their own pace. Framework handles serialization and routing.
- **Negative:** Eventual consistency between services. Message loss possible during broker failures (mitigated by persistent queues and retry). Debugging requires tracing message flow across services.

## Revisit When

Need strict message ordering, throughput exceeds ~10K messages/sec, or moving to event sourcing where a log-based broker (Kafka) provides better replay semantics.
