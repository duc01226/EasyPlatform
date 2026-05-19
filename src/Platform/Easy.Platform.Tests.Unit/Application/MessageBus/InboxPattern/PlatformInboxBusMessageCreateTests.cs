using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Common.Timing;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Application.MessageBus.InboxPattern;

/// <summary>
/// Covers <see cref="PlatformInboxBusMessage.Create{TMessage}"/> — the factory contract that the
/// stale-recovery query relies on. <c>LastConsumeDate</c> set at pop and never refreshed is the
/// invariant that lets the hard-timeout branch work.
/// </summary>
public class PlatformInboxBusMessageCreateTests : PlatformUnitTestBase
{
    [Fact]
    public void Create_ShouldSet_LastProcessingPingDate_ToNow()
    {
        var before = Clock.UtcNow;
        var msg = CreateMessage();
        var after = Clock.UtcNow;

        msg.LastProcessingPingDate.Should().NotBeNull();
        msg.LastProcessingPingDate!.Value.Should().BeOnOrAfter(before).And.BeOnOrBefore(after);
    }

    [Fact]
    public void Create_ShouldSet_LastConsumeDate_ToNow()
    {
        var before = Clock.UtcNow;
        var msg = CreateMessage();
        var after = Clock.UtcNow;

        msg.LastConsumeDate.Should().BeOnOrAfter(before).And.BeOnOrBefore(after);
    }

    [Fact]
    public void Create_ShouldSet_CreatedDate_ToNow()
    {
        var before = Clock.UtcNow;
        var msg = CreateMessage();
        var after = Clock.UtcNow;

        msg.CreatedDate.Should().BeOnOrAfter(before).And.BeOnOrBefore(after);
    }

    [Fact]
    public void Create_Id_StartsWithConsumerTypeAndSubQueuePrefix()
    {
        var msg = CreateMessage("subq");

        msg.Id.Should().StartWith(
            $"{nameof(FakeConsumer)}{PlatformInboxBusMessage.BuildIdSubQueuePrefixSeparator}subq{PlatformInboxBusMessage.BuildIdPrefixSeparator}");
    }

    private static PlatformInboxBusMessage CreateMessage(string subQueuePrefix = "default-sub-q")
    {
        return PlatformInboxBusMessage.Create(
            message: new TestMessage { Payload = "hello" },
            trackId: Ulid.NewUlid().ToString(),
            produceFrom: "TestProducer",
            routingKey: "test.routing.key",
            consumerType: typeof(FakeConsumer),
            consumeStatus: PlatformInboxBusMessage.ConsumeStatuses.Processing,
            forApplicationName: "TestApp",
            subQueueMessageIdPrefix: subQueuePrefix);
    }

    private sealed class TestMessage
    {
        public string Payload { get; set; } = string.Empty;
    }

    private sealed class FakeConsumer
    {
    }
}
