using Easy.Platform.Common.HostingBackgroundServices;
using Easy.Platform.Infrastructures.BackgroundJob;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Easy.Platform.Tests.Unit.Infrastructures.BackgroundJob;

/// <summary>
/// Guards <see cref="PlatformBackgroundJobStartProcessHostedService" /> — the hosted service the web host uses to start
/// and stop background-job processing along with the application lifetime.
/// <para>
/// <b>Invariants guarded:</b> the host may call StartAsync/StopAsync more than once (rolling restarts, a host that is
/// started then re-started, IHostedService registered more than once), and each extra call must NOT start a second
/// processing service — a second job server over the same storage executes every enqueued job twice. Symmetrically,
/// StopAsync must reach the processing service exactly once so the shutdown grace period is not consumed twice, and a
/// Stop that was never preceded by a Start must not tear down anything.
/// </para>
/// </summary>
public sealed class PlatformBackgroundJobStartProcessHostedServiceTests : IDisposable
{
    private readonly Mock<IPlatformBackgroundJobProcessingService> processingService = new();
    private readonly ServiceProvider serviceProvider;

    public PlatformBackgroundJobStartProcessHostedServiceTests()
    {
        processingService.Setup(service => service.Start(It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        processingService.Setup(service => service.Stop(It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        serviceProvider = new ServiceCollection().BuildServiceProvider();
    }

    public void Dispose()
    {
        serviceProvider.Dispose();
    }

    // TC-PLATJOB-070: starting the host starts job processing, passing the host's own cancellation token through.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-070")]
    public async Task StartAsync_StartsJobProcessingWithTheHostCancellationToken()
    {
        using var hostedService = CreateHostedService();
        using var cancellation = new CancellationTokenSource();

        await hostedService.StartAsync(cancellation.Token);

        processingService.Verify(
            service => service.Start(cancellation.Token),
            Times.Once,
            "the host's shutdown token is what lets a startup that is cancelled mid-flight abort instead of hanging");
    }

    // TC-PLATJOB-071: a repeated StartAsync must NOT start a second processing service.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-071")]
    public async Task StartAsync_CalledTwice_StartsJobProcessingOnlyOnce()
    {
        using var hostedService = CreateHostedService();

        await hostedService.StartAsync(CancellationToken.None);
        await hostedService.StartAsync(CancellationToken.None);

        processingService.Verify(
            service => service.Start(It.IsAny<CancellationToken>()),
            Times.Once,
            "a second processing service over the same storage would execute every enqueued job twice");
    }

    // TC-PLATJOB-072: stopping without ever starting must not tear anything down.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-072")]
    public async Task StopAsync_WithoutAPrecedingStart_DoesNotTouchTheProcessingService()
    {
        using var hostedService = CreateHostedService();

        await hostedService.StopAsync(CancellationToken.None);

        processingService.Verify(service => service.Stop(It.IsAny<CancellationToken>()), Times.Never);
        processingService.Verify(service => service.Start(It.IsAny<CancellationToken>()), Times.Never);
    }

    // TC-PLATJOB-073: a normal start/stop cycle stops job processing exactly once.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-073")]
    public async Task StopAsync_AfterStart_StopsJobProcessingExactlyOnce()
    {
        using var hostedService = CreateHostedService();
        using var cancellation = new CancellationTokenSource();

        await hostedService.StartAsync(CancellationToken.None);
        await hostedService.StopAsync(cancellation.Token);

        processingService.Verify(service => service.Stop(cancellation.Token), Times.Once);
    }

    // TC-PLATJOB-073: a repeated StopAsync must not re-enter the shutdown wait.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-073")]
    public async Task StopAsync_CalledTwice_StopsJobProcessingOnlyOnce()
    {
        using var hostedService = CreateHostedService();

        await hostedService.StartAsync(CancellationToken.None);
        await hostedService.StopAsync(CancellationToken.None);
        await hostedService.StopAsync(CancellationToken.None);

        processingService.Verify(
            service => service.Stop(It.IsAny<CancellationToken>()),
            Times.Once,
            "each Stop waits up to the full shutdown grace period; a second one would double the host's shutdown time");
    }

    // TC-PLATJOB-074: the hosted service is discoverable by the host and safe to dispose twice.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-074")]
    public void HostedService_IsAnIHostedServiceAndIsSafeToDisposeTwice()
    {
        typeof(PlatformBackgroundJobStartProcessHostedService).Should().BeAssignableTo<IHostedService>(
            "the host only starts job processing if this type is discovered as a hosted service");
        typeof(PlatformBackgroundJobStartProcessHostedService).Should().BeDerivedFrom<PlatformHostingBackgroundService>();

        var hostedService = CreateHostedService();

        var act = () =>
        {
            hostedService.Dispose();
            hostedService.Dispose();
        };

        act.Should().NotThrow("the host disposes it on shutdown and the DI container disposes it again");
    }

    // TC-PLATJOB-073: StoppingCts is cancelled BEFORE StopProcess runs — the order
    // PlatformHostingBackgroundService.StopAsync documents (PlatformHostingBackgroundService.cs:140,142). Recorded LOW
    // finding: every test above proves Stop is eventually called exactly once, but none proves the ORDER; reordering
    // those two lines would leave every existing assertion in this file green while a long-running executing task
    // never received its cancellation signal until AFTER the processing service had already begun shutting down.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-073")]
    public async Task StopAsync_CancelsStoppingCtsBeforeInvokingStopProcess()
    {
        using var hostedService = new ObservingHostedService(serviceProvider, NullLoggerFactory.Instance, processingService.Object);

        await hostedService.StartAsync(CancellationToken.None);
        await hostedService.StopAsync(CancellationToken.None);

        hostedService.StoppingCtsWasAlreadyCancelledWhenStopProcessRan.Should().BeTrue(
            "StoppingCts.CancelAsync() must complete BEFORE StopProcess runs so an in-flight executing task is already "
            + "signalled to abort by the time the processing service itself begins shutting down");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-073")]
    public async Task StopAsync_AfterSuccessfulStopAndDisposal_DoesNotStopProcessingAgain()
    {
        var hostedService = CreateHostedService();

        await hostedService.StartAsync(CancellationToken.None);
        await hostedService.StopAsync(CancellationToken.None);
        hostedService.Dispose();

        // Separate host shutdown callers can overlap: one finishes and disposes the host before
        // the other reaches this already-stopped service. Completed work remains idempotent.
        await hostedService.StopAsync(CancellationToken.None);

        processingService.Verify(service => service.Stop(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-074")]
    public async Task StopAsync_WhenDisposedBeforeSuccessfulStop_DoesNotHideTheLifecycleFailure()
    {
        var hostedService = CreateHostedService();

        await hostedService.StartAsync(CancellationToken.None);
        hostedService.Dispose();

        var stop = () => hostedService.StopAsync(CancellationToken.None);

        await stop.Should().ThrowAsync<ObjectDisposedException>();
        processingService.Verify(service => service.Stop(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-073")]
    public async Task StopAsync_WhenAConcurrentWaiterIsCancelled_DoesNotLetAnotherCallerReenterProcessingStop()
    {
        var stopEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var releaseStop = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        processingService
            .Setup(service => service.Stop(It.IsAny<CancellationToken>()))
            .Returns(async () =>
            {
                stopEntered.TrySetResult();
                await releaseStop.Task;
            });

        using var hostedService = CreateHostedService();
        await hostedService.StartAsync(CancellationToken.None);

        var firstStop = hostedService.StopAsync(CancellationToken.None);
        var thirdStop = Task.CompletedTask;

        try
        {
            await stopEntered.Task.WaitAsync(TimeSpan.FromSeconds(5));
            using var cancelled = new CancellationTokenSource();
            await cancelled.CancelAsync();

            var cancelledStop = () => hostedService.StopAsync(cancelled.Token);
            await cancelledStop.Should().ThrowAsync<OperationCanceledException>();

            thirdStop = hostedService.StopAsync(CancellationToken.None);
            processingService.Verify(
                service => service.Stop(It.IsAny<CancellationToken>()),
                Times.Once,
                "a cancelled waiter never acquired the lock and must not release the first caller's permit");
        }
        finally
        {
            releaseStop.TrySetResult();
            await Task.WhenAll(firstStop, thirdStop).WaitAsync(TimeSpan.FromSeconds(5));
        }

        processingService.Verify(service => service.Stop(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-073")]
    public async Task StopAsync_WhenProcessingStopThrows_DoesNotSuppressTheFailureOrMarkItCompleted()
    {
        processingService
            .Setup(service => service.Stop(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ObjectDisposedException("processing-service"));

        using var hostedService = CreateHostedService();
        await hostedService.StartAsync(CancellationToken.None);

        var stop = () => hostedService.StopAsync(CancellationToken.None);

        await stop.Should().ThrowAsync<ObjectDisposedException>();
        await stop.Should().ThrowAsync<ObjectDisposedException>();
        processingService.Verify(service => service.Stop(It.IsAny<CancellationToken>()), Times.Exactly(2));
    }

    private PlatformBackgroundJobStartProcessHostedService CreateHostedService()
    {
        return new PlatformBackgroundJobStartProcessHostedService(serviceProvider, NullLoggerFactory.Instance, processingService.Object);
    }

    /// <summary>
    /// Further-derives the type under test to OBSERVE, at the moment <c>StopProcess</c> runs, whether the ancestor's
    /// protected <c>StoppingCts</c> was already cancelled — proving the ORDER
    /// <see cref="StopAsync_CancelsStoppingCtsBeforeInvokingStopProcess" /> pins, not just that both eventually happen.
    /// </summary>
    private sealed class ObservingHostedService : PlatformBackgroundJobStartProcessHostedService
    {
        public ObservingHostedService(
            IServiceProvider serviceProvider,
            ILoggerFactory loggerFactory,
            IPlatformBackgroundJobProcessingService backgroundJobProcessingService)
            : base(serviceProvider, loggerFactory, backgroundJobProcessingService)
        {
        }

        public bool StoppingCtsWasAlreadyCancelledWhenStopProcessRan { get; private set; }

        protected override async Task StopProcess(CancellationToken cancellationToken)
        {
            StoppingCtsWasAlreadyCancelledWhenStopProcessRan = StoppingCts?.IsCancellationRequested ?? false;

            await base.StopProcess(cancellationToken);
        }
    }
}
