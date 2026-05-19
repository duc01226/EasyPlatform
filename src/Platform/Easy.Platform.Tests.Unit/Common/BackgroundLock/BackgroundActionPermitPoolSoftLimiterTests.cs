using Easy.Platform.Common.BackgroundLock;
using Easy.Platform.Application.BackgroundLock;
using Easy.Platform.Common.Diagnostics;
using Easy.Platform.Common.Utils;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using System.Diagnostics.Metrics;

namespace Easy.Platform.Tests.Unit.Common.BackgroundLock;

public class BackgroundActionPermitPoolSoftLimiterTests
{
    [Fact]
    public void PlatformBackgroundLockConfig_Defaults_ShouldUseQueueDepthBackpressureModel()
    {
        var config = new PlatformBackgroundLockConfig();

        config.DefaultWaitTimeout.Should().Be(Timeout.InfiniteTimeSpan);
        config.DefaultMaxHoldTime.Should().Be(TimeSpan.FromSeconds(30));
        config.DefaultMaxQueueDepthMultiplier.Should().Be(30);
        config.Invoking(p => p.Validate()).Should().NotThrow();
    }

    [Fact]
    public void PlatformBackgroundLockConfig_WhenInvalidPoolValues_ShouldThrowBeforePoolUse()
    {
        var config = new PlatformBackgroundLockConfig
        {
            Pools =
            {
                ["bad"] = new PlatformBackgroundLockPoolConfig { MaxConcurrent = 0 }
            }
        };

        config.Invoking(p => p.Validate()).Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public async Task SemaphoreSlimBackgroundActionPermitPool_WhenWaitTimesOut_ShouldReturnNullForFailOpenAdmission()
    {
        using var pool = new SemaphoreSlimBackgroundActionPermitPool(
            "test-soft-timeout",
            maxConcurrent: 1,
            waitTimeout: TimeSpan.FromMilliseconds(20),
            maxHoldTime: TimeSpan.FromSeconds(5),
            maxQueueDepth: 1,
            logger: new Mock<ILogger>().Object);

        using var heldPermit = await pool.AcquireAsync();

        var timedOutPermit = await pool.AcquireAsync();

        timedOutPermit.Should().BeNull("timeout returns null so callers can run fail-open without a permit");
        pool.Available.Should().Be(0);
    }

    [Fact]
    public async Task SemaphoreSlimBackgroundActionPermitPool_WhenPermitIsAutoReleased_ShouldRestoreCapacityWithoutDisposingOriginalPermit()
    {
        using var pool = new SemaphoreSlimBackgroundActionPermitPool(
            "test-soft-auto-release",
            maxConcurrent: 1,
            waitTimeout: TimeSpan.FromMilliseconds(100),
            maxHoldTime: TimeSpan.FromMilliseconds(30),
            maxQueueDepth: 1,
            logger: new Mock<ILogger>().Object);

        var originalPermit = await pool.AcquireAsync();
        await Task.Delay(120);

        using var nextPermit = await pool.AcquireAsync();

        nextPermit.Should().NotBeNull("auto-release restores pool capacity while the original action may still be running");
        originalPermit!.Dispose();
    }

    [Fact]
    public async Task SemaphoreSlimBackgroundActionPermitPool_WhenQueueIsFull_ShouldReturnNullForFailOpenAdmission()
    {
        using var pool = new SemaphoreSlimBackgroundActionPermitPool(
            "test-soft-queue-full",
            maxConcurrent: 1,
            waitTimeout: TimeSpan.FromSeconds(5),
            maxHoldTime: TimeSpan.FromSeconds(5),
            maxQueueDepth: 1,
            logger: new Mock<ILogger>().Object);

        using var heldPermit = await pool.AcquireAsync();
        var queuedPermitTask = pool.AcquireAsync();
        SpinWait.SpinUntil(() => pool.QueueDepth == 1, TimeSpan.FromSeconds(1)).Should().BeTrue();

        var rejectedPermit = await pool.AcquireAsync();

        rejectedPermit.Should().BeNull("queue-full returns null so callers can run fail-open without parking another waiter");
        pool.QueueDepth.Should().Be(1);

        heldPermit.Should().NotBeNull();
        heldPermit!.Dispose();
        using var queuedPermit = await queuedPermitTask.WaitAsync(TimeSpan.FromSeconds(1));
        pool.QueueDepth.Should().Be(0);
    }

    [Fact]
    public async Task SemaphoreSlimBackgroundActionPermitPool_WhenQueuedWaitIsCancelled_ShouldReleaseQueueDepth()
    {
        using var pool = new SemaphoreSlimBackgroundActionPermitPool(
            "test-soft-queue-cancel",
            maxConcurrent: 1,
            waitTimeout: TimeSpan.FromSeconds(5),
            maxHoldTime: TimeSpan.FromSeconds(5),
            maxQueueDepth: 1,
            logger: new Mock<ILogger>().Object);

        using var heldPermit = await pool.AcquireAsync();
        using var cts = new CancellationTokenSource();
        var queuedPermitTask = pool.AcquireAsync(cts.Token);
        SpinWait.SpinUntil(() => pool.QueueDepth == 1, TimeSpan.FromSeconds(1)).Should().BeTrue();

        await cts.CancelAsync();
        var act = async () => await queuedPermitTask;
        await act.Should().ThrowAsync<OperationCanceledException>();

        SpinWait.SpinUntil(() => pool.QueueDepth == 0, TimeSpan.FromSeconds(1)).Should().BeTrue();
    }

    [Fact]
    public async Task SemaphoreSlimBackgroundActionPermitPool_WhenQueueIsFull_ShouldEmitQueueFullMetric()
    {
        var poolName = $"test-soft-queue-metric-{Guid.NewGuid():N}";
        var queueFullCount = 0L;

        using var listener = new MeterListener();
        listener.InstrumentPublished = (instrument, meterListener) =>
        {
            if (instrument.Meter.Name == PlatformMeter.MeterName &&
                instrument.Name == "easyplatform.bgqueue.queue_full_total")
            {
                meterListener.EnableMeasurementEvents(instrument);
            }
        };
        listener.SetMeasurementEventCallback<long>(
            (_, measurement, tags, _) =>
            {
                if (HasPoolTag(tags, poolName))
                    queueFullCount += measurement;
            });
        listener.Start();

        using var pool = new SemaphoreSlimBackgroundActionPermitPool(
            poolName,
            maxConcurrent: 1,
            waitTimeout: TimeSpan.FromSeconds(5),
            maxHoldTime: TimeSpan.FromSeconds(5),
            maxQueueDepth: 0,
            logger: new Mock<ILogger>().Object);

        using var heldPermit = await pool.AcquireAsync();
        var rejectedPermit = await pool.AcquireAsync();

        rejectedPermit.Should().BeNull();
        queueFullCount.Should().Be(1);
    }

    [Fact]
    public void PlatformBackgroundActionPermitPoolRegistry_WhenNoQueueDepthOverride_ShouldUseDefaultMultiplier()
    {
        var loggerFactory = NullLoggerFactory.Instance;
        using var registry = new PlatformBackgroundActionPermitPoolRegistry(
            new PlatformBackgroundLockConfig
            {
                DefaultMaxQueueDepthMultiplier = 30,
                DefaultPool = new PlatformBackgroundLockPoolConfig { MaxConcurrent = 2 }
            },
            loggerFactory);

        var pool = registry.Get("test-default-multiplier");

        pool.MaxQueueDepth.Should().Be(60);
    }

    [Fact]
    public void PlatformBackgroundActionPermitPoolRegistry_WhenPoolHasAbsoluteQueueDepth_ShouldUseAbsoluteValue()
    {
        var loggerFactory = NullLoggerFactory.Instance;
        using var registry = new PlatformBackgroundActionPermitPoolRegistry(
            new PlatformBackgroundLockConfig
            {
                Pools =
                {
                    ["custom"] = new PlatformBackgroundLockPoolConfig
                    {
                        MaxConcurrent = 2,
                        MaxQueueDepth = 7,
                        MaxQueueDepthMultiplier = 30
                    }
                }
            },
            loggerFactory);

        var pool = registry.Get("custom");

        pool.MaxQueueDepth.Should().Be(7);
    }

    [Fact]
    public void PlatformBackgroundActionPermitPoolRegistry_WhenDisabled_ShouldUseNoOpQueueDepthValues()
    {
        var loggerFactory = NullLoggerFactory.Instance;
        using var registry = new PlatformBackgroundActionPermitPoolRegistry(
            new PlatformBackgroundLockConfig { Enabled = false },
            loggerFactory);

        var pool = registry.Get("disabled");

        pool.QueueDepth.Should().Be(0);
        pool.MaxQueueDepth.Should().Be(0);
    }

    [Fact]
    public async Task QueueActionInBackground_WhenPoolAcquireTimesOut_ShouldStillRunAction()
    {
        var actionRan = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var pool = new TimeoutPermitPool();

        Util.TaskRunner.QueueActionInBackground(
            () =>
            {
                actionRan.SetResult();
                return Task.CompletedTask;
            },
            pool: pool,
            retryCount: 0);

        var completedTask = await Task.WhenAny(actionRan.Task, Task.Delay(TimeSpan.FromSeconds(5)));

        completedTask.Should().Be(actionRan.Task, "TaskRunner fail-open path must execute the action when permit acquisition returns null");
    }

    private sealed class TimeoutPermitPool : IPlatformBackgroundActionPermitPool
    {
        public string Name => "test-timeout";

        public int Max => 1;

        public int Available => 0;

        public int InUse => 1;

        public int MaxQueueDepth => 0;

        public int QueueDepth => 0;

        public Task<IPlatformBackgroundActionPermitPool.IPermit?> AcquireAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IPlatformBackgroundActionPermitPool.IPermit?>(null);
        }
    }

    private static bool HasPoolTag(ReadOnlySpan<KeyValuePair<string, object?>> tags, string poolName)
    {
        foreach (var tag in tags)
        {
            if (tag.Key == "pool" && tag.Value?.ToString() == poolName)
                return true;
        }

        return false;
    }
}
