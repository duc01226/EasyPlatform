using System.Linq.Expressions;
using Easy.Platform.Application;
using Easy.Platform.Application.MessageBus.Consumers;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Infrastructures.MessageBus;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Easy.Platform.Tests.Unit.Application.MessageBus;

/// <summary>Technical contract: cancelling the inbox await retains the actual consumer's scope until it exits.</summary>
public sealed class PlatformInboxConsumerLifetimeTests
{
    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-016")]
    public async Task HostedInbox_WhenCancelled_KeepsTheConsumerScopeAliveUntilTheActualInvocationFinishes()
    {
        using var cancellation = new CancellationTokenSource();
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var exited = false;
        Task? invocation = null;
        ScopedDependency? dependency = null;
        var consumer = new Mock<IPlatformApplicationMessageBusConsumer<Payload>>();
        consumer.As<IPlatformMessageBusConsumer>().Setup(item => item.HandleWhen(It.IsAny<object>(), It.IsAny<string>())).ReturnsAsync(true);
        consumer.As<IPlatformMessageBusConsumer>().Setup(item => item.HandleAsync(It.IsAny<object>(), It.IsAny<string>()))
            .Returns(() => invocation = ConsumeAsync());
        var message = new PlatformInboxBusMessage
        {
            Id = "held-consumer",
            ConsumerBy = PlatformInboxBusMessage.GetConsumerByValue(consumer.Object.GetType()),
            JsonMessage = "{}",
            RoutingKey = "context.event.Payload",
            ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.Processing
        };
        var repository = new Mock<IPlatformInboxBusMessageRepository>();
        repository.Setup(item => item.GetByIdAsync(message.Id, It.IsAny<CancellationToken>(),
                It.IsAny<Expression<Func<PlatformInboxBusMessage, object?>>[]>()))
            .ReturnsAsync(message);
        using var provider = new ServiceCollection()
            .AddSingleton(repository.Object)
            .AddScoped(_ => new ScopedDependency())
            .AddScoped(consumer.Object.GetType(), scopedProvider =>
            {
                dependency = scopedProvider.GetRequiredService<ScopedDependency>();
                return consumer.Object;
            })
            .BuildServiceProvider();
        using var worker = new InvocationWorker(provider, consumer.Object.GetType());
        var operation = worker.HandleAsync(message, cancellation.Token);

        try
        {
            await entered.Task.WaitAsync(TimeSpan.FromSeconds(5));
            await cancellation.CancelAsync();
            var prematureReturn = () => operation.WaitAsync(TimeSpan.FromSeconds(5));
            await prematureReturn.Should().ThrowAsync<TimeoutException>(
                "cancelling the await wrapper cannot release the active consumer's scope");
            dependency.Should().NotBeNull();
            dependency!.IsDisposed.Should().BeFalse();
            exited.Should().BeFalse();
        }
        finally
        {
            release.TrySetResult();
            await operation.WaitAsync(TimeSpan.FromSeconds(5));
            if (invocation != null) await invocation.WaitAsync(TimeSpan.FromSeconds(5));
        }

        exited.Should().BeTrue();
        dependency!.IsDisposed.Should().BeTrue("the production scope ends only after its consumer has finished");
        message.ConsumeStatus.Should().Be(PlatformInboxBusMessage.ConsumeStatuses.New,
            "the existing worker cancellation owner must still revert the interrupted inbox row");

        async Task ConsumeAsync()
        {
            entered.TrySetResult();
            // Consumer contracts have no cancellation argument. A real invocation can finish after host cancellation.
            await release.Task;
            dependency!.IsDisposed.Should().BeFalse("the actual invocation still owns this scoped dependency");
            exited = true;
        }
    }

    public sealed class Payload { }

    private sealed class ScopedDependency : IDisposable
    {
        public bool IsDisposed { get; private set; }
        public void Dispose() => IsDisposed = true;
    }

    private sealed class InvocationWorker(IServiceProvider provider, Type consumerType)
        : PlatformConsumeInboxBusMessageHostedService(provider, NullLoggerFactory.Instance,
            Mock.Of<IPlatformApplicationSettingContext>(), Scanner(consumerType), new PlatformInboxConfig(),
            new PlatformMessageBusConfig { EnableLogConsumerProcessTime = false })
    {
        public Task HandleAsync(PlatformInboxBusMessage message, CancellationToken cancellationToken) =>
            HandleInboxMessageAsync(message, cancellationToken);

        private static IPlatformMessageBusScanner Scanner(Type consumerType)
        {
            var scanner = new Mock<IPlatformMessageBusScanner>();
            scanner.Setup(item => item.ScanAllDefinedConsumerTypes()).Returns([consumerType]);
            return scanner.Object;
        }
    }
}
