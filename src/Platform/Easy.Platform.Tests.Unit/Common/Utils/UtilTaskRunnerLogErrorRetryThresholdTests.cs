using Easy.Platform.Common.Utils;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Utils;

/// <summary>
/// Unit tests for <see cref="Util.TaskRunner.LogErrorRetryThreshold(int)"/>.
/// Guards the 75%-of-budget contract used by retry-logging sites across the platform.
///
/// <para>Formula: <c>max(1, floor(retryCount * 0.75))</c>. Intent: defer error-level logging until
/// 75% of the retry budget has been consumed so transient failures do not generate noise during
/// early retries. Tests cover the design contract — including the documented operational warnings
/// for very large retry budgets (Inbox/Outbox 43200 → 32400; <see cref="int.MaxValue"/> →
/// ~1.6 billion). Concrete handlers with unbounded retry counts MUST override <c>RetryOnFailedTimes</c>
/// to receive retry telemetry.</para>
/// </summary>
public class UtilTaskRunnerLogErrorRetryThresholdTests : PlatformUnitTestBase
{
    [Fact]
    public void LogErrorRetryThreshold_WhenZero_ShouldReturnOne()
    {
        Util.TaskRunner.LogErrorRetryThreshold(0).Should().Be(1);
    }

    [Fact]
    public void LogErrorRetryThreshold_WhenNegative_ShouldReturnOne()
    {
        Util.TaskRunner.LogErrorRetryThreshold(-1).Should().Be(1);
    }

    [Fact]
    public void LogErrorRetryThreshold_WhenOne_ShouldReturnOne()
    {
        // floor(1 * 0.75) = 0 → clamped up to 1 by the >= 1 guarantee.
        Util.TaskRunner.LogErrorRetryThreshold(1).Should().Be(1);
    }

    /// <summary>
    /// Bug A regression guard: retryCount=2 must yield threshold=1 so the FINAL
    /// retry attempt is logged. floor(2 * 0.75) = floor(1.5) = 1 — preserved.
    /// </summary>
    [Fact]
    public void LogErrorRetryThreshold_WhenTwo_ShouldReturnOne_BugARegressionGuard()
    {
        Util.TaskRunner.LogErrorRetryThreshold(2).Should().Be(1);
    }

    [Fact]
    public void LogErrorRetryThreshold_WhenTen_ShouldReturnSeven()
    {
        // floor(10 * 0.75) = floor(7.5) = 7. ApplicationBusMessage default budget = 10.
        Util.TaskRunner.LogErrorRetryThreshold(10).Should().Be(7);
    }

    /// <summary>
    /// Anchor for the design contract: callers passing retryCount=20 see error logs only
    /// after 15 attempts (75% of budget). This is the user-specified target.
    /// </summary>
    [Fact]
    public void LogErrorRetryThreshold_WhenTwenty_ShouldReturnFifteen()
    {
        // floor(20 * 0.75) = 15.
        Util.TaskRunner.LogErrorRetryThreshold(20).Should().Be(15);
    }

    /// <summary>
    /// Inbox/Outbox callers pass <c>DefaultResilientRetiredCount = 43200</c>.
    /// Documents the operational warning: first error log fires at retry attempt 32,400.
    /// </summary>
    [Fact]
    public void LogErrorRetryThreshold_WhenInboxBudget43200_ShouldReturn32400()
    {
        // floor(43200 * 0.75) = 32400.
        Util.TaskRunner.LogErrorRetryThreshold(43200).Should().Be(32400);
    }

    /// <summary>
    /// Documents the operational warning for unbounded background-event handlers.
    /// floor(int.MaxValue * 0.75) = floor((2^31 - 1) * 0.75) = 1,610,612,735.
    /// Concrete handlers needing retry telemetry MUST override RetryOnFailedTimes.
    /// </summary>
    [Fact]
    public void LogErrorRetryThreshold_WhenIntMaxValue_ShouldReturnLinear75Percent()
    {
        var result = Util.TaskRunner.LogErrorRetryThreshold(int.MaxValue);

        result.Should().Be(1_610_612_735, "floor(int.MaxValue * 0.75) = 1,610,612,735");
    }

    [Fact]
    public void LogErrorRetryThreshold_ResultIsAlwaysAtLeastOneForPositiveBudgets()
    {
        foreach (var n in new[] { 1, 2, 3, 5, 10, 20, 100, 43200, int.MaxValue })
        {
            Util.TaskRunner.LogErrorRetryThreshold(n).Should().BeGreaterThanOrEqualTo(1,
                "minimum threshold is 1 for positive budgets");
        }
    }

    [Fact]
    public void LogErrorRetryThreshold_ResultIsApproximately75PercentForNormalBudgets()
    {
        foreach (var n in new[] { 4, 8, 12, 16, 20, 50, 100, 1000 })
        {
            var result = Util.TaskRunner.LogErrorRetryThreshold(n);
            var expected = (int)Math.Floor(n * 0.75);
            result.Should().Be(expected, $"retryCount={n} → floor({n} * 0.75) = {expected}");
        }
    }
}
