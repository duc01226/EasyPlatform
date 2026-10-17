using Easy.Platform.Application.MessageBus.InboxPattern;
using System.Reflection;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Common;

namespace Easy.Platform.Application.MessageBus.Store;

/// <summary>
/// Provides explicit lookup of application lanes and persistence-owned message stores.
/// </summary>
public interface IPlatformMessageBusStoreRegistry : IPlatformModuleCompositionMetadataSource
{
    /// <summary>
    /// Gets a value indicating whether strict composition validation is enabled.
    /// </summary>
    bool IsStrictCompositionValidationEnabled { get; }

    /// <summary>
    /// Gets all application-lane contributions in registration order.
    /// </summary>
    IReadOnlyList<PlatformMessageBusApplicationLaneRegistration> ApplicationLaneRegistrations { get; }

    /// <summary>
    /// Gets all persistence-store contributions in registration order.
    /// </summary>
    IReadOnlyList<PlatformPersistenceMessageBusStoreRegistration> PersistenceStoreRegistrations { get; }

    /// <summary>
    /// Gets all explicit root bindings in registration order.
    /// </summary>
    IReadOnlyList<PlatformMessageBusStoreBinding> Bindings { get; }

    /// <summary>
    /// Gets descriptors created from explicit bindings, sorted by logical key.
    /// </summary>
    IReadOnlyList<PlatformMessageBusStoreDescriptor> Descriptors { get; }

    /// <summary>
    /// Gets a value indicating whether any persistence module contributed a runtime inbox/outbox store.
    /// </summary>
    /// <remarks>
    /// This is the single switch between the legacy unqualified DI path and registry routing. Store contribution is
    /// opt-in, so an existing host that composes no store keeps resolving the unqualified inbox/outbox repositories
    /// exactly as before, even when its application modules contribute lanes or its producers declare keys.
    /// </remarks>
    bool HasRuntimeStoreComposition { get; }

    /// <summary>
    /// Validates the registry according to the configured strictness.
    /// </summary>
    void Validate();

    /// <summary>
    /// Validates ownership of the concrete data-seeder types registered in the final service collection.
    /// </summary>
    /// <param name="registeredSeederTypes">The concrete seeder types visible to the host.</param>
    void ValidateSeederOwnership(IEnumerable<Type> registeredSeederTypes);

    /// <summary>
    /// Gets a descriptor by logical key. The default key retains the legacy adapter behavior.
    /// </summary>
    PlatformMessageBusStoreDescriptor Get(PlatformMessageBusStoreKey storeKey);

    /// <summary>
    /// Tries to resolve a descriptor by logical key. Returns <see langword="false" /> for an empty or unresolvable key.
    /// </summary>
    bool TryGet(PlatformMessageBusStoreKey storeKey, out PlatformMessageBusStoreDescriptor descriptor);

    /// <summary>
    /// Resolves an application lane's descriptor, requiring a unique match.
    /// </summary>
    PlatformMessageBusStoreDescriptor GetForApplication(Type applicationModuleType, PlatformMessageBusStoreKey? storeKey = null);

    /// <summary>
    /// Resolves an application lane's descriptor by its owning application assembly, requiring a unique match.
    /// </summary>
    PlatformMessageBusStoreDescriptor GetForApplication(Assembly applicationAssembly, PlatformMessageBusStoreKey? storeKey = null);

    /// <summary>
    /// Resolves the single-store compatibility path.
    /// </summary>
    /// <remarks>
    /// Several explicitly bound stores are always ambiguous: bindings have no legacy last-wins behavior to preserve,
    /// and silently picking one would write outbox rows outside the caller's transaction. Only unbound compatible
    /// application/persistence pairs keep the legacy last-registration fallback when strict mode is disabled.
    /// </remarks>
    PlatformMessageBusStoreDescriptor ResolveLegacyDefault();

    /// <summary>
    /// Resolves the unbound compatibility descriptor used by background workers, returning null when no application
    /// lane matches a runtime store. Registration errors and strict-mode ambiguity still throw.
    /// </summary>
    PlatformMessageBusStoreDescriptor TryResolveUnboundLegacyDefault();
}

/// <summary>
/// Merges provider-neutral message-store contributions at the composition root.
/// </summary>
public sealed class PlatformMessageBusStoreRegistry : IPlatformMessageBusStoreRegistry, IPlatformModuleCompositionMetadataSource
{
    /// <summary>
    /// Configuration key for enabling strict message-store composition validation.
    /// </summary>
    /// <remarks>
    /// Aliases <see cref="PlatformModuleCompositionOptions.StrictValidationConfigurationKey" /> so the application and
    /// ASP.NET Core paths can never read different settings.
    /// </remarks>
    public const string StrictCompositionValidationConfigurationKey = PlatformModuleCompositionOptions.StrictValidationConfigurationKey;

    private readonly RegistryState state;

    /// <summary>
    /// Initializes a registry from application contributions, persistence contributions, and explicit bindings.
    /// </summary>
    public PlatformMessageBusStoreRegistry(
        IEnumerable<PlatformMessageBusApplicationLaneRegistration> applicationLaneRegistrations,
        IEnumerable<PlatformPersistenceMessageBusStoreRegistration> persistenceStoreRegistrations,
        IEnumerable<PlatformMessageBusStoreBinding> bindings,
        bool isStrictCompositionValidationEnabled = false)
    {
        ApplicationLaneRegistrations = (applicationLaneRegistrations ?? []).ToList().AsReadOnly();
        PersistenceStoreRegistrations = (persistenceStoreRegistrations ?? []).ToList().AsReadOnly();
        Bindings = (bindings ?? []).ToList().AsReadOnly();
        IsStrictCompositionValidationEnabled = isStrictCompositionValidationEnabled;

        state = BuildState();
    }

    /// <inheritdoc />
    public bool IsStrictCompositionValidationEnabled { get; }

    /// <inheritdoc />
    public IReadOnlyList<PlatformMessageBusApplicationLaneRegistration> ApplicationLaneRegistrations { get; }

    /// <inheritdoc />
    public IReadOnlyList<PlatformPersistenceMessageBusStoreRegistration> PersistenceStoreRegistrations { get; }

    /// <inheritdoc />
    public IReadOnlyList<PlatformMessageBusStoreBinding> Bindings { get; }

    /// <inheritdoc />
    public IReadOnlyList<PlatformMessageBusStoreDescriptor> Descriptors
    {
        get
        {
            EnsureRegistrationErrors();
            return state.Descriptors;
        }
    }

    /// <inheritdoc />
    public bool HasRuntimeStoreComposition => PersistenceStoreRegistrations.Any(store => store.IsRuntimeEnabled);

    /// <inheritdoc />
    public void Validate()
    {
        EnsureRegistrationErrors();

        if (!IsStrictCompositionValidationEnabled)
            return;

        var metadata = (IPlatformModuleCompositionMetadataSource)this;
        var applicationLanes = metadata.ApplicationLaneMetadata;
        var bindings = metadata.BindingMetadata;

        var errors = PlatformModuleCompositionRules.FindApplicationLaneBindingErrors(applicationLanes, bindings);
        errors.AddRange(PlatformModuleCompositionRules.FindUnboundRuntimePersistenceStoreErrors(metadata.PersistenceStoreMetadata, bindings));
        errors.AddRange(PlatformModuleCompositionRules.FindDeclaredSeederOwnershipErrors(applicationLanes));

        if (errors.Count > 0)
            throw CreateCompositionException(errors);
    }

    /// <inheritdoc />
    public void ValidateSeederOwnership(IEnumerable<Type> registeredSeederTypes)
    {
        ArgumentNullException.ThrowIfNull(registeredSeederTypes);

        if (!IsStrictCompositionValidationEnabled)
            return;

        var applicationLanes = ((IPlatformModuleCompositionMetadataSource)this).ApplicationLaneMetadata;

        var errors = PlatformModuleCompositionRules.FindRegisteredSeederOwnershipErrors(applicationLanes, registeredSeederTypes);
        errors.AddRange(PlatformModuleCompositionRules.FindDeclaredSeederOwnershipErrors(applicationLanes));

        if (errors.Count > 0)
            throw CreateCompositionException(errors);
    }

    /// <inheritdoc />
    public PlatformMessageBusStoreDescriptor Get(PlatformMessageBusStoreKey storeKey)
    {
        EnsureRegistrationErrors();

        if (storeKey.IsEmpty)
            throw new ArgumentException("A message-bus store lookup requires a non-empty key.", nameof(storeKey));

        // Default is the unqualified compatibility path. It must apply the legacy ambiguity rule even when one
        // explicitly bound store happens to use the literal Default key; otherwise a multi-store host would
        // silently select that store and make the unqualified path order-dependent again.
        if (storeKey.IsDefault)
            return ResolveLegacyDefault();

        var descriptor = state.Descriptors.FirstOrDefault(candidate => candidate.StoreKey == storeKey);
        if (descriptor != null)
            return descriptor;

        throw CreateCompositionException([$"No message-bus store is bound for key '{storeKey}'."]);
    }

    /// <inheritdoc />
    public bool TryGet(PlatformMessageBusStoreKey storeKey, out PlatformMessageBusStoreDescriptor descriptor)
    {
        // A Try lookup must not throw for caller input; an empty key simply resolves no store.
        if (storeKey.IsEmpty)
        {
            descriptor = null;
            return false;
        }

        try
        {
            descriptor = Get(storeKey);
            return true;
        }
        catch (InvalidOperationException)
        {
            descriptor = null;
            return false;
        }
    }

    /// <inheritdoc />
    public PlatformMessageBusStoreDescriptor GetForApplication(Type applicationModuleType, PlatformMessageBusStoreKey? storeKey = null)
    {
        ArgumentNullException.ThrowIfNull(applicationModuleType);

        return GetForApplication(
            lane => lane.ApplicationModuleType == applicationModuleType,
            $"module '{GetTypeName(applicationModuleType)}'",
            storeKey);
    }

    /// <inheritdoc />
    public PlatformMessageBusStoreDescriptor GetForApplication(Assembly applicationAssembly, PlatformMessageBusStoreKey? storeKey = null)
    {
        ArgumentNullException.ThrowIfNull(applicationAssembly);

        return GetForApplication(
            lane => lane.ApplicationAssembly == applicationAssembly,
            $"assembly '{applicationAssembly.FullName ?? applicationAssembly.GetName().Name}'",
            storeKey);
    }

    /// <inheritdoc />
    public PlatformMessageBusStoreDescriptor ResolveLegacyDefault()
    {
        EnsureRegistrationErrors();

        if (state.Descriptors.Count == 1)
            return state.Descriptors[0];

        // Bindings are an explicit API with no legacy last-wins behavior to preserve. Selecting one of several bound
        // stores would route an unqualified producer or consumer into another module's database and transaction,
        // so the ambiguity is reported regardless of the strict flag.
        if (state.Descriptors.Count > 1)
            throw CreateCompositionException(["The legacy message-bus store path is ambiguous because multiple explicitly bound stores exist."]);

        if (state.LegacyCompatibleDescriptors.Count == 1)
            return state.LegacyCompatibleDescriptors[0];

        if (state.LegacyCompatibleDescriptors.Count > 1)
        {
            if (IsStrictCompositionValidationEnabled)
                throw CreateCompositionException(["The legacy message-bus store path is ambiguous because multiple compatible application/persistence pairs exist."]);

            // Unbound pairs mirror legacy DI, where the last registration wins.
            return state.LegacyCompatibleDescriptors[^1];
        }

        throw CreateCompositionException(["No compatible application/persistence message-bus store pair exists for the legacy default path."]);
    }

    /// <inheritdoc />
    public PlatformMessageBusStoreDescriptor TryResolveUnboundLegacyDefault()
    {
        EnsureRegistrationErrors();

        return state.Descriptors.Count == 0 && Bindings.Count == 0 && state.LegacyCompatibleDescriptors.Count == 0
            ? null
            : ResolveLegacyDefault();
    }

    bool IPlatformModuleCompositionMetadataSource.IsStrictValidationEnabled => IsStrictCompositionValidationEnabled;

    IReadOnlyList<PlatformModuleCompositionApplicationLane> IPlatformModuleCompositionMetadataSource.ApplicationLaneMetadata =>
        ApplicationLaneRegistrations.Select(MapApplicationLane).ToList().AsReadOnly();

    IReadOnlyList<PlatformModuleCompositionPersistenceStore> IPlatformModuleCompositionMetadataSource.PersistenceStoreMetadata =>
        PersistenceStoreRegistrations.Select(MapPersistenceStore).ToList().AsReadOnly();

    IReadOnlyList<PlatformModuleCompositionBinding> IPlatformModuleCompositionMetadataSource.BindingMetadata =>
        Bindings
            .Select(binding => new PlatformModuleCompositionBinding(
                binding.StoreKey.Value,
                binding.ApplicationModuleType,
                binding.PersistenceModuleType))
            .ToList()
            .AsReadOnly();

    IReadOnlyList<PlatformModuleCompositionStoreDescriptor> IPlatformModuleCompositionMetadataSource.DescriptorMetadata =>
        Descriptors.Select(MapDescriptor).ToList().AsReadOnly();

    private PlatformMessageBusStoreDescriptor GetForApplication(
        Func<PlatformMessageBusApplicationLaneRegistration, bool> lanePredicate,
        string applicationSubject,
        PlatformMessageBusStoreKey? storeKey)
    {
        EnsureRegistrationErrors();

        var descriptorSource = state.Descriptors.Count == 0 && Bindings.Count == 0
            ? state.LegacyCompatibleDescriptors
            : state.Descriptors;
        var candidates = descriptorSource
            .Where(descriptor => storeKey == null || descriptor.StoreKey == storeKey.Value)
            .Where(descriptor => descriptor.ApplicationLanes.Any(lanePredicate))
            .ToList();

        if (candidates.Count == 1)
            return candidates[0];

        if (candidates.Count == 0)
            throw CreateCompositionException([$"No message-bus store is bound for application {applicationSubject}."]);

        throw CreateCompositionException(
            [$"Application {applicationSubject} is bound to multiple message-bus stores; select a key explicitly."]);
    }

    private static PlatformModuleCompositionApplicationLane MapApplicationLane(
        PlatformMessageBusApplicationLaneRegistration lane)
    {
        return new PlatformModuleCompositionApplicationLane(
            lane.StoreKey.Value,
            lane.ApplicationModuleType,
            lane.ApplicationName,
            lane.ApplicationAssembly,
            lane.ApplicationDataSeederTypes);
    }

    private static PlatformModuleCompositionPersistenceStore MapPersistenceStore(
        PlatformPersistenceMessageBusStoreRegistration store)
    {
        return new PlatformModuleCompositionPersistenceStore(
            store.StoreKey.Value,
            store.PersistenceOwnerType,
            store.PersistenceContextType,
            store.InboxRepositoryServiceType,
            store.OutboxRepositoryServiceType,
            store.UnitOfWorkManagerServiceType,
            store.UnitOfWorkServiceType,
            store.IsRuntimeEnabled,
            store.IsInboxEnabled,
            store.IsOutboxEnabled,
            store.InboxRepositoryFactory != null,
            store.OutboxRepositoryFactory != null,
            store.UnitOfWorkManagerFactory != null,
            store.UnitOfWorkFactory != null);
    }

    private static PlatformModuleCompositionStoreDescriptor MapDescriptor(PlatformMessageBusStoreDescriptor descriptor)
    {
        var persistenceStore = new PlatformModuleCompositionPersistenceStore(
            descriptor.StoreKey.Value,
            descriptor.PersistenceOwnerType,
            descriptor.PersistenceContextType,
            descriptor.InboxRepositoryServiceType,
            descriptor.OutboxRepositoryServiceType,
            descriptor.UnitOfWorkManagerServiceType,
            descriptor.UnitOfWorkServiceType,
            descriptor.IsRuntimeEnabled,
            descriptor.IsInboxEnabled,
            descriptor.IsOutboxEnabled,
            descriptor.InboxRepositoryFactory != null,
            descriptor.OutboxRepositoryFactory != null,
            descriptor.UnitOfWorkManagerFactory != null,
            descriptor.UnitOfWorkFactory != null);

        return new PlatformModuleCompositionStoreDescriptor(
            descriptor.StoreKey.Value,
            persistenceStore,
            descriptor.ApplicationLanes.Select(MapApplicationLane));
    }

    private RegistryState BuildState()
    {
        var errors = new List<string>();

        var duplicateApplicationModules = ApplicationLaneRegistrations
            .GroupBy(lane => lane.ApplicationModuleType)
            .Where(group => group.Count() > 1)
            .Select(group =>
                $"Application module '{GetTypeName(group.Key)}' contributed {group.Count()} message-bus lanes; each concrete module may contribute exactly one lane.")
            .ToList();
        errors.AddRange(duplicateApplicationModules);

        var duplicateApplicationIdentities = ApplicationLaneRegistrations
            .GroupBy(lane => (lane.StoreKey, lane.ApplicationName), new ApplicationLaneIdentityComparer())
            .Where(group => group.Count() > 1)
            .Select(group =>
                $"Message-bus application identity '{group.Key.ApplicationName}' is claimed by multiple lanes for key '{group.Key.StoreKey}'.")
            .ToList();
        errors.AddRange(duplicateApplicationIdentities);

        // Context-only migration contributions remain visible through PersistenceStoreRegistrations for diagnostics,
        // but they cannot own message workers and must not compete with a runtime store under the same logical key.
        errors.AddRange(
            PlatformModuleCompositionRules.FindConflictingPersistenceContractErrors(PersistenceStoreRegistrations.Select(MapPersistenceStore)));

        var uniquePersistenceStores = PersistenceStoreRegistrations
            .Where(store => store.IsRuntimeEnabled)
            .GroupBy(store => store.StoreKey)
            .Select(group => group.First())
            .ToList();

        var duplicateBindings = Bindings
            .GroupBy(binding => (binding.StoreKey, binding.ApplicationModuleType, binding.PersistenceModuleType), new BindingIdentityComparer())
            .Where(group => group.Count() > 1)
            .Select(group =>
                $"Message-bus store binding for key '{group.Key.StoreKey}', application '{GetTypeName(group.Key.ApplicationModuleType)}', and persistence '{GetTypeName(group.Key.PersistenceModuleType)}' is duplicated.")
            .ToList();
        errors.AddRange(duplicateBindings);

        var persistenceByKey = uniquePersistenceStores.ToDictionary(store => store.StoreKey);
        var boundLanesByKey = new Dictionary<PlatformMessageBusStoreKey, List<PlatformMessageBusApplicationLaneRegistration>>();

        foreach (var binding in Bindings)
        {
            if (!persistenceByKey.TryGetValue(binding.StoreKey, out var persistenceStore))
            {
                errors.Add($"Message-bus binding for key '{binding.StoreKey}' has no persistence contribution.");
                continue;
            }

            if (persistenceStore.PersistenceModuleType != binding.PersistenceModuleType)
            {
                errors.Add(
                    $"Message-bus binding for key '{binding.StoreKey}' selects persistence '{GetTypeName(binding.PersistenceModuleType)}', but the contribution is owned by '{GetTypeName(persistenceStore.PersistenceModuleType)}'.");
                continue;
            }

            var applicationLanes = ApplicationLaneRegistrations
                .Where(lane => lane.StoreKey == binding.StoreKey && lane.ApplicationModuleType == binding.ApplicationModuleType)
                .ToList();

            if (applicationLanes.Count == 0)
            {
                errors.Add(
                    $"Message-bus binding for key '{binding.StoreKey}' has no application contribution for '{GetTypeName(binding.ApplicationModuleType)}'.");
                continue;
            }

            if (applicationLanes.Count > 1)
            {
                errors.Add(
                    $"Message-bus binding for key '{binding.StoreKey}' has multiple application contributions for '{GetTypeName(binding.ApplicationModuleType)}'.");
                continue;
            }

            if (!boundLanesByKey.TryGetValue(binding.StoreKey, out var lanes))
            {
                lanes = [];
                boundLanesByKey[binding.StoreKey] = lanes;
            }

            if (lanes.Any(lane => lane.ApplicationModuleType == applicationLanes[0].ApplicationModuleType))
            {
                errors.Add(
                    $"Message-bus store key '{binding.StoreKey}' binds application module '{GetTypeName(binding.ApplicationModuleType)}' more than once.");
                continue;
            }

            lanes.Add(applicationLanes[0]);
        }

        var descriptors = boundLanesByKey
            .OrderBy(item => item.Key.Value, StringComparer.Ordinal)
            .Select(item =>
            {
                var persistenceStore = persistenceByKey[item.Key];
                var orderedLanes = item.Value
                    .OrderBy(lane => lane.ApplicationName, StringComparer.Ordinal)
                    .ThenBy(lane => GetTypeName(lane.ApplicationModuleType), StringComparer.Ordinal)
                    .ToList();
                return new PlatformMessageBusStoreDescriptor(item.Key, persistenceStore, orderedLanes);
            })
            .ToList()
            .AsReadOnly();

        var legacyCompatibleDescriptors = ApplicationLaneRegistrations
            .Select(applicationLane =>
            {
                if (!persistenceByKey.TryGetValue(applicationLane.StoreKey, out var persistenceStore))
                    return null;

                return new PlatformMessageBusStoreDescriptor(applicationLane.StoreKey, persistenceStore, [applicationLane]);
            })
            .Where(descriptor => descriptor != null)
            .ToList()
            .AsReadOnly();

        return new RegistryState(
            errors.AsReadOnly(),
            descriptors,
            legacyCompatibleDescriptors);
    }

    private void EnsureRegistrationErrors()
    {
        if (state.Errors.Count > 0)
            throw CreateCompositionException(state.Errors);
    }

    private static InvalidOperationException CreateCompositionException(IEnumerable<string> errors)
    {
        var diagnostics = errors
            .Where(error => !string.IsNullOrWhiteSpace(error))
            .Distinct(StringComparer.Ordinal)
            .OrderBy(error => error, StringComparer.Ordinal)
            .ToList();

        return new InvalidOperationException(
            diagnostics.Count == 0
                ? "Message-bus store composition is invalid."
                : $"Message-bus store composition is invalid: {string.Join(" ", diagnostics)}");
    }

    private static string GetTypeName(Type type)
    {
        return PlatformModuleCompositionRules.GetTypeName(type);
    }

    private sealed class RegistryState
    {
        public RegistryState(
            IReadOnlyList<string> errors,
            IReadOnlyList<PlatformMessageBusStoreDescriptor> descriptors,
            IReadOnlyList<PlatformMessageBusStoreDescriptor> legacyCompatibleDescriptors)
        {
            Errors = errors;
            Descriptors = descriptors;
            LegacyCompatibleDescriptors = legacyCompatibleDescriptors;
        }

        public IReadOnlyList<string> Errors { get; }
        public IReadOnlyList<PlatformMessageBusStoreDescriptor> Descriptors { get; }
        public IReadOnlyList<PlatformMessageBusStoreDescriptor> LegacyCompatibleDescriptors { get; }
    }

    private sealed class ApplicationLaneIdentityComparer : IEqualityComparer<(PlatformMessageBusStoreKey StoreKey, string ApplicationName)>
    {
        public bool Equals(
            (PlatformMessageBusStoreKey StoreKey, string ApplicationName) x,
            (PlatformMessageBusStoreKey StoreKey, string ApplicationName) y)
        {
            return x.StoreKey == y.StoreKey && string.Equals(x.ApplicationName, y.ApplicationName, StringComparison.Ordinal);
        }

        public int GetHashCode((PlatformMessageBusStoreKey StoreKey, string ApplicationName) obj)
        {
            return HashCode.Combine(obj.StoreKey, StringComparer.Ordinal.GetHashCode(obj.ApplicationName));
        }
    }

    private sealed class BindingIdentityComparer : IEqualityComparer<(PlatformMessageBusStoreKey StoreKey, Type ApplicationModuleType, Type PersistenceModuleType)>
    {
        public bool Equals(
            (PlatformMessageBusStoreKey StoreKey, Type ApplicationModuleType, Type PersistenceModuleType) x,
            (PlatformMessageBusStoreKey StoreKey, Type ApplicationModuleType, Type PersistenceModuleType) y)
        {
            return x.StoreKey == y.StoreKey &&
                   x.ApplicationModuleType == y.ApplicationModuleType &&
                   x.PersistenceModuleType == y.PersistenceModuleType;
        }

        public int GetHashCode((PlatformMessageBusStoreKey StoreKey, Type ApplicationModuleType, Type PersistenceModuleType) obj)
        {
            return HashCode.Combine(obj.StoreKey, obj.ApplicationModuleType, obj.PersistenceModuleType);
        }
    }
}
