using System;
using System.Collections.Generic;
using Easy.Platform.Application;
using Easy.Platform.Application.MessageBus.Store;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PlatformExampleApp.TaskManagement.Domain;
using PlatformExampleApp.TaskManagement.Application.DataSeeders;

namespace PlatformExampleApp.TaskManagement.Application;

/// <summary>
/// Selects where TaskManagement's physical persistence is placed. The logical message-store key remains
/// TaskManagement-owned in either mode.
/// </summary>
public enum TaskManagementPersistenceMode
{
    Shared = 1,
    Isolated = 2
}

/// <summary>
/// TaskManagement-owned settings. This is deliberately a typed module contract rather than another
/// <see cref="IPlatformApplicationSettingContext"/> registration, because the platform context is a process-wide
/// compatibility service in a composite host.
/// </summary>
public interface ITaskManagementApplicationSettings
{
    bool MessagingEnabled { get; }

    bool InboxEnabled { get; }

    bool OutboxEnabled { get; }

    TaskManagementPersistenceMode PersistenceMode { get; }
}

/// <summary>
/// Binds TaskManagement configuration without exposing connection or deployment values to application DTOs.
/// </summary>
public sealed class TaskManagementApplicationSettings : ITaskManagementApplicationSettings
{
    public const string MESSAGING_ENABLED_CONFIGURATION_KEY = "TaskManagement:Messaging:Enabled";

    public const string MESSAGING_INBOX_ENABLED_CONFIGURATION_KEY = "TaskManagement:Messaging:InboxEnabled";

    public const string MESSAGING_OUTBOX_ENABLED_CONFIGURATION_KEY = "TaskManagement:Messaging:OutboxEnabled";

    public const string PERSISTENCE_MODE_CONFIGURATION_KEY = "TaskManagement:PersistenceMode";

    public TaskManagementApplicationSettings(IConfiguration configuration)
    {
        MessagingEnabled = IsMessagingEnabled(configuration);
        InboxEnabled = configuration.GetValue(MESSAGING_INBOX_ENABLED_CONFIGURATION_KEY, true);
        OutboxEnabled = configuration.GetValue(MESSAGING_OUTBOX_ENABLED_CONFIGURATION_KEY, true);

        var configuredPersistenceMode = configuration.GetValue<string>(PERSISTENCE_MODE_CONFIGURATION_KEY);

        if (string.IsNullOrWhiteSpace(configuredPersistenceMode))
        {
            PersistenceMode = TaskManagementPersistenceMode.Shared;
        }
        else if (!Enum.TryParse<TaskManagementPersistenceMode>(configuredPersistenceMode, true, out var parsedPersistenceMode) ||
                 !Enum.IsDefined(parsedPersistenceMode))
        {
            throw new ArgumentException(
                $"{PERSISTENCE_MODE_CONFIGURATION_KEY} must be one of {string.Join(", ", Enum.GetNames<TaskManagementPersistenceMode>())}.",
                nameof(configuration));
        }
        else
        {
            PersistenceMode = parsedPersistenceMode;
        }
    }

    /// <summary>
    /// The one reading of the messaging switch (default on), shared with hosts that decide which transport provider
    /// to compose before the settings object exists.
    /// </summary>
    public static bool IsMessagingEnabled(IConfiguration configuration)
    {
        return configuration.GetValue(MESSAGING_ENABLED_CONFIGURATION_KEY, true);
    }

    public bool MessagingEnabled { get; }

    public bool InboxEnabled { get; }

    public bool OutboxEnabled { get; }

    public TaskManagementPersistenceMode PersistenceMode { get; }
}

/// <summary>
/// TaskManagement application boundary. Platform assembly scanning discovers its CQRS handlers while the module
/// keeps its domain dependency and typed settings explicit for both composite and standalone hosts.
/// </summary>
public sealed class TaskManagementApplicationModule : PlatformApplicationModule
{
    /// <summary>
    /// Stable logical message-bus store key owned by TaskManagement in both composite and standalone hosts.
    /// The physical database selected for this key remains a host/persistence concern.
    /// </summary>
    public const string MessageBusStoreKeyValue = "TaskManagement";

    /// <summary>
    /// The store key instance every TaskManagement producer, consumer, persistence module, and host binding selects.
    /// </summary>
    public static readonly PlatformMessageBusStoreKey MessageBusStoreKeyInstance = new(MessageBusStoreKeyValue);

    /// <summary>
    /// Explicit lane identity. A composite host shares one configured application name across modules, so the
    /// TaskManagement lane names itself; its producers and consumers select this same identity.
    /// </summary>
    public static readonly string MessageBusApplicationNameValue =
        typeof(TaskManagementApplicationModule).Assembly.GetName().Name ?? nameof(TaskManagementApplicationModule);

    public override PlatformMessageBusStoreKey MessageBusStoreKey => MessageBusStoreKeyInstance;

    public override string MessageBusApplicationName => MessageBusApplicationNameValue;

    public TaskManagementApplicationModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration)
    {
    }

    /// <summary>
    /// A composite root owns shared caching infrastructure; a standalone root can opt in explicitly.
    /// </summary>
    protected override bool EnableDefaultCachingModule => false;

    public override List<Func<IConfiguration, Type>> GetDependentModuleTypes()
    {
        return [p => typeof(TaskManagementDomainModule)];
    }

    /// <summary>
    /// Keeps seeder ownership explicit when this application assembly is composed beside other application modules.
    /// </summary>
    protected override IReadOnlyCollection<Type> GetApplicationDataSeederTypes()
    {
        return [typeof(TaskManagementApplicationDataSeeder)];
    }

    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);

        serviceCollection.AddSingleton<ITaskManagementApplicationSettings>(
            new TaskManagementApplicationSettings(Configuration));
    }
}
