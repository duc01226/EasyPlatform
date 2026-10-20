using System.Linq.Expressions;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Common;
using Easy.Platform.Common.BackgroundLock;
using Easy.Platform.Domain.Events;
using Easy.Platform.Infrastructures.MessageBus;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace Easy.Platform.Tests.Unit.Application.MessageBus;

/// <summary>Technical contract: caller cancellation is distinct from a terminal deletion failure after a successful send.</summary>
public sealed class PlatformOutboxMessageBusCancellationTests
{
    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-017")]
    public async Task SuccessfulSend_WhenAutoDeleteIsCancelled_PropagatesCancellationWithoutLoggingAProcessingError()
    {
        using var cancellation = new CancellationTokenSource();
        using var harness = new Harness();
        var deletionEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        harness.Repository.Setup(item => item.DeleteManyAsync(
                It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(), It.IsAny<bool>(),
                It.IsAny<Action<PlatformCqrsEntityEvent>>(), It.IsAny<CancellationToken>()))
            .Returns(async (Expression<Func<PlatformOutboxBusMessage, bool>> _, bool _, Action<PlatformCqrsEntityEvent> _, CancellationToken token) =>
            {
                deletionEntered.TrySetResult();
                await Task.Delay(Timeout.InfiniteTimeSpan, token);
                return 0;
            });
        var message = new Payload();
        harness.Producer.Setup(item => item.SendAsync(message, It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(message);
        var operation = harness.Helper.SendExistingOutboxMessageAsync(new PlatformOutboxBusMessage { Id = "sent-outbox" },
            message, "context.event.Payload", 1, false, true, cancellation.Token, harness.Logger.Object,
            harness.Producer.Object, harness.Repository.Object);

        try
        {
            await deletionEntered.Task.WaitAsync(TimeSpan.FromSeconds(5));
            await cancellation.CancelAsync();
            var observeOperation = () => operation.WaitAsync(TimeSpan.FromSeconds(5));
            await observeOperation.Should().ThrowAsync<OperationCanceledException>();
        }
        finally
        {
            await cancellation.CancelAsync();
        }

        harness.Producer.Verify(item => item.SendAsync(message, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
        harness.Logger.Verify(item => item.Log(LogLevel.Error, It.IsAny<EventId>(), It.IsAny<It.IsAnyType>(),
            It.IsAny<Exception?>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()), Times.Never);
        harness.Repository.Verify(item => item.SetAsync(It.IsAny<PlatformOutboxBusMessage>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-018")]
    public async Task Delete_WhenItsRetryBudgetIsExhausted_StillLogsTheGenuineFailure()
    {
        using var harness = new Harness();
        var failure = new InvalidOperationException("terminal deletion failure");
        harness.Repository.Setup(item => item.DeleteManyAsync(
                It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(), It.IsAny<bool>(),
                It.IsAny<Action<PlatformCqrsEntityEvent>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(failure);

        // The same terminal repository/logging path runs with no delayed retry; public cleanup keeps its recovery budget.
        await harness.Helper.DeleteExistingOutboxProcessedMessageAsync(harness.Provider,
            new PlatformOutboxBusMessage { Id = "failed-delete" }, CancellationToken.None,
            outboxBusMessageRepositoryFactory: null!, maxRetryCount: 0);

        harness.Logger.Verify(item => item.Log(LogLevel.Error, It.IsAny<EventId>(),
            It.Is<It.IsAnyType>((state, _) => state.ToString()!.Contains(failure.Message)),
            It.IsAny<Exception?>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-019")]
    public async Task ScopedSuccessfulSend_WhenAutoDeleteIsCancelled_SettlesWithoutReportingASendFailure()
    {
        using var cancellation = new CancellationTokenSource();
        using var harness = new Harness();
        var deletionEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        harness.Repository.Setup(item => item.DeleteManyAsync(
                It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(), It.IsAny<bool>(),
                It.IsAny<Action<PlatformCqrsEntityEvent>>(), It.IsAny<CancellationToken>()))
            .Returns(async (Expression<Func<PlatformOutboxBusMessage, bool>> _, bool _, Action<PlatformCqrsEntityEvent> _, CancellationToken token) =>
            {
                deletionEntered.TrySetResult();
                await Task.Delay(Timeout.InfiniteTimeSpan, token);
                return 0;
            });
        var message = new Payload();
        harness.Producer.Setup(item => item.SendAsync(message, It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(message);
        var operation = harness.Helper.SendExistingOutboxMessageInNewScopeAsync(
            new PlatformOutboxBusMessage { Id = "scoped-sent-outbox", SendStatus = PlatformOutboxBusMessage.SendStatuses.Processing },
            message, "context.event.Payload", 1, false, true, cancellation.Token, harness.Logger.Object);

        try
        {
            await deletionEntered.Task.WaitAsync(TimeSpan.FromSeconds(5));
        }
        finally
        {
            await cancellation.CancelAsync();
            await operation.WaitAsync(TimeSpan.FromSeconds(5));
        }

        harness.Producer.Verify(item => item.SendAsync(message, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
        harness.Logger.Verify(item => item.Log(LogLevel.Error, It.IsAny<EventId>(), It.IsAny<It.IsAnyType>(),
            It.IsAny<Exception?>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()), Times.Never);
        harness.Repository.Verify(item => item.SetAsync(It.IsAny<PlatformOutboxBusMessage>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-020")]
    public async Task ScopedSend_WhenItsTokenIsCancelled_StillReportsAGenuineNonCancellationFailure()
    {
        using var cancellation = new CancellationTokenSource();
        using var harness = new Harness();
        var failure = new InvalidOperationException("genuine scoped repository failure");
        await cancellation.CancelAsync();

        // Scope selection fails before transport. A cancelled token must not hide a different failure type.
        await harness.Helper.SendExistingOutboxMessageInNewScopeAsync(new PlatformOutboxBusMessage { Id = "failed-scope" },
            new Payload(), "context.event.Payload", 1, false, true, cancellation.Token, harness.Logger.Object,
            outboxBusMessageRepositoryFactory: _ => throw failure);

        harness.Logger.Verify(item => item.Log(LogLevel.Error, It.IsAny<EventId>(),
            It.Is<It.IsAnyType>((state, _) => state.ToString()!.Contains("SendExistingOutboxMessageInNewScopeAsync failed")
                && state.ToString()!.Contains(failure.Message)),
            It.IsAny<Exception?>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-021")]
    public async Task ScopedSend_WhenCancellationIsNotRequested_ReportsAnOperationCancellationAsAFailure()
    {
        using var harness = new Harness();
        var failure = new OperationCanceledException("unowned scoped cancellation");
        var selections = 0;
        harness.Repository.Setup(item => item.FirstOrDefaultAsync(
                It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(), It.IsAny<CancellationToken>(),
                It.IsAny<Expression<Func<PlatformOutboxBusMessage, object?>>[]>()))
            .ReturnsAsync((PlatformOutboxBusMessage)null!);

        // The first scoped selection fails; normal failure recovery can then query the actual repository.
        await harness.Helper.SendExistingOutboxMessageInNewScopeAsync(new PlatformOutboxBusMessage { Id = "unowned-cancel" },
            new Payload(), "context.event.Payload", 1, false, true, CancellationToken.None, harness.Logger.Object,
            outboxBusMessageRepositoryFactory: _ => Interlocked.Increment(ref selections) == 1 ? throw failure : harness.Repository.Object);

        harness.Logger.Verify(item => item.Log(LogLevel.Error, It.IsAny<EventId>(),
            It.Is<It.IsAnyType>((state, _) => state.ToString()!.Contains("SendExistingOutboxMessageInNewScopeAsync failed")
                && state.ToString()!.Contains(failure.Message)),
            It.IsAny<Exception?>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()), Times.Once);
        harness.Repository.Verify(item => item.FirstOrDefaultAsync(
            It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(), It.IsAny<CancellationToken>(),
            It.IsAny<Expression<Func<PlatformOutboxBusMessage, object?>>[]>()), Times.Once);
    }

    public sealed class Payload { }

    private sealed class Harness : IDisposable
    {
        public Harness()
        {
            var root = new Mock<IPlatformRootServiceProvider>();
            var loggerFactory = new Mock<ILoggerFactory>();
            loggerFactory.Setup(item => item.CreateLogger(It.IsAny<string>())).Returns(Logger.Object);
            Provider = new ServiceCollection().AddSingleton(Repository.Object).AddSingleton(Producer.Object).AddSingleton(loggerFactory.Object)
                .AddSingleton(root.Object).BuildServiceProvider();
            root.Setup(item => item.GetService(It.IsAny<Type>())).Returns((Type type) => Provider.GetService(type));
            Helper = new PlatformOutboxMessageBusProducerHelper(new PlatformOutboxConfig(), Producer.Object,
                Provider, root.Object, Mock.Of<IPlatformBackgroundActionPermitPoolRegistry>());
        }

        public ServiceProvider Provider { get; }
        public Mock<IPlatformOutboxBusMessageRepository> Repository { get; } = new();
        public Mock<IPlatformMessageBusProducer> Producer { get; } = new();
        public Mock<ILogger> Logger { get; } = new();
        public PlatformOutboxMessageBusProducerHelper Helper { get; }
        public void Dispose() => Provider.Dispose();
    }
}
