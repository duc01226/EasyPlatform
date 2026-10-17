# RabbitMQ queue lifecycle

Read this guide when changing queue arguments, upgrading an existing deployment, or diagnosing a declaration failure. The initializer preserves an incompatible queue and fails startup; it never deletes and recreates it automatically.

Ordinary consumer queues are durable, nonexclusive and not automatically deleted. Their declaration uses `x-expires` for unused-queue expiry and `x-message-ttl` for message lifetime, from `PlatformRabbitMqOptions`. The former `message-ttl` declaration key was a policy name and did not enforce the intended message lifetime. This correction can produce a406 incompatibility for existing queues.

## Incompatible declarations

A406 declaration failure includes the queue name, retains the original exception and explains the migration requirement. Keep the existing queue and its accepted messages. A passive empty-count check is a snapshot: a publisher can enqueue immediately afterward, and deleting/rebinding also leaves a routing gap. Neither is an automatic migration strategy.

Choose an operator-controlled migration appropriate to the service: align the requested arguments with an already compatible declaration, or introduce a separately named queue and coordinate bindings, publishers and consumers. Drain or transfer accepted messages, retain replay/idempotency protection, verify consumption and only retire the old queue under the deployment owner's procedure. This framework provides no automatic queue migration or exactly-once transfer guarantee. Do not delete an existing queue merely to make startup green.

For validation, use a test-owned RabbitMQ virtual host with the same declared options and reuse it across repeat runs. This isolates new declarations from existing application queues without changing production behavior or resetting databases. Clean up only resources created by that validation run.

## Expiry and malformed messages

Ordinary message expiry is intentional retention, not a dead-letter guarantee. The initializer does not attach an ordinary queue to a dead-letter exchange. The malformed-message recovery path has separate parking/requeue behavior and deliberately preserves its existing no-expiry parking contract; the ordinary queue TTL correction does not apply to that parking queue.

## Cancellation and durable retry

The producer observes the caller's token before serialization, during readiness polling, before and after synchronous channel acquisition, and in the awaited client publish. Acquired channels return through the existing finally path. Synchronous cold acquisition cannot be interrupted in progress; no fixed cancellation-latency promise is made.

Cancellation after publishing begins has uncertain broker acceptance. It does not roll back a delivered message. Already committed outbox rows remain governed by the existing retry/recovery owner; caller cancellation must not mark them processed or delete them as successful. Autonomous workers use their own lifetime token and existing idempotency behavior.

The legacy ordinary-publish behavior for a missing exchange remains unchanged. A successful method return is not a new publisher-confirmation or exactly-once-delivery guarantee.

Source owners: `src/Platform/Easy.Platform.RabbitMQ/PlatformRabbitMqProcessInitializerService.cs`, `PlatformRabbitMqMessageBusProducer.cs`, and `src/Platform/Easy.Platform/Application/MessageBus/OutboxPattern/PlatformOutboxMessageBusProducerHelper.cs`.

Protocol references: [RabbitMQ3.12.4 declaration arguments](https://github.com/rabbitmq/rabbitmq-server/blob/v3.12.4/deps/rabbit/src/rabbit_amqqueue.erl), [RabbitMQ .NET client7.1.0 channel contract](https://github.com/rabbitmq/rabbitmq-dotnet-client/blob/v7.1.0/projects/RabbitMQ.Client/IChannel.cs).
