using System.Linq.Expressions;
using Easy.Platform.Application;
using Easy.Platform.Application.MessageBus.Consumers;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Common;
using Easy.Platform.Common.BackgroundLock;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Easy.Platform.Tests.Unit.Application.MessageBus;

/// <summary>Technical contract: a message operation retains ownership of an in-flight ping through cancellation.</summary>
public sealed class PlatformMessageBusPingLifetimeTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-012")]
    public async Task MessageOperation_WhenCancelled_DrainsItsActivePingBeforeReturning(bool useOutbox)
    {
        using var cancellation = new CancellationTokenSource();
        using var harness = new PingHarness();
        var operation = useOutbox ? harness.SendAsync(cancellation.Token) : harness.ConsumeAsync(cancellation.Token);

        try
        {
            // This observes a real first ping at the configured sixty-second interval, without changing its pacing.
            await harness.PingEntered.Task.WaitAsync(TimeSpan.FromSeconds(70));
            await cancellation.CancelAsync();
            await harness.MessageCancelled.Task.WaitAsync(TimeSpan.FromSeconds(5));

            var prematureReturn = () => operation.WaitAsync(TimeSpan.FromSeconds(5));
            await prematureReturn.Should().ThrowAsync<TimeoutException>(
                "the message operation must retain its dependencies while a ping still uses them");
        }
        finally
        {
            await cancellation.CancelAsync();
            harness.ReleasePing.TrySetResult();
            var observeOperation = () => operation;
            await observeOperation.Should().ThrowAsync<OperationCanceledException>();
        }

        harness.PingExited.Should().BeTrue();
    }

    public sealed class Payload { }

    private sealed class PingHarness : IDisposable
    {
        private readonly ServiceProvider provider;
        private readonly IPlatformRootServiceProvider root;
        private readonly Mock<IPlatformOutboxBusMessageRepository> outbox = new();
        private readonly Mock<IPlatformInboxBusMessageRepository> inbox = new();

        public PingHarness()
        {
            var rootMock = new Mock<IPlatformRootServiceProvider>();
            root = rootMock.Object;
            provider = new ServiceCollection()
                .AddSingleton(root)
                .AddSingleton<ILoggerFactory>(NullLoggerFactory.Instance)
                .AddSingleton(outbox.Object)
                .AddSingleton(inbox.Object)
                .BuildServiceProvider();
            rootMock.Setup(item => item.GetService(It.IsAny<Type>())).Returns((Type type) => provider.GetService(type));
            var manager = new Mock<IPlatformUnitOfWorkManager>();
            manager.Setup(item => item.Begin(It.IsAny<bool>())).Returns(() => Mock.Of<IPlatformUnitOfWork>());
            outbox.Setup(item => item.UowManager()).Returns(manager.Object);
            inbox.Setup(item => item.UowManager()).Returns(manager.Object);
            outbox.Setup(item => item.GetAllAsync(
                    It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(), It.IsAny<CancellationToken>(),
                    It.IsAny<Expression<Func<PlatformOutboxBusMessage, object?>>[]>()))
                .Returns(() => ReadPingRowsAsync<PlatformOutboxBusMessage>());
            inbox.Setup(item => item.GetAllAsync(
                    It.IsAny<Expression<Func<PlatformInboxBusMessage, bool>>>(), It.IsAny<CancellationToken>(),
                    It.IsAny<Expression<Func<PlatformInboxBusMessage, object?>>[]>()))
                .Returns(() => ReadPingRowsAsync<PlatformInboxBusMessage>());
        }

        public TaskCompletionSource PingEntered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource ReleasePing { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource MessageCancelled { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public bool PingExited { get; private set; }

        public Task SendAsync(CancellationToken token)
        {
            var producer = new Mock<IPlatformMessageBusProducer>();
            producer.Setup(item => item.SendAsync(It.IsAny<Payload>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .Returns(async (Payload message, string _, CancellationToken cancellationToken) =>
                {
                    await WaitForMessageCancellationAsync(cancellationToken);
                    return message;
                });
            var helper = new PlatformOutboxMessageBusProducerHelper(new PlatformOutboxConfig(), producer.Object,
                provider, root, Mock.Of<IPlatformBackgroundActionPermitPoolRegistry>());
            return helper.SendExistingOutboxMessageAsync(new PlatformOutboxBusMessage { Id = "outbox" },
                new Payload(), "context.event.Payload", 1, false, false, token, NullLogger.Instance, producer.Object, outbox.Object);
        }

        public Task ConsumeAsync(CancellationToken token)
        {
            var consumer = new Mock<IPlatformApplicationMessageBusConsumer<Payload>>();
            consumer.SetupGet(item => item.NeedStartIntervalPingInboxMessageProcessing).Returns(true);
            consumer.Setup(item => item.HandleAsync(It.IsAny<Payload>(), It.IsAny<string>()))
                .Returns(() => WaitForMessageCancellationAsync(token));
            return PlatformInboxMessageBusConsumerHelper.HandleConsumerLogicDirectlyForExistingInboxMessage(
                new PlatformInboxBusMessage { Id = "inbox" }, consumer.Object, provider, inbox.Object, new Payload(),
                "context.event.Payload", () => NullLogger.Instance, 1, false, false, token);
        }

        public void Dispose() => provider.Dispose();

        private async Task WaitForMessageCancellationAsync(CancellationToken token)
        {
            try { await Task.Delay(Timeout.InfiniteTimeSpan, token); }
            finally { MessageCancelled.TrySetResult(); }
        }

        private async Task<List<T>> ReadPingRowsAsync<T>()
        {
            PingEntered.TrySetResult();
            // A persistence operation may not honor cancellation until its current request finishes.
            await ReleasePing.Task;
            PingExited = true;
            return [];
        }
    }
}
