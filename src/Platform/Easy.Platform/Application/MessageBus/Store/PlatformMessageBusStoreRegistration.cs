using System.Reflection;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Domain.UnitOfWork;

namespace Easy.Platform.Application.MessageBus.Store;

/// <summary>
/// Describes one application-owned message-bus lane.
/// </summary>
/// <remarks>
/// This record contains composition metadata and resolver delegates only. It deliberately does not retain
/// configuration values, database names, credentials, request context, or message payloads.
/// </remarks>
public sealed record PlatformMessageBusApplicationLaneRegistration
{
    /// <summary>
    /// Initializes an application-lane registration.
    /// </summary>
    public PlatformMessageBusApplicationLaneRegistration(
        PlatformMessageBusStoreKey storeKey,
        Type applicationModuleType,
        string applicationName,
        Assembly applicationAssembly,
        Func<IServiceProvider, PlatformInboxConfig> inboxConfigFactory,
        Func<IServiceProvider, PlatformOutboxConfig> outboxConfigFactory,
        IEnumerable<Type> applicationDataSeederTypes = null)
    {
        EnsureStoreKey(storeKey);
        ArgumentNullException.ThrowIfNull(applicationModuleType);
        ArgumentException.ThrowIfNullOrWhiteSpace(applicationName);
        ArgumentNullException.ThrowIfNull(applicationAssembly);
        ArgumentNullException.ThrowIfNull(inboxConfigFactory);
        ArgumentNullException.ThrowIfNull(outboxConfigFactory);

        StoreKey = storeKey;
        ApplicationModuleType = applicationModuleType;
        ApplicationName = applicationName.Trim();
        ApplicationAssembly = applicationAssembly;
        InboxConfigFactory = inboxConfigFactory;
        OutboxConfigFactory = outboxConfigFactory;
        ApplicationDataSeederTypes = (applicationDataSeederTypes ?? [])
            .Where(type => type != null)
            .Distinct()
            .ToList()
            .AsReadOnly();
    }

    /// <summary>
    /// Gets the logical persistence key selected by the application module.
    /// </summary>
    public PlatformMessageBusStoreKey StoreKey { get; }

    /// <summary>
    /// Gets the concrete application module type that owns this lane.
    /// </summary>
    public Type ApplicationModuleType { get; }

    /// <summary>
    /// Gets the stable application identity used by message routing and inbox filtering.
    /// </summary>
    public string ApplicationName { get; }

    /// <summary>
    /// Gets the application assembly used for ownership and discovery diagnostics.
    /// </summary>
    public Assembly ApplicationAssembly { get; }

    /// <summary>
    /// Gets the factory for lane-specific inbox settings.
    /// </summary>
    public Func<IServiceProvider, PlatformInboxConfig> InboxConfigFactory { get; }

    /// <summary>
    /// Gets the factory for lane-specific outbox settings.
    /// </summary>
    public Func<IServiceProvider, PlatformOutboxConfig> OutboxConfigFactory { get; }

    /// <summary>
    /// Gets the concrete data-seeder types owned by this application lane.
    /// </summary>
    public IReadOnlyList<Type> ApplicationDataSeederTypes { get; }

    private static void EnsureStoreKey(PlatformMessageBusStoreKey storeKey)
    {
        if (storeKey.IsEmpty)
            throw new ArgumentException("A message-bus application lane must have a non-empty store key.", nameof(storeKey));
    }
}

/// <summary>
/// Describes one persistence-owned message store.
/// </summary>
/// <remarks>
/// The repository and unit-of-work types are closed service contracts. Resolver delegates select those
/// contracts from the final service provider without making the registry depend on a database provider.
/// </remarks>
public sealed record PlatformPersistenceMessageBusStoreRegistration
{
    /// <summary>
    /// Initializes a persistence store registration.
    /// </summary>
    public PlatformPersistenceMessageBusStoreRegistration(
        PlatformMessageBusStoreKey storeKey,
        Type persistenceOwnerType,
        Type persistenceContextType,
        Type inboxRepositoryServiceType,
        Type outboxRepositoryServiceType,
        Type unitOfWorkManagerServiceType,
        Func<IServiceProvider, IPlatformInboxBusMessageRepository> inboxRepositoryFactory,
        Func<IServiceProvider, IPlatformOutboxBusMessageRepository> outboxRepositoryFactory,
        Func<IServiceProvider, IPlatformUnitOfWorkManager> unitOfWorkManagerFactory,
        bool isRuntimeEnabled = true,
        Type unitOfWorkServiceType = null,
        Func<IServiceProvider, IPlatformUnitOfWork> unitOfWorkFactory = null)
    {
        EnsureStoreKey(storeKey);
        ArgumentNullException.ThrowIfNull(persistenceOwnerType);
        ArgumentNullException.ThrowIfNull(persistenceContextType);

        StoreKey = storeKey;
        PersistenceOwnerType = persistenceOwnerType;
        PersistenceContextType = persistenceContextType;
        InboxRepositoryServiceType = inboxRepositoryServiceType;
        OutboxRepositoryServiceType = outboxRepositoryServiceType;
        UnitOfWorkManagerServiceType = unitOfWorkManagerServiceType;
        InboxRepositoryFactory = inboxRepositoryFactory;
        OutboxRepositoryFactory = outboxRepositoryFactory;
        UnitOfWorkManagerFactory = unitOfWorkManagerFactory;
        IsRuntimeEnabled = isRuntimeEnabled;
        UnitOfWorkServiceType = unitOfWorkServiceType;
        UnitOfWorkFactory = unitOfWorkFactory;
    }

    /// <summary>
    /// Gets the logical persistence key published by the persistence module.
    /// </summary>
    public PlatformMessageBusStoreKey StoreKey { get; }

    /// <summary>
    /// Gets the type that owns the persistence boundary.
    /// </summary>
    public Type PersistenceOwnerType { get; }

    /// <summary>
    /// Gets the concrete persistence-module type, exposed as an explicit ownership alias for composition code.
    /// </summary>
    public Type PersistenceModuleType => PersistenceOwnerType;

    /// <summary>
    /// Gets the database-context type that owns the local transaction boundary.
    /// </summary>
    public Type PersistenceContextType { get; }

    /// <summary>
    /// Gets the closed inbox repository service type, or <see langword="null" /> when inbox is disabled.
    /// </summary>
    public Type InboxRepositoryServiceType { get; }

    /// <summary>
    /// Gets the closed outbox repository service type, or <see langword="null" /> when outbox is disabled.
    /// </summary>
    public Type OutboxRepositoryServiceType { get; }

    /// <summary>
    /// Gets the closed unit-of-work manager service type, or <see langword="null" /> when the store is disabled.
    /// </summary>
    public Type UnitOfWorkManagerServiceType { get; }

    /// <summary>
    /// Gets the closed provider-specific inner unit-of-work service type, or <see langword="null" /> when the store is non-runtime.
    /// </summary>
    /// <remarks>
    /// <see cref="UnitOfWorkManagerServiceType" /> intentionally remains the legacy aggregate manager contract.
    /// This property records the provider-specific closed contract that gives a repository its own context boundary.
    /// </remarks>
    public Type UnitOfWorkServiceType { get; }

    /// <summary>
    /// Gets the typed inbox repository resolver, or <see langword="null" /> when inbox is disabled.
    /// </summary>
    public Func<IServiceProvider, IPlatformInboxBusMessageRepository> InboxRepositoryFactory { get; }

    /// <summary>
    /// Gets the typed outbox repository resolver, or <see langword="null" /> when outbox is disabled.
    /// </summary>
    public Func<IServiceProvider, IPlatformOutboxBusMessageRepository> OutboxRepositoryFactory { get; }

    /// <summary>
    /// Gets the typed unit-of-work manager resolver, or <see langword="null" /> when the store is disabled.
    /// </summary>
    public Func<IServiceProvider, IPlatformUnitOfWorkManager> UnitOfWorkManagerFactory { get; }

    /// <summary>
    /// Gets the resolver for the provider-specific closed inner unit-of-work contract.
    /// </summary>
    public Func<IServiceProvider, IPlatformUnitOfWork> UnitOfWorkFactory { get; }

    /// <summary>
    /// Gets a value indicating whether this store can participate in runtime message processing.
    /// </summary>
    public bool IsRuntimeEnabled { get; }

    /// <summary>
    /// Gets a value indicating whether a typed inbox repository is available for this store.
    /// </summary>
    public bool IsInboxEnabled => IsRuntimeEnabled && InboxRepositoryServiceType != null && InboxRepositoryFactory != null;

    /// <summary>
    /// Gets a value indicating whether a typed outbox repository is available for this store.
    /// </summary>
    public bool IsOutboxEnabled => IsRuntimeEnabled && OutboxRepositoryServiceType != null && OutboxRepositoryFactory != null;

    /// <summary>
    /// Gets a value indicating whether a provider-specific closed inner unit-of-work path is available.
    /// </summary>
    public bool IsUnitOfWorkEnabled => IsRuntimeEnabled && UnitOfWorkServiceType != null && UnitOfWorkFactory != null;

    private static void EnsureStoreKey(PlatformMessageBusStoreKey storeKey)
    {
        if (storeKey.IsEmpty)
            throw new ArgumentException("A persistence message-bus store must have a non-empty store key.", nameof(storeKey));
    }
}

/// <summary>
/// Explicitly binds one application lane to one persistence-owned message store.
/// </summary>
/// <remarks>
/// The composition root owns this record. The registry never infers a binding from registration order or
/// from configuration values.
/// </remarks>
public sealed record PlatformMessageBusStoreBinding
{
    /// <summary>
    /// Initializes an explicit application-to-persistence binding.
    /// </summary>
    public PlatformMessageBusStoreBinding(
        PlatformMessageBusStoreKey storeKey,
        Type applicationModuleType,
        Type persistenceModuleType)
    {
        if (storeKey.IsEmpty)
            throw new ArgumentException("A message-bus store binding must have a non-empty store key.", nameof(storeKey));

        ArgumentNullException.ThrowIfNull(applicationModuleType);
        ArgumentNullException.ThrowIfNull(persistenceModuleType);

        StoreKey = storeKey;
        ApplicationModuleType = applicationModuleType;
        PersistenceModuleType = persistenceModuleType;
    }

    /// <summary>
    /// Gets the logical key under which the two contributions are joined.
    /// </summary>
    public PlatformMessageBusStoreKey StoreKey { get; }

    /// <summary>
    /// Gets the concrete application module type to bind.
    /// </summary>
    public Type ApplicationModuleType { get; }

    /// <summary>
    /// Gets the concrete persistence module type to bind.
    /// </summary>
    public Type PersistenceModuleType { get; }
}
