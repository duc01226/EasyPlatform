using System.Linq.Expressions;
using Easy.Platform.Application;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Application.MessageBus.Producers;
using Easy.Platform.Application.MessageBus.Store;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.Validations.Extensions;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using PlatformExampleApp.TaskManagement.Application;
using PlatformExampleApp.TaskManagement.Application.DataSeeders;
using PlatformExampleApp.TaskManagement.Application.MessageBus.Consumers;
using PlatformExampleApp.TaskManagement.Application.MessageBus.Producers;
using PlatformExampleApp.TaskManagement.Application.UseCaseEvents.TaskBoardItem;
using PlatformExampleApp.TaskManagement.Contracts.Messages;
using PlatformExampleApp.TaskManagement.Domain.Entities;
using PlatformExampleApp.TaskManagement.Domain.Repositories;

namespace PlatformExampleApp.Tests.Unit.TaskManagement;

/// <summary>
/// Pipeline contracts for the TaskManagement modular-monolith proof of concept. The tests assert module-owned
/// aggregate/projection state and stable routing identity; broker, inbox, and outbox bookkeeping is infrastructure
/// state and is intentionally outside these assertions.
/// </summary>
public sealed class TaskManagementApplicationPipelineTests
{
    // TC-EVT-101: a created aggregate event reaches the internal projection handler and writes owned business state.
    [Fact]
    [Trait("TechnicalSpec", "TC-EVT-101")]
    public async Task CreatedAggregateEvent_UpdatesProjectionThroughInternalEventHandler()
    {
        var item = TaskBoardItemEntity.Create("task-101", "Internal projection").EnsureValid();
        var entityEvent = new PlatformCqrsEntityEvent<TaskBoardItemEntity>(
            item,
            PlatformCqrsEntityEventCrudAction.Created);
        var persistedProjections = new List<TaskBoardItemProjectionEntity>();
        var repository = CreateProjectionRepository(persistedProjections);
        var handler = CreateProjectionHandler(repository.Object, CreateTaskRepository(item).Object);

        (await handler.HandleWhen(entityEvent)).Should().BeTrue();
        await handler.InvokeHandleAsync(entityEvent, CancellationToken.None);

        repository.Invocations.Should().ContainSingle(invocation =>
            invocation.Method.Name == nameof(ITaskManagementProjectionRepository<TaskBoardItemProjectionEntity>.CreateAsync));

        var savedProjection = persistedProjections.Should().ContainSingle().Subject;

        savedProjection.TaskId.Should().Be(item.Id);
        savedProjection.Title.Should().Be(item.Title);
        savedProjection.Status.Should().Be(TaskBoardItemStatus.Open);
        savedProjection.TaskConcurrencyUpdateToken.Should().Be(item.ConcurrencyUpdateToken);
        savedProjection.SourceEventId.Should().Be(item.FindDomainEvents<TaskBoardItemCreatedDomainEvent>().Single().SourceEventId);
        savedProjection.Id.Should().Be(TaskBoardItemProjectionEntity.CreateDeterministicId(item.Id));
    }

    // TC-EVT-107: an aggregate change updates the same per-task projection, and out-of-order delivery cannot regress it.
    [Fact]
    [Trait("TechnicalSpec", "TC-EVT-107")]
    public async Task UpdatedAggregateEvent_AppliesNewStatusToExistingProjection()
    {
        var item = TaskBoardItemEntity.Create("task-107", "Status projection").EnsureValid();
        var createdEvent = item.FindDomainEvents<TaskBoardItemCreatedDomainEvent>().Single();
        var staleSnapshot = TaskBoardItemEntity.Reconstitute(item.Id, item.Title, item.Status, item.ConcurrencyUpdateToken);
        var persistedProjections = new List<TaskBoardItemProjectionEntity>
        {
            TaskBoardItemProjectionEntity.ApplyCreatedEvent(createdEvent).EnsureValid()
        };
        var repository = CreateProjectionRepository(persistedProjections);

        // The committed aggregate is newer than the stale event snapshot: status changed and persistence rotated the token.
        var committedItem = TaskBoardItemEntity.Reconstitute(item.Id, item.Title, TaskBoardItemStatus.InProgress, "token-after-update");
        var handler = CreateProjectionHandler(repository.Object, CreateTaskRepository(committedItem).Object);
        var updatedEvent = new PlatformCqrsEntityEvent<TaskBoardItemEntity>(committedItem, PlatformCqrsEntityEventCrudAction.Updated);

        (await handler.HandleWhen(updatedEvent)).Should().BeTrue();
        await handler.InvokeHandleAsync(updatedEvent, CancellationToken.None);

        persistedProjections.Should().ContainSingle();
        persistedProjections[0].Id.Should().Be(TaskBoardItemProjectionEntity.CreateDeterministicId("task-107"));
        persistedProjections[0].Status.Should().Be(TaskBoardItemStatus.InProgress);
        persistedProjections[0].TaskConcurrencyUpdateToken.Should().Be("token-after-update");
        persistedProjections[0].SourceEventId.Should().Be(createdEvent.SourceEventId);

        // An older update delivered late carries the stale snapshot, but the handler reloads the committed aggregate.
        await handler.InvokeHandleAsync(
            new PlatformCqrsEntityEvent<TaskBoardItemEntity>(staleSnapshot, PlatformCqrsEntityEventCrudAction.Updated),
            CancellationToken.None);

        // A late replay of the creation event must not regress the projected status either.
        await handler.InvokeHandleAsync(
            new PlatformCqrsEntityEvent<TaskBoardItemEntity>(
                TaskBoardItemEntity.Create("task-107", "Status projection").EnsureValid(),
                PlatformCqrsEntityEventCrudAction.Created),
            CancellationToken.None);

        persistedProjections.Should().ContainSingle();
        persistedProjections[0].Status.Should().Be(TaskBoardItemStatus.InProgress);
        persistedProjections[0].TaskConcurrencyUpdateToken.Should().Be("token-after-update");
        persistedProjections[0].SourceEventId.Should().Be(createdEvent.SourceEventId);
    }

    // TC-EVT-102: the same seeder can run twice without producing duplicate deterministic aggregates.
    [Fact]
    [Trait("TechnicalSpec", "TC-EVT-102")]
    public async Task Seeder_RunTwice_ConvergesToOneAggregatePerDeterministicSeedId()
    {
        var persistedItems = new Dictionary<string, TaskBoardItemEntity>(StringComparer.Ordinal);
        var repository = new Mock<ITaskManagementRootRepository<TaskBoardItemEntity>> { CallBase = true };

        repository
            .Setup(itemRepository => itemRepository.AnyAsync(
                It.IsAny<Expression<Func<TaskBoardItemEntity, bool>>>(),
                It.IsAny<CancellationToken>()))
            .Returns((Expression<Func<TaskBoardItemEntity, bool>> predicate, CancellationToken _) =>
                Task.FromResult(persistedItems.Values.AsQueryable().Any(predicate.Compile())));
        repository
            .Setup(itemRepository => itemRepository.CreateAsync(
                It.IsAny<TaskBoardItemEntity>(),
                It.IsAny<bool>(),
                It.IsAny<Action<PlatformCqrsEntityEvent>>(),
                It.IsAny<CancellationToken>()))
            .Callback<TaskBoardItemEntity, bool, Action<PlatformCqrsEntityEvent>, CancellationToken>(
                (entity, _, _, _) => persistedItems[entity.Id] = entity)
            .Returns((TaskBoardItemEntity entity, bool _, Action<PlatformCqrsEntityEvent> __, CancellationToken ___) =>
                Task.FromResult(entity));

        var testContext = BuildTestContext();
        var seeder = new TaskManagementApplicationDataSeeder(
            Mock.Of<IPlatformUnitOfWorkManager>(),
            testContext.ServiceProvider,
            new ConfigurationBuilder().Build(),
            NullLoggerFactory.Instance,
            testContext.RootServiceProvider,
            repository.Object);

        await seeder.SeedData();
        await seeder.SeedData();

        persistedItems.Keys.Should().BeEquivalentTo(
            "taskmanagement-demo-001",
            "taskmanagement-demo-002",
            "taskmanagement-demo-003");
        persistedItems.Values.Should().OnlyContain(item => item.Status == TaskBoardItemStatus.Open);
        repository.Invocations.Count(invocation => invocation.Method.Name == nameof(ITaskManagementRootRepository<TaskBoardItemEntity>.CreateAsync))
            .Should().Be(3);
    }

    // TC-EVT-103: replaying the same transport message converges to one owned projection, and a later transport
    // delivery never overwrites it.
    [Fact]
    [Trait("TechnicalSpec", "TC-EVT-103")]
    public async Task IntegrationConsumer_ReplayingSameMessage_ConvergesToOneProjection()
    {
        var persistedProjections = new List<TaskBoardItemProjectionEntity>();
        var repository = CreateProjectionRepository(persistedProjections);
        var testContext = BuildTestContext();
        var consumer = new TaskBoardItemCreatedIntegrationEventConsumer(
            NullLoggerFactory.Instance,
            Mock.Of<IPlatformUnitOfWorkManager>(),
            testContext.ServiceProvider,
            testContext.RootServiceProvider,
            repository.Object);
        var message = CreateCreatedMessage("source-event-103", "task-103", "Replay-safe projection");

        await consumer.HandleLogicAsync(message, "unused-routing-key");
        await consumer.HandleLogicAsync(message, "unused-routing-key");
        await consumer.HandleLogicAsync(
            CreateCreatedMessage("source-event-103-late", "task-103", "Late different title"),
            "unused-routing-key");

        persistedProjections.Should().ContainSingle();
        persistedProjections[0].Id.Should().Be(
            TaskBoardItemProjectionEntity.CreateDeterministicId("task-103"));
        persistedProjections[0].SourceEventId.Should().Be("source-event-103");
        persistedProjections[0].Title.Should().Be("Replay-safe projection");
        persistedProjections[0].Status.Should().Be(TaskBoardItemStatus.Open);
        repository.Invocations.Count(invocation =>
                invocation.Method.Name == nameof(ITaskManagementProjectionRepository<TaskBoardItemProjectionEntity>.CreateAsync))
            .Should()
            .Be(1, "only the first delivery materializes the missing row");
    }

    // TC-EVT-104: producer and consumer both declare the TaskManagement lane explicitly.
    [Fact]
    [Trait("TechnicalSpec", "TC-EVT-104")]
    public void ProducerAndConsumer_ResolveTheSameExplicitTaskManagementStoreKey()
    {
        var testContext = BuildTestContext();
        var projectionRepository = CreateProjectionRepository([]);
        var producer = new TestableIntegrationProducer(
            NullLoggerFactory.Instance,
            Mock.Of<IPlatformUnitOfWorkManager>(),
            testContext.ServiceProvider,
            testContext.RootServiceProvider,
            Mock.Of<IPlatformApplicationBusMessageProducer>());
        var consumer = new TestableIntegrationConsumer(
            NullLoggerFactory.Instance,
            Mock.Of<IPlatformUnitOfWorkManager>(),
            testContext.ServiceProvider,
            testContext.RootServiceProvider,
            projectionRepository.Object);

        producer.SelectedStoreKey.Should().Be(consumer.SelectedStoreKey);
        producer.SelectedStoreKey.Should().Be(new PlatformMessageBusStoreKey(TaskManagementApplicationModule.MessageBusStoreKeyValue));
        producer.SelectedStoreKey.Should().NotBe(PlatformMessageBusStoreKey.Default);
        producer.SelectedApplicationName.Should().Be(consumer.SelectedApplicationName);
        producer.SelectedApplicationName.Should().Contain("PlatformExampleApp.TaskManagement.Application");

        var item = TaskBoardItemEntity.Create("task-104", "Stable event identity").EnsureValid();
        var sourceEvent = item.FindDomainEvents<TaskBoardItemCreatedDomainEvent>().Single();
        var message = producer.Build(new PlatformCqrsEntityEvent<TaskBoardItemEntity>(
            item,
            PlatformCqrsEntityEventCrudAction.Created));

        message.TrackingId.Should().Be(sourceEvent.SourceEventId);
        message.TaskId.Should().Be("task-104");
        message.Title.Should().Be("Stable event identity");
        message.Status.Should().Be(nameof(TaskBoardItemStatus.Open));
    }

    // TC-EVT-105: the production consumer path resolves the TaskManagement lane, retries a transient write failure within
    // its bounded budget, and converges on owned state; a persistent failure exhausts the budget and surfaces.
    [Fact]
    [Trait("TechnicalSpec", "TC-EVT-105")]
    public async Task IntegrationConsumer_TransientWriteFailure_RetriesWithinBoundedAttemptWindow()
    {
        var persistedProjections = new List<TaskBoardItemProjectionEntity>();
        var writeAttempts = 0;
        var repository = CreateProjectionRepository(
            persistedProjections,
            beforeWrite: () =>
            {
                writeAttempts++;
                if (writeAttempts == 1)
                    throw new InvalidOperationException("transient projection store failure");
            });
        var testContext = BuildTestContext(withTaskManagementLane: true);
        var consumer = CreateProductionConsumer(testContext, repository.Object);

        await consumer.HandleMessageDirectly(
            CreateCreatedMessage("source-event-105", "task-105", "Transient recovery"),
            "unused-routing-key",
            retryCount: 1);

        writeAttempts.Should().Be(2);
        persistedProjections.Should().ContainSingle(projection =>
            projection.TaskId == "task-105" &&
            projection.SourceEventId == "source-event-105" &&
            projection.Title == "Transient recovery");
        testContext.RegistryLookups.Should().Contain(TaskManagementApplicationModule.MessageBusStoreKeyInstance);
    }

    // TC-EVT-105 (exhaustion): a failure that persists past the retry budget is rethrown and writes nothing.
    [Fact]
    [Trait("TechnicalSpec", "TC-EVT-105")]
    public async Task IntegrationConsumer_PersistentWriteFailure_ExhaustsRetryBudgetAndThrows()
    {
        var persistedProjections = new List<TaskBoardItemProjectionEntity>();
        var writeAttempts = 0;
        var repository = CreateProjectionRepository(
            persistedProjections,
            beforeWrite: () =>
            {
                writeAttempts++;
                throw new InvalidOperationException("persistent projection store failure");
            });
        var testContext = BuildTestContext(withTaskManagementLane: true);
        var consumer = CreateProductionConsumer(testContext, repository.Object);

        var handle = () => consumer.HandleMessageDirectly(
            CreateCreatedMessage("source-event-105-exhausted", "task-105-exhausted", "Never persisted"),
            "unused-routing-key",
            retryCount: 1);

        await handle.Should().ThrowAsync<InvalidOperationException>().WithMessage("persistent projection store failure");
        writeAttempts.Should().Be(2, "one initial attempt plus exactly one retry");
        persistedProjections.Should().BeEmpty();
    }

    private static TaskBoardItemCreatedIntegrationEvent CreateCreatedMessage(string trackingId, string taskId, string title)
    {
        return new TaskBoardItemCreatedIntegrationEvent
        {
            TrackingId = trackingId,
            TaskId = taskId,
            Title = title,
            Status = nameof(TaskBoardItemStatus.Open)
        };
    }

    private static TestableProjectionEventHandler CreateProjectionHandler(
        ITaskManagementProjectionRepository<TaskBoardItemProjectionEntity> projectionRepository,
        ITaskManagementRootRepository<TaskBoardItemEntity> taskRepository)
    {
        var testContext = BuildTestContext();

        return new TestableProjectionEventHandler(
            NullLoggerFactory.Instance,
            Mock.Of<IPlatformUnitOfWorkManager>(),
            testContext.ServiceProvider,
            testContext.RootServiceProvider,
            projectionRepository,
            taskRepository);
    }

    /// <summary>
    /// The unmodified production consumer, with retry delays zeroed and a unit-of-work manager whose default
    /// <c>ExecuteUowTask</c> runs inside a no-op active unit of work.
    /// </summary>
    private static TaskBoardItemCreatedIntegrationEventConsumer CreateProductionConsumer(
        TestContext testContext,
        ITaskManagementProjectionRepository<TaskBoardItemProjectionEntity> projectionRepository)
    {
        var activeUnitOfWork = new Mock<IPlatformUnitOfWork>();
        activeUnitOfWork.Setup(unitOfWork => unitOfWork.SaveChangesAsync(It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        var unitOfWorkManager = new Mock<IPlatformUnitOfWorkManager> { CallBase = true };
        unitOfWorkManager.Setup(manager => manager.TryGetCurrentActiveUow()).Returns(activeUnitOfWork.Object);

        return new TaskBoardItemCreatedIntegrationEventConsumer(
            NullLoggerFactory.Instance,
            unitOfWorkManager.Object,
            testContext.ServiceProvider,
            testContext.RootServiceProvider,
            projectionRepository)
        {
            RetryOnFailedDelaySeconds = 0,
            MaxRetryOnFailedDelaySeconds = 0
        };
    }

    private static Mock<ITaskManagementRootRepository<TaskBoardItemEntity>> CreateTaskRepository(TaskBoardItemEntity committedItem)
    {
        var repository = new Mock<ITaskManagementRootRepository<TaskBoardItemEntity>>();

        repository
            .Setup(itemRepository => itemRepository.FirstOrDefaultAsync(
                It.IsAny<Expression<Func<TaskBoardItemEntity, bool>>>(),
                It.IsAny<CancellationToken>(),
                It.IsAny<Expression<Func<TaskBoardItemEntity, object?>>[]>()))
            .Returns((
                Expression<Func<TaskBoardItemEntity, bool>> predicate,
                CancellationToken _,
                Expression<Func<TaskBoardItemEntity, object?>>[] __) =>
                Task.FromResult(new[] { committedItem }.AsQueryable().FirstOrDefault(predicate.Compile())!));

        return repository;
    }

    private static Mock<ITaskManagementProjectionRepository<TaskBoardItemProjectionEntity>> CreateProjectionRepository(
        List<TaskBoardItemProjectionEntity> persistedProjections,
        Action? beforeWrite = null)
    {
        var repository = new Mock<ITaskManagementProjectionRepository<TaskBoardItemProjectionEntity>>();

        repository
            .Setup(itemRepository => itemRepository.FirstOrDefaultAsync(
                It.IsAny<Expression<Func<TaskBoardItemProjectionEntity, bool>>>(),
                It.IsAny<CancellationToken>(),
                It.IsAny<Expression<Func<TaskBoardItemProjectionEntity, object?>>[]>()))
            .Returns((
                Expression<Func<TaskBoardItemProjectionEntity, bool>> predicate,
                CancellationToken _,
                Expression<Func<TaskBoardItemProjectionEntity, object?>>[] __) =>
                Task.FromResult(persistedProjections.AsQueryable().FirstOrDefault(predicate.Compile())!));
        repository
            .Setup(itemRepository => itemRepository.CreateAsync(
                It.IsAny<TaskBoardItemProjectionEntity>(),
                It.IsAny<bool>(),
                It.IsAny<Action<PlatformCqrsEntityEvent>>(),
                It.IsAny<CancellationToken>()))
            .Returns((TaskBoardItemProjectionEntity projection, bool _, Action<PlatformCqrsEntityEvent> __, CancellationToken ___) =>
            {
                beforeWrite?.Invoke();
                persistedProjections.Add(projection);
                return Task.FromResult(projection);
            });
        repository
            .Setup(itemRepository => itemRepository.CreateOrUpdateAsync(
                It.IsAny<TaskBoardItemProjectionEntity>(),
                It.IsAny<Expression<Func<TaskBoardItemProjectionEntity, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                It.IsAny<Action<PlatformCqrsEntityEvent>>(),
                It.IsAny<CancellationToken>()))
            .Callback<TaskBoardItemProjectionEntity, Expression<Func<TaskBoardItemProjectionEntity, bool>>, bool, bool, Action<PlatformCqrsEntityEvent>, CancellationToken>(
                (projection, _, _, _, _, _) =>
                {
                    beforeWrite?.Invoke();
                    persistedProjections.RemoveAll(existing => existing.Id == projection.Id);
                    persistedProjections.Add(projection);
                })
            .Returns((TaskBoardItemProjectionEntity projection, Expression<Func<TaskBoardItemProjectionEntity, bool>> _, bool __, bool ___, Action<PlatformCqrsEntityEvent> ____, CancellationToken _____) =>
                Task.FromResult(projection));

        return repository;
    }

    private static TestContext BuildTestContext(bool withTaskManagementLane = false)
    {
        var requestContext = new Mock<IPlatformApplicationRequestContext>();
        var requestContextAccessor = new Mock<IPlatformApplicationRequestContextAccessor>();
        requestContextAccessor.SetupGet(accessor => accessor.Current).Returns(requestContext.Object);

        var applicationSettingContext = new Mock<IPlatformApplicationSettingContext>();
        applicationSettingContext
            .SetupGet(context => context.ProcessEventEnsureNoCircularPipeLineMaxCircularCount)
            .Returns(IPlatformApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCountDefaultValue);

        var serviceCollection = new ServiceCollection();
        serviceCollection.AddSingleton<IPlatformApplicationRequestContextAccessor>(requestContextAccessor.Object);
        serviceCollection.AddSingleton<IPlatformApplicationSettingContext>(applicationSettingContext.Object);
        var serviceProvider = serviceCollection.BuildServiceProvider();

        var registryLookups = new List<PlatformMessageBusStoreKey>();
        var rootServiceProvider = new Mock<IPlatformRootServiceProvider>();
        rootServiceProvider
            .Setup(provider => provider.GetService(typeof(IPlatformApplicationSettingContext)))
            .Returns(applicationSettingContext.Object);

        if (withTaskManagementLane)
        {
            rootServiceProvider
                .Setup(provider => provider.GetService(typeof(IPlatformMessageBusStoreRegistry)))
                .Returns(CreateTaskManagementOnlyRegistry(registryLookups));
        }

        return new TestContext(serviceProvider, rootServiceProvider.Object, registryLookups);
    }

    /// <summary>
    /// A composed runtime registry holding only the TaskManagement store, bound without an inbox repository so the
    /// production consumer takes its direct (retrying) handling path.
    /// </summary>
    private static IPlatformMessageBusStoreRegistry CreateTaskManagementOnlyRegistry(List<PlatformMessageBusStoreKey> lookups)
    {
        var storeKey = TaskManagementApplicationModule.MessageBusStoreKeyInstance;
        var descriptor = new PlatformMessageBusStoreDescriptor(
            storeKey,
            new PlatformPersistenceMessageBusStoreRegistration(
                storeKey,
                persistenceOwnerType: typeof(TaskManagementApplicationPipelineTests),
                persistenceContextType: typeof(TaskManagementApplicationPipelineTests),
                inboxRepositoryServiceType: null,
                outboxRepositoryServiceType: null,
                unitOfWorkManagerServiceType: null,
                inboxRepositoryFactory: null,
                outboxRepositoryFactory: null,
                unitOfWorkManagerFactory: null),
            [
                new PlatformMessageBusApplicationLaneRegistration(
                    storeKey,
                    typeof(TaskManagementApplicationModule),
                    TaskManagementApplicationModule.MessageBusApplicationNameValue,
                    typeof(TaskManagementApplicationModule).Assembly,
                    _ => new PlatformInboxConfig(),
                    _ => new PlatformOutboxConfig())
            ]);
        var registry = new Mock<IPlatformMessageBusStoreRegistry>();

        registry.SetupGet(storeRegistry => storeRegistry.HasRuntimeStoreComposition).Returns(true);
        registry
            .Setup(storeRegistry => storeRegistry.Get(It.IsAny<PlatformMessageBusStoreKey>()))
            .Returns((PlatformMessageBusStoreKey requestedKey) =>
            {
                lookups.Add(requestedKey);

                return requestedKey == storeKey
                    ? descriptor
                    : throw new InvalidOperationException($"No message-bus store is bound for key '{requestedKey}'.");
            });

        return registry.Object;
    }

    private sealed record TestContext(
        ServiceProvider ServiceProvider,
        IPlatformRootServiceProvider RootServiceProvider,
        List<PlatformMessageBusStoreKey> RegistryLookups);

    private sealed class TestableProjectionEventHandler : TaskBoardItemProjectionEventHandler
    {
        public TestableProjectionEventHandler(
            Microsoft.Extensions.Logging.ILoggerFactory loggerFactory,
            IPlatformUnitOfWorkManager unitOfWorkManager,
            IServiceProvider serviceProvider,
            IPlatformRootServiceProvider rootServiceProvider,
            ITaskManagementProjectionRepository<TaskBoardItemProjectionEntity> projectionRepository,
            ITaskManagementRootRepository<TaskBoardItemEntity> taskBoardItemRepository)
            : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider, projectionRepository, taskBoardItemRepository)
        {
        }

        public Task InvokeHandleAsync(
            PlatformCqrsEntityEvent<TaskBoardItemEntity> entityEvent,
            CancellationToken cancellationToken)
        {
            return HandleAsync(entityEvent, cancellationToken);
        }
    }

    private sealed class TestableIntegrationProducer : TaskBoardItemCreatedIntegrationEventProducer
    {
        public TestableIntegrationProducer(
            Microsoft.Extensions.Logging.ILoggerFactory loggerFactory,
            IPlatformUnitOfWorkManager unitOfWorkManager,
            IServiceProvider serviceProvider,
            IPlatformRootServiceProvider rootServiceProvider,
            IPlatformApplicationBusMessageProducer applicationBusMessageProducer)
            : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider, applicationBusMessageProducer)
        {
        }

        public PlatformMessageBusStoreKey SelectedStoreKey => MessageBusStoreKey;

        public string SelectedApplicationName => MessageBusApplicationName;

        public TaskBoardItemCreatedIntegrationEvent Build(PlatformCqrsEntityEvent<TaskBoardItemEntity> entityEvent)
        {
            return BuildMessage(entityEvent);
        }
    }

    private sealed class TestableIntegrationConsumer : TaskBoardItemCreatedIntegrationEventConsumer
    {
        public TestableIntegrationConsumer(
            Microsoft.Extensions.Logging.ILoggerFactory loggerFactory,
            IPlatformUnitOfWorkManager unitOfWorkManager,
            IServiceProvider serviceProvider,
            IPlatformRootServiceProvider rootServiceProvider,
            ITaskManagementProjectionRepository<TaskBoardItemProjectionEntity> projectionRepository)
            : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider, projectionRepository)
        {
        }

        public PlatformMessageBusStoreKey SelectedStoreKey => MessageBusStoreKey;

        public string SelectedApplicationName => MessageBusApplicationName;
    }
}
