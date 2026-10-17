using System.Text;
using System.Text.Json;
using Easy.Platform.Application;
using Easy.Platform.Common;
using Easy.Platform.Infrastructures.MessageBus;
using Easy.Platform.RabbitMQ;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Easy.Platform.Tests.Unit.Common;

public class PlatformRabbitMqMalformedMessageRecoveryTests
{
    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-RECOVERY-002")]
    public async Task OriginalDelivery_IsAcknowledgedOnlyAfterConfirmedParking()
    {
        using var fixture = new RecoveryFixture();
        var confirmation = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var publishing = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        fixture.Publish(async (_, token) =>
        {
            publishing.SetResult();
            await confirmation.Task.WaitAsync(token);
        });

        var recovery = fixture.Recover();
        await publishing.Task.WaitAsync(TimeSpan.FromSeconds(5));
        fixture.Original.Verify(channel => channel.BasicAckAsync(It.IsAny<ulong>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never);
        confirmation.SetResult();
        await recovery;

        fixture.Original.Verify(channel => channel.BasicAckAsync(42, false, It.IsAny<CancellationToken>()), Times.Once);
        fixture.NoReject();
        fixture.Publisher.Verify(channel => channel.DisposeAsync(), Times.Once);
        fixture.Connection.Verify(connection => connection.DisposeAsync(), Times.Once);
        fixture.OptionsCaptured!.PublisherConfirmationsEnabled.Should().BeTrue();
        fixture.OptionsCaptured.PublisherConfirmationTrackingEnabled.Should().BeTrue();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-RECOVERY-003")]
    public async Task Parking_PreservesBytesAndReplayMetadataWithoutExpirationOrInputMutation()
    {
        using var fixture = new RecoveryFixture();
        var originalHeaders = new Dictionary<string, object?> { ["business-header"] = "original" };
        var properties = new BasicProperties
        {
            Headers = originalHeaders,
            Expiration = "1",
            UserId = "original-user",
            MessageId = "message-id",
            ContentType = "application/json"
        };
        var bytes = Encoding.UTF8.GetBytes("{unreadable-token-canary}");
        var delivery = Delivery(bytes, properties);
        BasicProperties? parked = null;
        ReadOnlyMemory<byte> parkedBody = default;
        fixture.Publisher.Setup(channel => channel.BasicPublishAsync("", It.IsAny<string>(), true,
                It.IsAny<BasicProperties>(), It.IsAny<ReadOnlyMemory<byte>>(), It.IsAny<CancellationToken>()))
            .Callback((string _, string _, bool _, BasicProperties copy, ReadOnlyMemory<byte> body, CancellationToken _) =>
            {
                parked = copy;
                parkedBody = body;
            }).Returns(ValueTask.CompletedTask);

        await fixture.Recovery.RecoverAsync("source-queue", fixture.Original.Object, delivery, typeof(JsonException), CancellationToken.None);

        parkedBody.ToArray().Should().Equal(bytes);
        parked!.Persistent.Should().BeTrue();
        parked.Expiration.Should().BeNull();
        parked.UserId.Should().BeNull();
        parked.MessageId.Should().Be("message-id");
        parked.ContentType.Should().Be("application/json");
        parked.Headers![PlatformRabbitMqMalformedMessageRecovery.SourceQueueHeader].Should().Be("source-queue");
        parked.Headers[PlatformRabbitMqMalformedMessageRecovery.SourceExchangeHeader].Should().Be("source-exchange");
        parked.Headers[PlatformRabbitMqMalformedMessageRecovery.SourceRoutingKeyHeader].Should().Be("Event.Test.Payload");
        parked.Headers[PlatformRabbitMqMalformedMessageRecovery.SourceExpirationHeader].Should().Be("1");
        parked.Headers[PlatformRabbitMqMalformedMessageRecovery.SourceUserIdHeader].Should().Be("original-user");
        parked.Headers.Should().NotBeSameAs(originalHeaders);
        originalHeaders.Should().ContainSingle().Which.Key.Should().Be("business-header");
        properties.Expiration.Should().Be("1");
        properties.UserId.Should().Be("original-user");
        fixture.Logger.Messages.Should().NotContain(message => message.Contains("token-canary", StringComparison.Ordinal));
        fixture.QueueArguments!["x-max-length"].Should().Be(fixture.Options.MalformedMessageQueueMaxMessageCount);
        fixture.QueueArguments["x-max-length-bytes"].Should().Be(fixture.Options.MalformedMessageQueueMaxLengthBytes);
        fixture.QueueArguments["x-overflow"].Should().Be("reject-publish");
        fixture.QueueArguments.Should().NotContainKey("x-expires").And.NotContainKey("x-message-ttl");
        fixture.NoReject();
    }

    [Theory]
    [InlineData(false, 5)]
    [InlineData(false, 0)]
    [InlineData(true, 120)]
    [InlineData(false, double.NaN)]
    [InlineData(false, double.PositiveInfinity)]
    [Trait("TechnicalSpec", "TC-RMQ-RECOVERY-002")]
    public async Task ParkingFailure_RequeuesOnlyThisDeliveryAndDisposesResources(bool failDeclaration, double configuredDelaySeconds)
    {
        using var fixture = new RecoveryFixture();
        fixture.Options.RequeueDelayTimeInSeconds = configuredDelaySeconds;
        if (failDeclaration)
            fixture.DeclareFailure(new IOException("sensitive-declaration-canary"));
        else
            fixture.Publish((_, _) => Task.FromException(new IOException("sensitive-publish-canary")));

        await fixture.Recover();

        fixture.Original.Verify(channel => channel.BasicAckAsync(It.IsAny<ulong>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never);
        fixture.Original.Verify(channel => channel.BasicNackAsync(42, false, true, It.IsAny<CancellationToken>()), Times.Once);
        fixture.Recovery.Delays.Should().ContainSingle().Which.Should().BeGreaterThanOrEqualTo(TimeSpan.FromSeconds(1))
            .And.BeLessThanOrEqualTo(TimeSpan.FromSeconds(60));
        fixture.Publisher.Verify(channel => channel.DisposeAsync(), Times.Once);
        fixture.Connection.Verify(connection => connection.DisposeAsync(), Times.Once);
        fixture.Logger.Messages.Should().NotContain(message => message.Contains("canary", StringComparison.Ordinal));
        fixture.NoReject();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-RECOVERY-002")]
    public async Task CancellationDuringPublication_LeavesOriginalUnacknowledged()
    {
        using var fixture = new RecoveryFixture();
        using var cancellation = new CancellationTokenSource();
        var publishing = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        fixture.Publish(async (_, token) =>
        {
            publishing.SetResult();
            await Task.Delay(Timeout.InfiniteTimeSpan, token);
        });

        var recovery = fixture.Recover(cancellation.Token);
        await publishing.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await cancellation.CancelAsync();
        await recovery;

        fixture.NoDeliveryDisposition();
        fixture.Publisher.Verify(channel => channel.DisposeAsync(), Times.Once);
        fixture.Connection.Verify(connection => connection.DisposeAsync(), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-RECOVERY-002")]
    public async Task RecoveryShutdown_CancelsPublicationAndRetainsOriginal()
    {
        using var fixture = new RecoveryFixture();
        var publishing = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        fixture.Publish(async (_, token) =>
        {
            publishing.SetResult();
            await Task.Delay(Timeout.InfiniteTimeSpan, token);
        });
        var recovery = fixture.Recover();
        await publishing.Task.WaitAsync(TimeSpan.FromSeconds(5));

        fixture.Recovery.Dispose();
        await recovery;

        fixture.NoDeliveryDisposition();
        fixture.Connection.Verify(connection => connection.DisposeAsync(), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-RECOVERY-003")]
    public async Task RecoveryDeadline_IncludesWaitingForTheSerializedPublisher()
    {
        using var fixture = new RecoveryFixture();
        var confirmation = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var publishing = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        fixture.Publish(async (_, token) =>
        {
            publishing.SetResult();
            await confirmation.Task.WaitAsync(token);
        });
        var first = fixture.Recover();
        await publishing.Task.WaitAsync(TimeSpan.FromSeconds(5));
        fixture.Options.MalformedMessageRecoveryTimeoutSeconds = 0.05;

        await fixture.Recovery.RecoverAsync("source-queue", fixture.Original.Object,
            Delivery(Encoding.UTF8.GetBytes("null"), deliveryTag: 43), typeof(JsonException), CancellationToken.None).WaitAsync(TimeSpan.FromSeconds(5));

        fixture.Connection.Verify(connection => connection.CreateChannelAsync(It.IsAny<CreateChannelOptions>(), It.IsAny<CancellationToken>()), Times.Once);
        fixture.Original.Verify(channel => channel.BasicNackAsync(43, false, true, It.IsAny<CancellationToken>()), Times.Once);
        confirmation.SetResult();
        await first;
        fixture.Original.Verify(channel => channel.BasicAckAsync(42, false, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-RECOVERY-002")]
    public async Task AckFailureAfterConfirmation_DoesNotRejectOrRepublishTheDurableCopy()
    {
        using var fixture = new RecoveryFixture();
        fixture.Original.Setup(channel => channel.BasicAckAsync(It.IsAny<ulong>(), false, It.IsAny<CancellationToken>()))
            .Returns(new ValueTask(Task.FromException(new IOException("channel closed"))));

        await fixture.Recover();

        fixture.Publisher.Verify(channel => channel.BasicPublishAsync("", It.IsAny<string>(), true,
            It.IsAny<BasicProperties>(), It.IsAny<ReadOnlyMemory<byte>>(), It.IsAny<CancellationToken>()), Times.Once);
        fixture.NoReject();
        fixture.Original.Verify(channel => channel.BasicNackAsync(It.IsAny<ulong>(), It.IsAny<bool>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never);
        fixture.Connection.Verify(connection => connection.DisposeAsync(), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-RECOVERY-002")]
    public async Task ClosedOriginalChannel_OnParkingFailureRetainsDeliveryWithoutDisposition()
    {
        using var fixture = new RecoveryFixture();
        fixture.Original.SetupGet(channel => channel.IsOpen).Returns(false);
        fixture.DeclareFailure(new IOException("broker unavailable"));

        await fixture.Recover();

        fixture.NoDeliveryDisposition();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-RECOVERY-003")]
    public async Task PublisherCleanupFailure_DoesNotUndoConfirmedParking()
    {
        using var fixture = new RecoveryFixture();
        fixture.Publisher.Setup(channel => channel.DisposeAsync()).Returns(new ValueTask(Task.FromException(new IOException("close failed"))));

        await fixture.Recover();

        fixture.Original.Verify(channel => channel.BasicAckAsync(42, false, It.IsAny<CancellationToken>()), Times.Once);
        fixture.NoReject();
        fixture.Publisher.Verify(channel => channel.DisposeAsync(), Times.Once);
        fixture.Connection.Verify(connection => connection.DisposeAsync(), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-RECOVERY-003")]
    public async Task ChannelCreationFailure_ReleasesOwnedConnectionAndRecoverySlot()
    {
        using var fixture = new RecoveryFixture();
        fixture.Connection.Setup(connection => connection.CreateChannelAsync(It.IsAny<CreateChannelOptions>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new IOException("channel unavailable"));

        await fixture.Recover();

        fixture.Connection.Verify(connection => connection.DisposeAsync(), Times.Once);
        fixture.Publisher.Verify(channel => channel.DisposeAsync(), Times.Never);
        fixture.Original.Verify(channel => channel.BasicNackAsync(42, false, true, It.IsAny<CancellationToken>()), Times.Once);
        fixture.NoReject();
    }

    [Theory]
    [InlineData("")]
    [InlineData("source-queue")]
    [InlineData("đường-dẫn-🔒")]
    [Trait("TechnicalSpec", "TC-RMQ-RECOVERY-003")]
    public void ParkingQueueIdentity_IsStableBoundedAndSourceSpecific(string source)
    {
        source += new string('界', 500);
        var name = PlatformRabbitMqMalformedMessageRecovery.GetParkingQueueName(source);

        Encoding.UTF8.GetByteCount(name).Should().BeLessThan(255);
        name.Should().Be(PlatformRabbitMqMalformedMessageRecovery.GetParkingQueueName(source));
        name.Should().NotBe(PlatformRabbitMqMalformedMessageRecovery.GetParkingQueueName(source + "other"));
    }

    [Theory]
    [InlineData(0, 1, 1)]
    [InlineData(-1, 1, 1)]
    [InlineData(1, 0, 1)]
    [InlineData(1, -1, 1)]
    [InlineData(1, 1, 0)]
    [InlineData(1, 1, -1)]
    [InlineData(1, 1, 301)]
    [InlineData(1, 1, double.NaN)]
    [InlineData(1, 1, double.PositiveInfinity)]
    [Trait("TechnicalSpec", "TC-RMQ-RECOVERY-003")]
    public void RecoveryConfiguration_RejectsUnboundedOrInvalidBudgets(int count, long bytes, double seconds)
    {
        var options = Options();
        options.MalformedMessageQueueMaxMessageCount = count;
        options.MalformedMessageQueueMaxLengthBytes = bytes;
        options.MalformedMessageRecoveryTimeoutSeconds = seconds;

        Action create = () =>
        {
            using var recovery = new PlatformRabbitMqMalformedMessageRecovery(options, NullLogger.Instance);
        };

        create.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Theory]
    [InlineData("{bad", false)]
    [InlineData("null", false)]
    [InlineData("{\"Value\":\"text\"}", true)]
    [Trait("TechnicalSpec", "TC-RMQ-RECOVERY-001")]
    public async Task InvalidDelivery_ParksOnceAndRunsNoSelectedConsumer(string body, bool mixedContracts)
    {
        using var fixture = new RecoveryFixture();
        var first = new FirstConsumer();
        var second = new IncompatibleConsumer();
        using var initializer = new TestInitializer(fixture, mixedContracts ? [first, second] : [first]);

        await initializer.Transfer(fixture.Original.Object, Delivery(Encoding.UTF8.GetBytes(body)));

        initializer.RecoveryCalls.Should().Be(1);
        first.Calls.Should().Be(0);
        second.Calls.Should().Be(0);
        fixture.Original.Verify(channel => channel.BasicAckAsync(42, false, It.IsAny<CancellationToken>()), Times.Once);
        fixture.NoReject();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-RECOVERY-001")]
    public async Task ParkingFailure_ThroughRealTransferNeverFallsIntoDestructiveReject()
    {
        using var fixture = new RecoveryFixture();
        fixture.DeclareFailure(new IOException("permission denied"));
        var consumer = new FirstConsumer();
        using var initializer = new TestInitializer(fixture, [consumer]);

        await initializer.Transfer(fixture.Original.Object, Delivery(Encoding.UTF8.GetBytes("null")));

        consumer.Calls.Should().Be(0);
        fixture.Original.Verify(channel => channel.BasicAckAsync(It.IsAny<ulong>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never);
        fixture.Original.Verify(channel => channel.BasicNackAsync(42, false, true, It.IsAny<CancellationToken>()), Times.Once);
        fixture.NoReject();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-RECOVERY-001")]
    public async Task ValidDelivery_RunsAllConsumersWithIndependentTypedCopiesAndOwnedBody()
    {
        using var fixture = new RecoveryFixture();
        var first = new FirstConsumer();
        var second = new SecondConsumer();
        using var initializer = new TestInitializer(fixture, [first, second]);
        var acknowledged = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        fixture.Original.Setup(channel => channel.BasicAckAsync(42, false, It.IsAny<CancellationToken>()))
            .Callback(() => acknowledged.SetResult()).Returns(ValueTask.CompletedTask);

        var bytes = Encoding.UTF8.GetBytes("{\"Value\":\"valid\"}");
        await initializer.Transfer(fixture.Original.Object, Delivery(bytes));
        await acknowledged.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await initializer.ConsumersCompleted.WaitAsync(TimeSpan.FromSeconds(5));

        first.Calls.Should().Be(1);
        second.Calls.Should().Be(1);
        first.Message!.Value.Should().Be("valid");
        second.Message!.Value.Should().Be("valid");
        first.Message.Should().NotBeSameAs(second.Message);
        bytes.AsSpan().Fill((byte)'X'); // The SDK can release/reuse its input memory after ReceivedAsync returns.
        initializer.BackgroundDelivery!.Body.ToArray().Should().Equal(Encoding.UTF8.GetBytes("{\"Value\":\"valid\"}"));
        initializer.RecoveryCalls.Should().Be(0);
        fixture.NoReject();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-RECOVERY-001")]
    public async Task NoSelectedConsumer_PreservesExistingAcknowledgementContract()
    {
        using var fixture = new RecoveryFixture();
        using var initializer = new TestInitializer(fixture, []);
        var acknowledged = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        fixture.Original.Setup(channel => channel.BasicAckAsync(42, false, It.IsAny<CancellationToken>()))
            .Callback(() => acknowledged.SetResult()).Returns(ValueTask.CompletedTask);

        await initializer.Transfer(fixture.Original.Object, Delivery(Encoding.UTF8.GetBytes("null")));
        await acknowledged.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await initializer.ConsumersCompleted.WaitAsync(TimeSpan.FromSeconds(5));

        initializer.RecoveryCalls.Should().Be(0);
        fixture.NoReject();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-RECOVERY-001")]
    public async Task CancelledTransfer_DoesNotParkConsumeOrAcknowledge()
    {
        using var fixture = new RecoveryFixture();
        var consumer = new FirstConsumer();
        using var initializer = new TestInitializer(fixture, [consumer]);
        initializer.SetCancellation(new CancellationToken(true));

        await initializer.Transfer(fixture.Original.Object, Delivery(Encoding.UTF8.GetBytes("null")));

        consumer.Calls.Should().Be(0);
        initializer.RecoveryCalls.Should().Be(0);
        fixture.NoDeliveryDisposition();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-RECOVERY-001")]
    public async Task CancellationDuringConsumerExecution_LeavesDeliveryForReplay()
    {
        using var fixture = new RecoveryFixture();
        using var cancellation = new CancellationTokenSource();
        var consumer = new FirstConsumer { OnHandled = cancellation.Cancel };
        using var initializer = new TestInitializer(fixture, [consumer]);
        initializer.SetCancellation(cancellation.Token);

        await initializer.Transfer(fixture.Original.Object, Delivery(Encoding.UTF8.GetBytes("{\"Value\":\"valid\"}")));
        await initializer.ConsumersCompleted.WaitAsync(TimeSpan.FromSeconds(5));

        consumer.Calls.Should().Be(1);
        fixture.NoDeliveryDisposition();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-RMQ-RECOVERY-001")]
    public async Task CancelledDelivery_WithLiveProcessTokenNeverSchedulesAcknowledgement()
    {
        using var fixture = new RecoveryFixture();
        using var deliveryCancellation = new CancellationTokenSource();
        var consumer = new FirstConsumer { OnHandled = deliveryCancellation.Cancel };
        using var initializer = new TestInitializer(fixture, [consumer]);
        var acknowledged = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        fixture.Original.Setup(channel => channel.BasicAckAsync(42, false, It.IsAny<CancellationToken>()))
            .Callback(() => acknowledged.TrySetResult()).Returns(ValueTask.CompletedTask);

        // A captured delivery can be cancelled while a new process epoch has a live ACK token.
        await initializer.ExecuteDelivery(consumer, fixture.Original.Object,
            Delivery(Encoding.UTF8.GetBytes("{\"Value\":\"valid\"}")), deliveryCancellation.Token);

        consumer.Calls.Should().Be(1);
        deliveryCancellation.IsCancellationRequested.Should().BeTrue();
        // There is no ACK-scheduled signal on the production path. Observe the external ACK boundary negatively
        // after fan-out completes; this budget detects an erroneous background ACK without retrying an assertion.
        await Assert.ThrowsAsync<TimeoutException>(() => acknowledged.Task.WaitAsync(TimeSpan.FromSeconds(1)));
        fixture.NoDeliveryDisposition();
    }

    public static PlatformRabbitMqOptions Options() => new()
    {
        HostNames = "localhost",
        Username = "fixture",
        Password = "fixture",
        MalformedMessageRecoveryTimeoutSeconds = 10
    };

    private static BasicDeliverEventArgs Delivery(byte[] body, IReadOnlyBasicProperties? properties = null, ulong deliveryTag = 42) =>
        new("consumer", deliveryTag, false, "source-exchange", "Event.Test.Payload", properties ?? new BasicProperties(), body);

    private sealed class RecoveryFixture : IDisposable
    {
        public PlatformRabbitMqOptions Options { get; } = PlatformRabbitMqMalformedMessageRecoveryTests.Options();
        public Mock<IChannel> Original { get; } = new();
        public Mock<IChannel> Publisher { get; } = new();
        public Mock<IConnection> Connection { get; } = new();
        public RecordingLogger Logger { get; } = new();
        public TestRecovery Recovery { get; }
        public CreateChannelOptions? OptionsCaptured { get; private set; }
        public IDictionary<string, object?>? QueueArguments { get; private set; }

        public RecoveryFixture()
        {
            Original.SetupGet(channel => channel.IsOpen).Returns(true);
            Connection.Setup(connection => connection.CreateChannelAsync(It.IsAny<CreateChannelOptions>(), It.IsAny<CancellationToken>()))
                .Callback((CreateChannelOptions options, CancellationToken _) => OptionsCaptured = options)
                .ReturnsAsync(Publisher.Object);
            Publisher.Setup(channel => channel.QueueDeclareAsync(It.IsAny<string>(), true, false, false,
                    It.IsAny<IDictionary<string, object?>>(), false, false, It.IsAny<CancellationToken>()))
                .Callback((string _, bool _, bool _, bool _, IDictionary<string, object?> arguments, bool _, bool _, CancellationToken _) => QueueArguments = arguments)
                .ReturnsAsync(new QueueDeclareOk("parking", 0, 0));
            Publish((_, _) => Task.CompletedTask);
            Recovery = new TestRecovery(Options, Logger, _ => Task.FromResult(Connection.Object));
        }

        public void Publish(Func<ReadOnlyMemory<byte>, CancellationToken, Task> publish) =>
            Publisher.Setup(channel => channel.BasicPublishAsync("", It.IsAny<string>(), true,
                    It.IsAny<BasicProperties>(), It.IsAny<ReadOnlyMemory<byte>>(), It.IsAny<CancellationToken>()))
                .Returns((string _, string _, bool _, BasicProperties _, ReadOnlyMemory<byte> body, CancellationToken token) => new ValueTask(publish(body, token)));

        public void DeclareFailure(Exception error) =>
            Publisher.Setup(channel => channel.QueueDeclareAsync(It.IsAny<string>(), true, false, false,
                    It.IsAny<IDictionary<string, object?>>(), false, false, It.IsAny<CancellationToken>()))
                .ThrowsAsync(error);

        public Task Recover(CancellationToken cancellationToken = default) => Recovery.RecoverAsync("source-queue", Original.Object,
            Delivery(Encoding.UTF8.GetBytes("null")), typeof(JsonException), cancellationToken);

        public void NoReject() => Original.Verify(channel => channel.BasicRejectAsync(It.IsAny<ulong>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never);
        public void NoDeliveryDisposition()
        {
            NoReject();
            Original.Verify(channel => channel.BasicAckAsync(It.IsAny<ulong>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never);
            Original.Verify(channel => channel.BasicNackAsync(It.IsAny<ulong>(), It.IsAny<bool>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never);
        }
        public void Dispose() => Recovery.Dispose();
    }

    private sealed class TestRecovery(PlatformRabbitMqOptions options, ILogger logger, Func<CancellationToken, Task<IConnection>> createConnection)
        : PlatformRabbitMqMalformedMessageRecovery(options, logger)
    {
        public List<TimeSpan> Delays { get; } = [];
        protected override Task<IConnection> CreateConnectionAsync(CancellationToken cancellationToken) => createConnection(cancellationToken);
        protected override Task WaitBeforeRequeueAsync(TimeSpan delay, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            Delays.Add(delay);
            return Task.CompletedTask;
        }
    }

    private sealed class TestInitializer : PlatformRabbitMqProcessInitializerService
    {
        private readonly RecoveryFixture fixture;
        private readonly ServiceProvider provider;
        private readonly TaskCompletionSource consumersCompleted = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public int RecoveryCalls { get; private set; }
        public Task ConsumersCompleted => consumersCompleted.Task;
        public BasicDeliverEventArgs? BackgroundDelivery { get; private set; }

        public TestInitializer(RecoveryFixture fixture, IPlatformMessageBusConsumer[] consumers)
            : this(fixture, CreateProvider(consumers), consumers) { }

        private TestInitializer(RecoveryFixture fixture, ServiceProvider provider, IPlatformMessageBusConsumer[] consumers)
            : base(provider.GetRequiredService<IPlatformApplicationSettingContext>(), Mock.Of<IPlatformRabbitMqExchangeProvider>(),
                Scanner(consumers), null!, fixture.Options, new PlatformMessageBusConfig(), null!, null!, null!, null!,
                NullLoggerFactory.Instance, Root(provider))
        {
            this.fixture = fixture;
            this.provider = provider;
            CheckAllModulesInitiatedToAllowConsumeMessages = true;
        }

        public Task Transfer(IChannel channel, BasicDeliverEventArgs delivery) => TransferMessageToAllMessageBusConsumers(channel, delivery, "source-queue");

        public Task ExecuteDelivery(FirstConsumer consumer, IChannel channel, BasicDeliverEventArgs delivery, CancellationToken token) =>
            ExecuteCanProcessMessageBusConsumers([new KeyValuePair<Type, object>(consumer.GetType(), new MessagePayload { Value = "valid" })],
                channel, delivery, token);

        public void SetCancellation(CancellationToken token) =>
            typeof(PlatformRabbitMqProcessInitializerService).GetField("currentStartProcessCancellationToken",
                System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.SetValue(this, token);

        protected override async Task ExecuteCanProcessMessageBusConsumers(List<KeyValuePair<Type, object>> canProcessConsumerTypeToBusMessagePairs, IChannel channel,
            BasicDeliverEventArgs rabbitMqMessageArgs, CancellationToken cancellationToken)
        {
            BackgroundDelivery = rabbitMqMessageArgs;
            try { await base.ExecuteCanProcessMessageBusConsumers(canProcessConsumerTypeToBusMessagePairs, channel, rabbitMqMessageArgs, cancellationToken); }
            finally { consumersCompleted.TrySetResult(); }
        }

        protected override Task RecoverMalformedMessageAsync(string sourceQueue, IChannel channel, BasicDeliverEventArgs delivery,
            Type failureType, CancellationToken cancellationToken)
        {
            RecoveryCalls++;
            return fixture.Recovery.RecoverAsync(sourceQueue, channel, delivery, failureType, cancellationToken);
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            if (disposing) provider.Dispose();
        }

        private static ServiceProvider CreateProvider(IPlatformMessageBusConsumer[] consumers)
        {
            var services = new ServiceCollection().AddSingleton(Mock.Of<IPlatformApplicationSettingContext>());
            foreach (var consumer in consumers) services.AddSingleton(consumer.GetType(), consumer);
            return services.BuildServiceProvider();
        }

        private static IPlatformMessageBusScanner Scanner(IPlatformMessageBusConsumer[] consumers)
        {
            var scanner = new Mock<IPlatformMessageBusScanner>();
            scanner.Setup(value => value.ScanAllDefinedConsumerTypes()).Returns(consumers.Select(value => value.GetType()).ToList());
            return scanner.Object;
        }

        private static IPlatformRootServiceProvider Root(ServiceProvider provider)
        {
            var root = new Mock<IPlatformRootServiceProvider>();
            root.Setup(value => value.GetService(It.IsAny<Type>())).Returns((Type type) => provider.GetService(type));
            return root.Object;
        }
    }

    public class MessagePayload { public string Value { get; set; } = ""; }
    public class IncompatiblePayload { public int Value { get; set; } }

    [PlatformConsumerRoutingKey("Event.Test.Payload")]
    public class FirstConsumer() : PlatformMessageBusConsumer<MessagePayload>(NullLoggerFactory.Instance)
    {
        public int Calls { get; private set; }
        public MessagePayload? Message { get; private set; }
        public Action? OnHandled { get; set; }
        public override Task HandleLogicAsync(MessagePayload message, string routingKey)
        {
            Calls++;
            Message = message;
            OnHandled?.Invoke();
            return Task.CompletedTask;
        }
    }

    [PlatformConsumerRoutingKey("Event.Test.Payload")]
    public class SecondConsumer : FirstConsumer;

    [PlatformConsumerRoutingKey("Event.Test.Payload")]
    public class IncompatibleConsumer() : PlatformMessageBusConsumer<IncompatiblePayload>(NullLoggerFactory.Instance)
    {
        public int Calls { get; private set; }
        public override Task HandleLogicAsync(IncompatiblePayload message, string routingKey)
        {
            Calls++;
            return Task.CompletedTask;
        }
    }

    private sealed class RecordingLogger : ILogger
    {
        public List<string> Messages { get; } = [];
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            lock (Messages) Messages.Add(formatter(state, exception));
        }
    }
}
