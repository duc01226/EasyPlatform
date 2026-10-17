using Easy.Platform.Application;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Application.MessageBus.Store;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.MongoDB;
using Easy.Platform.Persistence;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;
using MongoDB.Driver;
using PlatformExampleApp.TaskManagement.Application;
using PlatformExampleApp.TaskManagement.Domain.Entities;
using PlatformExampleApp.TaskManagement.Domain.Repositories;
using PlatformExampleApp.TaskManagement.Persistence.Mongo;

namespace PlatformExampleApp.Tests.Unit.TaskManagement;

/// <summary>
/// Provider-boundary contracts for TaskManagement's modular persistence POC. These tests inspect driver configuration
/// and collection identity without requiring a live MongoDB server; database I/O remains an integration concern.
/// </summary>
public sealed class TaskManagementPersistenceTests
{
    // TC-PERSIST-101: shared placement can use the existing Mongo database while context-owned platform collections remain isolated.
    [Fact]
    [Trait("TechnicalSpec", "TC-PERSIST-101")]
    public void SharedMode_UsesConfiguredDatabaseAndPrefixedPlatformCollections()
    {
        var module = CreateModule(
            ("MongoDB:ConnectionString", "mongodb://localhost:27017"),
            ("MongoDB:Database", "bravosuite-shared"),
            ("TaskManagement:PersistenceMode", "Shared"));

        var options = module.ConfigureForTests();
        var context = CreateContext(options.Database);

        options.Database.Should().Be("bravosuite-shared");
        context.GetCollectionName<TaskBoardItemEntity>().Should().Be("TaskBoardItemEntity");
        context.GetCollectionName<TaskBoardItemProjectionEntity>().Should().Be("TaskBoardItemProjectionEntity");
        context.GetCollectionName<PlatformInboxBusMessage>().Should().Be("TaskManagement_InboxEventBusMessage");
        context.GetCollectionName<PlatformOutboxBusMessage>().Should().Be("TaskManagement_OutboxEventBusMessage");
        context.MigrationHistoryCollection.CollectionNamespace.CollectionName.Should().Be("TaskManagement_MigrationHistory");
        context.DataMigrationHistoryCollection.CollectionNamespace.CollectionName.Should().Be("TaskManagement_ApplicationDataMigrationHistory");
    }

    // TC-PERSIST-102: isolated placement requires a distinct TaskManagement database setting.
    [Fact]
    [Trait("TechnicalSpec", "TC-PERSIST-102")]
    public void IsolatedMode_UsesTaskManagementDatabaseWithoutChangingBusinessCollectionOwnership()
    {
        var module = CreateModule(
            ("TaskManagement:Mongo:ConnectionString", "mongodb://localhost:27017"),
            ("MongoDB:Database", "bravosuite-shared"),
            ("TaskManagement:Mongo:Database", "bravosuite-taskmanagement"),
            ("TaskManagement:PersistenceMode", "Isolated"));

        var options = module.ConfigureForTests();
        var context = CreateContext(options.Database);

        options.Database.Should().Be("bravosuite-taskmanagement");
        context.GetCollectionName<TaskBoardItemEntity>().Should().Be("TaskBoardItemEntity");
        context.GetCollectionName<TaskBoardItemProjectionEntity>().Should().Be("TaskBoardItemProjectionEntity");
        module.PersistenceMode.Should().Be(TaskManagementPersistenceMode.Isolated);
    }

    // TC-PERSIST-107: isolated placement without its own database setting fails before any options are applied.
    [Fact]
    [Trait("TechnicalSpec", "TC-PERSIST-107")]
    public void IsolatedMode_WithoutTaskManagementDatabase_FailsBeforeOptionsAreApplied()
    {
        var module = CreateModule(
            ("MongoDB:ConnectionString", "mongodb://localhost:27017"),
            ("MongoDB:Database", "bravosuite-shared"),
            ("TaskManagement:PersistenceMode", "Isolated"));

        var configure = () => module.ConfigureForTests();

        configure.Should()
            .Throw<InvalidOperationException>()
            .WithMessage("*TaskManagement:Mongo:Database*");
    }

    // TC-PERSIST-103: the module reads inbox and outbox enablement independently and owns a stable non-default key.
    [Fact]
    [Trait("TechnicalSpec", "TC-PERSIST-103")]
    public void MessagingFlags_AreIndependentAndStoreKeyIsTaskManagementOwned()
    {
        var inboxDisabledModule = CreateModule(
            ("MongoDB:ConnectionString", "mongodb://localhost:27017"),
            ("MongoDB:Database", "bravosuite-shared"),
            ("TaskManagement:Messaging:InboxEnabled", "false"),
            ("TaskManagement:Messaging:OutboxEnabled", "true"));
        var outboxDisabledModule = CreateModule(
            ("MongoDB:ConnectionString", "mongodb://localhost:27017"),
            ("MongoDB:Database", "bravosuite-shared"),
            ("TaskManagement:Messaging:InboxEnabled", "true"),
            ("TaskManagement:Messaging:OutboxEnabled", "false"));

        inboxDisabledModule.InboxEnabledForTests.Should().BeFalse();
        inboxDisabledModule.OutboxEnabledForTests.Should().BeTrue();
        outboxDisabledModule.InboxEnabledForTests.Should().BeTrue();
        outboxDisabledModule.OutboxEnabledForTests.Should().BeFalse();
        inboxDisabledModule.MessageBusStoreKey.Should().Be(TaskManagementApplicationModule.MessageBusStoreKeyInstance);
        inboxDisabledModule.MessageBusStoreKey.Value.Should().Be(TaskManagementApplicationModule.MessageBusStoreKeyValue);
        inboxDisabledModule.MessageBusStoreKey.Should().NotBe(PlatformMessageBusStoreKey.Default);
    }

    // TC-PERSIST-104: runtime TaskManagement persistence is a full owner, not a cross-database migration-only context.
    [Fact]
    [Trait("TechnicalSpec", "TC-PERSIST-104")]
    public void RuntimeModule_IsNotCrossDatabaseMigrationOnly_AndUsesTypedRepositoryPorts()
    {
        var module = CreateModule(
            ("MongoDB:ConnectionString", "mongodb://localhost:27017"),
            ("MongoDB:Database", "bravosuite-shared"));

        module.ForCrossDbMigrationOnly.Should().BeFalse();
        typeof(TaskManagementRepository<>).GetInterfaces().Should().Contain(type =>
            type.IsGenericType && type.GetGenericTypeDefinition() == typeof(ITaskManagementProjectionRepository<>));
        typeof(TaskManagementRootRepository<>).GetInterfaces().Should().Contain(type =>
            type.IsGenericType && type.GetGenericTypeDefinition() == typeof(ITaskManagementRootRepository<>));
        typeof(TaskManagementRootRepository<>).GetInterfaces().Should().NotContain(type =>
            type.IsGenericType && type.GetGenericTypeDefinition() == typeof(ITaskManagementRepository<>));
        var dependentModuleTypes = module.GetDependentModuleTypes();
        dependentModuleTypes.Should().ContainSingle();
        dependentModuleTypes[0](new ConfigurationBuilder().Build()).Should().Be(typeof(TaskManagementApplicationModule));
    }

    // TC-PERSIST-105: the platform-owned lifecycle remains the migration-before-seed path and the module defaults are safe for a POC.
    [Fact]
    [Trait("TechnicalSpec", "TC-PERSIST-105")]
    public void DefaultConfiguration_EnablesBothMessageStoresAndKeepsDeterministicProjectionIdentity()
    {
        var module = CreateModule(
            ("MongoDB:ConnectionString", "mongodb://localhost:27017"),
            ("MongoDB:Database", "bravosuite-shared"));

        module.InboxEnabledForTests.Should().BeTrue();
        module.OutboxEnabledForTests.Should().BeTrue();

        // One projection per task: identity is the trimmed task id and does not vary with the source event.
        TaskBoardItemProjectionEntity.CreateDeterministicId(" task-105 ")
            .Should()
            .Be("task-105");
        new TaskBoardItemProjectionEntity { TaskId = "task-105", SourceEventId = "event-a" }.UniqueCompositeId()
            .Should()
            .Be(new TaskBoardItemProjectionEntity { TaskId = "task-105", SourceEventId = "event-b" }.UniqueCompositeId());
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PERSIST-106")]
    public void MongoMappings_PreserveIdEnumAndAggregateRowVersionMembers()
    {
        new TaskBoardItemEntityMongoClassMapping().RegisterClassMap();
        new TaskBoardItemProjectionEntityMongoClassMapping().RegisterClassMap();

        var aggregateMap = BsonClassMap.LookupClassMap(typeof(TaskBoardItemEntity));
        var projectionMap = BsonClassMap.LookupClassMap(typeof(TaskBoardItemProjectionEntity));

        aggregateMap.IdMemberMap.MemberName.Should().Be(nameof(TaskBoardItemEntity.Id));
        aggregateMap.GetMemberMap(nameof(TaskBoardItemEntity.Status)).GetSerializer()
            .Should()
            .BeOfType<EnumSerializer<TaskBoardItemStatus>>()
            .Which.Representation.Should()
            .Be(BsonType.String);
        aggregateMap.GetMemberMap(nameof(TaskBoardItemEntity.ConcurrencyUpdateToken)).Should().NotBeNull();
        projectionMap.IdMemberMap.MemberName.Should().Be(nameof(TaskBoardItemProjectionEntity.Id));
        projectionMap.GetMemberMap(nameof(TaskBoardItemProjectionEntity.SourceEventId)).Should().NotBeNull();
        projectionMap.GetMemberMap(nameof(TaskBoardItemProjectionEntity.ConcurrencyUpdateToken)).Should().NotBeNull();
        projectionMap.GetMemberMap(nameof(TaskBoardItemProjectionEntity.TaskConcurrencyUpdateToken)).Should().NotBeNull();
    }

    private static TestableTaskManagementMongoPersistenceModule CreateModule(params (string Key, string Value)[] values)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(values.ToDictionary(pair => pair.Key, pair => (string?)pair.Value))
            .Build();

        return new TestableTaskManagementMongoPersistenceModule(Mock.Of<IServiceProvider>(), configuration);
    }

    private static TaskManagementDbContext CreateContext(string databaseName)
    {
        var database = new MongoClient("mongodb://localhost:27017").GetDatabase(databaseName);
        var databaseWrapper = new PlatformMongoDatabase<TaskManagementDbContext>(database);
        var requestContextAccessor = Mock.Of<IPlatformApplicationRequestContextAccessor>();
        var applicationSettings = Mock.Of<IPlatformApplicationSettingContext>();
        var rootServiceProvider = Mock.Of<IPlatformRootServiceProvider>();

        return new TaskManagementDbContext(
            databaseWrapper,
            NullLoggerFactory.Instance,
            requestContextAccessor,
            new PlatformPersistenceConfiguration<TaskManagementDbContext>(),
            rootServiceProvider,
            applicationSettings);
    }

    private sealed class TestableTaskManagementMongoPersistenceModule : TaskManagementMongoPersistenceModule
    {
        public TestableTaskManagementMongoPersistenceModule(IServiceProvider serviceProvider, IConfiguration configuration)
            : base(serviceProvider, configuration)
        {
        }

        public bool InboxEnabledForTests => IsInboxBusMessageEnabled();

        public bool OutboxEnabledForTests => IsOutboxBusMessageEnabled();

        public PlatformMongoOptions<TaskManagementDbContext> ConfigureForTests()
        {
            var options = new PlatformMongoOptions<TaskManagementDbContext>();
            ConfigureMongoOptions(options);
            return options;
        }
    }
}
