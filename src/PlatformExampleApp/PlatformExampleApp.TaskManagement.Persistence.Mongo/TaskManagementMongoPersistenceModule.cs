using System;
using System.Collections.Generic;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Application.MessageBus.Store;
using Easy.Platform.MongoDB;
using Easy.Platform.Persistence;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using PlatformExampleApp.TaskManagement.Application;

namespace PlatformExampleApp.TaskManagement.Persistence.Mongo;

/// <summary>
/// TaskManagement-owned Mongo persistence boundary. The physical database can be shared or isolated by configuration,
/// while this module always retains its own context, repository ports, system-collection namespace, and message-store key.
/// </summary>
public class TaskManagementMongoPersistenceModule : PlatformMongoDbPersistenceModule<TaskManagementDbContext>
{
    public const string SYSTEM_COLLECTION_NAME_PREFIX = "TaskManagement_";

    public const string TASK_MANAGEMENT_MONGO_CONNECTION_STRING_CONFIGURATION_KEY = "TaskManagement:Mongo:ConnectionString";

    public const string TASK_MANAGEMENT_MONGO_DATABASE_CONFIGURATION_KEY = "TaskManagement:Mongo:Database";

    private const string DEFAULT_MONGO_CONNECTION_STRING_CONFIGURATION_KEY = "MongoDB:ConnectionString";

    private const string DEFAULT_MONGO_DATABASE_CONFIGURATION_KEY = "MongoDB:Database";

    private readonly TaskManagementApplicationSettings applicationSettings;

    public TaskManagementMongoPersistenceModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration)
    {
        applicationSettings = new TaskManagementApplicationSettings(configuration);
    }

    /// <summary>
    /// Exposes placement as module metadata for composition tests and host diagnostics without exposing credentials.
    /// </summary>
    public TaskManagementPersistenceMode PersistenceMode => applicationSettings.PersistenceMode;

    /// <inheritdoc />
    public override PlatformMessageBusStoreKey MessageBusStoreKey => TaskManagementApplicationModule.MessageBusStoreKeyInstance;

    /// <inheritdoc />
    public override bool EnableMessageBusStoreContribution => true;

    /// <inheritdoc />
    public override List<Func<IConfiguration, Type>> GetDependentModuleTypes()
    {
        return [p => typeof(TaskManagementApplicationModule)];
    }

    protected override void ConfigureMongoOptions(PlatformMongoOptions<TaskManagementDbContext> options)
    {
        var connectionString = GetRequiredConfigurationValue(
            TASK_MANAGEMENT_MONGO_CONNECTION_STRING_CONFIGURATION_KEY,
            DEFAULT_MONGO_CONNECTION_STRING_CONFIGURATION_KEY);
        var database = ResolveDatabaseName();

        options.ConnectionString = new MongoUrlBuilder(connectionString)
            .With(p => p.MinConnectionPoolSize = RecommendedMinPoolSize)
            .With(p => p.MaxConnectionPoolSize = GetRecommendedMaxPoolSize())
            .With(p => p.MaxConnecting = GetRecommendedMaxConnecting())
            .With(p => p.MaxConnectionIdleTime = RecommendedConnectionIdleLifetimeSeconds.Seconds())
            .With(p => p.ConnectTimeout = 30.Seconds())
            .ToString();
        options.Database = database;
    }

    protected override bool IsInboxBusMessageEnabled()
    {
        return applicationSettings.MessagingEnabled && applicationSettings.InboxEnabled;
    }

    protected override bool IsOutboxBusMessageEnabled()
    {
        return applicationSettings.MessagingEnabled && applicationSettings.OutboxEnabled;
    }

    private string ResolveDatabaseName()
    {
        var taskManagementDatabase = Configuration[TASK_MANAGEMENT_MONGO_DATABASE_CONFIGURATION_KEY];

        if (applicationSettings.PersistenceMode == TaskManagementPersistenceMode.Isolated)
            return RequireNonEmptyConfigurationValue(
                taskManagementDatabase,
                TASK_MANAGEMENT_MONGO_DATABASE_CONFIGURATION_KEY,
                "Isolated TaskManagement persistence requires its own configured database.");

        return string.IsNullOrWhiteSpace(taskManagementDatabase)
            ? GetRequiredConfigurationValue(DEFAULT_MONGO_DATABASE_CONFIGURATION_KEY)
            : taskManagementDatabase;
    }

    private string GetRequiredConfigurationValue(string configurationKey, string fallbackConfigurationKey = null)
    {
        var value = Configuration[configurationKey];

        if (string.IsNullOrWhiteSpace(value) && fallbackConfigurationKey != null)
            value = Configuration[fallbackConfigurationKey];

        return RequireNonEmptyConfigurationValue(value, configurationKey, "A MongoDB configuration value is required.");
    }

    private static string RequireNonEmptyConfigurationValue(string value, string configurationKey, string message)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new InvalidOperationException($"{message} Configuration key: {configurationKey}.");

        return value.Trim();
    }
}
