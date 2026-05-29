using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Common.Timing;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Application.MessageBus;

public class PlatformSubQueueMessagePredicateTests
{
    [Fact]
    public void InboxPredecessorPredicate_WhenMessageHasNoSubQueuePrefix_ShouldNeverMatch()
    {
        var current = NewInboxMessage(id: $"Consumer{PlatformInboxBusMessage.BuildIdPrefixSeparator}current");
        var previous = NewInboxMessage(
            id: $"Consumer{PlatformInboxBusMessage.BuildIdPrefixSeparator}previous",
            createdDate: current.CreatedDate.AddMinutes(-1));

        var predicate = PlatformInboxBusMessage
            .CheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessageExpr(current)
            .Compile();

        PlatformInboxBusMessage.GetSubQueuePrefix(current.Id).Should().BeNull();
        predicate(previous).Should().BeFalse();
    }

    [Fact]
    public void InboxPredecessorPredicate_WhenPreviousMessageHasSameSubQueuePrefix_ShouldMatchOnlyOlderActiveMessages()
    {
        var current = NewInboxMessage(
            id: $"Consumer{PlatformInboxBusMessage.BuildIdSubQueuePrefixSeparator}sub-a{PlatformInboxBusMessage.BuildIdPrefixSeparator}current");
        var previousSameSubQueue = NewInboxMessage(
            id: $"Consumer{PlatformInboxBusMessage.BuildIdSubQueuePrefixSeparator}sub-a{PlatformInboxBusMessage.BuildIdPrefixSeparator}previous",
            createdDate: current.CreatedDate.AddMinutes(-1));
        var previousDifferentSubQueue = NewInboxMessage(
            id: $"Consumer{PlatformInboxBusMessage.BuildIdSubQueuePrefixSeparator}sub-b{PlatformInboxBusMessage.BuildIdPrefixSeparator}previous",
            createdDate: current.CreatedDate.AddMinutes(-1));
        var processedSameSubQueue = NewInboxMessage(
            id: $"Consumer{PlatformInboxBusMessage.BuildIdSubQueuePrefixSeparator}sub-a{PlatformInboxBusMessage.BuildIdPrefixSeparator}processed",
            createdDate: current.CreatedDate.AddMinutes(-1),
            status: PlatformInboxBusMessage.ConsumeStatuses.Processed);
        var newerSameSubQueue = NewInboxMessage(
            id: $"Consumer{PlatformInboxBusMessage.BuildIdSubQueuePrefixSeparator}sub-a{PlatformInboxBusMessage.BuildIdPrefixSeparator}newer",
            createdDate: current.CreatedDate.AddMinutes(1));

        var predicate = PlatformInboxBusMessage
            .CheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessageExpr(current)
            .Compile();

        PlatformInboxBusMessage.GetSubQueuePrefix(current.Id).Should().Be("sub-a");
        predicate(previousSameSubQueue).Should().BeTrue();
        predicate(previousDifferentSubQueue).Should().BeFalse();
        predicate(processedSameSubQueue).Should().BeFalse();
        predicate(newerSameSubQueue).Should().BeFalse();
    }

    [Fact]
    public void OutboxPredecessorPredicate_WhenMessageHasNoSubQueuePrefix_ShouldNeverMatch()
    {
        var current = NewOutboxMessage(id: $"Message{PlatformOutboxBusMessage.BuildIdPrefixSeparator}current");
        var previous = NewOutboxMessage(
            id: $"Message{PlatformOutboxBusMessage.BuildIdPrefixSeparator}previous",
            createdDate: current.CreatedDate.AddMinutes(-1));

        var predicate = PlatformOutboxBusMessage
            .CheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessageExpr(current)
            .Compile();

        PlatformOutboxBusMessage.GetSubQueuePrefix(current.Id).Should().BeNull();
        predicate(previous).Should().BeFalse();
    }

    [Fact]
    public void OutboxPredecessorPredicate_WhenPreviousMessageHasSameSubQueuePrefix_ShouldMatchOnlyOlderActiveMessages()
    {
        var current = NewOutboxMessage(
            id: $"Message{PlatformOutboxBusMessage.BuildIdSubQueuePrefixSeparator}sub-a{PlatformOutboxBusMessage.BuildIdPrefixSeparator}current");
        var previousSameSubQueue = NewOutboxMessage(
            id: $"Message{PlatformOutboxBusMessage.BuildIdSubQueuePrefixSeparator}sub-a{PlatformOutboxBusMessage.BuildIdPrefixSeparator}previous",
            createdDate: current.CreatedDate.AddMinutes(-1));
        var previousDifferentSubQueue = NewOutboxMessage(
            id: $"Message{PlatformOutboxBusMessage.BuildIdSubQueuePrefixSeparator}sub-b{PlatformOutboxBusMessage.BuildIdPrefixSeparator}previous",
            createdDate: current.CreatedDate.AddMinutes(-1));
        var processedSameSubQueue = NewOutboxMessage(
            id: $"Message{PlatformOutboxBusMessage.BuildIdSubQueuePrefixSeparator}sub-a{PlatformOutboxBusMessage.BuildIdPrefixSeparator}processed",
            createdDate: current.CreatedDate.AddMinutes(-1),
            status: PlatformOutboxBusMessage.SendStatuses.Processed);
        var newerSameSubQueue = NewOutboxMessage(
            id: $"Message{PlatformOutboxBusMessage.BuildIdSubQueuePrefixSeparator}sub-a{PlatformOutboxBusMessage.BuildIdPrefixSeparator}newer",
            createdDate: current.CreatedDate.AddMinutes(1));

        var predicate = PlatformOutboxBusMessage
            .CheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessageExpr(current)
            .Compile();

        PlatformOutboxBusMessage.GetSubQueuePrefix(current.Id).Should().Be("sub-a");
        predicate(previousSameSubQueue).Should().BeTrue();
        predicate(previousDifferentSubQueue).Should().BeFalse();
        predicate(processedSameSubQueue).Should().BeFalse();
        predicate(newerSameSubQueue).Should().BeFalse();
    }

    private static PlatformInboxBusMessage NewInboxMessage(
        string id,
        DateTime? createdDate = null,
        PlatformInboxBusMessage.ConsumeStatuses status = PlatformInboxBusMessage.ConsumeStatuses.New)
    {
        return new PlatformInboxBusMessage
        {
            Id = id,
            JsonMessage = "{}",
            MessageTypeFullName = "TestMessage",
            ProduceFrom = "TestProducer",
            RoutingKey = "test.routing.key",
            ConsumerBy = "TestConsumer",
            ConsumeStatus = status,
            CreatedDate = createdDate ?? Clock.UtcNow,
            LastConsumeDate = Clock.UtcNow,
            LastProcessingPingDate = Clock.UtcNow
        };
    }

    private static PlatformOutboxBusMessage NewOutboxMessage(
        string id,
        DateTime? createdDate = null,
        PlatformOutboxBusMessage.SendStatuses status = PlatformOutboxBusMessage.SendStatuses.New)
    {
        return new PlatformOutboxBusMessage
        {
            Id = id,
            JsonMessage = "{}",
            MessageTypeFullName = "TestMessage",
            RoutingKey = "test.routing.key",
            SendStatus = status,
            CreatedDate = createdDate ?? Clock.UtcNow,
            LastSendDate = Clock.UtcNow,
            LastProcessingPingDate = Clock.UtcNow
        };
    }
}
