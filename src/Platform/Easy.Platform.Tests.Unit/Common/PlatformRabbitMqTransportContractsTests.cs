using System.Reflection;
using System.Text;
using System.Linq.Expressions;
using Easy.Platform.Application;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Common;
using Easy.Platform.Common.BackgroundLock;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.Events;
using Easy.Platform.Infrastructures.MessageBus;
using Easy.Platform.RabbitMQ;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.ObjectPool;
using Moq;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Easy.Platform.Tests.Unit.Common;

/// <summary>
/// TC-RMQ-TRANSPORT-001..010 guard the real producer/declaration owners. Pools reuse their protected
/// object-pool seam; no network or virtual replacement of the production Get/Return methods is needed.
/// </summary>
public class PlatformRabbitMqTransportContractsTests
{
    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-TRANSPORT-001")]
    public async Task PreCanceledSend_DoesNotSerializeOrAcquireAndPreservesWrappedFailure()
    {
        using var cancellation = new CancellationTokenSource();
        await cancellation.CancelAsync();
        var message = new CountingMessage();
        var producer = new PlatformRabbitMqMessageBusProducer(null!, new PlatformRabbitMqOptions(), NullLoggerFactory.Instance, null!, null!);

        var action = () => producer.SendAsync(message, "test.context.message", cancellation.Token);
        var failure = await action.Should().ThrowAsync<PlatformMessageBusException<CountingMessage>>();

        message.GetterCalls.Should().Be(0);
        failure.Which.EventBusMessage.Should().BeSameAs(message);
        failure.Which.InnerException.Should().BeAssignableTo<OperationCanceledException>()
            .Which.CancellationToken.Should().Be(cancellation.Token);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-TRANSPORT-002")]
    public async Task CancellationDuringReadiness_StopsSendWithoutAcquiringChannel()
    {
        using var fixture = new TransportFixture();
        fixture.SetStarted(false);
        using var cancellation = new CancellationTokenSource();
        var serialized = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var message = new CountingMessage { OnRead = () => serialized.TrySetResult() };
        var send = fixture.Producer.SendAsync(message, "test.context.message", cancellation.Token);
        await serialized.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await cancellation.CancelAsync();
        try
        {
            var action = () => send.WaitAsync(TimeSpan.FromSeconds(5));
            var failure = await action.Should().ThrowAsync<PlatformMessageBusException<CountingMessage>>();
            failure.Which.InnerException.Should().BeAssignableTo<OperationCanceledException>()
                .Which.CancellationToken.Should().Be(cancellation.Token);
            fixture.Policy.Created.Should().Be(0);
            fixture.Policy.Returned.Should().Be(0);
        }
        finally
        {
            // Drain an intentionally broken tokenless-wait mutant instead of leaving a60s background waiter.
            fixture.SetStarted(true);
            try { await send.WaitAsync(TimeSpan.FromSeconds(5)); }
            catch (PlatformMessageBusException<CountingMessage>) { }
        }
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-TRANSPORT-003")]
    public async Task SuccessfulSend_PreservesWireBodyRoutingPersistenceTokenAndSingleLease()
    {
        using var fixture = new TransportFixture();
        using var cancellation = new CancellationTokenSource();
        var message = new TransportMessage { Value = "wire-value" };
        CancellationToken observed = default;
        ReadOnlyMemory<byte> observedBody = default;
        fixture.Publish((body, token) =>
        {
            observed = token;
            observedBody = body;
            return Task.CompletedTask;
        });

        (await fixture.Producer.SendAsync(message, "test.context.message", cancellation.Token)).Should().BeSameAs(message);

        observed.Should().Be(cancellation.Token);
        Encoding.UTF8.GetString(observedBody.Span).Should().Contain("wire-value");
        fixture.Channel.Verify(channel => channel.BasicPublishAsync("test-exchange", "test.context.message", false,
            It.Is<BasicProperties>(properties => properties.Persistent), It.IsAny<ReadOnlyMemory<byte>>(), cancellation.Token), Times.Once);
        fixture.Policy.Created.Should().Be(1);
        fixture.Policy.Returned.Should().Be(1);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-TRANSPORT-004")]
    public async Task CancellationDuringPublish_ReachesClientAndReturnsLeaseOnce()
    {
        using var fixture = new TransportFixture();
        using var cancellation = new CancellationTokenSource();
        var publishing = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var finish = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        CancellationToken observed = default;
        fixture.Publish(async (_, token) =>
        {
            observed = token;
            publishing.SetResult();
            await finish.Task.WaitAsync(token);
        });
        var send = fixture.Producer.SendAsync(new TransportMessage(), "test.context.message", cancellation.Token);
        await publishing.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await cancellation.CancelAsync();
        try
        {
            var action = () => send.WaitAsync(TimeSpan.FromSeconds(5));
            var failure = await action.Should().ThrowAsync<PlatformMessageBusException<TransportMessage>>();
            failure.Which.InnerException.Should().BeAssignableTo<OperationCanceledException>();
            observed.Should().Be(cancellation.Token);
            fixture.Policy.Returned.Should().Be(1);
        }
        finally
        {
            finish.TrySetResult();
            try { await send; }
            catch (PlatformMessageBusException<TransportMessage>) { }
        }
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-TRANSPORT-005")]
    public async Task CancellationDuringSynchronousAcquire_DoesNotPublishAndReturnsAcquiredLease()
    {
        using var fixture = new TransportFixture();
        using var cancellation = new CancellationTokenSource();
        fixture.Policy.OnCreate = cancellation.Cancel;

        var action = () => fixture.Producer.SendAsync(new TransportMessage(), "test.context.message", cancellation.Token);
        (await action.Should().ThrowAsync<PlatformMessageBusException<TransportMessage>>())
            .Which.InnerException.Should().BeAssignableTo<OperationCanceledException>();

        fixture.Channel.Verify(channel => channel.BasicPublishAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>(),
            It.IsAny<BasicProperties>(), It.IsAny<ReadOnlyMemory<byte>>(), It.IsAny<CancellationToken>()), Times.Never);
        fixture.Policy.Returned.Should().Be(1);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-TRANSPORT-006")]
    public async Task QueueArgumentConflict_PreservesQueueAndOriginalFailureWithoutDeleteOrRebind()
    {
        using var fixture = new TransportFixture();
        ShutdownEventArgs? closeReason = null;
        fixture.Channel.SetupGet(channel => channel.CloseReason).Returns(() => closeReason);
        var expected = new InvalidOperationException("Incompatible queue arguments.");
        fixture.Channel.Setup(channel => channel.QueueDeclareAsync(It.IsAny<string>(), true, false, false,
                It.IsAny<IDictionary<string, object?>>(), false, false, It.IsAny<CancellationToken>()))
            .Callback(() => closeReason = new ShutdownEventArgs(ShutdownInitiator.Peer, 406, "PRECONDITION_FAILED"))
            .ThrowsAsync(expected);
        var spare = NewChannel();
        spare.Setup(channel => channel.QueueDeclarePassiveAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new QueueDeclareOk("preserved", 0, 0));
        fixture.Policy.NextChannel = spare.Object;

        var action = () => fixture.Declare();
        var failure = await action.Should().ThrowAsync<InvalidOperationException>();

        failure.Which.InnerException.Should().BeSameAs(expected);
        failure.Which.Message.Should().Contain("preserved").And.Contain("Migrate");
        fixture.Channel.Invocations.Concat(spare.Invocations).Should().NotContain(invocation =>
            invocation.Method.Name == nameof(IChannel.QueueDeleteAsync) || invocation.Method.Name == nameof(IChannel.QueueDeclarePassiveAsync));
        fixture.Channel.Verify(channel => channel.QueueBindAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<IDictionary<string, object?>>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never);
        fixture.Policy.Returned.Should().Be(1);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-TRANSPORT-007")]
    public async Task OrdinaryQueue_DeclaresConfiguredTtlAndDurabilityAndBothBindings()
    {
        using var fixture = new TransportFixture();
        IDictionary<string, object?>? arguments = null;
        fixture.Channel.Setup(channel => channel.QueueDeclareAsync(It.IsAny<string>(), true, false, false,
                It.IsAny<IDictionary<string, object?>>(), false, false, It.IsAny<CancellationToken>()))
            .Callback((string _, bool _, bool _, bool _, IDictionary<string, object?> values, bool _, bool _, CancellationToken _) => arguments = values)
            .ReturnsAsync(new QueueDeclareOk("declared", 0, 0));

        await fixture.Declare();

        arguments.Should().ContainKey("x-message-ttl").WhoseValue.Should().Be(fixture.Options.QueueMessagesTimeToLive);
        arguments.Should().ContainKey("x-expires").WhoseValue.Should().Be(fixture.Options.QueueUnusedExpireTime);
        arguments.Should().NotContainKey("message-ttl");
        fixture.Channel.Verify(channel => channel.QueueBindAsync(It.IsAny<string>(), "test-exchange", It.IsAny<string>(),
            It.IsAny<IDictionary<string, object?>>(), false, It.IsAny<CancellationToken>()), Times.Exactly(2));
        fixture.Policy.Returned.Should().Be(1);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    [Trait("TechnicalSpec", "TC-RMQ-TRANSPORT-008")]
    public async Task CanceledPublish_KeepsCommittedOutboxForFreshWorkerRetryInDefaultAndKeyedStores(bool keyed)
    {
        using var fixture = new TransportFixture();
        using var cancellation = new CancellationTokenSource();
        var payload = new TransportMessage { Value = "committed-body" };
        PlatformOutboxBusMessage? stored = new()
        {
            Id = "committed-outbox",
            JsonMessage = payload.ToJson(),
            RoutingKey = "test.context.message",
            MessageTypeFullName = typeof(TransportMessage).FullName!,
            SendStatus = PlatformOutboxBusMessage.SendStatuses.Processing,
            LastProcessingPingDate = DateTime.UtcNow.AddHours(-1),
        };
        var committedJson = stored.ToJson();
        var repository = new Mock<IPlatformOutboxBusMessageRepository>();
        repository.Setup(value => value.FirstOrDefaultAsync(It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(), It.IsAny<CancellationToken>()))
            .Returns((Expression<Func<PlatformOutboxBusMessage, bool>> predicate, CancellationToken token, Expression<Func<PlatformOutboxBusMessage, object?>>[] _) =>
            {
                token.ThrowIfCancellationRequested();
                return Task.FromResult(stored != null && predicate.Compile()(stored) ? stored.Clone() : null!);
            });
        repository.Setup(value => value.DeleteManyAsync(It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(), true,
                It.IsAny<Action<PlatformCqrsEntityEvent>>(), It.IsAny<CancellationToken>()))
            .Returns((Expression<Func<PlatformOutboxBusMessage, bool>> predicate, bool _, Action<PlatformCqrsEntityEvent> _, CancellationToken token) =>
            {
                token.ThrowIfCancellationRequested();
                if (stored == null || !predicate.Compile()(stored)) return Task.FromResult(0);
                stored = null;
                return Task.FromResult(1);
            });
        var foreignRepository = new Mock<IPlatformOutboxBusMessageRepository>(MockBehavior.Strict);
        var services = new ServiceCollection();
        services.AddSingleton(keyed ? foreignRepository.Object : repository.Object);
        services.AddSingleton<ILoggerFactory>(NullLoggerFactory.Instance);
        using var serviceProvider = services.BuildServiceProvider();
        var root = new Mock<IPlatformRootServiceProvider>();
        root.Setup(value => value.GetService(It.IsAny<Type>())).Returns((Type type) => serviceProvider.GetService(type));
        var registry = new Mock<IPlatformBackgroundActionPermitPoolRegistry>();
        registry.Setup(value => value.Get(It.IsAny<string>())).Returns(Mock.Of<IPlatformBackgroundActionPermitPool>());
        var helper = new PlatformOutboxMessageBusProducerHelper(new PlatformOutboxConfig(), fixture.Producer, serviceProvider, root.Object, registry.Object);
        Func<IServiceProvider, IPlatformOutboxBusMessageRepository>? factory = keyed ? _ => repository.Object : null;
        var publishing = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var finish = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var wireBodies = new List<string>();
        fixture.Publish(async (body, token) =>
        {
            wireBodies.Add(Encoding.UTF8.GetString(body.Span));
            publishing.TrySetResult();
            await finish.Task.WaitAsync(token);
        });
        var send = helper.SendExistingOutboxMessageAsync(stored.Clone(), payload, stored.RoutingKey, 1, false, true,
            cancellation.Token, NullLogger.Instance, fixture.Producer, repository.Object, factory!);
        await publishing.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await cancellation.CancelAsync();
        try
        {
            await send.WaitAsync(TimeSpan.FromSeconds(5));
            stored.Should().NotBeNull("caller cancellation cannot delete an already committed outbox row");
            stored!.ToJson().Should().Be(committedJson, "even the failed-state update can be canceled; persisted state must remain retryable");
            PlatformOutboxBusMessage.CanHandleMessagesExpr().Compile()(stored).Should().BeTrue();
            using var worker = new CancellationTokenSource();
            fixture.Publish((body, token) =>
            {
                token.Should().Be(worker.Token);
                wireBodies.Add(Encoding.UTF8.GetString(body.Span));
                return Task.CompletedTask;
            });
            await helper.SendExistingOutboxMessageAsync(stored.Clone(), payload, stored.RoutingKey, 1, false, true,
                worker.Token, NullLogger.Instance, fixture.Producer, repository.Object, factory!);
            stored.Should().BeNull("only a successful fresh worker send permits configured processed-row deletion");
            wireBodies.Should().HaveCount(2);
            wireBodies[1].Should().Be(wireBodies[0]);
            foreignRepository.Invocations.Should().BeEmpty("a keyed recovery cannot fall back to the default store");
        }
        finally
        {
            finish.TrySetResult();
            await send;
        }
    }

    [Theory]
    [InlineData(404)]
    [InlineData(500)]
    [Trait("TechnicalSpec", "TC-RMQ-TRANSPORT-009")]
    public async Task OtherDeclarationFailures_PropagateOriginalCauseAndReleaseLease(ushort code)
    {
        using var fixture = new TransportFixture();
        var expected = new InvalidOperationException("Original declaration failure.");
        fixture.Channel.SetupGet(channel => channel.CloseReason).Returns(new ShutdownEventArgs(ShutdownInitiator.Peer, code, "unrelated failure"));
        fixture.Channel.Setup(channel => channel.QueueDeclareAsync(It.IsAny<string>(), true, false, false,
                It.IsAny<IDictionary<string, object?>>(), false, false, It.IsAny<CancellationToken>()))
            .ThrowsAsync(expected);

        var action = () => fixture.Declare();

        (await action.Should().ThrowAsync<InvalidOperationException>()).Which.Should().BeSameAs(expected);
        fixture.Policy.Returned.Should().Be(1);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-TRANSPORT-010")]
    public async Task NonCancellationPublishFailure_PreservesMessageAndNativeCauseAndReturnsLease()
    {
        using var fixture = new TransportFixture();
        var expected = new InvalidOperationException("Native publish failed.");
        var message = new TransportMessage { Value = "unsent" };
        fixture.Publish((_, _) => Task.FromException(expected));

        var action = () => fixture.Producer.SendAsync(message, "test.context.message");
        var failure = await action.Should().ThrowAsync<PlatformMessageBusException<TransportMessage>>();

        failure.Which.EventBusMessage.Should().BeSameAs(message);
        failure.Which.InnerException.Should().BeSameAs(expected);
        fixture.Policy.Returned.Should().Be(1);
    }

    private static Mock<IChannel> NewChannel()
    {
        var channel = new Mock<IChannel>();
        channel.SetupGet(value => value.IsOpen).Returns(true);
        channel.SetupGet(value => value.IsClosed).Returns(false);
        return channel;
    }

    private sealed class TransportFixture : IDisposable
    {
        public PlatformRabbitMqOptions Options { get; } = new() { QueueMessagesTimeToLive = 12345 };
        public Mock<IChannel> Channel { get; } = NewChannel();
        public RecordingPolicy Policy { get; }
        private readonly TestProducerPool producerPool;
        private readonly TestConsumerPool consumerPool;
        private readonly PlatformRabbitMqProcessInitializerService initializer;
        public PlatformRabbitMqMessageBusProducer Producer { get; }

        public TransportFixture()
        {
            Policy = new RecordingPolicy(Channel.Object);
            var scanner = new Mock<IPlatformMessageBusScanner>();
            scanner.Setup(value => value.ScanAllDefinedConsumerBindingRoutingKeys()).Returns(["test.context.message"]);
            var exchange = new Mock<IPlatformRabbitMqExchangeProvider>();
            exchange.Setup(value => value.GetExchangeName(It.IsAny<string>())).Returns("test-exchange");
            producerPool = new TestProducerPool(Options, Policy);
            consumerPool = new TestConsumerPool(Options, scanner.Object, Policy);
            var settings = new Mock<IPlatformApplicationSettingContext>();
            settings.SetupGet(value => value.ApplicationName).Returns("transport-contract");
            initializer = new PlatformRabbitMqProcessInitializerService(settings.Object, exchange.Object, scanner.Object,
                consumerPool, Options, new PlatformMessageBusConfig(), null!, null!, null!, null!, NullLoggerFactory.Instance,
                Mock.Of<IPlatformRootServiceProvider>());
            SetStarted(true);
            Producer = new PlatformRabbitMqMessageBusProducer(exchange.Object, Options, NullLoggerFactory.Instance, producerPool, initializer);
            Publish((_, _) => Task.CompletedTask);
        }

        public void SetStarted(bool started) => typeof(PlatformRabbitMqProcessInitializerService)
            .GetProperty(nameof(PlatformRabbitMqProcessInitializerService.IsStarted))!.SetValue(initializer, started);

        public Task Declare() => (Task)typeof(PlatformRabbitMqProcessInitializerService)
            .GetMethod("DeclareQueueForConsumer", BindingFlags.Instance | BindingFlags.NonPublic)!
            .Invoke(initializer, [PlatformBusMessageRoutingKey.New("test.context.message")])!;

        public void Publish(Func<ReadOnlyMemory<byte>, CancellationToken, Task> publish) =>
            Channel.Setup(channel => channel.BasicPublishAsync(It.IsAny<string>(), It.IsAny<string>(), false,
                    It.IsAny<BasicProperties>(), It.IsAny<ReadOnlyMemory<byte>>(), It.IsAny<CancellationToken>()))
                .Returns((string _, string _, bool _, BasicProperties _, ReadOnlyMemory<byte> body, CancellationToken token) => new ValueTask(publish(body, token)));

        public void Dispose()
        {
            initializer.Dispose();
            producerPool.Dispose();
            consumerPool.Dispose();
        }
    }

    private sealed class RecordingPolicy(IChannel channel) : PooledObjectPolicy<IChannel>
    {
        public int Created { get; private set; }
        public int Returned { get; private set; }
        public Action? OnCreate { get; set; }
        public IChannel? NextChannel { get; set; }
        public override IChannel Create()
        {
            Created++;
            OnCreate?.Invoke();
            return Created > 1 ? NextChannel ?? channel : channel;
        }
        public override bool Return(IChannel value)
        {
            Returned++;
            return value.CloseReason == null;
        }
    }

    private sealed class TestProducerPool : PlatformProducerRabbitMqChannelPool
    {
        public TestProducerPool(PlatformRabbitMqOptions options, RecordingPolicy policy) : base(options)
        {
            InternalObjectPool = new DefaultObjectPool<IChannel>(policy);
        }
    }

    private sealed class TestConsumerPool : PlatformConsumerRabbitMqChannelPool
    {
        public TestConsumerPool(PlatformRabbitMqOptions options, IPlatformMessageBusScanner scanner, RecordingPolicy policy) : base(options, scanner)
        {
            InternalObjectPool = new DefaultObjectPool<IChannel>(policy);
        }
    }

    public sealed class TransportMessage { public string Value { get; set; } = string.Empty; }

    public sealed class CountingMessage
    {
        [System.Text.Json.Serialization.JsonIgnore]
        public Action? OnRead { get; set; }
        [System.Text.Json.Serialization.JsonIgnore]
        public int GetterCalls { get; private set; }
        public string Value
        {
            get { GetterCalls++; OnRead?.Invoke(); return "wire-value"; }
        }
    }
}
