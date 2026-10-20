using Easy.Platform.Common;
using Easy.Platform.Common.HostingBackgroundServices;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Easy.Platform.Tests.Unit.Common.HostingBackgroundServices;

/// <summary>Technical contract: a hosted stop joins both its execution and queued child work.</summary>
public sealed class PlatformHostingBackgroundServiceLifetimeTests
{
    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-005")]
    public async Task StopAsync_WaitsForTheExecutingBodyAfterSignallingCancellation()
    {
        using var provider = new ServiceCollection().BuildServiceProvider();
        using var service = new ControlledHostedService(provider);
        await service.StartAsync(CancellationToken.None);

        var stop = service.StopAsync(CancellationToken.None);
        try
        {
            await service.CancellationObserved.Task.WaitAsync(TimeSpan.FromSeconds(5));
            stop.IsCompleted.Should().BeFalse();
        }
        finally
        {
            service.Release.TrySetResult();
            await stop.WaitAsync(TimeSpan.FromSeconds(5));
        }

        service.ExecutionFinished.Should().BeTrue("StopAsync must join execution before the provider can be disposed");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-006")]
    public async Task StopAsync_WaitsForChildWorkThatDoesNotObserveCancellationImmediately()
    {
        using var provider = new ServiceCollection().BuildServiceProvider();
        using var service = new ControlledHostedService(provider);
        await service.StartAsync(CancellationToken.None);
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var childFinished = false;
        service.Enqueue(async () =>
        {
            entered.TrySetResult();
            await release.Task;
            provider.GetServices<object>().Should().BeEmpty("the provider must still be alive while child work drains");
            childFinished = true;
        });
        await entered.Task.WaitAsync(TimeSpan.FromSeconds(5));
        service.Release.TrySetResult();
        await service.Execution.WaitAsync(TimeSpan.FromSeconds(5));

        var stop = service.StopAsync(CancellationToken.None);
        try
        {
            stop.IsCompleted.Should().BeFalse();
            var prematureStop = () => stop.WaitAsync(TimeSpan.FromSeconds(5));
            await prematureStop.Should().ThrowAsync<TimeoutException>(
                "a held child must keep stop pending after cancellation callbacks have finished");
            childFinished.Should().BeFalse("the child is still held until the finally block releases it");
        }
        finally
        {
            release.TrySetResult();
            await stop.WaitAsync(TimeSpan.FromSeconds(5));
        }

        childFinished.Should().BeTrue();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-007")]
    public async Task IntervalStop_DuringModuleReadiness_ExitsBeforeProviderDisposalWithoutLoggingAnError()
    {
        var module = new Mock<IPlatformModule>();
        module.SetupGet(item => item.IsFullyInitialized).Returns(false);
        using var provider = new ServiceCollection().AddSingleton(module.Object).BuildServiceProvider();
        var logger = new Mock<ILogger>();
        var factory = new Mock<ILoggerFactory>();
        factory.Setup(item => item.CreateLogger(It.IsAny<string>())).Returns(logger.Object);
        using var service = new WaitingIntervalService(provider, factory.Object);
        await service.StartAsync(CancellationToken.None);
        await service.Entered.Task.WaitAsync(TimeSpan.FromSeconds(5));

        await service.StopAsync(CancellationToken.None).WaitAsync(TimeSpan.FromSeconds(5));
        await provider.DisposeAsync();

        service.Exited.Should().BeTrue();
        logger.Verify(item => item.Log(
            LogLevel.Error, It.IsAny<EventId>(), It.IsAny<It.IsAnyType>(), It.IsAny<Exception?>(),
            It.IsAny<Func<It.IsAnyType, Exception?, string>>()), Times.Never);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-013")]
    public async Task StopAsync_PreservesAnUnexpectedExecutingBodyFailure()
    {
        using var provider = new ServiceCollection().BuildServiceProvider();
        using var service = new ControlledHostedService(provider);
        await service.StartAsync(CancellationToken.None);
        var failure = new InvalidOperationException("executing body failed");
        service.Release.TrySetException(failure);

        var stop = () => service.StopAsync(CancellationToken.None);

        (await stop.Should().ThrowAsync<InvalidOperationException>()).Which.Should().BeSameAs(failure);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-014")]
    public async Task ModuleReadiness_WhenAlreadyCancelled_DoesNotResolveADisposedProvider()
    {
        using var provider = new ServiceCollection().BuildServiceProvider();
        await provider.DisposeAsync();
        using var cancellation = new CancellationTokenSource();
        await cancellation.CancelAsync();

        var wait = () => IPlatformModule.WaitForAllModulesInitializedAsync(provider, typeof(IPlatformModule), cancellation.Token);

        await wait.Should().ThrowAsync<OperationCanceledException>();
    }

    private sealed class ControlledHostedService(IServiceProvider provider)
        : PlatformHostingBackgroundService(provider, NullLoggerFactory.Instance)
    {
        public TaskCompletionSource CancellationObserved { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public bool ExecutionFinished { get; private set; }
        public Task Execution => ExecuteTask;

        public void Enqueue(Func<Task> action) => QueueBackgroundWork(_ => action(), StoppingCts.Token);

        protected override async Task StartProcess(CancellationToken cancellationToken)
        {
            using var registration = StoppingCts.Token.Register(() => CancellationObserved.TrySetResult());
            await Release.Task;
            ExecutionFinished = true;
        }
    }

    private sealed class WaitingIntervalService(IServiceProvider provider, ILoggerFactory factory)
        : PlatformIntervalHostingBackgroundService(provider, factory)
    {
        public TaskCompletionSource Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public bool Exited { get; private set; }

        protected override async Task IntervalProcessAsync(CancellationToken cancellationToken)
        {
            Entered.TrySetResult();
            try { await IPlatformModule.WaitForAllModulesInitializedAsync(ServiceProvider, typeof(IPlatformModule), cancellationToken, Logger); }
            finally { Exited = true; }
        }
    }
}
