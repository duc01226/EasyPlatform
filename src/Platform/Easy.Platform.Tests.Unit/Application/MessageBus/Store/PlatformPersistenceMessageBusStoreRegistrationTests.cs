using Easy.Platform.Application;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Application.MessageBus.Store;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.EfCore;
using Easy.Platform.EfCore.Domain.UnitOfWork;
using Easy.Platform.MongoDB;
using Easy.Platform.MongoDB.Domain.UnitOfWork;
using Easy.Platform.MongoDB.Migration;
using Easy.Platform.Persistence;
using Easy.Platform.Persistence.DataMigration;
using Easy.Platform.Tests.Unit.Common.Modules;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using Moq;

namespace Easy.Platform.Tests.Unit.Application.MessageBus.Store;

/// <summary>
/// Executable proof that provider persistence modules publish a closed, context-owned message-store contract.
/// The tests build registrations without opening MongoDB or an EF connection; only the Mongo driver namespace
/// objects and the final DI service graph are exercised.
/// </summary>
public sealed class PlatformPersistenceMessageBusStoreRegistrationTests : PlatformModuleTestBase
{
    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-201")]
    public void MongoAndEfPersistenceModules_PublishClosedRepositoryAndInnerUnitOfWorkContracts()
    {
        var (services, configuration) = NewHost();
        var mongoModule = CreateModule<TestMongoPersistenceModule>(services, configuration);
        mongoModule.RegisterServices(services);

        var efModule = CreateModule<TestEfPersistenceModule>(services, configuration);
        efModule.RegisterServices(services);

        var contributions = GetPersistenceContributions(services);
        contributions.Should().HaveCount(2);

        var mongoContribution = contributions.Single(p => p.PersistenceContextType == typeof(TestMongoDbContext));
        mongoContribution.PersistenceOwnerType.Should().Be(typeof(TestMongoPersistenceModule));
        mongoContribution.InboxRepositoryServiceType.Should().Be(typeof(IPlatformInboxBusMessageRepository<TestMongoDbContext>));
        mongoContribution.OutboxRepositoryServiceType.Should().Be(typeof(IPlatformOutboxBusMessageRepository<TestMongoDbContext>));
        mongoContribution.UnitOfWorkManagerServiceType.Should().Be(typeof(IPlatformUnitOfWorkManager));
        mongoContribution.UnitOfWorkServiceType.Should().Be(typeof(IPlatformMongoDbPersistenceUnitOfWork<TestMongoDbContext>));
        mongoContribution.IsRuntimeEnabled.Should().BeTrue();
        mongoContribution.IsInboxEnabled.Should().BeTrue();
        mongoContribution.IsOutboxEnabled.Should().BeTrue();
        mongoContribution.IsUnitOfWorkEnabled.Should().BeTrue();

        var efContribution = contributions.Single(p => p.PersistenceContextType == typeof(TestEfDbContext));
        efContribution.PersistenceOwnerType.Should().Be(typeof(TestEfPersistenceModule));
        efContribution.InboxRepositoryServiceType.Should().Be(typeof(IPlatformInboxBusMessageRepository<TestEfDbContext>));
        efContribution.OutboxRepositoryServiceType.Should().Be(typeof(IPlatformOutboxBusMessageRepository<TestEfDbContext>));
        efContribution.UnitOfWorkManagerServiceType.Should().Be(typeof(IPlatformUnitOfWorkManager));
        efContribution.UnitOfWorkServiceType.Should().Be(typeof(IPlatformEfCorePersistenceUnitOfWork<TestEfDbContext>));
        efContribution.IsRuntimeEnabled.Should().BeTrue();
        efContribution.IsInboxEnabled.Should().BeTrue();
        efContribution.IsOutboxEnabled.Should().BeTrue();
        efContribution.IsUnitOfWorkEnabled.Should().BeTrue();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-202")]
    public void DistinctStoreKeys_ResolveClosedRepositoriesInnerUnitOfWorkAndLaneConfiguration()
    {
        var (services, configuration) = NewHost();
        var mongoModule = CreateModule<TestMongoPersistenceModule>(services, configuration);
        mongoModule.RegisterServices(services);

        var efModule = CreateModule<TestEfPersistenceModule>(services, configuration);
        efModule.RegisterServices(services);

        var mongoInbox = new Mock<IPlatformInboxBusMessageRepository<TestMongoDbContext>>().Object;
        var mongoOutbox = new Mock<IPlatformOutboxBusMessageRepository<TestMongoDbContext>>().Object;
        var mongoUnitOfWork = new Mock<IPlatformMongoDbPersistenceUnitOfWork<TestMongoDbContext>>().Object;
        var efInbox = new Mock<IPlatformInboxBusMessageRepository<TestEfDbContext>>().Object;
        var efOutbox = new Mock<IPlatformOutboxBusMessageRepository<TestEfDbContext>>().Object;
        var efUnitOfWork = new Mock<IPlatformEfCorePersistenceUnitOfWork<TestEfDbContext>>().Object;
        var unitOfWorkManager = new Mock<IPlatformUnitOfWorkManager>().Object;
        var unqualifiedInbox = new Mock<IPlatformInboxBusMessageRepository>().Object;
        var unqualifiedOutbox = new Mock<IPlatformOutboxBusMessageRepository>().Object;

        // These explicit test registrations are deliberately appended after both provider adapters. They make the
        // factory result observable while retaining a different sentinel behind the unqualified compatibility path.
        services.AddSingleton<IPlatformInboxBusMessageRepository<TestMongoDbContext>>(mongoInbox);
        services.AddSingleton<IPlatformOutboxBusMessageRepository<TestMongoDbContext>>(mongoOutbox);
        services.AddSingleton<IPlatformMongoDbPersistenceUnitOfWork<TestMongoDbContext>>(mongoUnitOfWork);
        services.AddSingleton<IPlatformInboxBusMessageRepository<TestEfDbContext>>(efInbox);
        services.AddSingleton<IPlatformOutboxBusMessageRepository<TestEfDbContext>>(efOutbox);
        services.AddSingleton<IPlatformEfCorePersistenceUnitOfWork<TestEfDbContext>>(efUnitOfWork);
        services.AddSingleton<IPlatformUnitOfWorkManager>(unitOfWorkManager);
        services.AddSingleton<IPlatformInboxBusMessageRepository>(unqualifiedInbox);
        services.AddSingleton<IPlatformOutboxBusMessageRepository>(unqualifiedOutbox);

        using var serviceProvider = services.BuildServiceProvider();
        var mongoKey = new PlatformMessageBusStoreKey("Mongo");
        var efKey = new PlatformMessageBusStoreKey("Ef");
        var contributions = serviceProvider.GetServices<PlatformPersistenceMessageBusStoreRegistration>().ToList();
        var registry = new PlatformMessageBusStoreRegistry(
            [
                CreateApplicationLane(mongoKey, typeof(MongoApplicationLane), "MongoApp", 101),
                CreateApplicationLane(efKey, typeof(EfApplicationLane), "EfApp", 202)
            ],
            contributions,
            [
                new PlatformMessageBusStoreBinding(mongoKey, typeof(MongoApplicationLane), typeof(TestMongoPersistenceModule)),
                new PlatformMessageBusStoreBinding(efKey, typeof(EfApplicationLane), typeof(TestEfPersistenceModule))
            ],
            isStrictCompositionValidationEnabled: true);

        registry.Validate();

        var mongoDescriptor = registry.Get(mongoKey);
        var efDescriptor = registry.Get(efKey);

        mongoDescriptor.ResolveInboxRepository(serviceProvider).Should().BeSameAs(mongoInbox);
        mongoDescriptor.ResolveOutboxRepository(serviceProvider).Should().BeSameAs(mongoOutbox);
        mongoDescriptor.ResolveUnitOfWork(serviceProvider).Should().BeSameAs(mongoUnitOfWork);
        mongoDescriptor.ResolveUnitOfWorkManager(serviceProvider).Should().BeSameAs(unitOfWorkManager);
        mongoDescriptor.ResolveInboxConfig(serviceProvider, typeof(MongoApplicationLane)).MaxStoreProcessedMessageCount.Should().Be(101);

        efDescriptor.ResolveInboxRepository(serviceProvider).Should().BeSameAs(efInbox);
        efDescriptor.ResolveOutboxRepository(serviceProvider).Should().BeSameAs(efOutbox);
        efDescriptor.ResolveUnitOfWork(serviceProvider).Should().BeSameAs(efUnitOfWork);
        efDescriptor.ResolveUnitOfWorkManager(serviceProvider).Should().BeSameAs(unitOfWorkManager);
        efDescriptor.ResolveOutboxConfig(serviceProvider, typeof(EfApplicationLane)).MaxStoreProcessedMessageCount.Should().Be(202);

        serviceProvider.GetRequiredService<IPlatformInboxBusMessageRepository>().Should().BeSameAs(unqualifiedInbox);
        serviceProvider.GetRequiredService<IPlatformOutboxBusMessageRepository>().Should().BeSameAs(unqualifiedOutbox);
        mongoDescriptor.InboxRepositoryServiceType.Should().NotBe(typeof(IPlatformInboxBusMessageRepository));
        efDescriptor.InboxRepositoryServiceType.Should().NotBe(typeof(IPlatformInboxBusMessageRepository));
        mongoDescriptor.UnitOfWorkServiceType.Should().NotBe(efDescriptor.UnitOfWorkServiceType);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-203")]
    public void CrossDatabaseMigrationOnlyPersistenceModule_PublishesContextOnlyNonRuntimeContribution()
    {
        var (services, configuration) = NewHost();
        var module = CreateModule<TestMongoMigrationOnlyPersistenceModule>(services, configuration);
        module.RegisterServices(services);

        var contribution = GetPersistenceContributions(services).Should().ContainSingle().Subject;

        contribution.IsRuntimeEnabled.Should().BeFalse();
        contribution.IsInboxEnabled.Should().BeFalse();
        contribution.IsOutboxEnabled.Should().BeFalse();
        contribution.IsUnitOfWorkEnabled.Should().BeFalse();
        contribution.InboxRepositoryServiceType.Should().BeNull();
        contribution.OutboxRepositoryServiceType.Should().BeNull();
        contribution.UnitOfWorkManagerServiceType.Should().BeNull();
        contribution.UnitOfWorkServiceType.Should().BeNull();
        contribution.InboxRepositoryFactory.Should().BeNull();
        contribution.OutboxRepositoryFactory.Should().BeNull();
        contribution.UnitOfWorkManagerFactory.Should().BeNull();
        contribution.UnitOfWorkFactory.Should().BeNull();

        services.Should().Contain(p => p.ServiceType == typeof(TestMongoDbContext));
        services.Should().NotContain(p => p.ServiceType == typeof(IPlatformInboxBusMessageRepository<TestMongoDbContext>));
        services.Should().NotContain(p => p.ServiceType == typeof(IPlatformOutboxBusMessageRepository<TestMongoDbContext>));
        services.Should().NotContain(p => p.ServiceType == typeof(IPlatformMongoDbPersistenceUnitOfWork<TestMongoDbContext>));
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-203")]
    public void RuntimeStoreSelection_IgnoresSameKeyMigrationOnlyContribution()
    {
        var (services, configuration) = NewHost();
        var runtimeModule = CreateModule<TestMongoPersistenceModule>(services, configuration);
        runtimeModule.RegisterServices(services);

        var migrationOnlyModule = CreateModule<TestMongoMigrationOnlyPersistenceModule>(services, configuration);
        migrationOnlyModule.RegisterServices(services);

        using var serviceProvider = services.BuildServiceProvider();
        var key = new PlatformMessageBusStoreKey("Mongo");
        var registry = new PlatformMessageBusStoreRegistry(
            [CreateApplicationLane(key, typeof(MongoApplicationLane), "MongoApp", 101)],
            serviceProvider.GetServices<PlatformPersistenceMessageBusStoreRegistration>(),
            [new PlatformMessageBusStoreBinding(key, typeof(MongoApplicationLane), typeof(TestMongoPersistenceModule))],
            isStrictCompositionValidationEnabled: true);

        registry.Validate();

        var descriptor = registry.Get(key);
        descriptor.PersistenceOwnerType.Should().Be(typeof(TestMongoPersistenceModule));
        descriptor.PersistenceContextType.Should().Be(typeof(TestMongoDbContext));
        descriptor.IsRuntimeEnabled.Should().BeTrue();
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    [Trait("TechnicalSpec", "TC-STORE-204")]
    public async Task MongoSystemCollectionPrefix_IsolatesSystemCollectionsAndExistingIndexPathsOnOneDatabase(bool shareMigrationLedger)
    {
        const string databaseName = "same-physical-database";
        const string prefix = "TaskManagement_";
        var database = new Mock<IMongoDatabase>();
        var requestedCollectionNames = new List<string>();
        var inboxCollection = CreateMockCollection<PlatformInboxBusMessage>(databaseName, $"{prefix}{PlatformMongoDbContext<PrefixedMongoDbContext>.PlatformInboxBusMessageCollectionName}", out var inboxIndexes);
        var outboxCollection = CreateMockCollection<PlatformOutboxBusMessage>(databaseName, $"{prefix}{PlatformMongoDbContext<PrefixedMongoDbContext>.PlatformOutboxBusMessageCollectionName}", out var outboxIndexes);
        var dataMigrationCollectionName = shareMigrationLedger ? $"{prefix}MigrationHistory" : $"{prefix}ApplicationDataMigrationHistory";
        var dataMigrationCollection = CreateMockCollection<PlatformDataMigrationHistory>(databaseName, dataMigrationCollectionName, out var dataMigrationIndexes);
        var migrationCollection = CreateMockCollection<PlatformMongoMigrationHistory>(databaseName, $"{prefix}MigrationHistory", out var migrationIndexes);

        database
            .Setup(p => p.GetCollection<PlatformInboxBusMessage>(It.IsAny<string>(), It.IsAny<MongoCollectionSettings>()))
            .Callback<string, MongoCollectionSettings>((collectionName, _) => requestedCollectionNames.Add(collectionName))
            .Returns(inboxCollection.Object);
        database
            .Setup(p => p.GetCollection<PlatformOutboxBusMessage>(It.IsAny<string>(), It.IsAny<MongoCollectionSettings>()))
            .Callback<string, MongoCollectionSettings>((collectionName, _) => requestedCollectionNames.Add(collectionName))
            .Returns(outboxCollection.Object);
        database
            .Setup(p => p.GetCollection<PlatformDataMigrationHistory>(It.IsAny<string>(), It.IsAny<MongoCollectionSettings>()))
            .Callback<string, MongoCollectionSettings>((collectionName, _) => requestedCollectionNames.Add(collectionName))
            .Returns(dataMigrationCollection.Object);
        database
            .Setup(p => p.GetCollection<PlatformMongoMigrationHistory>(It.IsAny<string>(), It.IsAny<MongoCollectionSettings>()))
            .Callback<string, MongoCollectionSettings>((collectionName, _) => requestedCollectionNames.Add(collectionName))
            .Returns(migrationCollection.Object);

        using var loggerFactory = LoggerFactory.Create(_ => { });
        using var context = new PrefixedMongoDbContext(
            new PlatformMongoDatabase<PrefixedMongoDbContext>(database.Object),
            loggerFactory,
            new Mock<IPlatformApplicationRequestContextAccessor>().Object,
            new PlatformPersistenceConfiguration<PrefixedMongoDbContext>(),
            new Mock<IPlatformRootServiceProvider>().Object,
            new Mock<IPlatformApplicationSettingContext>().Object,
            shareMigrationLedger);

        context.InboxBusMessageCollection.CollectionNamespace.DatabaseNamespace.DatabaseName.Should().Be(databaseName);
        context.OutboxBusMessageCollection.CollectionNamespace.DatabaseNamespace.DatabaseName.Should().Be(databaseName);
        context.DataMigrationHistoryCollection.CollectionNamespace.DatabaseNamespace.DatabaseName.Should().Be(databaseName);
        context.MigrationHistoryCollection.CollectionNamespace.DatabaseNamespace.DatabaseName.Should().Be(databaseName);

        new[]
            {
                context.InboxBusMessageCollection.CollectionNamespace.CollectionName,
                context.OutboxBusMessageCollection.CollectionNamespace.CollectionName,
                context.DataMigrationHistoryCollection.CollectionNamespace.CollectionName,
                context.MigrationHistoryCollection.CollectionNamespace.CollectionName
            }
            .Should()
            .Equal(
                $"{prefix}InboxEventBusMessage",
                $"{prefix}OutboxEventBusMessage",
                dataMigrationCollectionName,
                $"{prefix}MigrationHistory");

        requestedCollectionNames.Should().Contain(
        [
            $"{prefix}InboxEventBusMessage",
            $"{prefix}OutboxEventBusMessage",
            dataMigrationCollectionName,
            $"{prefix}MigrationHistory"
        ]);

        context.GetCollectionName<PlatformInboxBusMessage>().Should().Be("TaskManagement_InboxEventBusMessage");
        context.GetCollectionName<PlatformMongoMigrationHistory>().Should().Be("TaskManagement_MigrationHistory");
        context.GetCollectionName<ApplicationMappedEntity>().Should().Be("ApplicationTask");

        await context.EnsureMigrationHistoryCollectionIndexesAsync(recreate: true);
        await context.EnsureApplicationDataMigrationHistoryCollectionIndexesAsync(recreate: true);
        await context.EnsureInboxBusMessageCollectionIndexesAsync(recreate: true);
        await context.EnsureOutboxBusMessageCollectionIndexesAsync(recreate: true);

        migrationIndexes.Verify(p => p.DropAllAsync(It.IsAny<CancellationToken>()), Times.Once);
        migrationIndexes.Verify(p => p.CreateManyAsync(It.IsAny<IEnumerable<CreateIndexModel<PlatformMongoMigrationHistory>>>(), It.IsAny<CancellationToken>()), Times.Once);
        dataMigrationIndexes.Verify(p => p.DropAllAsync(It.IsAny<CancellationToken>()), Times.Once);
        dataMigrationIndexes.Verify(p => p.CreateManyAsync(It.IsAny<IEnumerable<CreateIndexModel<PlatformDataMigrationHistory>>>(), It.IsAny<CancellationToken>()), Times.Once);
        inboxIndexes.Verify(p => p.DropAllAsync(It.IsAny<CancellationToken>()), Times.Once);
        inboxIndexes.Verify(p => p.CreateManyAsync(It.IsAny<IEnumerable<CreateIndexModel<PlatformInboxBusMessage>>>(), It.IsAny<CancellationToken>()), Times.Once);
        outboxIndexes.Verify(p => p.DropAllAsync(It.IsAny<CancellationToken>()), Times.Once);
        outboxIndexes.Verify(p => p.CreateManyAsync(It.IsAny<IEnumerable<CreateIndexModel<PlatformOutboxBusMessage>>>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-205")]
    public void RegistryConflictDiagnostics_IncludeOnlyLogicalTypeMetadata_AndEmptyMongoPrefixPreservesNames()
    {
        var key = new PlatformMessageBusStoreKey("Conflicting");
        var firstInboxType = typeof(IPlatformInboxBusMessageRepository<TestMongoDbContext>);
        var secondInboxType = typeof(IPlatformInboxBusMessageRepository<TestEfDbContext>);
        var firstInnerUnitOfWorkType = typeof(IPlatformMongoDbPersistenceUnitOfWork<TestMongoDbContext>);
        var secondInnerUnitOfWorkType = typeof(IPlatformEfCorePersistenceUnitOfWork<TestEfDbContext>);
        var registry = new PlatformMessageBusStoreRegistry(
            [],
            [
                CreatePersistenceContribution(key, firstInboxType, firstInnerUnitOfWorkType),
                CreatePersistenceContribution(key, secondInboxType, secondInnerUnitOfWorkType)
            ],
            [],
            isStrictCompositionValidationEnabled: true);

        var act = () => registry.Validate();

        act.Should().Throw<InvalidOperationException>()
            .Which.Message.Should()
            .Contain(firstInboxType.FullName!)
            .And.Contain(secondInboxType.FullName!)
            .And.Contain(firstInnerUnitOfWorkType.FullName!)
            .And.Contain(secondInnerUnitOfWorkType.FullName!)
            .And.NotContain("ConnectionString")
            .And.NotContain("Server=")
            .And.NotContain("password")
            .And.NotContain("Database");

        using var loggerFactory = LoggerFactory.Create(_ => { });
        using var context = new DefaultMongoDbContext(
            new PlatformMongoDatabase<DefaultMongoDbContext>(new MongoClient("mongodb://127.0.0.1:27017").GetDatabase("same-physical-database")),
            loggerFactory,
            new Mock<IPlatformApplicationRequestContextAccessor>().Object,
            new PlatformPersistenceConfiguration<DefaultMongoDbContext>(),
            new Mock<IPlatformRootServiceProvider>().Object,
            new Mock<IPlatformApplicationSettingContext>().Object);

        context.InboxBusMessageCollection.CollectionNamespace.CollectionName.Should().Be("InboxEventBusMessage");
        context.OutboxBusMessageCollection.CollectionNamespace.CollectionName.Should().Be("OutboxEventBusMessage");
        context.DataMigrationHistoryCollection.CollectionNamespace.CollectionName.Should().Be("ApplicationDataMigrationHistory");
        context.MigrationHistoryCollection.CollectionNamespace.CollectionName.Should().Be("MigrationHistory");
    }

    private static List<PlatformPersistenceMessageBusStoreRegistration> GetPersistenceContributions(IServiceCollection services)
    {
        return services
            .Where(p => p.ServiceType == typeof(PlatformPersistenceMessageBusStoreRegistration))
            .Select(p => p.ImplementationInstance)
            .OfType<PlatformPersistenceMessageBusStoreRegistration>()
            .ToList();
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
            moduleType.Assembly,
            _ => new PlatformInboxConfig { MaxStoreProcessedMessageCount = configurationMarker },
            _ => new PlatformOutboxConfig { MaxStoreProcessedMessageCount = configurationMarker });
    }

    private static PlatformPersistenceMessageBusStoreRegistration CreatePersistenceContribution(
        PlatformMessageBusStoreKey key,
        Type inboxRepositoryServiceType,
        Type unitOfWorkServiceType)
    {
        var inboxRepository = new Mock<IPlatformInboxBusMessageRepository>().Object;
        var outboxRepository = new Mock<IPlatformOutboxBusMessageRepository>().Object;
        var unitOfWorkManager = new Mock<IPlatformUnitOfWorkManager>().Object;
        var unitOfWork = new Mock<IPlatformUnitOfWork>().Object;

        return new PlatformPersistenceMessageBusStoreRegistration(
            key,
            typeof(TestMongoPersistenceModule),
            typeof(TestMongoDbContext),
            inboxRepositoryServiceType,
            typeof(IPlatformOutboxBusMessageRepository<TestMongoDbContext>),
            typeof(IPlatformUnitOfWorkManager),
            _ => inboxRepository,
            _ => outboxRepository,
            _ => unitOfWorkManager,
            isRuntimeEnabled: true,
            unitOfWorkServiceType: unitOfWorkServiceType,
            unitOfWorkFactory: _ => unitOfWork);
    }

    private static Mock<IMongoCollection<TEntity>> CreateMockCollection<TEntity>(
        string databaseName,
        string collectionName,
        out Mock<IMongoIndexManager<TEntity>> indexManager)
    {
        indexManager = new Mock<IMongoIndexManager<TEntity>>();
        indexManager
            .Setup(p => p.DropAllAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        indexManager
            .Setup(p => p.CreateManyAsync(It.IsAny<IEnumerable<CreateIndexModel<TEntity>>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var collection = new Mock<IMongoCollection<TEntity>>();
        collection.SetupGet(p => p.CollectionNamespace).Returns(new CollectionNamespace(databaseName, collectionName));
        collection.SetupGet(p => p.Indexes).Returns(indexManager.Object);
        return collection;
    }

    private sealed class TestMongoPersistenceModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : PlatformMongoDbPersistenceModule<TestMongoDbContext>(serviceProvider, configuration)
    {
        public override PlatformMessageBusStoreKey MessageBusStoreKey => new("Mongo");

        public override bool EnableMessageBusStoreContribution => true;

        protected override void ConfigureMongoOptions(PlatformMongoOptions<TestMongoDbContext> options)
        {
            options.ConnectionString = "mongodb://127.0.0.1:27017";
            options.Database = "phase04";
        }

        public override Task InitializeDatabaseAsync(IServiceScope serviceScope) => Task.CompletedTask;
    }

    private sealed class TestMongoMigrationOnlyPersistenceModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : PlatformMongoDbPersistenceModule<TestMongoDbContext>(serviceProvider, configuration)
    {
        public override PlatformMessageBusStoreKey MessageBusStoreKey => new("Mongo");

        public override bool ForCrossDbMigrationOnly => true;

        public override bool EnableMessageBusStoreContribution => true;

        protected override void ConfigureMongoOptions(PlatformMongoOptions<TestMongoDbContext> options)
        {
            options.ConnectionString = "mongodb://127.0.0.1:27017";
            options.Database = "phase04-migration-only";
        }

        public override Task InitializeDatabaseAsync(IServiceScope serviceScope) => Task.CompletedTask;
    }

    private sealed class TestEfPersistenceModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : PlatformEfCorePersistenceModule<TestEfDbContext>(serviceProvider, configuration)
    {
        public override PlatformMessageBusStoreKey MessageBusStoreKey => new("Ef");

        public override bool EnableMessageBusStoreContribution => true;

        protected override Action<DbContextOptionsBuilder> DbContextOptionsBuilderActionProvider(IServiceProvider serviceProvider)
        {
            return options => options.UseInMemoryDatabase("phase04");
        }

        public override Task InitializeDatabaseAsync(IServiceScope serviceScope) => Task.CompletedTask;
    }

    public sealed class TestMongoDbContext(
        IPlatformMongoDatabase<TestMongoDbContext> database,
        ILoggerFactory loggerFactory,
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        PlatformPersistenceConfiguration<TestMongoDbContext> persistenceConfiguration,
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformApplicationSettingContext applicationSettingContext)
        : PlatformMongoDbContext<TestMongoDbContext>(
            database,
            loggerFactory,
            requestContextAccessor,
            persistenceConfiguration,
            rootServiceProvider,
            applicationSettingContext)
    {
        public override Task InternalEnsureIndexesAsync(bool recreate = false) => Task.CompletedTask;
    }

    public sealed class PrefixedMongoDbContext(
        IPlatformMongoDatabase<PrefixedMongoDbContext> database,
        ILoggerFactory loggerFactory,
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        PlatformPersistenceConfiguration<PrefixedMongoDbContext> persistenceConfiguration,
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformApplicationSettingContext applicationSettingContext,
        bool shareMigrationLedger = false)
        : PlatformMongoDbContext<PrefixedMongoDbContext>(
            database,
            loggerFactory,
            requestContextAccessor,
            persistenceConfiguration,
            rootServiceProvider,
            applicationSettingContext)
    {
        protected override string PlatformSystemCollectionNamePrefix => "TaskManagement_";

        public override string DataMigrationHistoryCollectionName =>
            shareMigrationLedger ? MigrationHistoryCollectionName : base.DataMigrationHistoryCollectionName;

        public override List<KeyValuePair<Type, string>> EntityTypeToCollectionNameMaps() =>
        [new(typeof(ApplicationMappedEntity), "ApplicationTask")];

        public override Task InternalEnsureIndexesAsync(bool recreate = false) => Task.CompletedTask;
    }

    public sealed class DefaultMongoDbContext(
        IPlatformMongoDatabase<DefaultMongoDbContext> database,
        ILoggerFactory loggerFactory,
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        PlatformPersistenceConfiguration<DefaultMongoDbContext> persistenceConfiguration,
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformApplicationSettingContext applicationSettingContext)
        : PlatformMongoDbContext<DefaultMongoDbContext>(
            database,
            loggerFactory,
            requestContextAccessor,
            persistenceConfiguration,
            rootServiceProvider,
            applicationSettingContext)
    {
        public override Task InternalEnsureIndexesAsync(bool recreate = false) => Task.CompletedTask;
    }

    public sealed class TestEfDbContext(DbContextOptions<TestEfDbContext> options)
        : PlatformEfCoreDbContext<TestEfDbContext>(options);

    private sealed class MongoApplicationLane;
    private sealed class EfApplicationLane;
    private sealed class ApplicationMappedEntity;
}
