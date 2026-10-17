using System.Collections.Concurrent;
using System.Linq.Expressions;
using System.Reflection;
using System.Runtime.CompilerServices;
using Easy.Platform.Application;
using Easy.Platform.Application.Cqrs.Events;
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
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Easy.Platform.Tests.Unit.Application.MessageBus.Store;

/// <summary>
/// Behavior proof that store routing is OPT-IN. A host whose persistence modules contribute no runtime store keeps the
/// legacy unqualified inbox/outbox DI path for every producer, consumer, and CQRS event handler, even when application
/// lanes exist and callers declare non-Default store keys. A composed host routes to the selected lane store instead.
/// </summary>
public sealed class PlatformMessageBusLegacyHostRoutingTests
{
    private const string LegacyApplicationName = "LegacyHost";
    private static readonly PlatformMessageBusStoreKey ModuleKey = new("Module-X");

    // ───────────────────────────── Producer ─────────────────────────────

    [Theory]
    [Trait("TechnicalSpec", "TC-ROUTE-104")]
    [InlineData(true)]
    [InlineData(false)]
    public async Task KeyedProducer_InLegacyHost_UsesUnqualifiedOutboxPath_AndNeverTouchesStoreFactories(bool registerRegistry)
    {
        var factoryCalls = new FactoryCallCounter();
        using var host = LegacyProducerHost.Create(
            registerRegistry ? CreateMultiPersistenceLegacyRegistry(factoryCalls) : null,
            registerDiOutboxRepository: true);
        var keyedProducer = host.Producer;

        keyedProducer.HasOutboxMessageSupport(ModuleKey, "Lane-A").Should().BeTrue("the unqualified DI outbox repository is registered");

        var sentMessage = await keyedProducer.SendAsync(
            ModuleKey,
            new PlatformBusMessage<TestPayload> { Payload = new TestPayload(), ProduceFrom = "Caller" },
            applicationName: "Lane-A");
        var sentPayloadMessage = await keyedProducer.SendAsync<PlatformBusMessage<TestPayload>, TestPayload>(
            ModuleKey,
            "track-legacy",
            new TestPayload(),
            applicationName: "Lane-A");

        host.BusSends.Should().HaveCount(2, "the legacy outbox helper sends directly when there is no active source unit of work");
        sentMessage.ProduceFrom.Should().Be("Caller", "a legacy host keeps the caller-set producer identity");
        sentPayloadMessage.ProduceFrom.Should().Be(LegacyApplicationName);
        host.BusSends[1].RoutingKey.Should().Contain(LegacyApplicationName, "the payload message is built from the host application name, not a lane");
        factoryCalls.Total.Should().Be(0, "a store that did not opt in must never resolve repositories or configuration");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-ROUTE-104")]
    public void KeyedProducer_InLegacyHost_ReportsNoOutboxSupport_WhenNoDiRepositoryIsRegistered()
    {
        using var host = LegacyProducerHost.Create(CreateMultiPersistenceLegacyRegistry(new FactoryCallCounter()), registerDiOutboxRepository: false);

        host.Producer.HasOutboxMessageSupport(ModuleKey).Should().BeFalse();
        host.Producer.HasOutboxMessageSupport().Should().BeFalse();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-ROUTE-101")]
    public async Task ComposedHost_StampsLaneIdentityOverCallerProduceFrom_ForKeyedAndUnqualifiedOverloads()
    {
        var factoryCalls = new FactoryCallCounter();
        var key = new PlatformMessageBusStoreKey("Store-A");
        var registry = new PlatformMessageBusStoreRegistry(
            [CreateLane(key, typeof(ApplicationLaneA), "Lane-A", typeof(object).Assembly, factoryCalls)],
            [CreateStore(key, typeof(PersistenceStoreA), typeof(DatabaseContextA), CreateInboxRepository().Object, CreateOutboxRepository().Object, factoryCalls)],
            [new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneA), typeof(PersistenceStoreA))],
            isStrictCompositionValidationEnabled: true);
        using var host = LegacyProducerHost.Create(registry, registerDiOutboxRepository: false);

        var keyed = await host.Producer.SendAsync(
            key,
            new PlatformBusMessage<TestPayload> { Payload = new TestPayload(), ProduceFrom = "Caller" },
            autoSaveOutboxMessage: false);
        var unqualified = await host.Producer.SendAsync(
            new PlatformBusMessage<TestPayload> { Payload = new TestPayload(), ProduceFrom = "Caller" },
            autoSaveOutboxMessage: false);
        await host.Producer.SendAsync(
            new PlatformBusMessage<TestPayload> { Payload = new TestPayload() },
            autoSaveOutboxMessage: false);

        keyed.ProduceFrom.Should().Be("Lane-A");
        unqualified.ProduceFrom.Should().Be("Lane-A", "the unqualified overload routes through the Default store key in a composed host");
        factoryCalls.OutboxConfig.Should().Be(1, "the singleton lane outbox configuration is resolved once and reused across sends");
    }

    // ───────────────────────────── Consumer ─────────────────────────────

    [Theory]
    [Trait("TechnicalSpec", "TC-ROUTE-102")]
    [InlineData(true)]
    [InlineData(false)]
    public void KeyedConsumer_InLegacyHost_ResolvesUnqualifiedInboxRepositoryAndConfig(bool registerRegistry)
    {
        var factoryCalls = new FactoryCallCounter();
        var diInbox = CreateInboxRepository().Object;
        var diInboxConfig = new PlatformInboxConfig { MaxStoreProcessedMessageCount = 7 };
        using var host = ConsumerHost.Create(
            registerRegistry ? CreateMultiPersistenceLegacyRegistry(factoryCalls) : null,
            diInbox,
            diInboxConfig);

        var consumer = host.CreateConsumer();

        var resolve = () => consumer.SelectedInboxRepository;
        resolve.Should().NotThrow();
        consumer.SelectedInboxRepository.Should().BeSameAs(diInbox);
        consumer.SelectedInboxConfig.Should().BeSameAs(diInboxConfig);
        consumer.SelectedApplicationName.Should().Be(LegacyApplicationName);
        factoryCalls.Total.Should().Be(0);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-ROUTE-102")]
    public void Consumer_ConfigureMessageBusStoreRoute_ResetsResolvedRoute_InOneStep()
    {
        var factoryCalls = new FactoryCallCounter();
        var inboxA = CreateInboxRepository().Object;
        var inboxB = CreateInboxRepository().Object;
        var keyA = new PlatformMessageBusStoreKey("Store-A");
        var keyB = new PlatformMessageBusStoreKey("Store-B");
        var registry = new PlatformMessageBusStoreRegistry(
            [
                CreateLane(keyA, typeof(ApplicationLaneA), "Lane-A", typeof(object).Assembly, factoryCalls),
                CreateLane(keyB, typeof(ApplicationLaneB), "Lane-B", typeof(object).Assembly, factoryCalls)
            ],
            [
                CreateStore(keyA, typeof(PersistenceStoreA), typeof(DatabaseContextA), inboxA, CreateOutboxRepository().Object, factoryCalls),
                CreateStore(keyB, typeof(PersistenceStoreB), typeof(DatabaseContextB), inboxB, CreateOutboxRepository().Object, factoryCalls)
            ],
            [
                new PlatformMessageBusStoreBinding(keyA, typeof(ApplicationLaneA), typeof(PersistenceStoreA)),
                new PlatformMessageBusStoreBinding(keyB, typeof(ApplicationLaneB), typeof(PersistenceStoreB))
            ],
            isStrictCompositionValidationEnabled: true);
        using var host = ConsumerHost.Create(registry, CreateInboxRepository().Object, new PlatformInboxConfig());
        var consumer = host.CreateConsumer();

        consumer.ConfigureMessageBusStoreRoute(keyA, "Lane-A");
        consumer.SelectedInboxRepository.Should().BeSameAs(inboxA);
        consumer.SelectedApplicationName.Should().Be("Lane-A");

        consumer.ConfigureMessageBusStoreRoute(keyB, "Lane-B");
        consumer.SelectedInboxRepository.Should().BeSameAs(inboxB, "reconfiguring must drop every piece of the previously resolved lane");
        consumer.SelectedInboxConfig.MaxStoreProcessedMessageCount.Should().Be(202);
        consumer.SelectedApplicationName.Should().Be("Lane-B");
    }

    // ───────────────────────────── CQRS event handler ─────────────────────────────

    [Fact]
    [Trait("TechnicalSpec", "TC-ROUTE-107")]
    public void CqrsHandler_InComposedHost_RoutesInboxToHandlerLaneStore_AndCachesResolution()
    {
        var factoryCalls = new FactoryCallCounter();
        var handlerInbox = CreateInboxRepository().Object;
        var otherInbox = CreateInboxRepository().Object;
        var handlerKey = new PlatformMessageBusStoreKey("Store-H");
        var otherKey = new PlatformMessageBusStoreKey("Store-O");
        var realRegistry = new PlatformMessageBusStoreRegistry(
            [
                CreateLane(handlerKey, typeof(ApplicationLaneA), "Lane-H", typeof(PlatformMessageBusLegacyHostRoutingTests).Assembly, factoryCalls),
                CreateLane(otherKey, typeof(ApplicationLaneB), "Lane-O", typeof(object).Assembly, factoryCalls)
            ],
            [
                CreateStore(handlerKey, typeof(PersistenceStoreA), typeof(DatabaseContextA), handlerInbox, CreateOutboxRepository().Object, factoryCalls),
                CreateStore(otherKey, typeof(PersistenceStoreB), typeof(DatabaseContextB), otherInbox, CreateOutboxRepository().Object, factoryCalls)
            ],
            [
                new PlatformMessageBusStoreBinding(handlerKey, typeof(ApplicationLaneA), typeof(PersistenceStoreA)),
                new PlatformMessageBusStoreBinding(otherKey, typeof(ApplicationLaneB), typeof(PersistenceStoreB))
            ],
            isStrictCompositionValidationEnabled: true);
        var countingRegistry = CreateCountingRegistry(realRegistry);
        using var host = HandlerHost.Create(countingRegistry.Object, diInboxRepository: CreateInboxRepository().Object);

        var firstHandler = host.CreateHandler<InboxEnabledHandler>();
        var secondHandler = host.CreateHandler<InboxEnabledHandler>();

        firstHandler.InboxSupport.Should().BeTrue();
        firstHandler.RetryOnFailedDelaySeconds.Should().Be(firstHandler.BaseRetryDelaySeconds, "inbox-supported handlers keep the base retry delay");
        secondHandler.InboxSupport.Should().BeTrue();

        var route = InvokeInboxRoute(firstHandler, host.ServiceProvider);
        route.Repository.Should().BeSameAs(handlerInbox);
        route.RepositoryFactory.Should().NotBeNull();
        route.StoreKey.Should().Be(handlerKey);
        route.ApplicationName.Should().Be("Lane-H");
        route.Config.MaxStoreProcessedMessageCount.Should().Be(1);
        InvokeInboxRoute(secondHandler, host.ServiceProvider).Config.Should().BeSameAs(route.Config, "lane inbox configuration is resolved once per lane");

        countingRegistry.Verify(
            registry => registry.GetForApplication(It.IsAny<Assembly>(), It.IsAny<PlatformMessageBusStoreKey?>()),
            Times.Once,
            "the handler route is cached per registry and handler type instead of re-resolved on every event");
        factoryCalls.InboxConfig.Should().Be(1);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-ROUTE-107")]
    public void CqrsHandler_WithInboxDisabled_InComposedHostWithoutHandlerLane_HasNoInboxSupportAndDoesNotThrow()
    {
        var factoryCalls = new FactoryCallCounter();
        var key = new PlatformMessageBusStoreKey("Store-O");
        var registry = new PlatformMessageBusStoreRegistry(
            [CreateLane(key, typeof(ApplicationLaneB), "Lane-O", typeof(object).Assembly, factoryCalls)],
            [CreateStore(key, typeof(PersistenceStoreB), typeof(DatabaseContextB), CreateInboxRepository().Object, CreateOutboxRepository().Object, factoryCalls)],
            [new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneB), typeof(PersistenceStoreB))],
            isStrictCompositionValidationEnabled: true);
        using var host = HandlerHost.Create(registry, diInboxRepository: CreateInboxRepository().Object);

        var disabledHandler = host.CreateHandler<InboxDisabledHandler>();
        var checkDisabled = () => disabledHandler.InboxSupport;
        checkDisabled.Should().NotThrow();
        disabledHandler.InboxSupport.Should().BeFalse();
        disabledHandler.RetryOnFailedDelaySeconds.Should().Be(disabledHandler.BaseRetryDelaySeconds * 10);

        // Counter-case: the early return is what protects the disabled handler — an inbox-enabled handler in the same
        // lane-less assembly must still fail loudly instead of silently falling back to the unqualified repository.
        var enabledHandler = host.CreateHandler<InboxEnabledHandler>();
        var checkEnabled = () => enabledHandler.InboxSupport;
        checkEnabled.Should().Throw<InvalidOperationException>().WithMessage("*No message-bus store is bound for application assembly*");
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-ROUTE-107")]
    [InlineData(true)]
    [InlineData(false)]
    public void CqrsHandler_InLegacyHost_UsesUnqualifiedInboxRepositoryRegistration(bool registerDiInbox)
    {
        var factoryCalls = new FactoryCallCounter();
        var diInbox = CreateInboxRepository().Object;
        // Two lanes for the handler assembly would be ambiguous if the legacy host were (wrongly) routed.
        var registry = new PlatformMessageBusStoreRegistry(
            [
                CreateLane(ModuleKey, typeof(ApplicationLaneA), "Lane-A", typeof(PlatformMessageBusLegacyHostRoutingTests).Assembly, factoryCalls),
                CreateLane(new PlatformMessageBusStoreKey("Module-Y"), typeof(ApplicationLaneB), "Lane-B", typeof(PlatformMessageBusLegacyHostRoutingTests).Assembly, factoryCalls)
            ],
            [
                CreateStore(ModuleKey, typeof(PersistenceStoreA), typeof(DatabaseContextA), CreateInboxRepository().Object, CreateOutboxRepository().Object, factoryCalls, isRuntimeEnabled: false)
            ],
            []);
        using var host = HandlerHost.Create(registry, registerDiInbox ? diInbox : null);

        var handler = host.CreateHandler<InboxEnabledHandler>();

        handler.InboxSupport.Should().Be(registerDiInbox);
        handler.RetryOnFailedDelaySeconds.Should().Be(registerDiInbox ? handler.BaseRetryDelaySeconds : handler.BaseRetryDelaySeconds * 10);

        if (registerDiInbox)
        {
            var route = InvokeInboxRoute(handler, host.ServiceProvider);
            route.Repository.Should().BeSameAs(diInbox);
            route.RepositoryFactory.Should().BeNull();
            route.StoreKey.Should().BeNull();
            route.ApplicationName.Should().Be(LegacyApplicationName);
        }

        factoryCalls.Total.Should().Be(0);
    }

    // ───────────────────────────── CQRS producer ignored-route warning ─────────────────────────────

    [Fact]
    [Trait("TechnicalSpec", "TC-ROUTE-104")]
    public async Task CqrsProducer_WithLegacyOnlyProducer_InComposedHost_WarnsOncePerProducerType()
    {
        var composedRegistry = new PlatformMessageBusStoreRegistry(
            [CreateLane(ModuleKey, typeof(ApplicationLaneA), "Lane-A", typeof(object).Assembly, new FactoryCallCounter())],
            [CreateStore(ModuleKey, typeof(PersistenceStoreA), typeof(DatabaseContextA), CreateInboxRepository().Object, CreateOutboxRepository().Object, new FactoryCallCounter())],
            [new PlatformMessageBusStoreBinding(ModuleKey, typeof(ApplicationLaneA), typeof(PersistenceStoreA))]);
        var loggerFactory = new CapturingLoggerFactory();
        var legacyProducer = new CountingLegacyProducer();
        using var serviceProvider = CreateHandlerScopeServices();
        var rootServiceProvider = new Mock<IPlatformRootServiceProvider>();
        rootServiceProvider.Setup(provider => provider.GetService(typeof(IPlatformMessageBusStoreRegistry))).Returns(composedRegistry);

        var producer = new WarnOnceKeyedCqrsProducer(loggerFactory, Mock.Of<IPlatformUnitOfWorkManager>(), serviceProvider, rootServiceProvider.Object, legacyProducer);
        await producer.SendForTest(new RoutingTestEvent());
        await producer.SendForTest(new RoutingTestEvent());

        legacyProducer.SendCount.Should().Be(2, "the warning never blocks the legacy send");
        loggerFactory.Warnings.Should().ContainSingle(message => message.Contains(nameof(WarnOnceKeyedCqrsProducer)) && message.Contains("Module-X"));
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-ROUTE-104")]
    public async Task CqrsProducer_WithLegacyOnlyProducer_InLegacyHost_DoesNotWarn()
    {
        var loggerFactory = new CapturingLoggerFactory();
        var legacyProducer = new CountingLegacyProducer();
        using var serviceProvider = CreateHandlerScopeServices();

        var producer = new LegacyHostKeyedCqrsProducer(
            loggerFactory,
            Mock.Of<IPlatformUnitOfWorkManager>(),
            serviceProvider,
            Mock.Of<IPlatformRootServiceProvider>(),
            legacyProducer);
        await producer.SendForTest(new RoutingTestEvent());

        legacyProducer.SendCount.Should().Be(1);
        loggerFactory.Warnings.Should().BeEmpty("a declared key is meaningless without runtime store composition");
    }

    // ───────────────────────────── Outbox helper transactional invariant ─────────────────────────────

    [Fact]
    [Trait("TechnicalSpec", "TC-ROUTE-101")]
    public async Task RoutedOutboxSend_WithActiveSourceUowInSelectedStore_DefersBusSendUntilCommit_ExactlyOnce()
    {
        var outbox = CreateOutboxRepository();
        var completedActions = new ConcurrentBag<Func<Task>>();
        var sourceUow = new Mock<IPlatformUnitOfWork>();
        sourceUow.SetupGet(uow => uow.Id).Returns("source-uow");
        sourceUow.Setup(uow => uow.IsPseudoTransactionUow()).Returns(false);
        sourceUow.SetupGet(uow => uow.OnSaveChangesCompletedActions).Returns(completedActions);
        var selectedUowManager = new Mock<IPlatformUnitOfWorkManager>();
        selectedUowManager.Setup(manager => manager.TryGetCurrentOrCreatedActiveUow("source-uow")).Returns(sourceUow.Object);
        outbox.Setup(repository => repository.UowManager()).Returns(selectedUowManager.Object);
        SetupOutboxPersistence(outbox);
        var processed = new TaskCompletionSource<PlatformOutboxBusMessage>(TaskCreationOptions.RunContinuationsAsynchronously);
        selectedUowManager.Setup(manager => manager.CurrentActiveUow()).Returns(sourceUow.Object);
        selectedUowManager.Setup(manager => manager.ExecuteUowTask(It.IsAny<Func<Task>>(), It.IsAny<bool>()))
            .Returns((Func<Task> action, bool _) => action());
        selectedUowManager.Setup(manager => manager.Begin(It.IsAny<bool>())).Returns(sourceUow.Object);
        sourceUow.Setup(uow => uow.CompleteAsync(It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        outbox.Setup(repository => repository.SetAsync(It.IsAny<PlatformOutboxBusMessage>(), It.IsAny<CancellationToken>()))
            .Returns((PlatformOutboxBusMessage row, CancellationToken _) =>
            {
                if (row.SendStatus == PlatformOutboxBusMessage.SendStatuses.Processed) processed.TrySetResult(row);
                return Task.FromResult(row);
            });
        outbox.Setup(repository => repository.GetAllAsync(
                It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        var bus = new Mock<IPlatformMessageBusProducer>();
        bus.Setup(producer => producer.SendAsync(It.IsAny<PlatformBusMessage<TestPayload>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PlatformBusMessage<TestPayload> message, string _, CancellationToken __) => message);
        var services = new ServiceCollection();
        services.AddSingleton<ILoggerFactory>(new CapturingLoggerFactory());
        services.AddSingleton(bus.Object);
        services.AddScoped(_ => new CommitScopeMarker());
        var unqualifiedResolutions = 0;
        services.AddScoped<IPlatformOutboxBusMessageRepository>(_ =>
        {
            Interlocked.Increment(ref unqualifiedResolutions);
            throw new InvalidOperationException("The selected-store callback must not resolve an unqualified repository");
        });
        using var provider = services.BuildServiceProvider();
        var root = new PlatformRootServiceProvider(provider, services);
        var selectedScopes = new ConcurrentBag<CommitScopeMarker>();
        IPlatformOutboxBusMessageRepository SelectedRepository(IServiceProvider scoped)
        {
            selectedScopes.Add(scoped.GetRequiredService<CommitScopeMarker>());
            return outbox.Object;
        }
        var helper = new PlatformOutboxMessageBusProducerHelper(
            new PlatformOutboxConfig(), bus.Object, provider, root, CreateBackgroundPoolRegistry());
        using var cancellation = new CancellationTokenSource(TimeSpan.FromSeconds(10));

        await helper.HandleSendingOutboxMessageAsync(
            new PlatformBusMessage<TestPayload> { Payload = new TestPayload(), TrackingId = "track-atomic" },
            "Event.Lane-A.Test",
            retryProcessFailedMessageInSecondsUnit: 1,
            subQueueMessageIdPrefix: null,
            needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage: false,
            autoDeleteProcessedMessage: false,
            sourceOutboxUowId: "source-uow",
            cancellationToken: cancellation.Token,
            outboxBusMessageRepositoryFactory: SelectedRepository,
            selectedOutboxConfig: new PlatformOutboxConfig());

        bus.Verify(
            producer => producer.SendAsync(It.IsAny<PlatformBusMessage<TestPayload>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never,
            "nothing may reach the bus before the source unit of work commits");
        completedActions.Should().ContainSingle("the send is queued on the source unit of work's post-commit actions exactly once");
        outbox.Verify(
            repository => repository.CreateAsync(It.IsAny<PlatformOutboxBusMessage>(), It.IsAny<bool>(), It.IsAny<Action<PlatformCqrsEntityEvent>>(), It.IsAny<CancellationToken>()),
            Times.Once,
            "the outbox row is written inside the source transaction");

        var initialScope = selectedScopes.Single();
        await completedActions.Single()();
        var deliveredRow = await processed.Task.WaitAsync(cancellation.Token);

        deliveredRow.SendStatus.Should().Be(PlatformOutboxBusMessage.SendStatuses.Processed);
        bus.Verify(producer => producer.SendAsync(
            It.IsAny<PlatformBusMessage<TestPayload>>(), "Event.Lane-A.Test", It.IsAny<CancellationToken>()), Times.Once);
        outbox.Verify(repository => repository.SetAsync(
            It.Is<PlatformOutboxBusMessage>(row => row.SendStatus == PlatformOutboxBusMessage.SendStatuses.Processed),
            It.IsAny<CancellationToken>()), Times.Once);
        selectedScopes.Should().Contain(scope => !ReferenceEquals(scope, initialScope), "post-commit delivery uses a fresh selected-store scope");
        unqualifiedResolutions.Should().Be(0);
    }

    private sealed class CommitScopeMarker;

    [Fact]
    [Trait("TechnicalSpec", "TC-ROUTE-101")]
    public async Task RoutedOutboxSend_WithSourceUowFromAnotherStore_SendsDirectly_AndWarnsAboutLostAtomicity()
    {
        // Current decided behavior: the selected store cannot see the source unit of work, so the helper cannot defer the
        // send to that transaction's commit. It keeps the legacy direct-send fallback and emits a warning (not fail-fast,
        // because an already-completed source UoW is indistinguishable from a foreign-store UoW at this layer).
        var outbox = CreateOutboxRepository();
        outbox.Setup(repository => repository.UowManager()).Returns(new Mock<IPlatformUnitOfWorkManager>().Object);
        SetupOutboxPersistence(outbox);
        var bus = new Mock<IPlatformMessageBusProducer>();
        bus.Setup(producer => producer.SendAsync(It.IsAny<PlatformBusMessage<TestPayload>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PlatformBusMessage<TestPayload> message, string _, CancellationToken _) => message);
        var loggerFactory = new CapturingLoggerFactory();
        var helper = CreateOutboxHelper(bus.Object, loggerFactory);

        await helper.HandleSendingOutboxMessageAsync(
            new PlatformBusMessage<TestPayload> { Payload = new TestPayload(), TrackingId = "track-cross-store" },
            "Event.Lane-B.Test",
            retryProcessFailedMessageInSecondsUnit: 1,
            subQueueMessageIdPrefix: null,
            needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage: false,
            autoDeleteProcessedMessage: false,
            sourceOutboxUowId: "foreign-store-uow",
            cancellationToken: CancellationToken.None,
            outboxBusMessageRepositoryFactory: _ => outbox.Object,
            selectedOutboxConfig: new PlatformOutboxConfig());

        bus.Verify(
            producer => producer.SendAsync(It.IsAny<PlatformBusMessage<TestPayload>>(), "Event.Lane-B.Test", It.IsAny<CancellationToken>()),
            Times.Once);
        loggerFactory.Warnings.Should().ContainSingle(message => message.Contains("foreign-store-uow") && message.Contains("atomicity"));
    }

    // ───────────────────────────── Fixtures ─────────────────────────────

    private static void SetupOutboxPersistence(Mock<IPlatformOutboxBusMessageRepository> outbox)
    {
        outbox
            .Setup(repository => repository.FirstOrDefaultAsync(It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PlatformOutboxBusMessage)null!);
        outbox
            .Setup(repository => repository.CreateAsync(
                It.IsAny<PlatformOutboxBusMessage>(),
                It.IsAny<bool>(),
                It.IsAny<Action<PlatformCqrsEntityEvent>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((PlatformOutboxBusMessage message, bool _, Action<PlatformCqrsEntityEvent> _, CancellationToken _) => message);
    }

    private static InboxRoute InvokeInboxRoute<TEvent>(PlatformCqrsEventApplicationHandler<TEvent> handler, IServiceProvider serviceProvider)
        where TEvent : PlatformCqrsEvent, new()
    {
        var method = typeof(PlatformCqrsEventApplicationHandler<TEvent>)
            .GetMethod("ResolveInboxMessageBusRoute", BindingFlags.Instance | BindingFlags.NonPublic)!;
        var tuple = (ITuple)method.Invoke(handler, [serviceProvider])!;

        return new InboxRoute(
            (PlatformInboxConfig)tuple[0]!,
            (IPlatformInboxBusMessageRepository)tuple[1]!,
            (Func<IServiceProvider, IPlatformInboxBusMessageRepository>?)tuple[2],
            (PlatformMessageBusStoreKey?)tuple[3],
            (string)tuple[4]!);
    }

    private static Mock<IPlatformMessageBusStoreRegistry> CreateCountingRegistry(PlatformMessageBusStoreRegistry realRegistry)
    {
        var registry = new Mock<IPlatformMessageBusStoreRegistry>();
        registry.SetupGet(item => item.HasRuntimeStoreComposition).Returns(realRegistry.HasRuntimeStoreComposition);
        registry
            .Setup(item => item.GetForApplication(It.IsAny<Assembly>(), It.IsAny<PlatformMessageBusStoreKey?>()))
            .Returns((Assembly assembly, PlatformMessageBusStoreKey? key) => realRegistry.GetForApplication(assembly, key));
        return registry;
    }

    /// <summary>
    /// Legacy multi-persistence host shape (regression for C1): two persistence contributions that did NOT opt in to
    /// runtime store routing plus two application lanes, non-strict.
    /// </summary>
    private static PlatformMessageBusStoreRegistry CreateMultiPersistenceLegacyRegistry(FactoryCallCounter factoryCalls)
    {
        var secondKey = new PlatformMessageBusStoreKey("Module-Y");
        return new PlatformMessageBusStoreRegistry(
            [
                CreateLane(ModuleKey, typeof(ApplicationLaneA), "Lane-A", typeof(object).Assembly, factoryCalls),
                CreateLane(secondKey, typeof(ApplicationLaneB), "Lane-B", typeof(object).Assembly, factoryCalls)
            ],
            [
                CreateStore(ModuleKey, typeof(PersistenceStoreA), typeof(DatabaseContextA), CreateInboxRepository().Object, CreateOutboxRepository().Object, factoryCalls, isRuntimeEnabled: false),
                CreateStore(secondKey, typeof(PersistenceStoreB), typeof(DatabaseContextB), CreateInboxRepository().Object, CreateOutboxRepository().Object, factoryCalls, isRuntimeEnabled: false)
            ],
            [],
            isStrictCompositionValidationEnabled: false);
    }

    private static PlatformMessageBusApplicationLaneRegistration CreateLane(
        PlatformMessageBusStoreKey key,
        Type moduleType,
        string applicationName,
        Assembly assembly,
        FactoryCallCounter factoryCalls)
    {
        var marker = moduleType == typeof(ApplicationLaneB) ? 202 : 1;
        return new PlatformMessageBusApplicationLaneRegistration(
            key,
            moduleType,
            applicationName,
            assembly,
            _ =>
            {
                Interlocked.Increment(ref factoryCalls.InboxConfig);
                return new PlatformInboxConfig { MaxStoreProcessedMessageCount = marker };
            },
            _ =>
            {
                Interlocked.Increment(ref factoryCalls.OutboxConfig);
                return new PlatformOutboxConfig { MaxStoreProcessedMessageCount = marker };
            });
    }

    private static PlatformPersistenceMessageBusStoreRegistration CreateStore(
        PlatformMessageBusStoreKey key,
        Type ownerType,
        Type contextType,
        IPlatformInboxBusMessageRepository inboxRepository,
        IPlatformOutboxBusMessageRepository outboxRepository,
        FactoryCallCounter factoryCalls,
        bool isRuntimeEnabled = true)
    {
        return new PlatformPersistenceMessageBusStoreRegistration(
            key,
            ownerType,
            contextType,
            typeof(IPlatformInboxBusMessageRepository),
            typeof(IPlatformOutboxBusMessageRepository),
            typeof(IPlatformUnitOfWorkManager),
            _ =>
            {
                Interlocked.Increment(ref factoryCalls.Repository);
                return inboxRepository;
            },
            _ =>
            {
                Interlocked.Increment(ref factoryCalls.Repository);
                return outboxRepository;
            },
            _ => new Mock<IPlatformUnitOfWorkManager>().Object,
            isRuntimeEnabled);
    }

    private static Mock<IPlatformInboxBusMessageRepository> CreateInboxRepository()
    {
        var repository = new Mock<IPlatformInboxBusMessageRepository>();
        repository.Setup(item => item.UowManager()).Returns(new Mock<IPlatformUnitOfWorkManager>().Object);
        return repository;
    }

    private static Mock<IPlatformOutboxBusMessageRepository> CreateOutboxRepository()
    {
        var repository = new Mock<IPlatformOutboxBusMessageRepository>();
        repository.Setup(item => item.UowManager()).Returns(new Mock<IPlatformUnitOfWorkManager>().Object);
        return repository;
    }

    private static PlatformOutboxMessageBusProducerHelper CreateOutboxHelper(IPlatformMessageBusProducer bus, ILoggerFactory loggerFactory)
    {
        var rootServiceProvider = new Mock<IPlatformRootServiceProvider>();
        rootServiceProvider.Setup(provider => provider.GetService(typeof(ILoggerFactory))).Returns(loggerFactory);

        return new PlatformOutboxMessageBusProducerHelper(
            new PlatformOutboxConfig(),
            bus,
            new ServiceCollection().BuildServiceProvider(),
            rootServiceProvider.Object,
            CreateBackgroundPoolRegistry());
    }

    private static IPlatformBackgroundActionPermitPoolRegistry CreateBackgroundPoolRegistry()
    {
        var registry = new Mock<IPlatformBackgroundActionPermitPoolRegistry>();
        registry.Setup(item => item.Get(It.IsAny<string>())).Returns(Mock.Of<IPlatformBackgroundActionPermitPool>());
        return registry.Object;
    }

    private static Mock<IPlatformApplicationSettingContext> CreateSettingContext()
    {
        var settingContext = new Mock<IPlatformApplicationSettingContext>();
        settingContext.SetupGet(context => context.ApplicationName).Returns(LegacyApplicationName);
        return settingContext;
    }

    private static Mock<IPlatformApplicationRequestContextAccessor> CreateRequestContextAccessor()
    {
        var requestContext = new Mock<IPlatformApplicationRequestContext>();
        requestContext.Setup(context => context.GetAllKeyValues()).Returns(new Dictionary<string, object?>());
        var accessor = new Mock<IPlatformApplicationRequestContextAccessor>();
        accessor.SetupGet(item => item.Current).Returns(requestContext.Object);
        return accessor;
    }

    private static ServiceProvider CreateHandlerScopeServices()
    {
        var services = new ServiceCollection();
        services.AddSingleton(CreateSettingContext().Object);
        services.AddSingleton(CreateRequestContextAccessor().Object);
        return services.BuildServiceProvider();
    }

    private sealed record InboxRoute(
        PlatformInboxConfig Config,
        IPlatformInboxBusMessageRepository Repository,
        Func<IServiceProvider, IPlatformInboxBusMessageRepository>? RepositoryFactory,
        PlatformMessageBusStoreKey? StoreKey,
        string ApplicationName);

    private sealed class FactoryCallCounter
    {
        public int InboxConfig;
        public int OutboxConfig;
        public int Repository;

        public int Total => InboxConfig + OutboxConfig + Repository;
    }

    private sealed record BusSend(object Message, string RoutingKey);

    private sealed class LegacyProducerHost : IDisposable
    {
        private readonly ServiceProvider serviceProvider;

        private LegacyProducerHost(ServiceProvider serviceProvider, PlatformApplicationBusMessageProducer producer, List<BusSend> busSends)
        {
            this.serviceProvider = serviceProvider;
            Producer = producer;
            BusSends = busSends;
        }

        public PlatformApplicationBusMessageProducer Producer { get; }
        public List<BusSend> BusSends { get; }

        public static LegacyProducerHost Create(IPlatformMessageBusStoreRegistry? registry, bool registerDiOutboxRepository)
        {
            var busSends = new List<BusSend>();
            var bus = new Mock<IPlatformMessageBusProducer>();
            bus.Setup(producer => producer.SendAsync(It.IsAny<PlatformBusMessage<TestPayload>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((PlatformBusMessage<TestPayload> message, string routingKey, CancellationToken _) =>
                {
                    busSends.Add(new BusSend(message, routingKey));
                    return message;
                });

            var services = new ServiceCollection();
            if (registry != null)
                services.AddSingleton(registry);
            if (registerDiOutboxRepository)
                services.AddSingleton(CreateOutboxRepository().Object);
            services.AddSingleton(bus.Object);
            services.AddSingleton(new Mock<IPlatformUnitOfWorkManager>().Object);
            services.AddSingleton<ILoggerFactory>(NullLoggerFactory.Instance);
            services.AddSingleton(CreateBackgroundPoolRegistry());
            services.AddScoped(provider => new PlatformOutboxMessageBusProducerHelper(
                new PlatformOutboxConfig(),
                provider.GetRequiredService<IPlatformMessageBusProducer>(),
                provider,
                new PlatformRootServiceProvider(provider, services),
                provider.GetRequiredService<IPlatformBackgroundActionPermitPoolRegistry>()));
            var serviceProvider = services.BuildServiceProvider();

            var producer = new PlatformApplicationBusMessageProducer(
                serviceProvider,
                NullLoggerFactory.Instance,
                CreateSettingContext().Object,
                CreateRequestContextAccessor().Object,
                new PlatformOutboxConfig(),
                new Mock<IPlatformUnitOfWorkManager>().Object);

            return new LegacyProducerHost(serviceProvider, producer, busSends);
        }

        public void Dispose() => serviceProvider.Dispose();
    }

    private sealed class ConsumerHost : IDisposable
    {
        private readonly ServiceProvider serviceProvider;
        private readonly PlatformRootServiceProvider rootServiceProvider;

        private ConsumerHost(ServiceProvider serviceProvider, PlatformRootServiceProvider rootServiceProvider)
        {
            this.serviceProvider = serviceProvider;
            this.rootServiceProvider = rootServiceProvider;
        }

        public static ConsumerHost Create(IPlatformMessageBusStoreRegistry? registry, IPlatformInboxBusMessageRepository diInbox, PlatformInboxConfig diInboxConfig)
        {
            var services = new ServiceCollection();
            if (registry != null)
                services.AddSingleton(registry);
            services.AddSingleton(diInbox);
            services.AddSingleton(diInboxConfig);
            services.AddSingleton(CreateSettingContext().Object);
            services.AddSingleton(CreateRequestContextAccessor().Object);
            var serviceProvider = services.BuildServiceProvider();

            return new ConsumerHost(serviceProvider, new PlatformRootServiceProvider(serviceProvider, services));
        }

        public ModuleKeyedConsumer CreateConsumer() =>
            new(NullLoggerFactory.Instance, new Mock<IPlatformUnitOfWorkManager>().Object, serviceProvider, rootServiceProvider);

        public void Dispose() => serviceProvider.Dispose();
    }

    private sealed class HandlerHost : IDisposable
    {
        private readonly ServiceProvider serviceProvider;
        private readonly PlatformRootServiceProvider rootServiceProvider;

        private HandlerHost(ServiceProvider serviceProvider, PlatformRootServiceProvider rootServiceProvider)
        {
            this.serviceProvider = serviceProvider;
            this.rootServiceProvider = rootServiceProvider;
        }

        public IServiceProvider ServiceProvider => serviceProvider;

        public static HandlerHost Create(IPlatformMessageBusStoreRegistry registry, IPlatformInboxBusMessageRepository? diInboxRepository)
        {
            var services = new ServiceCollection();
            services.AddSingleton(registry);
            if (diInboxRepository != null)
                services.AddScoped(_ => diInboxRepository);
            services.AddSingleton(new PlatformInboxConfig());
            services.AddSingleton(CreateSettingContext().Object);
            services.AddSingleton(CreateRequestContextAccessor().Object);
            var serviceProvider = services.BuildServiceProvider();

            return new HandlerHost(serviceProvider, new PlatformRootServiceProvider(serviceProvider, services));
        }

        public THandler CreateHandler<THandler>()
            where THandler : RoutingTestHandlerBase =>
            (THandler)Activator.CreateInstance(
                typeof(THandler),
                NullLoggerFactory.Instance,
                new Mock<IPlatformUnitOfWorkManager>().Object,
                serviceProvider,
                rootServiceProvider)!;

        public void Dispose() => serviceProvider.Dispose();
    }

    public sealed class TestPayload;

    private sealed class ApplicationLaneA;
    private sealed class ApplicationLaneB;
    private sealed class PersistenceStoreA;
    private sealed class PersistenceStoreB;
    private sealed class DatabaseContextA;
    private sealed class DatabaseContextB;

    public sealed class RoutingTestEvent : PlatformCqrsEvent
    {
        public override string EventType => "RoutingTest";
        public override string EventName => "RoutingTest";
        public override string EventAction => "Raised";
    }

    public abstract class RoutingTestHandlerBase : PlatformCqrsEventApplicationHandler<RoutingTestEvent>
    {
        protected RoutingTestHandlerBase(
            ILoggerFactory loggerFactory,
            IPlatformUnitOfWorkManager unitOfWorkManager,
            IServiceProvider serviceProvider,
            IPlatformRootServiceProvider rootServiceProvider)
            : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
        {
            BaseRetryDelaySeconds = 3;
            RetryOnFailedDelaySeconds = BaseRetryDelaySeconds;
        }

        public double BaseRetryDelaySeconds { get; }

        public bool InboxSupport => HasInboxMessageSupport();

        public override Task<bool> HandleWhen(RoutingTestEvent @event) => Task.FromResult(true);

        protected override Task HandleAsync(RoutingTestEvent @event, CancellationToken cancellationToken) => Task.CompletedTask;
    }

    public sealed class InboxEnabledHandler : RoutingTestHandlerBase
    {
        public InboxEnabledHandler(
            ILoggerFactory loggerFactory,
            IPlatformUnitOfWorkManager unitOfWorkManager,
            IServiceProvider serviceProvider,
            IPlatformRootServiceProvider rootServiceProvider)
            : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider) { }
    }

    public sealed class InboxDisabledHandler : RoutingTestHandlerBase
    {
        public InboxDisabledHandler(
            ILoggerFactory loggerFactory,
            IPlatformUnitOfWorkManager unitOfWorkManager,
            IServiceProvider serviceProvider,
            IPlatformRootServiceProvider rootServiceProvider)
            : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider) { }

        public override bool EnableInboxEventBusMessage => false;
    }

    private sealed class ModuleKeyedConsumer : PlatformApplicationMessageBusConsumer<TestPayload>
    {
        public ModuleKeyedConsumer(
            ILoggerFactory loggerFactory,
            IPlatformUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider,
            IPlatformRootServiceProvider rootServiceProvider)
            : base(loggerFactory, uowManager, serviceProvider, rootServiceProvider) { }

        protected override PlatformMessageBusStoreKey MessageBusStoreKey => ModuleKey;
        protected override string MessageBusApplicationName => "Lane-A";

        public IPlatformInboxBusMessageRepository SelectedInboxRepository => InboxBusMessageRepo;
        public PlatformInboxConfig SelectedInboxConfig => InboxConfig;
        public string SelectedApplicationName => ResolvedMessageBusApplicationName;

        public override Task HandleLogicAsync(TestPayload message, string routingKey) => Task.CompletedTask;
    }

    private abstract class KeyedCqrsProducerBase : PlatformCqrsEventBusMessageProducer<RoutingTestEvent, PlatformBusMessage<TestPayload>>
    {
        protected KeyedCqrsProducerBase(
            ILoggerFactory loggerFactory,
            IPlatformUnitOfWorkManager unitOfWorkManager,
            IServiceProvider serviceProvider,
            IPlatformRootServiceProvider rootServiceProvider,
            IPlatformApplicationBusMessageProducer applicationBusMessageProducer)
            : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider, applicationBusMessageProducer) { }

        protected override PlatformMessageBusStoreKey MessageBusStoreKey => ModuleKey;

        public Task SendForTest(RoutingTestEvent @event) => SendMessage(@event, CancellationToken.None);

        protected override PlatformBusMessage<TestPayload> BuildMessage(RoutingTestEvent @event) => new() { Payload = new TestPayload() };

        public override Task<bool> HandleWhen(RoutingTestEvent @event) => Task.FromResult(true);
    }

    private sealed class WarnOnceKeyedCqrsProducer : KeyedCqrsProducerBase
    {
        public WarnOnceKeyedCqrsProducer(
            ILoggerFactory loggerFactory,
            IPlatformUnitOfWorkManager unitOfWorkManager,
            IServiceProvider serviceProvider,
            IPlatformRootServiceProvider rootServiceProvider,
            IPlatformApplicationBusMessageProducer applicationBusMessageProducer)
            : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider, applicationBusMessageProducer) { }
    }

    private sealed class LegacyHostKeyedCqrsProducer : KeyedCqrsProducerBase
    {
        public LegacyHostKeyedCqrsProducer(
            ILoggerFactory loggerFactory,
            IPlatformUnitOfWorkManager unitOfWorkManager,
            IServiceProvider serviceProvider,
            IPlatformRootServiceProvider rootServiceProvider,
            IPlatformApplicationBusMessageProducer applicationBusMessageProducer)
            : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider, applicationBusMessageProducer) { }
    }

    private sealed class CountingLegacyProducer : IPlatformApplicationBusMessageProducer
    {
        public int SendCount { get; private set; }

        public Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageGroup = null!,
            string messageAction = null!,
            bool autoSaveOutboxMessage = true,
            bool forceUseDefaultRoutingKey = false,
            bool sendInNewTransactionScope = false,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformWithPayloadBusMessage<TMessagePayload>, IPlatformSelfRoutingKeyBusMessage, IPlatformTrackableBusMessage, new()
            where TMessagePayload : class, new()
        {
            SendCount++;
            return Task.FromResult(new TMessage());
        }

        public Task<TMessage> SendAsync<TMessage>(
            TMessage message,
            bool autoSaveOutboxMessage = true,
            bool forceUseDefaultRoutingKey = false,
            string sourceOutboxUowId = null!,
            bool sendInNewTransactionScope = false,
            CancellationToken cancellationToken = default)
            where TMessage : class, new()
        {
            SendCount++;
            return Task.FromResult(message);
        }

        public bool HasOutboxMessageSupport() => false;
    }

    private sealed class CapturingLoggerFactory : ILoggerFactory
    {
        private readonly ConcurrentQueue<(LogLevel Level, string Message)> entries = new();

        public IReadOnlyList<string> Warnings =>
            entries.Where(entry => entry.Level == LogLevel.Warning).Select(entry => entry.Message).ToList();

        public ILogger CreateLogger(string categoryName) => new CapturingLogger(entries);

        public void AddProvider(ILoggerProvider provider) { }

        public void Dispose() { }

        private sealed class CapturingLogger(ConcurrentQueue<(LogLevel Level, string Message)> entries) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

            public bool IsEnabled(LogLevel logLevel) => true;

            public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            {
                entries.Enqueue((logLevel, formatter(state, exception)));
            }
        }
    }
}
