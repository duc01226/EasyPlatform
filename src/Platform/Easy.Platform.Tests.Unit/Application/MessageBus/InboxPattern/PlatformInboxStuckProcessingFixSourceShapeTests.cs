using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Application.MessageBus.InboxPattern;

/// <summary>
/// Source-text shape assertions for fixes that have no unit-testable surface (host-service runtime
/// behavior). These guard against silent regressions if anyone removes the per-message hard timeout
/// (Fix B), reintroduces an immediate-ping shortcut that bypasses the standard
/// <see cref="PlatformInboxBusMessage.CheckProcessingPingIntervalSeconds"/> pacing, or removes the
/// early-exit refactor that lets stale recovery still run when permits are exhausted (Fix D).
/// Pattern precedent: <c>UtilTaskRunnerRetryTests</c>.
/// </summary>
public class PlatformInboxStuckProcessingFixSourceShapeTests
{
    private const string HostedServicePath =
        "src/Platform/Easy.Platform/Application/MessageBus/InboxPattern/PlatformConsumeInboxBusMessageHostedService.cs";

    private const string HelperPath =
        "src/Platform/Easy.Platform/Application/MessageBus/InboxPattern/PlatformInboxMessageBusConsumerHelper.cs";

    [Fact]
    public void FixB_InvokeConsumer_WrapsWithCancelAfterAndWaitAsync()
    {
        var source = ReadRepositoryFile(HostedServicePath);

        source.Should().Contain("CancellationTokenSource.CreateLinkedTokenSource(cancellationToken)");
        source.Should().Contain("timeoutCts.CancelAfter(InboxConfig.MaxProcessingDurationSeconds.Seconds())");
        source.Should().Contain(".WaitAsync(timeoutCts.Token)");
    }

    [Fact]
    public void FixB_InvokeConsumer_RethrowsTimeoutOnConsumerOverrun()
    {
        var source = ReadRepositoryFile(HostedServicePath);

        // Distinguish "consumer hit the wall-clock ceiling" from "outer host shutdown" so only the
        // former is converted into a TimeoutException routed through the Failed-retry pathway.
        source.Should().Contain(
            "catch (OperationCanceledException) when (timeoutCts.IsCancellationRequested && !cancellationToken.IsCancellationRequested)");
        source.Should().Contain("throw new TimeoutException(");
        source.Should().Contain("exceeded MaxProcessingDurationSeconds=");
    }

    [Fact]
    public void PingBackgroundTask_UsesStandardCheckIntervalDelay_NotImmediate()
    {
        var source = ReadRepositoryFile(HelperPath);

        // The pop path already writes LastProcessingPingDate so the row has a fresh ping
        // immediately after pop. The background task should pace by the standard
        // CheckProcessingPingIntervalSeconds — NOT bypass it via an immediate fire.
        source.Should().Contain("delayTimeSeconds: PlatformInboxBusMessage.CheckProcessingPingIntervalSeconds");
        source.Should().NotContain("delayTimeSeconds: 0");
    }

    [Fact]
    public void FixD_IntervalEarlyExit_DoesNotGateOnParallelPermitPool()
    {
        var source = ReadRepositoryFile(HostedServicePath);

        // Must keep the interval-collision lock guard so two interval ticks don't pile up on the same host.
        source.Should().Contain("if (maxIntervalProcessTriggeredLock.CurrentCount == 0)");

        // Must NOT short-circuit when the consumer permit pool is drained — otherwise stale-Processing
        // recovery can never run on a host whose permits are stuck on hung consumers.
        source.Should().NotContain("processMessageParallelLimitLock.CurrentCount == 0 || maxIntervalProcessTriggeredLock.CurrentCount == 0");
        source.Should().NotContain("maxIntervalProcessTriggeredLock.CurrentCount == 0 || processMessageParallelLimitLock.CurrentCount == 0");
    }

    [Fact]
    public void Overshoot_InnerPagerGate_MustNotShortCircuitOnPermitExhaustion()
    {
        var source = ReadRepositoryFile(HostedServicePath);

        // Inner pager gate (inside ExecuteScrollingPagingAsync) must NOT return early when permits are 0.
        // If reintroduced, the candidate query would never run when all permits held by hung consumers,
        // defeating the entire overshoot pattern.
        source.Should().NotContain("if (processMessageParallelLimitLock.CurrentCount == 0)\r\n                        return []");
        source.Should().NotContain("if (processMessageParallelLimitLock.CurrentCount == 0)\n                        return []");
    }

    [Fact]
    public void Overshoot_HandleInboxMessage_UsesPermitAcquiredFlagPattern()
    {
        var source = ReadRepositoryFile(HostedServicePath);

        // Must initialize the acquisition flag at false (pre-WaitAsync state).
        source.Should().Contain("var permitAcquired = false");

        // Must use the bool-returning WaitAsync overload (timeout-then-overshoot) with the inbox config knob.
        source.Should().Contain("permitAcquired = await processMessageParallelLimitLock.WaitAsync(");
        source.Should().Contain("InboxConfig.PermitAcquisitionTimeoutSeconds.Seconds()");

        // Release MUST be guarded by the flag — prevents over-release on timeout/cancel paths.
        source.Should().Contain("if (permitAcquired) processMessageParallelLimitLock.TryRelease()");

        // WaitAsync MUST be inside the try block so cancellation triggers the revert path.
        var tryIndex = source.IndexOf("try\r\n        {\r\n            permitAcquired = await processMessageParallelLimitLock.WaitAsync(", StringComparison.Ordinal);
        if (tryIndex < 0)
            tryIndex = source.IndexOf("try\n        {\n            permitAcquired = await processMessageParallelLimitLock.WaitAsync(", StringComparison.Ordinal);
        tryIndex.Should().BeGreaterThan(0,
            "WaitAsync must be inside the try block so OperationCanceledException is caught and revert fires (Path 5/6)");
    }

    [Fact]
    public void Overshoot_HandleInboxMessage_LogsWarningOnOvershoot()
    {
        var source = ReadRepositoryFile(HostedServicePath);

        // Must emit an operational signal when overshoot fires — sustained warnings indicate
        // MaxParallelProcessingMessagesCount is undersized.
        source.Should().Contain("if (!permitAcquired)");
        source.Should().Contain("[InboxConsume] Permit acquisition timed out");
        source.Should().Contain("Logger.LogWarning(");
    }

    [Fact]
    public void Overshoot_HandleInboxMessage_RevertUsesCancellationTokenNone()
    {
        var source = ReadRepositoryFile(HostedServicePath);

        // Revert path must use CancellationToken.None so it completes even during host shutdown
        // when the caller's token is already cancelled.
        source.Should().Contain("RevertExistingInboxToNewMessageAsync");
        source.Should().Contain("CancellationToken.None");
    }

    [Fact]
    public void Overshoot_InboxConfig_HasPermitAcquisitionTimeoutSeconds()
    {
        const string configPath = "src/Platform/Easy.Platform/Application/MessageBus/InboxPattern/PlatformInboxConfig.cs";
        var source = ReadRepositoryFile(configPath);

        source.Should().Contain("public int PermitAcquisitionTimeoutSeconds");
        source.Should().Contain("= 60", "default must remain conservative — favors throttling under normal load, overshoot only on hang");
    }

    private static string ReadRepositoryFile(string relativePath)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory != null)
        {
            var candidatePath = Path.Combine(directory.FullName, relativePath);
            if (File.Exists(candidatePath))
                return File.ReadAllText(candidatePath);

            directory = directory.Parent;
        }

        throw new FileNotFoundException($"Could not find repository file '{relativePath}'.");
    }
}
