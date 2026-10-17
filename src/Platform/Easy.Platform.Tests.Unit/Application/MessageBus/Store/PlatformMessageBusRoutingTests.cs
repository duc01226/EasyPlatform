using System.Collections.Concurrent;
using System.Linq.Expressions;
using System.Reflection;
using Easy.Platform.Application;
using Easy.Platform.Application.MessageBus.Consumers;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Application.MessageBus.Producers;
using Easy.Platform.Application.MessageBus.Producers.CqrsEventProducers;
using Easy.Platform.Application.MessageBus.Store;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Common.BackgroundLock;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Easy.Platform.Persistence.Domain;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Easy.Platform.Tests.Unit.Application.MessageBus.Store;

/// <summary>
/// Executable proof for Phase 08 message-bus routing. The fixtures deliberately expose two logical stores and
/// register one of them as the legacy unqualified repository. A keyed path is correct only when it reaches the
/// explicitly selected repository and application lane, regardless of that unqualified registration.
/// </summary>
public sealed class PlatformMessageBusRoutingTests
{
    [Theory]
    [InlineData(false, false, false)]
    [InlineData(false, true, false)]
    [InlineData(true, false, false)]
    [InlineData(true, true, false)]
    [InlineData(false, false, true)]
    [InlineData(false, true, true)]
    [Trait("TechnicalSpec", "TC-MSG-LOAD-002")]
    public async Task ActiveSourceOutboxPersistenceFailure_EscapesWithoutRetryOrSaveCallback(bool isPseudo, bool failOnCreate, bool isEmptyAggregate)
    {
        var outbox = CreateOutboxRepository();
        var source = new Mock<IPlatformUnitOfWork>();
        source.Setup(unit => unit.IsPseudoTransactionUow()).Returns(isPseudo);
        var callbacks = new ConcurrentBag<Func<Task>>();
        source.SetupGet(unit => unit.OnSaveChangesCompletedActions).Returns(callbacks);
        using var sourceServices = new ServiceCollection().BuildServiceProvider();
        using var emptyAggregate = new PlatformAggregatedPersistenceUnitOfWork(Mock.Of<IPlatformRootServiceProvider>(), sourceServices, NullLoggerFactory.Instance);
        var activeSource = isEmptyAggregate ? emptyAggregate : source.Object;
        var manager = new Mock<IPlatformUnitOfWorkManager>();
        manager.Setup(unit => unit.TryGetCurrentOrCreatedActiveUow("active-source")).Returns(activeSource);
        outbox.Setup(repository => repository.UowManager()).Returns(manager.Object);
        var persistenceError = new InvalidOperationException("persistence failed");
        var read = outbox.Setup(repository => repository.FirstOrDefaultAsync(
            It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(), It.IsAny<CancellationToken>()));
        if (failOnCreate)
        {
            read.ReturnsAsync((PlatformOutboxBusMessage)null!);
            outbox.Setup(repository => repository.CreateAsync(It.IsAny<PlatformOutboxBusMessage>(), It.IsAny<bool>(),
                    It.IsAny<Action<PlatformCqrsEntityEvent>>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(persistenceError);
        }
        else
            read.ThrowsAsync(persistenceError);
        var transport = new Mock<IPlatformMessageBusProducer>();
        transport.Setup(producer => producer.SendAsync(It.IsAny<PlatformBusMessage<TestPayload>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("transport unavailable"));
        var config = new PlatformOutboxConfig();
        var helper = CreateOutboxHelper(config, transport.Object);
        using var cancellation = new CancellationTokenSource(TimeSpan.FromSeconds(5));

        Func<Task> send = () => helper.HandleSendingOutboxMessageAsync(
            new PlatformBusMessage<TestPayload> { TrackingId = "active-message", Payload = new TestPayload() },
            "Event.Test.Payload", 1, null!, true, false, sourceOutboxUowId: "active-source", cancellationToken: cancellation.Token,
            outboxBusMessageRepositoryFactory: _ => outbox.Object, selectedOutboxConfig: config);

        (await send.Should().ThrowAsync<InvalidOperationException>()).Which.Should().BeSameAs(persistenceError);
        outbox.Verify(repository => repository.FirstOrDefaultAsync(It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(),
            It.IsAny<CancellationToken>()), Times.Once, "the active source scope cannot be repaired by prolonged same-scope retry");
        activeSource.OnSaveChangesCompletedActions.Should().BeEmpty("a failed outbox write cannot register dispatch after save");
        transport.Verify(producer => producer.SendAsync(It.IsAny<PlatformBusMessage<TestPayload>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            isPseudo ? Times.Once() : Times.Never());
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-MSG-LOAD-002")]
    public async Task IndependentOutboxPersistence_StillRetriesTransientFailure()
    {
        var outbox = CreateOutboxRepository();
        outbox.SetupSequence(repository => repository.FirstOrDefaultAsync(
                It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("temporary persistence fault"))
            .ReturnsAsync(new PlatformOutboxBusMessage { SendStatus = PlatformOutboxBusMessage.SendStatuses.Processed });
        var transport = new Mock<IPlatformMessageBusProducer>();
        transport.Setup(producer => producer.SendAsync(It.IsAny<PlatformBusMessage<TestPayload>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("transport unavailable"));
        var config = new PlatformOutboxConfig();
        var helper = CreateOutboxHelper(config, transport.Object);
        using var cancellation = new CancellationTokenSource(TimeSpan.FromSeconds(10));

        await helper.HandleSendingOutboxMessageAsync(
            new PlatformBusMessage<TestPayload> { TrackingId = "independent-message", Payload = new TestPayload() },
            "Event.Test.Payload", 1, null!, true, false, cancellationToken: cancellation.Token,
            outboxBusMessageRepositoryFactory: _ => outbox.Object, selectedOutboxConfig: config);

        outbox.Verify(repository => repository.FirstOrDefaultAsync(It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(),
            It.IsAny<CancellationToken>()), Times.Exactly(2));
        outbox.Verify(repository => repository.CreateAsync(It.IsAny<PlatformOutboxBusMessage>(), It.IsAny<bool>(),
            It.IsAny<Action<PlatformCqrsEntityEvent>>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-ROUTE-101")]
    public async Task KeyedProducer_UsesSelectedLaneIdentity_AndSelectedOutboxRepositoryAndUow()
    {
        var outboxA = CreateOutboxRepository();
        var outboxB = CreateOutboxRepository();
        var registry = CreateTwoStoreRegistry(
            CreateInboxRepository().Object,
            CreateInboxRepository().Object,
            outboxA.Object,
            outboxB.Object);

        var capturedMessage = (PlatformBusMessage<TestPayload>)null!;
        var messageBusProducer = new Mock<IPlatformMessageBusProducer>();
        messageBusProducer
            .Setup(producer => producer.SendAsync(
                It.IsAny<PlatformBusMessage<TestPayload>>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((PlatformBusMessage<TestPayload> message, string _, CancellationToken _) =>
            {
                capturedMessage = message;
                return message;
            });

        var services = new ServiceCollection();
        services.AddSingleton<IPlatformMessageBusStoreRegistry>(registry);
        services.AddSingleton<IPlatformMessageBusProducer>(messageBusProducer.Object);
        using var serviceProvider = services.BuildServiceProvider();

        var applicationSettingContext = new Mock<IPlatformApplicationSettingContext>();
        applicationSettingContext.SetupGet(context => context.ApplicationName).Returns("LegacyHost");
        var requestContext = new Mock<IPlatformApplicationRequestContext>();
        requestContext.Setup(context => context.GetAllKeyValues()).Returns(new Dictionary<string, object?>());
        var requestContextAccessor = new Mock<IPlatformApplicationRequestContextAccessor>();
        requestContextAccessor.SetupGet(accessor => accessor.Current).Returns(requestContext.Object);

        var producer = new PlatformApplicationBusMessageProducer(
            serviceProvider,
            NullLoggerFactory.Instance,
            applicationSettingContext.Object,
            requestContextAccessor.Object,
            new PlatformOutboxConfig(),
            new Mock<IPlatformUnitOfWorkManager>().Object);

        var keyedProducer = producer.Should().BeAssignableTo<IPlatformKeyedApplicationBusMessageProducer>().Subject;
        var result = await keyedProducer.SendAsync<PlatformBusMessage<TestPayload>, TestPayload>(
            new PlatformMessageBusStoreKey("Store-A"),
            "route-track-id",
            new TestPayload(),
            applicationName: "Lane-A",
            forceUseDefaultRoutingKey: false,
            autoSaveOutboxMessage: false);

        result.Should().BeSameAs(capturedMessage);
        capturedMessage.ProduceFrom.Should().Be("Lane-A");
        capturedMessage.RoutingKey().ProducerContext.Should().Be("Lane-A");
        capturedMessage.RoutingKey().MessageType.Should().Be(nameof(TestPayload));
        producer.HasOutboxMessageSupport(new PlatformMessageBusStoreKey("Store-A"), "Lane-A").Should().BeTrue();
        outboxA.Verify(repository => repository.UowManager(), Times.AtLeastOnce);
        outboxB.Verify(repository => repository.UowManager(), Times.Never);

        // A source aggregate can publish before its first provider is initialized. It must stage the outbox
        // and wait for SaveChanges rather than treating the empty provider set as an immediately committed UoW.
        using var sourceUow = new PlatformAggregatedPersistenceUnitOfWork(Mock.Of<IPlatformRootServiceProvider>(), serviceProvider, NullLoggerFactory.Instance)
        {
            Id = "source-uow-a"
        };
        var selectedUowManager = new Mock<IPlatformUnitOfWorkManager>();
        selectedUowManager
            .Setup(manager => manager.TryGetCurrentOrCreatedActiveUow("source-uow-a"))
            .Returns(sourceUow);
        outboxA.Setup(repository => repository.UowManager()).Returns(selectedUowManager.Object);

        var helper = CreateOutboxHelper(new PlatformOutboxConfig(), messageBusProducer.Object);
        outboxA
            .Setup(repository => repository.FirstOrDefaultAsync(
                It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((PlatformOutboxBusMessage)null!);
        outboxA
            .Setup(repository => repository.CreateAsync(
                It.IsAny<PlatformOutboxBusMessage>(),
                It.IsAny<bool>(),
                It.IsAny<Action<PlatformCqrsEntityEvent>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((PlatformOutboxBusMessage message, bool _, Action<PlatformCqrsEntityEvent> _, CancellationToken _) => message);

        await helper.HandleSendingOutboxMessageAsync(
            new PlatformBusMessage<TestPayload> { Payload = new TestPayload() },
            "Event.Lane-A.Test",
            retryProcessFailedMessageInSecondsUnit: 1,
            subQueueMessageIdPrefix: null,
            needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage: true,
            autoDeleteProcessedMessage: false,
            sourceOutboxUowId: "source-uow-a",
            cancellationToken: CancellationToken.None,
            outboxBusMessageRepositoryFactory: _ => outboxA.Object,
            selectedOutboxConfig: new PlatformOutboxConfig());

        outboxA.Verify(
            repository => repository.CreateAsync(
                It.IsAny<PlatformOutboxBusMessage>(),
                It.IsAny<bool>(),
                It.IsAny<Action<PlatformCqrsEntityEvent>>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
        outboxB.Verify(
            repository => repository.CreateAsync(
                It.IsAny<PlatformOutboxBusMessage>(),
                It.IsAny<bool>(),
                It.IsAny<Action<PlatformCqrsEntityEvent>>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
        selectedUowManager.Verify(manager => manager.TryGetCurrentOrCreatedActiveUow("source-uow-a"), Times.Once);
        sourceUow.OnSaveChangesCompletedActions.Should().ContainSingle("transport delivery must wait for the active source UoW to save");
        messageBusProducer.Verify(transport => transport.SendAsync(
            It.IsAny<PlatformBusMessage<TestPayload>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once,
            "only the earlier explicit autoSaveOutboxMessage:false send may reach the bus before the source commits");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-ROUTE-102")]
    public async Task Consumer_ResolvesLaneLazily_AndInboxCreateAndDuplicateCheckStayOnStoreB()
    {
        var inboxA = CreateInboxRepository();
        var inboxB = CreateInboxRepository();
        var registry = CreateTwoStoreRegistry(inboxA.Object, inboxB.Object, CreateOutboxRepository().Object, CreateOutboxRepository().Object);
        var applicationSettingContext = new Mock<IPlatformApplicationSettingContext>();
        applicationSettingContext.SetupGet(context => context.ApplicationName).Returns("LegacyHost");

        var requestContextAccessor = new Mock<IPlatformApplicationRequestContextAccessor>();
        requestContextAccessor.SetupGet(accessor => accessor.Current).Returns(Mock.Of<IPlatformApplicationRequestContext>());
        var rootServiceProvider = new Mock<IPlatformRootServiceProvider>();
        rootServiceProvider
            .Setup(provider => provider.GetService(typeof(IPlatformApplicationSettingContext)))
            .Returns(applicationSettingContext.Object);
        rootServiceProvider
            .Setup(provider => provider.GetService(typeof(IPlatformMessageBusStoreRegistry)))
            .Returns(registry);
        var consumerServices = new ServiceCollection();
        consumerServices.AddSingleton<IPlatformApplicationRequestContextAccessor>(requestContextAccessor.Object);
        consumerServices.AddSingleton<IPlatformInboxBusMessageRepository>(inboxA.Object);
        consumerServices.AddSingleton<IPlatformRootServiceProvider>(rootServiceProvider.Object);
        using var consumerServiceProvider = consumerServices.BuildServiceProvider();
        rootServiceProvider
            .Setup(provider => provider.GetService(typeof(IServiceScopeFactory)))
            .Returns(consumerServiceProvider.GetRequiredService<IServiceScopeFactory>());

        var routedConsumer = new TestRoutedConsumer(
            NullLoggerFactory.Instance,
            new Mock<IPlatformUnitOfWorkManager>().Object,
            consumerServiceProvider,
            rootServiceProvider.Object);

        rootServiceProvider.Verify(provider => provider.GetService(typeof(IPlatformMessageBusStoreRegistry)), Times.Never);
        routedConsumer.SelectedInboxRepository.Should().BeSameAs(inboxB.Object);
        routedConsumer.SelectedInboxConfig.MaxStoreProcessedMessageCount.Should().Be(202);
        routedConsumer.SelectedApplicationName.Should().Be("Lane-B");
        routedConsumer.PipelineRoute("routing-key", new TestInboxMessage()).Should().Contain("Lane-B");
        rootServiceProvider.Verify(provider => provider.GetService(typeof(IPlatformMessageBusStoreRegistry)), Times.Once);

        var persistedMessage = (PlatformInboxBusMessage)null!;
        var duplicateMessage = new PlatformBusMessage<TestPayload>
        {
            TrackingId = "duplicate-track-id",
            ProduceFrom = "Lane-A",
            Payload = new TestPayload()
        };
        var persistedDuplicate = PlatformInboxBusMessage.Create(
            duplicateMessage,
            duplicateMessage.TrackingId,
            duplicateMessage.ProduceFrom,
            "routing-key",
            typeof(TestInboxConsumer),
            PlatformInboxBusMessage.ConsumeStatuses.Processed,
            "Lane-B",
            null);
        var hasPersistedMessage = false;

        inboxB
            .Setup(repository => repository.FirstOrDefaultAsync(
                It.IsAny<Expression<Func<PlatformInboxBusMessage, bool>>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => hasPersistedMessage ? persistedDuplicate : null);
        inboxB
            .Setup(repository => repository.CreateImmediatelyAsync(
                It.IsAny<PlatformInboxBusMessage>(),
                It.IsAny<bool>(),
                It.IsAny<Action<PlatformCqrsEntityEvent>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((PlatformInboxBusMessage message, bool _, Action<PlatformCqrsEntityEvent> _, CancellationToken _) =>
            {
                persistedMessage = message;
                hasPersistedMessage = true;
                return message;
            });
        var currentConsumer = new Mock<IPlatformApplicationMessageBusConsumer<PlatformBusMessage<TestPayload>>>();
        currentConsumer
            .Setup(consumer => consumer.HandleAsync(It.IsAny<PlatformBusMessage<TestPayload>>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);
        currentConsumer.SetupGet(consumer => consumer.NeedStartIntervalPingInboxMessageProcessing).Returns(false);
        currentConsumer.SetupGet(consumer => consumer.HasErrorAndShouldNeverRetry).Returns(false);

        var inboxConfig = new PlatformInboxConfig();
        await PlatformInboxMessageBusConsumerHelper.HandleExecutingInboxConsumerAsync(
            rootServiceProvider.Object,
            consumerServiceProvider,
            typeof(TestInboxConsumer),
            inboxB.Object,
            inboxConfig,
            applicationSettingContext.Object,
            duplicateMessage,
            "Lane-B",
            "routing-key",
            () => NullLogger.Instance,
            retryProcessFailedMessageInSecondsUnit: 1,
            handleExistingInboxMessage: null,
            currentScopeConsumerInstance: currentConsumer.Object,
            handleInUow: null,
            subQueueMessageIdPrefix: null,
            autoDeleteProcessedMessageImmediately: true,
            needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage: false,
            allowHandleNewInboxMessageInBackground: false,
            allowTryConsumeMessageImmediatelyBeforeCreateInboxMessage: false,
            cancellationToken: CancellationToken.None,
            inboxBusMessageRepositoryFactory: _ => inboxB.Object);

        currentConsumer.Verify(consumer => consumer.HandleAsync(duplicateMessage, "routing-key"), Times.Once);
        inboxB.Verify(
            repository => repository.CreateImmediatelyAsync(
                It.IsAny<PlatformInboxBusMessage>(),
                It.IsAny<bool>(),
                It.IsAny<Action<PlatformCqrsEntityEvent>>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
        inboxA.Verify(
            repository => repository.CreateImmediatelyAsync(
                It.IsAny<PlatformInboxBusMessage>(),
                It.IsAny<bool>(),
                It.IsAny<Action<PlatformCqrsEntityEvent>>(),
                It.IsAny<CancellationToken>()),
            Times.Never);

        await PlatformInboxMessageBusConsumerHelper.HandleExecutingInboxConsumerAsync(
            rootServiceProvider.Object,
            consumerServiceProvider,
            typeof(TestInboxConsumer),
            inboxB.Object,
            inboxConfig,
            applicationSettingContext.Object,
            duplicateMessage,
            "Lane-B",
            "routing-key",
            () => NullLogger.Instance,
            retryProcessFailedMessageInSecondsUnit: 1,
            handleExistingInboxMessage: null,
            currentScopeConsumerInstance: currentConsumer.Object,
            handleInUow: null,
            subQueueMessageIdPrefix: null,
            autoDeleteProcessedMessageImmediately: true,
            needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage: false,
            allowHandleNewInboxMessageInBackground: false,
            allowTryConsumeMessageImmediatelyBeforeCreateInboxMessage: false,
            cancellationToken: CancellationToken.None,
            inboxBusMessageRepositoryFactory: _ => inboxB.Object);

        currentConsumer.Verify(consumer => consumer.HandleAsync(duplicateMessage, "routing-key"), Times.Once);
        inboxB.Verify(
            repository => repository.FirstOrDefaultAsync(
                It.IsAny<Expression<Func<PlatformInboxBusMessage, bool>>>(),
                It.IsAny<CancellationToken>()),
            Times.Exactly(2));

        persistedMessage.ForApplicationName.Should().Be("Lane-B");
        var laneFilter = PlatformInboxBusMessage.CanHandleMessagesExpr("Lane-B").Compile();
        laneFilter(persistedDuplicate).Should().BeFalse("a processed row is not eligible for duplicate execution");
        laneFilter(new PlatformInboxBusMessage
        {
            ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.New,
            ForApplicationName = "Lane-A"
        }).Should().BeFalse("a lane-B consumer must not claim lane-A work");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-ROUTE-103")]
    public async Task CqrsProducer_UsesKeyAndSourceUow_WhileMissingOrAmbiguousRoutesFailBeforeSend()
    {
        var keyedProducer = new RecordingApplicationBusProducer { OutboxSupport = true };
        using var serviceProvider = CreateCqrsServiceProvider(out var rootServiceProvider, out var applicationSettingContext);
        var cqrsProducer = new TestCqrsProducer(
            NullLoggerFactory.Instance,
            new Mock<IPlatformUnitOfWorkManager>().Object,
            serviceProvider,
            rootServiceProvider.Object,
            keyedProducer);

        cqrsProducer.HasSelectedOutboxSupport.Should().BeTrue();
        await cqrsProducer.SendForTest(new TestCqrsEvent { SourceUowId = "source-uow-b" });

        keyedProducer.KeyedSends.Should().ContainSingle();
        keyedProducer.KeyedSends[0].StoreKey.Should().Be(new PlatformMessageBusStoreKey("Store-B"));
        keyedProducer.KeyedSends[0].ApplicationName.Should().Be("Lane-B");
        keyedProducer.KeyedSends[0].SourceOutboxUowId.Should().Be("source-uow-b");
        applicationSettingContext.VerifyGet(context => context.ApplicationName, Times.Never);

        var outboxA = CreateOutboxRepository();
        var outboxB = CreateOutboxRepository();
        var twoStoreRegistry = CreateTwoStoreRegistry(
            CreateInboxRepository().Object,
            CreateInboxRepository().Object,
            outboxA.Object,
            outboxB.Object);
        var platformProducer = CreatePlatformProducer(twoStoreRegistry);

        var missingKey = new PlatformMessageBusStoreKey("Missing");
        var missingRoute = () => platformProducer.HasOutboxMessageSupport(missingKey, "Lane-Missing");
        missingRoute.Should().Throw<InvalidOperationException>().WithMessage("*No message-bus store is bound*");
        outboxA.Verify(repository => repository.UowManager(), Times.Never);
        outboxB.Verify(repository => repository.UowManager(), Times.Never);

        var sharedKey = new PlatformMessageBusStoreKey("Shared");
        var sharedRegistry = CreateAmbiguousRegistry(sharedKey);
        var ambiguousProducer = CreatePlatformProducer(sharedRegistry);
        var ambiguousRoute = () => ambiguousProducer.HasOutboxMessageSupport(sharedKey);
        ambiguousRoute.Should().Throw<InvalidOperationException>().WithMessage("*select one*");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-ROUTE-104")]
    public async Task LegacyProducerPath_RemainsUsableWithoutKeyedCapability()
    {
        var legacyProducer = new RecordingLegacyApplicationBusProducer();
        using var serviceProvider = CreateCqrsServiceProvider(out var rootServiceProvider, out _);
        var cqrsProducer = new TestCqrsProducer(
            NullLoggerFactory.Instance,
            new Mock<IPlatformUnitOfWorkManager>().Object,
            serviceProvider,
            rootServiceProvider.Object,
            legacyProducer);

        cqrsProducer.HasSelectedOutboxSupport.Should().BeTrue();
        await cqrsProducer.SendForTest(new TestCqrsEvent { SourceUowId = "legacy-uow" });

        legacyProducer.LegacySendCount.Should().Be(1);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-ROUTE-104")]
    public void ConcreteLegacyProducer_UsesLegacyDefaultRoute_AndRejectsStrictAmbiguity()
    {
        var key = new PlatformMessageBusStoreKey("Store-A");
        var singleStoreRegistry = new PlatformMessageBusStoreRegistry(
            [CreateApplicationLane(key, typeof(ApplicationLaneA), "Lane-A", 101)],
            [CreatePersistenceStore(
                key,
                typeof(PersistenceStoreA),
                typeof(DatabaseContextA),
                CreateInboxRepository().Object,
                CreateOutboxRepository().Object)],
            [new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneA), typeof(PersistenceStoreA))],
            isStrictCompositionValidationEnabled: true);

        CreatePlatformProducer(singleStoreRegistry)
            .HasOutboxMessageSupport()
            .Should()
            .BeTrue("the legacy overload must use the one compatible registered store instead of global DI order");

        var ambiguousProducer = CreatePlatformProducer(
            CreateTwoStoreRegistry(
                CreateInboxRepository().Object,
                CreateInboxRepository().Object,
                CreateOutboxRepository().Object,
                CreateOutboxRepository().Object));

        Func<bool> resolveAmbiguousLegacyRoute = ambiguousProducer.HasOutboxMessageSupport;
        resolveAmbiguousLegacyRoute
            .Should()
            .Throw<InvalidOperationException>()
            .WithMessage("*legacy message-bus store path is ambiguous*");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-ROUTE-105")]
    public async Task ExplicitHelperFactory_IsUsedByInboxAndOutboxCleanupPaths()
    {
        var inboxA = CreateInboxRepository();
        var inboxB = CreateInboxRepository();
        var outboxA = CreateOutboxRepository();
        var outboxB = CreateOutboxRepository();
        var services = new ServiceCollection();
        services.AddSingleton<IPlatformInboxBusMessageRepository>(inboxA.Object);
        using var serviceProvider = services.BuildServiceProvider();

        inboxB
            .Setup(repository => repository.DeleteManyAsync(
                It.IsAny<Expression<Func<PlatformInboxBusMessage, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Action<PlatformCqrsEntityEvent>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);
        await PlatformInboxMessageBusConsumerHelper.DeleteExistingInboxProcessedMessageAsync(
            serviceProvider,
            new PlatformInboxBusMessage { Id = "inbox-b" },
            () => NullLogger.Instance,
            inboxBusMessageRepositoryFactory: _ => inboxB.Object);

        var helper = CreateOutboxHelper(new PlatformOutboxConfig(), Mock.Of<IPlatformMessageBusProducer>());
        outboxB
            .Setup(repository => repository.DeleteManyAsync(
                It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Action<PlatformCqrsEntityEvent>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);
        await helper.DeleteExistingOutboxProcessedMessageAsync(
            serviceProvider,
            new PlatformOutboxBusMessage { Id = "outbox-b" },
            outboxBusMessageRepositoryFactory: _ => outboxB.Object);

        inboxB.Verify(
            repository => repository.DeleteManyAsync(
                It.IsAny<Expression<Func<PlatformInboxBusMessage, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Action<PlatformCqrsEntityEvent>>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
        outboxB.Verify(
            repository => repository.DeleteManyAsync(
                It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Action<PlatformCqrsEntityEvent>>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
        inboxA.Verify(
            repository => repository.DeleteManyAsync(
                It.IsAny<Expression<Func<PlatformInboxBusMessage, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Action<PlatformCqrsEntityEvent>>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
        outboxA.Verify(
            repository => repository.DeleteManyAsync(
                It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Action<PlatformCqrsEntityEvent>>(),
                It.IsAny<CancellationToken>()),
            Times.Never);

        var outboxSource = ReadRepositoryFile("src/Platform/Easy.Platform/Application/MessageBus/OutboxPattern/PlatformOutboxMessageBusProducerHelper.cs");
        var inboxSource = ReadRepositoryFile("src/Platform/Easy.Platform/Application/MessageBus/InboxPattern/PlatformInboxMessageBusConsumerHelper.cs");
        outboxSource.Should().Contain("Func<IServiceProvider, IPlatformOutboxBusMessageRepository> outboxBusMessageRepositoryFactory = null");
        outboxSource.Should().Contain("SendExistingOutboxMessageInNewScopeAsync(");
        outboxSource.Should().Contain("outboxBusMessageRepositoryFactory(scopedServiceProvider)");
        inboxSource.Should().Contain("Func<IServiceProvider, IPlatformInboxBusMessageRepository> inboxBusMessageRepositoryFactory = null");
        inboxSource.Should().Contain("inboxBusMessageRepositoryFactory(scopedServiceProvider)");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-ROUTE-106")]
    public void PlatformProducer_ExposesAdditiveKeyedCapability_WithoutChangingLegacyInterfaceShape()
    {
        var legacyMethods = typeof(IPlatformApplicationBusMessageProducer)
            .GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .OrderBy(method => method.Name, StringComparer.Ordinal)
            .ThenBy(method => method.GetParameters().Length)
            .ToArray();

        legacyMethods.Should().HaveCount(3);
        legacyMethods.Count(method => method.Name == nameof(IPlatformApplicationBusMessageProducer.HasOutboxMessageSupport))
            .Should()
            .Be(1);
        legacyMethods.Count(method => method.Name == nameof(IPlatformApplicationBusMessageProducer.SendAsync))
            .Should()
            .Be(2);
        legacyMethods.Where(method => method.Name == nameof(IPlatformApplicationBusMessageProducer.SendAsync))
            .Select(method => method.GetParameters().Length)
            .Should()
            .Equal(6, 8);
        typeof(PlatformApplicationBusMessageProducer)
            .Should()
            .BeAssignableTo<IPlatformKeyedApplicationBusMessageProducer>();

        var legacyOnly = new RecordingLegacyApplicationBusProducer();
        legacyOnly.Should().BeAssignableTo<IPlatformApplicationBusMessageProducer>();
        legacyOnly.Should().NotBeAssignableTo<IPlatformKeyedApplicationBusMessageProducer>();
    }

    private static Mock<IPlatformInboxBusMessageRepository> CreateInboxRepository()
    {
        var uowManager = new Mock<IPlatformUnitOfWorkManager>();
        uowManager.Setup(manager => manager.TryCurrentActiveUowSaveChangesAsync()).Returns(Task.CompletedTask);

        var repository = new Mock<IPlatformInboxBusMessageRepository>();
        repository.Setup(repository => repository.UowManager()).Returns(uowManager.Object);
        return repository;
    }

    private static Mock<IPlatformOutboxBusMessageRepository> CreateOutboxRepository()
    {
        var uowManager = new Mock<IPlatformUnitOfWorkManager>();
        uowManager.Setup(manager => manager.TryGetCurrentActiveUow()).Returns((IPlatformUnitOfWork)null!);

        var repository = new Mock<IPlatformOutboxBusMessageRepository>();
        repository.Setup(repository => repository.UowManager()).Returns(uowManager.Object);
        return repository;
    }

    private static PlatformMessageBusStoreRegistry CreateTwoStoreRegistry(
        IPlatformInboxBusMessageRepository inboxA,
        IPlatformInboxBusMessageRepository inboxB,
        IPlatformOutboxBusMessageRepository outboxA,
        IPlatformOutboxBusMessageRepository outboxB)
    {
        var keyA = new PlatformMessageBusStoreKey("Store-A");
        var keyB = new PlatformMessageBusStoreKey("Store-B");
        return new PlatformMessageBusStoreRegistry(
            [
                CreateApplicationLane(keyA, typeof(ApplicationLaneA), "Lane-A", 101),
                CreateApplicationLane(keyB, typeof(ApplicationLaneB), "Lane-B", 202)
            ],
            [
                CreatePersistenceStore(keyA, typeof(PersistenceStoreA), typeof(DatabaseContextA), inboxA, outboxA),
                CreatePersistenceStore(keyB, typeof(PersistenceStoreB), typeof(DatabaseContextB), inboxB, outboxB)
            ],
            [
                new PlatformMessageBusStoreBinding(keyA, typeof(ApplicationLaneA), typeof(PersistenceStoreA)),
                new PlatformMessageBusStoreBinding(keyB, typeof(ApplicationLaneB), typeof(PersistenceStoreB))
            ],
            isStrictCompositionValidationEnabled: true);
    }

    private static PlatformMessageBusStoreRegistry CreateAmbiguousRegistry(PlatformMessageBusStoreKey key)
    {
        var persistence = CreatePersistenceStore(
            key,
            typeof(PersistenceStoreA),
            typeof(DatabaseContextA),
            CreateInboxRepository().Object,
            CreateOutboxRepository().Object);
        return new PlatformMessageBusStoreRegistry(
            [
                CreateApplicationLane(key, typeof(ApplicationLaneA), "Lane-A", 101),
                CreateApplicationLane(key, typeof(ApplicationLaneB), "Lane-B", 202)
            ],
            [persistence],
            [
                new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneA), typeof(PersistenceStoreA)),
                new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneB), typeof(PersistenceStoreA))
            ],
            isStrictCompositionValidationEnabled: true);
    }

    private static PlatformMessageBusApplicationLaneRegistration CreateApplicationLane(
        PlatformMessageBusStoreKey key,
        Type moduleType,
        string applicationName,
        int configurationMarker)
    {
        return new PlatformMessageBusApplicationLaneRegistration(
            key,
            moduleType,
            applicationName,
            typeof(PlatformMessageBusRoutingTests).Assembly,
            _ => new PlatformInboxConfig { MaxStoreProcessedMessageCount = configurationMarker },
            _ => new PlatformOutboxConfig { MaxStoreProcessedMessageCount = configurationMarker });
    }

    private static PlatformPersistenceMessageBusStoreRegistration CreatePersistenceStore(
        PlatformMessageBusStoreKey key,
        Type ownerType,
        Type contextType,
        IPlatformInboxBusMessageRepository inboxRepository,
        IPlatformOutboxBusMessageRepository outboxRepository)
    {
        return new PlatformPersistenceMessageBusStoreRegistration(
            key,
            ownerType,
            contextType,
            typeof(IPlatformInboxBusMessageRepository),
            typeof(IPlatformOutboxBusMessageRepository),
            typeof(IPlatformUnitOfWorkManager),
            _ => inboxRepository,
            _ => outboxRepository,
            _ => new Mock<IPlatformUnitOfWorkManager>().Object);
    }

    private static PlatformOutboxMessageBusProducerHelper CreateOutboxHelper(
        PlatformOutboxConfig config,
        IPlatformMessageBusProducer messageBusProducer)
    {
        var rootServiceProvider = new Mock<IPlatformRootServiceProvider>();
        rootServiceProvider
            .Setup(provider => provider.GetService(typeof(ILoggerFactory)))
            .Returns(NullLoggerFactory.Instance);
        var backgroundPoolRegistry = new Mock<IPlatformBackgroundActionPermitPoolRegistry>();
        backgroundPoolRegistry
            .Setup(registry => registry.Get(It.IsAny<string>()))
            .Returns(Mock.Of<IPlatformBackgroundActionPermitPool>());

        return new PlatformOutboxMessageBusProducerHelper(
            config,
            messageBusProducer,
            new ServiceCollection().BuildServiceProvider(),
            rootServiceProvider.Object,
            backgroundPoolRegistry.Object);
    }

    private static PlatformApplicationBusMessageProducer CreatePlatformProducer(PlatformMessageBusStoreRegistry registry)
    {
        var services = new ServiceCollection();
        services.AddSingleton<IPlatformMessageBusStoreRegistry>(registry);
        using var serviceProvider = services.BuildServiceProvider();

        var applicationSettingContext = new Mock<IPlatformApplicationSettingContext>();
        applicationSettingContext.SetupGet(context => context.ApplicationName).Returns("LegacyHost");
        var requestContext = new Mock<IPlatformApplicationRequestContext>();
        requestContext.Setup(context => context.GetAllKeyValues()).Returns(new Dictionary<string, object?>());
        var requestContextAccessor = new Mock<IPlatformApplicationRequestContextAccessor>();
        requestContextAccessor.SetupGet(accessor => accessor.Current).Returns(requestContext.Object);

        return new PlatformApplicationBusMessageProducer(
            serviceProvider,
            NullLoggerFactory.Instance,
            applicationSettingContext.Object,
            requestContextAccessor.Object,
            new PlatformOutboxConfig(),
            new Mock<IPlatformUnitOfWorkManager>().Object);
    }

    private static ServiceProvider CreateCqrsServiceProvider(
        out Mock<IPlatformRootServiceProvider> rootServiceProvider,
        out Mock<IPlatformApplicationSettingContext> applicationSettingContext)
    {
        applicationSettingContext = new Mock<IPlatformApplicationSettingContext>();
        applicationSettingContext.SetupGet(context => context.ApplicationName).Returns("LegacyHost");
        var requestContext = new Mock<IPlatformApplicationRequestContext>();
        requestContext.Setup(context => context.GetAllKeyValues()).Returns(new Dictionary<string, object?>());
        var requestContextAccessor = new Mock<IPlatformApplicationRequestContextAccessor>();
        requestContextAccessor.SetupGet(accessor => accessor.Current).Returns(requestContext.Object);

        var services = new ServiceCollection();
        services.AddSingleton<IPlatformApplicationSettingContext>(applicationSettingContext.Object);
        services.AddSingleton<IPlatformApplicationRequestContextAccessor>(requestContextAccessor.Object);
        var serviceProvider = services.BuildServiceProvider();
        rootServiceProvider = new Mock<IPlatformRootServiceProvider>();
        return serviceProvider;
    }

    private static string ReadRepositoryFile(string relativePath)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory != null)
        {
            var candidatePath = Path.Combine(directory.FullName, relativePath);
            if (File.Exists(candidatePath))
                return File.ReadAllText(candidatePath);

            directory = directory.Parent;
        }

        throw new FileNotFoundException($"Could not find repository file '{relativePath}'.");
    }

    public sealed class TestPayload;

    private sealed class TestInboxMessage
    {
        public string Value { get; set; } = "value";
    }

    private sealed class TestInboxConsumer;

    private sealed class ApplicationLaneA;
    private sealed class ApplicationLaneB;
    private sealed class PersistenceStoreA;
    private sealed class PersistenceStoreB;
    private sealed class DatabaseContextA;
    private sealed class DatabaseContextB;

    private sealed class TestRoutedConsumer : PlatformApplicationMessageBusConsumer<TestInboxMessage>
    {
        public TestRoutedConsumer(
            ILoggerFactory loggerFactory,
            IPlatformUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider,
            IPlatformRootServiceProvider rootServiceProvider)
            : base(loggerFactory, uowManager, serviceProvider, rootServiceProvider) { }

        protected override PlatformMessageBusStoreKey MessageBusStoreKey => new("Store-B");
        protected override string MessageBusApplicationName => "Lane-B";

        public IPlatformInboxBusMessageRepository SelectedInboxRepository => InboxBusMessageRepo;
        public PlatformInboxConfig SelectedInboxConfig => InboxConfig;
        public string SelectedApplicationName => ResolvedMessageBusApplicationName;
        public string PipelineRoute(string routingKey, TestInboxMessage message) => GetPipelineRoutingKey(routingKey, message);

        public override Task HandleLogicAsync(TestInboxMessage message, string routingKey) => Task.CompletedTask;
    }

    private sealed class TestCqrsEvent : PlatformCqrsEvent, IPlatformUowEvent
    {
        public override string EventType => "Test";
        public override string EventName => "Test";
        public override string EventAction => "Raised";
        public string SourceUowId { get; set; }
    }

    private sealed class TestCqrsProducer : PlatformCqrsEventBusMessageProducer<TestCqrsEvent, PlatformBusMessage<TestPayload>>
    {
        public TestCqrsProducer(
            ILoggerFactory loggerFactory,
            IPlatformUnitOfWorkManager unitOfWorkManager,
            IServiceProvider serviceProvider,
            IPlatformRootServiceProvider rootServiceProvider,
            IPlatformApplicationBusMessageProducer applicationBusMessageProducer)
            : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider, applicationBusMessageProducer) { }

        protected override PlatformMessageBusStoreKey MessageBusStoreKey => new("Store-B");
        protected override string MessageBusApplicationName => "Lane-B";

        public bool HasSelectedOutboxSupport => MustRunHandlerInSameCurrentActiveUow;
        public Task SendForTest(TestCqrsEvent @event) => SendMessage(@event, CancellationToken.None);

        protected override PlatformBusMessage<TestPayload> BuildMessage(TestCqrsEvent @event) =>
            new() { Payload = new TestPayload() };

        public override Task<bool> HandleWhen(TestCqrsEvent @event) => Task.FromResult(true);
    }

    private sealed record KeyedSend(
        PlatformMessageBusStoreKey StoreKey,
        string ApplicationName,
        string SourceOutboxUowId);

    private sealed class RecordingApplicationBusProducer : IPlatformApplicationBusMessageProducer, IPlatformKeyedApplicationBusMessageProducer
    {
        public List<KeyedSend> KeyedSends { get; } = [];
        public bool OutboxSupport { get; set; }

        public Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageGroup = null,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            bool forceUseDefaultRoutingKey = false,
            bool sendInNewTransactionScope = false,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformWithPayloadBusMessage<TMessagePayload>, IPlatformSelfRoutingKeyBusMessage, IPlatformTrackableBusMessage, new()
            where TMessagePayload : class, new() =>
            Task.FromResult(new TMessage());

        public Task<TMessage> SendAsync<TMessage>(
            TMessage message,
            bool autoSaveOutboxMessage = true,
            bool forceUseDefaultRoutingKey = false,
            string sourceOutboxUowId = null,
            bool sendInNewTransactionScope = false,
            CancellationToken cancellationToken = default)
            where TMessage : class, new() =>
            Task.FromResult(message);

        public Task<TMessage> SendAsync<TMessage>(
            PlatformMessageBusStoreKey storeKey,
            TMessage message,
            string applicationName = null,
            bool autoSaveOutboxMessage = true,
            bool forceUseDefaultRoutingKey = false,
            string sourceOutboxUowId = null,
            bool sendInNewTransactionScope = false,
            CancellationToken cancellationToken = default)
            where TMessage : class, new()
        {
            KeyedSends.Add(new KeyedSend(storeKey, applicationName, sourceOutboxUowId));
            return Task.FromResult(message);
        }

        public Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            PlatformMessageBusStoreKey storeKey,
            string trackId,
            TMessagePayload messagePayload,
            string applicationName = null,
            string messageGroup = null,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            bool forceUseDefaultRoutingKey = false,
            bool sendInNewTransactionScope = false,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformWithPayloadBusMessage<TMessagePayload>, IPlatformSelfRoutingKeyBusMessage, IPlatformTrackableBusMessage, new()
            where TMessagePayload : class, new() =>
            Task.FromResult(new TMessage());

        public bool HasOutboxMessageSupport() => OutboxSupport;

        public bool HasOutboxMessageSupport(PlatformMessageBusStoreKey storeKey, string applicationName = null) => OutboxSupport;
    }

    private sealed class RecordingLegacyApplicationBusProducer : IPlatformApplicationBusMessageProducer
    {
        public int LegacySendCount { get; private set; }

        public Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageGroup = null,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            bool forceUseDefaultRoutingKey = false,
            bool sendInNewTransactionScope = false,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformWithPayloadBusMessage<TMessagePayload>, IPlatformSelfRoutingKeyBusMessage, IPlatformTrackableBusMessage, new()
            where TMessagePayload : class, new()
        {
            LegacySendCount++;
            return Task.FromResult(new TMessage());
        }

        public Task<TMessage> SendAsync<TMessage>(
            TMessage message,
            bool autoSaveOutboxMessage = true,
            bool forceUseDefaultRoutingKey = false,
            string sourceOutboxUowId = null,
            bool sendInNewTransactionScope = false,
            CancellationToken cancellationToken = default)
            where TMessage : class, new()
        {
            LegacySendCount++;
            return Task.FromResult(message);
        }

        public bool HasOutboxMessageSupport() => true;
    }
}
