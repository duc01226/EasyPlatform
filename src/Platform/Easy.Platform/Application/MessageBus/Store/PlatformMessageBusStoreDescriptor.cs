using Easy.Platform.Application.MessageBus.InboxPattern;
using System.Reflection;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Domain.UnitOfWork;

namespace Easy.Platform.Application.MessageBus.Store;

/// <summary>
/// Represents a fully bound logical message-bus store and its application lanes.
/// </summary>
/// <remarks>
/// A descriptor contains only ownership metadata and typed resolver delegates. It is safe to expose in
/// composition diagnostics because it does not materialize or serialize persistence configuration or messages.
/// </remarks>
public sealed class PlatformMessageBusStoreDescriptor
{
    /// <summary>
    /// Initializes a descriptor from a persistence contribution and one or more application lanes.
    /// </summary>
    public PlatformMessageBusStoreDescriptor(
        PlatformMessageBusStoreKey storeKey,
        PlatformPersistenceMessageBusStoreRegistration persistenceStore,
        IEnumerable<PlatformMessageBusApplicationLaneRegistration> applicationLanes)
    {
        if (storeKey.IsEmpty)
            throw new ArgumentException("A message-bus store descriptor must have a non-empty store key.", nameof(storeKey));

        ArgumentNullException.ThrowIfNull(persistenceStore);
        ArgumentNullException.ThrowIfNull(applicationLanes);

        var lanes = applicationLanes.Where(lane => lane != null).ToList();
        if (lanes.Count == 0)
            throw new ArgumentException("A message-bus store descriptor must have at least one application lane.", nameof(applicationLanes));

        StoreKey = storeKey;
        PersistenceOwnerType = persistenceStore.PersistenceOwnerType;
        PersistenceModuleType = persistenceStore.PersistenceModuleType;
        PersistenceContextType = persistenceStore.PersistenceContextType;
        InboxRepositoryServiceType = persistenceStore.InboxRepositoryServiceType;
        OutboxRepositoryServiceType = persistenceStore.OutboxRepositoryServiceType;
        UnitOfWorkManagerServiceType = persistenceStore.UnitOfWorkManagerServiceType;
        IsRuntimeEnabled = persistenceStore.IsRuntimeEnabled;
        IsInboxEnabled = persistenceStore.IsInboxEnabled;
        IsOutboxEnabled = persistenceStore.IsOutboxEnabled;
        InboxRepositoryFactory = persistenceStore.InboxRepositoryFactory;
        OutboxRepositoryFactory = persistenceStore.OutboxRepositoryFactory;
        UnitOfWorkManagerFactory = persistenceStore.UnitOfWorkManagerFactory;
        UnitOfWorkServiceType = persistenceStore.UnitOfWorkServiceType;
        UnitOfWorkFactory = persistenceStore.UnitOfWorkFactory;
        ApplicationLanes = lanes.AsReadOnly();
    }

    /// <summary>
    /// Gets the bound logical store key.
    /// </summary>
    public PlatformMessageBusStoreKey StoreKey { get; }

    /// <summary>
    /// Gets the persistence owner type.
    /// </summary>
    public Type PersistenceOwnerType { get; }

    /// <summary>
    /// Gets the concrete persistence module type.
    /// </summary>
    public Type PersistenceModuleType { get; }

    /// <summary>
    /// Gets the context type that owns the local transaction boundary.
    /// </summary>
    public Type PersistenceContextType { get; }

    /// <summary>
    /// Gets the closed inbox repository service type, or <see langword="null" /> when disabled.
    /// </summary>
    public Type InboxRepositoryServiceType { get; }

    /// <summary>
    /// Gets the closed outbox repository service type, or <see langword="null" /> when disabled.
    /// </summary>
    public Type OutboxRepositoryServiceType { get; }

    /// <summary>
    /// Gets the closed unit-of-work manager service type, or <see langword="null" /> when disabled.
    /// </summary>
    public Type UnitOfWorkManagerServiceType { get; }

    /// <summary>
    /// Gets the closed provider-specific inner unit-of-work service type.
    /// </summary>
    public Type UnitOfWorkServiceType { get; }

    /// <summary>
    /// Gets a value indicating whether this store is enabled for runtime processing.
    /// </summary>
    public bool IsRuntimeEnabled { get; }

    /// <summary>
    /// Gets a value indicating whether inbox processing has a typed repository path.
    /// </summary>
    public bool IsInboxEnabled { get; }

    /// <summary>
    /// Gets a value indicating whether outbox processing has a typed repository path.
    /// </summary>
    public bool IsOutboxEnabled { get; }

    /// <summary>
    /// Gets the typed inbox repository factory.
    /// </summary>
    public Func<IServiceProvider, IPlatformInboxBusMessageRepository> InboxRepositoryFactory { get; }

    /// <summary>
    /// Gets the typed outbox repository factory.
    /// </summary>
    public Func<IServiceProvider, IPlatformOutboxBusMessageRepository> OutboxRepositoryFactory { get; }

    /// <summary>
    /// Gets the typed unit-of-work manager factory.
    /// </summary>
    public Func<IServiceProvider, IPlatformUnitOfWorkManager> UnitOfWorkManagerFactory { get; }

    /// <summary>
    /// Gets the resolver for the closed provider-specific inner unit-of-work contract.
    /// </summary>
    public Func<IServiceProvider, IPlatformUnitOfWork> UnitOfWorkFactory { get; }

    /// <summary>
    /// Gets the application lanes intentionally bound to this persistence contract.
    /// </summary>
    public IReadOnlyList<PlatformMessageBusApplicationLaneRegistration> ApplicationLanes { get; }

    /// <summary>
    /// Resolves the only lane in this descriptor.
    /// </summary>
    public PlatformMessageBusApplicationLaneRegistration GetSingleApplicationLane()
    {
        if (ApplicationLanes.Count == 1)
            return ApplicationLanes[0];

        throw new InvalidOperationException(
            $"Message-bus store '{StoreKey}' has {ApplicationLanes.Count} application lanes; select one by module type or application name.");
    }

    /// <summary>
    /// Resolves a lane by its concrete application module type.
    /// </summary>
    public PlatformMessageBusApplicationLaneRegistration GetApplicationLane(Type applicationModuleType)
    {
        ArgumentNullException.ThrowIfNull(applicationModuleType);

        var lanes = ApplicationLanes.Where(lane => lane.ApplicationModuleType == applicationModuleType).ToList();
        return ResolveSingleLane(lanes, $"module '{GetTypeName(applicationModuleType)}'");
    }

    /// <summary>
    /// Resolves a lane by the assembly that owns the application module.
    /// </summary>
    public PlatformMessageBusApplicationLaneRegistration GetApplicationLane(Assembly applicationAssembly)
    {
        ArgumentNullException.ThrowIfNull(applicationAssembly);

        var lanes = ApplicationLanes.Where(lane => lane.ApplicationAssembly == applicationAssembly).ToList();
        return ResolveSingleLane(
            lanes,
            $"assembly '{applicationAssembly.FullName ?? applicationAssembly.GetName().Name}'");
    }

    /// <summary>
    /// Resolves a lane by its application identity.
    /// </summary>
    public PlatformMessageBusApplicationLaneRegistration GetApplicationLane(string applicationName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(applicationName);

        var normalizedApplicationName = applicationName.Trim();
        var lanes = ApplicationLanes.Where(lane => string.Equals(lane.ApplicationName, normalizedApplicationName, StringComparison.Ordinal)).ToList();
        return ResolveSingleLane(lanes, $"application '{normalizedApplicationName}'");
    }

    /// <summary>
    /// Resolves the typed inbox repository for this descriptor.
    /// </summary>
    public IPlatformInboxBusMessageRepository ResolveInboxRepository(IServiceProvider serviceProvider)
    {
        ArgumentNullException.ThrowIfNull(serviceProvider);

        if (!IsInboxEnabled || InboxRepositoryFactory == null)
            throw new InvalidOperationException($"Message-bus store '{StoreKey}' has no enabled inbox repository contract.");

        return InboxRepositoryFactory(serviceProvider)
            ?? throw new InvalidOperationException($"Message-bus store '{StoreKey}' inbox repository factory returned no repository.");
    }

    /// <summary>
    /// Resolves the typed outbox repository for this descriptor.
    /// </summary>
    public IPlatformOutboxBusMessageRepository ResolveOutboxRepository(IServiceProvider serviceProvider)
    {
        ArgumentNullException.ThrowIfNull(serviceProvider);

        if (!IsOutboxEnabled || OutboxRepositoryFactory == null)
            throw new InvalidOperationException($"Message-bus store '{StoreKey}' has no enabled outbox repository contract.");

        return OutboxRepositoryFactory(serviceProvider)
            ?? throw new InvalidOperationException($"Message-bus store '{StoreKey}' outbox repository factory returned no repository.");
    }

    /// <summary>
    /// Resolves the typed unit-of-work manager for this descriptor.
    /// </summary>
    public IPlatformUnitOfWorkManager ResolveUnitOfWorkManager(IServiceProvider serviceProvider)
    {
        ArgumentNullException.ThrowIfNull(serviceProvider);

        if (!IsRuntimeEnabled || UnitOfWorkManagerFactory == null)
            throw new InvalidOperationException($"Message-bus store '{StoreKey}' has no enabled unit-of-work contract.");

        return UnitOfWorkManagerFactory(serviceProvider)
            ?? throw new InvalidOperationException($"Message-bus store '{StoreKey}' unit-of-work factory returned no manager.");
    }

    /// <summary>
    /// Resolves the closed provider-specific inner unit of work for this descriptor.
    /// </summary>
    public IPlatformUnitOfWork ResolveUnitOfWork(IServiceProvider serviceProvider)
    {
        ArgumentNullException.ThrowIfNull(serviceProvider);

        if (!IsRuntimeEnabled || UnitOfWorkFactory == null)
            throw new InvalidOperationException($"Message-bus store '{StoreKey}' has no enabled inner unit-of-work contract.");

        return UnitOfWorkFactory(serviceProvider)
            ?? throw new InvalidOperationException($"Message-bus store '{StoreKey}' inner unit-of-work factory returned no unit of work.");
    }

    /// <summary>
    /// Resolves the inbox configuration from a selected lane.
    /// </summary>
    public PlatformInboxConfig ResolveInboxConfig(IServiceProvider serviceProvider, Type applicationModuleType)
    {
        var lane = GetApplicationLane(applicationModuleType);
        return lane.InboxConfigFactory(serviceProvider)
            ?? throw new InvalidOperationException($"Message-bus application lane '{lane.ApplicationName}' inbox factory returned no configuration.");
    }

    /// <summary>
    /// Resolves the outbox configuration from a selected lane.
    /// </summary>
    public PlatformOutboxConfig ResolveOutboxConfig(IServiceProvider serviceProvider, Type applicationModuleType)
    {
        var lane = GetApplicationLane(applicationModuleType);
        return lane.OutboxConfigFactory(serviceProvider)
            ?? throw new InvalidOperationException($"Message-bus application lane '{lane.ApplicationName}' outbox factory returned no configuration.");
    }

    private PlatformMessageBusApplicationLaneRegistration ResolveSingleLane(
        List<PlatformMessageBusApplicationLaneRegistration> lanes,
        string selector)
    {
        if (lanes.Count == 1)
            return lanes.Single();

        throw new InvalidOperationException(
            lanes.Count == 0
                ? $"Message-bus store '{StoreKey}' has no application lane for {selector}."
                : $"Message-bus store '{StoreKey}' has multiple application lanes for {selector}. Select a unique lane.");
    }

    private static string GetTypeName(Type type)
    {
        return type.FullName ?? type.Name;
    }
}
