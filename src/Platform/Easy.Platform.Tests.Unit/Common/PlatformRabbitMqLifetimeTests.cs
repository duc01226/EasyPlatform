using System.Text;
using Easy.Platform.Application;
using Easy.Platform.Common;
using Easy.Platform.Infrastructures.MessageBus;
using Easy.Platform.Persistence;
using Easy.Platform.RabbitMQ;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Easy.Platform.Tests.Unit.Common;

/// <summary>Technical contract: module and hosted startup share one lifetime, including in-flight deliveries and ACKs.</summary>
public sealed class PlatformRabbitMqLifetimeTests
{
    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-008")]
    public async Task RepeatedStart_DoesNotReplaceOrCancelTheModuleStartedLifetime()
    {
        using var provider = new ServiceCollection().BuildServiceProvider();
        using var initializer = new ControlledInitializer(provider);
        await initializer.StartProcess(CancellationToken.None, maxRetryCount: 0);
        var original = initializer.ExecutionToken;
        using var secondCaller = new CancellationTokenSource();

        await initializer.StartProcess(secondCaller.Token, maxRetryCount: 0);
        await secondCaller.CancelAsync();

        initializer.InitializeCalls.Should().Be(1);
        initializer.ExecutionToken.Should().Be(original);
        original.IsCancellationRequested.Should().BeFalse("a no-op hosted start does not own the module's running consumers");
        await initializer.StopProcess();
        original.IsCancellationRequested.Should().BeTrue();
        initializer.IsStarted.Should().BeFalse();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-009")]
    public async Task Stop_DuringModuleStartup_CancelsAndJoinsInitializationEvenBeforeIsStarted()
    {
        using var provider = new ServiceCollection().BuildServiceProvider();
        using var initializer = new ControlledInitializer(provider);
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        initializer.Initialize = async token =>
        {
            entered.TrySetResult();
            await Task.Delay(Timeout.InfiniteTimeSpan, token);
        };
        var start = initializer.StartProcess(CancellationToken.None, maxRetryCount: 0);
        await entered.Task.WaitAsync(TimeSpan.FromSeconds(5));

        await initializer.StopProcess().WaitAsync(TimeSpan.FromSeconds(5));

        var observeStart = () => start;
        await observeStart.Should().ThrowAsync<OperationCanceledException>();
        initializer.InitializationExited.Should().BeTrue();
        initializer.IsStarted.Should().BeFalse();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-010")]
    public async Task Stop_DuringDeliveryReadiness_LeavesValidDeliveryUnacknowledgedAndRejectsLateWork()
    {
        var waiting = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var module = new Mock<IPlatformPersistenceModule>();
        module.SetupGet(item => item.IsFullyInitialized).Returns(() =>
        {
            waiting.TrySetResult();
            return false;
        });
        using var provider = new ServiceCollection().AddSingleton(module.Object).BuildServiceProvider();
        using var initializer = new ControlledInitializer(provider);
        var channel = new Mock<IChannel>(MockBehavior.Strict);
        var delivery = new BasicDeliverEventArgs("consumer", 42, false, "events", "context.event.Payload", new BasicProperties(), Encoding.UTF8.GetBytes("{}"));
        var transfer = initializer.Transfer(channel.Object, delivery);
        await waiting.Task.WaitAsync(TimeSpan.FromSeconds(5));

        await initializer.StopProcess().WaitAsync(TimeSpan.FromSeconds(5));
        await transfer.WaitAsync(TimeSpan.FromSeconds(5));
        await provider.DisposeAsync();
        await initializer.Transfer(channel.Object, delivery);
        initializer.AckMessage(channel.Object, delivery, isReject: true);
        await initializer.StopProcess();

        channel.VerifyNoOtherCalls();
        initializer.RecoveryCalls.Should().Be(0, "shutdown while waiting for modules is not a malformed payload");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-011")]
    public async Task Stop_WaitsForAnAcknowledgementAlreadyInFlight()
    {
        using var provider = new ServiceCollection().BuildServiceProvider();
        using var initializer = new ControlledInitializer(provider);
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var cancelled = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var ackFinished = false;
        var channel = new Mock<IChannel>();
        channel.SetupGet(item => item.IsOpen).Returns(true);
        channel.SetupGet(item => item.IsClosed).Returns(false);
        channel.Setup(item => item.BasicAckAsync(42, false, It.IsAny<CancellationToken>()))
            .Returns((ulong _, bool _, CancellationToken token) => new ValueTask(AcknowledgeAsync(token)));
        var delivery = new BasicDeliverEventArgs("consumer", 42, false, "events", "context.event.Payload", new BasicProperties(), Encoding.UTF8.GetBytes("{}"));
        initializer.AckMessage(channel.Object, delivery, isReject: false);
        await entered.Task.WaitAsync(TimeSpan.FromSeconds(5));

        var stop = initializer.StopProcess();
        try
        {
            await cancelled.Task.WaitAsync(TimeSpan.FromSeconds(5));
            stop.IsCompleted.Should().BeFalse("an ACK operation can still hold a channel after its token is cancelled");
        }
        finally
        {
            release.TrySetResult();
            await stop.WaitAsync(TimeSpan.FromSeconds(5));
        }

        ackFinished.Should().BeTrue();
        channel.Verify(item => item.BasicAckAsync(42, false, It.IsAny<CancellationToken>()), Times.Once);

        async Task AcknowledgeAsync(CancellationToken token)
        {
            using var registration = token.Register(() => cancelled.TrySetResult());
            entered.TrySetResult();
            await release.Task;
            ackFinished = true;
        }
    }

    private sealed class ControlledInitializer : PlatformRabbitMqProcessInitializerService
    {
        public ControlledInitializer(ServiceProvider provider)
            : base(Mock.Of<IPlatformApplicationSettingContext>(), Mock.Of<IPlatformRabbitMqExchangeProvider>(),
                Mock.Of<IPlatformMessageBusScanner>(), null!, new PlatformRabbitMqOptions(), new PlatformMessageBusConfig(),
                null!, null!, null!, null!, NullLoggerFactory.Instance, Root(provider))
        { }

        public Func<CancellationToken, Task> Initialize { get; set; } = _ => Task.CompletedTask;
        public int InitializeCalls { get; private set; }
        public int RecoveryCalls { get; private set; }
        public bool InitializationExited { get; private set; }
        public CancellationToken ExecutionToken => ProcessingCancellationToken;

        public Task Transfer(IChannel channel, BasicDeliverEventArgs delivery) => TransferMessageToAllMessageBusConsumers(channel, delivery, "source-queue");

        protected override async Task InitializeProcessingAsync(int? maxRetryCount)
        {
            InitializeCalls++;
            try { await Initialize(ProcessingCancellationToken); }
            finally { InitializationExited = true; }
        }

        protected override Task RecoverMalformedMessageAsync(string sourceQueue, IChannel channel, BasicDeliverEventArgs delivery, Type failureType, CancellationToken cancellationToken)
        {
            RecoveryCalls++;
            return Task.CompletedTask;
        }

        private static IPlatformRootServiceProvider Root(ServiceProvider provider)
        {
            var root = new Mock<IPlatformRootServiceProvider>();
            root.Setup(item => item.GetService(It.IsAny<Type>())).Returns((Type type) => provider.GetService(type));
            return root.Object;
        }
    }
}
