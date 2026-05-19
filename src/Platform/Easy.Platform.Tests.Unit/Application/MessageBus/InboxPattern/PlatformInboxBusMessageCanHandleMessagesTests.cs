using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Common.Timing;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Application.MessageBus.InboxPattern;

/// <summary>
/// Covers <see cref="PlatformInboxBusMessage.CanHandleMessagesExpr"/> and
/// <see cref="PlatformInboxBusMessage.CanHandleMessagesQueryBuilder"/>. Liveness is determined solely
/// by <see cref="PlatformInboxBusMessage.LastProcessingPingDate"/> — a fresh ping is absolute proof
/// the consumer is still progressing. Wall-clock duration is NOT a recovery signal: long-running ≠ stuck.
/// </summary>
public class PlatformInboxBusMessageCanHandleMessagesTests : PlatformUnitTestBase
{
    private const string AppA = "AppA";
    private const string AppB = "AppB";
    private const int PingStaleSeconds =
        PlatformInboxBusMessage.CheckProcessingPingIntervalSeconds * PlatformInboxBusMessage.MaxAllowedProcessingPingMisses;

    // ---------------------------------------------------------------------------------------------
    // CanHandleMessagesExpr branches
    // ---------------------------------------------------------------------------------------------

    [Fact]
    public void CanHandleMessagesExpr_WhenNew_ShouldMatch()
    {
        var msg = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.New, AppA);

        Compile(AppA)(msg).Should().BeTrue();
    }

    [Fact]
    public void CanHandleMessagesExpr_WhenFailedAndNextRetryNull_ShouldMatch()
    {
        var msg = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.Failed, AppA);
        msg.NextRetryProcessAfter = null;

        Compile(AppA)(msg).Should().BeTrue();
    }

    [Fact]
    public void CanHandleMessagesExpr_WhenFailedAndNextRetryPast_ShouldMatch()
    {
        var msg = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.Failed, AppA);
        msg.NextRetryProcessAfter = Clock.UtcNow.AddSeconds(-1);

        Compile(AppA)(msg).Should().BeTrue();
    }

    [Fact]
    public void CanHandleMessagesExpr_WhenFailedAndNextRetryFuture_ShouldNotMatch()
    {
        var msg = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.Failed, AppA);
        msg.NextRetryProcessAfter = Clock.UtcNow.AddMinutes(5);

        Compile(AppA)(msg).Should().BeFalse();
    }

    [Fact]
    public void CanHandleMessagesExpr_WhenFailedWithRetryImmediatelyAndLastConsumeBeforeFirstTimeProcess_ShouldMatch()
    {
        var firstTimeProcessDate = Clock.UtcNow;
        var msg = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.Failed, AppA);
        msg.LastConsumeDate = firstTimeProcessDate.AddMinutes(-10);
        msg.NextRetryProcessAfter = firstTimeProcessDate.AddHours(1);

        var expr = PlatformInboxBusMessage
            .CanHandleMessagesExpr(AppA, retryFailedMessageImmediately: true, firstTimeProcessDate: firstTimeProcessDate)
            .Compile();

        expr(msg).Should().BeTrue();
    }

    [Fact]
    public void CanHandleMessagesExpr_WhenProcessingAndLastPingNull_ShouldMatch()
    {
        var msg = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.Processing, AppA);
        msg.LastProcessingPingDate = null;
        msg.LastConsumeDate = Clock.UtcNow;

        Compile(AppA)(msg).Should().BeTrue();
    }

    [Fact]
    public void CanHandleMessagesExpr_WhenProcessingAndPingStale_ShouldMatch()
    {
        var msg = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.Processing, AppA);
        msg.LastProcessingPingDate = Clock.UtcNow.AddSeconds(-(PingStaleSeconds + 30));
        msg.LastConsumeDate = Clock.UtcNow.AddSeconds(-(PingStaleSeconds + 30));

        Compile(AppA)(msg).Should().BeTrue();
    }

    [Fact]
    public void CanHandleMessagesExpr_WhenProcessingAndPingFreshButLastConsumeOld_ShouldNotMatch()
    {
        // Ping freshness is the absolute proof of liveness — a still-progressing consumer keeps refreshing
        // LastProcessingPingDate. Wall-clock duration (LastConsumeDate) is NOT used as a recovery signal:
        // long-running consumers (bulk migrations, multi-hour ETL) are legitimate, not stuck.
        var msg = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.Processing, AppA);
        msg.LastProcessingPingDate = Clock.UtcNow.AddSeconds(-10);
        msg.LastConsumeDate = Clock.UtcNow.AddSeconds(-(PlatformInboxBusMessage.DefaultMaxProcessingDurationSeconds + 60));

        Compile(AppA)(msg).Should().BeFalse();
    }

    [Fact]
    public void CanHandleMessagesExpr_WhenProcessingAndBothTimestampsFresh_ShouldNotMatch()
    {
        var msg = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.Processing, AppA);
        msg.LastProcessingPingDate = Clock.UtcNow.AddSeconds(-5);
        msg.LastConsumeDate = Clock.UtcNow.AddSeconds(-5);

        Compile(AppA)(msg).Should().BeFalse();
    }

    [Fact]
    public void CanHandleMessagesExpr_WhenProcessed_ShouldNotMatch()
    {
        var msg = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.Processed, AppA);

        Compile(AppA)(msg).Should().BeFalse();
    }

    [Fact]
    public void CanHandleMessagesExpr_WhenIgnored_ShouldNotMatch()
    {
        var msg = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.Ignored, AppA);

        Compile(AppA)(msg).Should().BeFalse();
    }

    [Fact]
    public void CanHandleMessagesExpr_WhenForApplicationNameMismatch_ShouldNotMatch()
    {
        var msg = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.New, AppB);

        Compile(AppA)(msg).Should().BeFalse();
    }

    [Fact]
    public void CanHandleMessagesExpr_WhenForApplicationNameOnMessageIsNull_ShouldMatch()
    {
        var msg = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.New, forApplicationName: null);

        Compile(AppA)(msg).Should().BeTrue();
    }

    // ---------------------------------------------------------------------------------------------
    // CanHandleMessagesQueryBuilder UNION-ALL branches
    // ---------------------------------------------------------------------------------------------

    [Fact]
    public void QueryBuilder_NewBranch_ReturnsNewMessagesOrderedByCreatedDate()
    {
        var older = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.New, AppA, createdAt: Clock.UtcNow.AddMinutes(-10));
        var newer = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.New, AppA, createdAt: Clock.UtcNow.AddMinutes(-1));

        var result = PlatformInboxBusMessage.CanHandleMessagesQueryBuilder(
                Source(newer, older),
                limit: 50,
                forApplicationName: AppA)
            .ToList();

        result.Select(p => p.Id).Should().ContainInOrder(older.Id, newer.Id);
    }

    [Fact]
    public void QueryBuilder_FailedBranch_ReturnsOnlyRetryReadyFailedMessages()
    {
        var ready = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.Failed, AppA);
        ready.NextRetryProcessAfter = Clock.UtcNow.AddSeconds(-1);

        var notReady = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.Failed, AppA);
        notReady.NextRetryProcessAfter = Clock.UtcNow.AddHours(1);

        var result = PlatformInboxBusMessage.CanHandleMessagesQueryBuilder(
                Source(ready, notReady),
                limit: 50,
                forApplicationName: AppA)
            .ToList();

        result.Select(p => p.Id).Should().BeEquivalentTo([ready.Id]);
    }

    [Fact]
    public void QueryBuilder_ProcessingPingStaleBranch_ReturnsStalePingRows()
    {
        var stale = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.Processing, AppA);
        stale.LastProcessingPingDate = Clock.UtcNow.AddSeconds(-(PingStaleSeconds + 30));
        stale.LastConsumeDate = Clock.UtcNow.AddSeconds(-(PingStaleSeconds + 30));

        var fresh = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.Processing, AppA);
        fresh.LastProcessingPingDate = Clock.UtcNow.AddSeconds(-5);
        fresh.LastConsumeDate = Clock.UtcNow.AddSeconds(-5);

        var result = PlatformInboxBusMessage.CanHandleMessagesQueryBuilder(
                Source(stale, fresh),
                limit: 50,
                forApplicationName: AppA)
            .ToList();

        result.Select(p => p.Id).Should().Contain(stale.Id).And.NotContain(fresh.Id);
    }

    [Fact]
    public void QueryBuilder_ProcessingFreshPing_IsExcludedEvenWhenLastConsumeIsOld()
    {
        // Liveness invariant: a fresh ping is absolute proof the consumer is still progressing.
        // Wall-clock duration alone (LastConsumeDate) is NOT a recovery signal — long-running ≠ stuck.
        var longRunningButAlive = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.Processing, AppA);
        longRunningButAlive.LastProcessingPingDate = Clock.UtcNow.AddSeconds(-10);
        longRunningButAlive.LastConsumeDate = Clock.UtcNow.AddSeconds(-(PlatformInboxBusMessage.DefaultMaxProcessingDurationSeconds + 60));

        var result = PlatformInboxBusMessage.CanHandleMessagesQueryBuilder(
                Source(longRunningButAlive),
                limit: 50,
                forApplicationName: AppA)
            .ToList();

        result.Should().BeEmpty();
    }

    [Fact]
    public void QueryBuilder_CombinedResult_RespectsOuterLimit()
    {
        var rows = Enumerable.Range(0, 10)
            .Select(i => NewMessage(PlatformInboxBusMessage.ConsumeStatuses.New, AppA, createdAt: Clock.UtcNow.AddMinutes(-i)))
            .ToArray();

        var result = PlatformInboxBusMessage.CanHandleMessagesQueryBuilder(
                Source(rows),
                limit: 3,
                forApplicationName: AppA)
            .ToList();

        result.Should().HaveCount(3);
    }

    [Fact]
    public void QueryBuilder_CombinedResult_OrderedByCreatedDateAscending()
    {
        var newMsg = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.New, AppA, createdAt: Clock.UtcNow.AddMinutes(-5));

        var failedMsg = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.Failed, AppA, createdAt: Clock.UtcNow.AddMinutes(-20));
        failedMsg.NextRetryProcessAfter = null;

        var stalePingMsg = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.Processing, AppA, createdAt: Clock.UtcNow.AddMinutes(-15));
        stalePingMsg.LastProcessingPingDate = Clock.UtcNow.AddSeconds(-(PingStaleSeconds + 30));
        stalePingMsg.LastConsumeDate = Clock.UtcNow.AddSeconds(-(PingStaleSeconds + 30));

        var result = PlatformInboxBusMessage.CanHandleMessagesQueryBuilder(
                Source(newMsg, failedMsg, stalePingMsg),
                limit: 50,
                forApplicationName: AppA)
            .ToList();

        // 3 distinct rows (one per branch), ordered by CreatedDate asc
        result.Select(p => p.Id).Should().ContainInOrder(failedMsg.Id, stalePingMsg.Id, newMsg.Id);
    }

    [Fact]
    public void QueryBuilder_ForApplicationNameFilter_AppliedToEveryBranch()
    {
        var newOtherApp = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.New, AppB);

        var failedOtherApp = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.Failed, AppB);
        failedOtherApp.NextRetryProcessAfter = null;

        var stalePingOtherApp = NewMessage(PlatformInboxBusMessage.ConsumeStatuses.Processing, AppB);
        stalePingOtherApp.LastProcessingPingDate = Clock.UtcNow.AddSeconds(-(PingStaleSeconds + 30));
        stalePingOtherApp.LastConsumeDate = Clock.UtcNow.AddSeconds(-(PingStaleSeconds + 30));

        var result = PlatformInboxBusMessage.CanHandleMessagesQueryBuilder(
                Source(newOtherApp, failedOtherApp, stalePingOtherApp),
                limit: 50,
                forApplicationName: AppA)
            .ToList();

        result.Should().BeEmpty();
    }

    // ---------------------------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------------------------

    private static Func<PlatformInboxBusMessage, bool> Compile(string forApplicationName)
    {
        return PlatformInboxBusMessage.CanHandleMessagesExpr(forApplicationName).Compile();
    }

    private static IQueryable<PlatformInboxBusMessage> Source(params PlatformInboxBusMessage[] rows)
    {
        return rows.AsQueryable();
    }

    private static PlatformInboxBusMessage NewMessage(
        PlatformInboxBusMessage.ConsumeStatuses status,
        string? forApplicationName,
        DateTime? createdAt = null)
    {
        var now = Clock.UtcNow;
        return new PlatformInboxBusMessage
        {
            Id = $"TestConsumer{PlatformInboxBusMessage.BuildIdSubQueuePrefixSeparator}{PlatformInboxBusMessage.BuildIdPrefixSeparator}{Ulid.NewUlid()}",
            JsonMessage = "{}",
            MessageTypeFullName = "TestMessage",
            ProduceFrom = "TestProducer",
            RoutingKey = "test.routing.key",
            ConsumerBy = "TestConsumer",
            ConsumeStatus = status,
            CreatedDate = createdAt ?? now,
            LastConsumeDate = now,
            LastProcessingPingDate = now,
            ForApplicationName = forApplicationName
        };
    }
}
