using System.Reflection;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Common;

/// <summary>
/// Supplies the provider-neutral metadata required to validate a module composition root.
/// </summary>
/// <remarks>
/// The options intentionally carry only service descriptors, CLR types, assemblies, and message-store metadata.
/// They must not carry configuration values, connection strings, credentials, request context, or message payloads.
/// ASP.NET Core adapters populate <see cref="ControllerAssemblies"/>; the core validator has no ASP.NET dependency.
/// </remarks>
public sealed class PlatformModuleCompositionOptions
{
    /// <summary>
    /// Configuration key used by the platform ASP.NET adapter to opt into strict validation.
    /// </summary>
    /// <remarks>
    /// This is the single owner of the setting name; the message-bus store registry constant aliases it.
    /// </remarks>
    public const string StrictValidationConfigurationKey = "Platform:MessageBusStores:StrictCompositionValidation";

    /// <summary>
    /// Gets a value indicating whether strict application/persistence composition rules apply.
    /// </summary>
    public bool StrictValidationEnabled { get; init; }

    /// <summary>
    /// Gets the final service collection used by the host, when available.
    /// </summary>
    public IServiceCollection ServiceCollection { get; init; }

    /// <summary>
    /// Gets the final service provider used by the host, when available.
    /// </summary>
    public IServiceProvider ServiceProvider { get; init; }

    /// <summary>
    /// Gets the provider-neutral message-store metadata assembled from application and persistence contributions.
    /// </summary>
    public IPlatformModuleCompositionMetadataSource MessageBusStoreRegistry { get; init; }

    /// <summary>
    /// Gets the controller assemblies explicitly selected by the ASP.NET adapter.
    /// </summary>
    public IReadOnlyCollection<Assembly> ControllerAssemblies { get; init; } = [];

    /// <summary>
    /// Gets the concrete application-data seeder types visible to the final service collection.
    /// </summary>
    public IReadOnlyCollection<Type> RegisteredSeederTypes { get; init; } = [];

    /// <summary>
    /// Gets the concrete message-consumer types visible to the final service collection.
    /// </summary>
    public IReadOnlyCollection<Type> RegisteredConsumerTypes { get; init; } = [];

    /// <summary>
    /// Gets the concrete event-producer types visible to the final service collection.
    /// </summary>
    public IReadOnlyCollection<Type> RegisteredProducerTypes { get; init; } = [];

    /// <summary>
    /// Gets the number of unqualified application-setting-context registrations visible to the final service collection.
    /// </summary>
    public int ApplicationSettingContextRegistrationCount { get; init; }

    /// <summary>
    /// Gets the assemblies that own shared platform infrastructure components.
    /// </summary>
    /// <remarks>
    /// The core validator uses this metadata to exclude shared infrastructure from application-lane coverage checks
    /// without referencing an application-layer type.
    /// </remarks>
    public IReadOnlyCollection<Assembly> InfrastructureAssemblies { get; init; } = [];

    /// <summary>
    /// Gets a value indicating whether the final service collection contains the platform message-bus scanner.
    /// </summary>
    public bool HasMessageBusScannerRegistration { get; init; }

    /// <summary>
    /// Gets a value indicating whether the final service collection contains the inbox consumer worker.
    /// </summary>
    public bool HasInboxConsumerWorkerRegistration { get; init; }

    /// <summary>
    /// Gets a value indicating whether the final service collection contains the inbox cleaner worker.
    /// </summary>
    public bool HasInboxCleanerWorkerRegistration { get; init; }

    /// <summary>
    /// Gets a value indicating whether the final service collection contains the application message producer.
    /// </summary>
    public bool HasApplicationProducerRegistration { get; init; }

    /// <summary>
    /// Gets a value indicating whether the final service collection contains the keyed application producer.
    /// </summary>
    public bool HasKeyedApplicationProducerRegistration { get; init; }

    /// <summary>
    /// Gets a value indicating whether the final service collection contains the outbox sender worker.
    /// </summary>
    public bool HasOutboxSenderWorkerRegistration { get; init; }

    /// <summary>
    /// Gets a value indicating whether the final service collection contains the outbox cleaner worker.
    /// </summary>
    public bool HasOutboxCleanerWorkerRegistration { get; init; }

    /// <summary>
    /// Gets a value indicating whether the final service collection contains the message-store registry service.
    /// </summary>
    public bool HasMessageBusStoreRegistryRegistration { get; init; }
}

/// <summary>
/// Exposes message-bus composition metadata to the Common-layer validator without importing application contracts.
/// </summary>
public interface IPlatformModuleCompositionMetadataSource
{
    /// <summary>Gets whether strict composition validation was enabled by the source.</summary>
    bool IsStrictValidationEnabled { get; }

    /// <summary>Gets application-lane contributions.</summary>
    IReadOnlyList<PlatformModuleCompositionApplicationLane> ApplicationLaneMetadata { get; }

    /// <summary>Gets persistence-store contributions.</summary>
    IReadOnlyList<PlatformModuleCompositionPersistenceStore> PersistenceStoreMetadata { get; }

    /// <summary>Gets explicit application-to-persistence bindings.</summary>
    IReadOnlyList<PlatformModuleCompositionBinding> BindingMetadata { get; }

    /// <summary>Gets descriptors assembled from explicit bindings.</summary>
    IReadOnlyList<PlatformModuleCompositionStoreDescriptor> DescriptorMetadata { get; }
}

/// <summary>Describes one application-owned lane using only provider-neutral metadata.</summary>
public sealed class PlatformModuleCompositionApplicationLane
{
    public PlatformModuleCompositionApplicationLane(
        string storeKey,
        Type applicationModuleType,
        string applicationName,
        Assembly applicationAssembly,
        IEnumerable<Type> applicationDataSeederTypes)
    {
        StoreKey = storeKey;
        ApplicationModuleType = applicationModuleType;
        ApplicationName = applicationName;
        ApplicationAssembly = applicationAssembly;
        ApplicationDataSeederTypes = (applicationDataSeederTypes ?? [])
            .Where(type => type != null)
            .Distinct()
            .ToList()
            .AsReadOnly();
    }

    public string StoreKey { get; }
    public Type ApplicationModuleType { get; }
    public string ApplicationName { get; }
    public Assembly ApplicationAssembly { get; }
    public IReadOnlyList<Type> ApplicationDataSeederTypes { get; }
}

/// <summary>Describes one persistence-owned message-bus store using only provider-neutral metadata.</summary>
public sealed class PlatformModuleCompositionPersistenceStore
{
    public PlatformModuleCompositionPersistenceStore(
        string storeKey,
        Type persistenceOwnerType,
        Type persistenceContextType,
        Type inboxRepositoryServiceType,
        Type outboxRepositoryServiceType,
        Type unitOfWorkManagerServiceType,
        Type unitOfWorkServiceType,
        bool isRuntimeEnabled,
        bool isInboxEnabled,
        bool isOutboxEnabled,
        bool hasInboxRepositoryFactory,
        bool hasOutboxRepositoryFactory,
        bool hasUnitOfWorkManagerFactory,
        bool hasUnitOfWorkFactory)
    {
        StoreKey = storeKey;
        PersistenceOwnerType = persistenceOwnerType;
        PersistenceContextType = persistenceContextType;
        InboxRepositoryServiceType = inboxRepositoryServiceType;
        OutboxRepositoryServiceType = outboxRepositoryServiceType;
        UnitOfWorkManagerServiceType = unitOfWorkManagerServiceType;
        UnitOfWorkServiceType = unitOfWorkServiceType;
        IsRuntimeEnabled = isRuntimeEnabled;
        IsInboxEnabled = isInboxEnabled;
        IsOutboxEnabled = isOutboxEnabled;
        HasInboxRepositoryFactory = hasInboxRepositoryFactory;
        HasOutboxRepositoryFactory = hasOutboxRepositoryFactory;
        HasUnitOfWorkManagerFactory = hasUnitOfWorkManagerFactory;
        HasUnitOfWorkFactory = hasUnitOfWorkFactory;
    }

    public string StoreKey { get; }
    public Type PersistenceOwnerType { get; }
    public Type PersistenceModuleType => PersistenceOwnerType;
    public Type PersistenceContextType { get; }
    public Type InboxRepositoryServiceType { get; }
    public Type OutboxRepositoryServiceType { get; }
    public Type UnitOfWorkManagerServiceType { get; }
    public Type UnitOfWorkServiceType { get; }
    public bool IsRuntimeEnabled { get; }
    public bool IsInboxEnabled { get; }
    public bool IsOutboxEnabled { get; }
    public bool HasInboxRepositoryFactory { get; }
    public bool HasOutboxRepositoryFactory { get; }
    public bool HasUnitOfWorkManagerFactory { get; }
    public bool HasUnitOfWorkFactory { get; }
}

/// <summary>Describes one explicit application-to-persistence binding.</summary>
public sealed class PlatformModuleCompositionBinding
{
    public PlatformModuleCompositionBinding(string storeKey, Type applicationModuleType, Type persistenceModuleType)
    {
        StoreKey = storeKey;
        ApplicationModuleType = applicationModuleType;
        PersistenceModuleType = persistenceModuleType;
    }

    public string StoreKey { get; }
    public Type ApplicationModuleType { get; }
    public Type PersistenceModuleType { get; }
}

/// <summary>Describes one bound store and the lanes intentionally assigned to it.</summary>
public sealed class PlatformModuleCompositionStoreDescriptor
{
    public PlatformModuleCompositionStoreDescriptor(
        string storeKey,
        PlatformModuleCompositionPersistenceStore persistenceStore,
        IEnumerable<PlatformModuleCompositionApplicationLane> applicationLanes)
    {
        StoreKey = storeKey;
        PersistenceStore = persistenceStore;
        ApplicationLanes = (applicationLanes ?? [])
            .Where(lane => lane != null)
            .ToList()
            .AsReadOnly();
    }

    public string StoreKey { get; }
    public PlatformModuleCompositionPersistenceStore PersistenceStore { get; }
    public Type PersistenceOwnerType => PersistenceStore.PersistenceOwnerType;
    public Type PersistenceModuleType => PersistenceStore.PersistenceModuleType;
    public Type PersistenceContextType => PersistenceStore.PersistenceContextType;
    public Type InboxRepositoryServiceType => PersistenceStore.InboxRepositoryServiceType;
    public Type OutboxRepositoryServiceType => PersistenceStore.OutboxRepositoryServiceType;
    public Type UnitOfWorkManagerServiceType => PersistenceStore.UnitOfWorkManagerServiceType;
    public Type UnitOfWorkServiceType => PersistenceStore.UnitOfWorkServiceType;
    public bool IsRuntimeEnabled => PersistenceStore.IsRuntimeEnabled;
    public bool IsInboxEnabled => PersistenceStore.IsInboxEnabled;
    public bool IsOutboxEnabled => PersistenceStore.IsOutboxEnabled;
    public bool HasInboxRepositoryFactory => PersistenceStore.HasInboxRepositoryFactory;
    public bool HasOutboxRepositoryFactory => PersistenceStore.HasOutboxRepositoryFactory;
    public bool HasUnitOfWorkManagerFactory => PersistenceStore.HasUnitOfWorkManagerFactory;
    public bool HasUnitOfWorkFactory => PersistenceStore.HasUnitOfWorkFactory;
    public IReadOnlyList<PlatformModuleCompositionApplicationLane> ApplicationLanes { get; }
}
