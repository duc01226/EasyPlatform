namespace Easy.Platform.Common;

/// <summary>
/// Single source of truth for the message-bus store composition rules shared by the application-layer store registry
/// and the Common-layer composition validator.
/// </summary>
/// <remarks>
/// The rules operate only on provider-neutral composition metadata, so the Common layer never references an
/// application contract. Every diagnostic contains only type names, logical store keys, and lane identities.
/// </remarks>
internal static class PlatformModuleCompositionRules
{
    /// <summary>
    /// Determines whether two persistence contributions describe the same persistence contract.
    /// </summary>
    /// <remarks>
    /// The comparison is intentionally strict: every service type, enablement flag, and resolver presence must match,
    /// so two contributions that could resolve different repositories or transaction owners are never merged.
    /// </remarks>
    public static bool HaveSamePersistenceContract(
        PlatformModuleCompositionPersistenceStore first,
        PlatformModuleCompositionPersistenceStore second)
    {
        return first.PersistenceOwnerType == second.PersistenceOwnerType &&
               first.PersistenceContextType == second.PersistenceContextType &&
               first.InboxRepositoryServiceType == second.InboxRepositoryServiceType &&
               first.OutboxRepositoryServiceType == second.OutboxRepositoryServiceType &&
               first.UnitOfWorkManagerServiceType == second.UnitOfWorkManagerServiceType &&
               first.UnitOfWorkServiceType == second.UnitOfWorkServiceType &&
               first.IsRuntimeEnabled == second.IsRuntimeEnabled &&
               first.IsInboxEnabled == second.IsInboxEnabled &&
               first.IsOutboxEnabled == second.IsOutboxEnabled &&
               first.HasInboxRepositoryFactory == second.HasInboxRepositoryFactory &&
               first.HasOutboxRepositoryFactory == second.HasOutboxRepositoryFactory &&
               first.HasUnitOfWorkManagerFactory == second.HasUnitOfWorkManagerFactory &&
               first.HasUnitOfWorkFactory == second.HasUnitOfWorkFactory;
    }

    /// <summary>
    /// Describes a persistence contract using type names only.
    /// </summary>
    public static string DescribePersistenceContract(PlatformModuleCompositionPersistenceStore store)
    {
        return $"owner '{GetTypeName(store.PersistenceOwnerType)}', "
               + $"context '{GetTypeName(store.PersistenceContextType)}', "
               + $"inbox '{GetTypeNameOrDisabled(store.InboxRepositoryServiceType)}', "
               + $"outbox '{GetTypeNameOrDisabled(store.OutboxRepositoryServiceType)}', "
               + $"unit-of-work-manager '{GetTypeNameOrDisabled(store.UnitOfWorkManagerServiceType)}', "
               + $"inner-unit-of-work '{GetTypeNameOrDisabled(store.UnitOfWorkServiceType)}', "
               + $"runtime '{store.IsRuntimeEnabled}'";
    }

    /// <summary>
    /// Finds runtime store keys whose contributions disagree on the persistence contract.
    /// </summary>
    public static List<string> FindConflictingPersistenceContractErrors(IEnumerable<PlatformModuleCompositionPersistenceStore> persistenceStores)
    {
        var errors = new List<string>();

        // Context-only migration contributions cannot own message workers, so only runtime stores compete for a key.
        foreach (var persistenceGroup in persistenceStores.Where(store => store.IsRuntimeEnabled).GroupBy(store => store.StoreKey, StringComparer.Ordinal))
        {
            var first = persistenceGroup.First();
            var conflicting = persistenceGroup.Skip(1).FirstOrDefault(store => !HaveSamePersistenceContract(first, store));

            if (conflicting != null)
            {
                errors.Add(
                    $"Message-bus store key '{first.StoreKey}' has conflicting persistence contracts: "
                    + $"first [{DescribePersistenceContract(first)}], conflicting [{DescribePersistenceContract(conflicting)}].");
            }
        }

        return errors;
    }

    /// <summary>
    /// Finds application lanes that do not have exactly one explicit store binding.
    /// </summary>
    public static List<string> FindApplicationLaneBindingErrors(
        IEnumerable<PlatformModuleCompositionApplicationLane> applicationLanes,
        IReadOnlyCollection<PlatformModuleCompositionBinding> bindings)
    {
        var errors = new List<string>();

        foreach (var applicationLane in applicationLanes)
        {
            var matchingBindings = bindings.Count(binding =>
                string.Equals(binding.StoreKey, applicationLane.StoreKey, StringComparison.Ordinal) &&
                binding.ApplicationModuleType == applicationLane.ApplicationModuleType);

            if (matchingBindings != 1)
            {
                errors.Add(
                    matchingBindings == 0
                        ? $"Application lane '{GetTypeName(applicationLane.ApplicationModuleType)}' with key '{applicationLane.StoreKey}' has no explicit store binding."
                        : $"Application lane '{GetTypeName(applicationLane.ApplicationModuleType)}' with key '{applicationLane.StoreKey}' has {matchingBindings} explicit store bindings.");
            }
        }

        return errors;
    }

    /// <summary>
    /// Finds runtime persistence stores that no explicit binding selects.
    /// </summary>
    public static List<string> FindUnboundRuntimePersistenceStoreErrors(
        IEnumerable<PlatformModuleCompositionPersistenceStore> persistenceStores,
        IReadOnlyCollection<PlatformModuleCompositionBinding> bindings)
    {
        return persistenceStores
            .Where(store => store.IsRuntimeEnabled)
            .GroupBy(store => store.StoreKey, StringComparer.Ordinal)
            .Select(group => group.First())
            .Where(store => !bindings.Any(binding =>
                string.Equals(binding.StoreKey, store.StoreKey, StringComparison.Ordinal) &&
                binding.PersistenceModuleType == store.PersistenceModuleType))
            .Select(store =>
                $"Runtime persistence store '{store.StoreKey}' owned by '{GetTypeName(store.PersistenceOwnerType)}' is not explicitly bound to an application lane.")
            .ToList();
    }

    /// <summary>
    /// Finds seeders declared by more than one application lane.
    /// </summary>
    public static List<string> FindDeclaredSeederOwnershipErrors(IEnumerable<PlatformModuleCompositionApplicationLane> applicationLanes)
    {
        return GetDeclaredSeederOwners(applicationLanes)
            .Where(item => item.Value.Count != 1)
            .Select(item => DescribeSeederOwnershipError(item.Key, item.Value.Count))
            .ToList();
    }

    /// <summary>
    /// Finds registered seeder types that do not have exactly one declaring application lane.
    /// </summary>
    public static List<string> FindRegisteredSeederOwnershipErrors(
        IEnumerable<PlatformModuleCompositionApplicationLane> applicationLanes,
        IEnumerable<Type> registeredSeederTypes)
    {
        var declaredSeederOwners = GetDeclaredSeederOwners(applicationLanes);

        return (registeredSeederTypes ?? [])
            .Where(type => type != null)
            .Distinct()
            .Select(type => new { SeederType = type, OwnerCount = declaredSeederOwners.TryGetValue(type, out var owners) ? owners.Count : 0 })
            .Where(item => item.OwnerCount != 1)
            .Select(item => DescribeSeederOwnershipError(item.SeederType, item.OwnerCount))
            .ToList();
    }

    /// <summary>
    /// Gets the stable diagnostic name of a type.
    /// </summary>
    public static string GetTypeName(Type type)
    {
        return type.FullName ?? type.Name;
    }

    private static Dictionary<Type, HashSet<Type>> GetDeclaredSeederOwners(IEnumerable<PlatformModuleCompositionApplicationLane> applicationLanes)
    {
        return applicationLanes
            .SelectMany(lane => lane.ApplicationDataSeederTypes.Select(seederType => new { SeederType = seederType, lane.ApplicationModuleType }))
            .GroupBy(item => item.SeederType)
            .ToDictionary(group => group.Key, group => group.Select(item => item.ApplicationModuleType).ToHashSet());
    }

    private static string DescribeSeederOwnershipError(Type seederType, int ownerCount)
    {
        return ownerCount == 0
            ? $"Seeder '{GetTypeName(seederType)}' has no application-lane owner."
            : $"Seeder '{GetTypeName(seederType)}' has {ownerCount} application-lane owners.";
    }

    private static string GetTypeNameOrDisabled(Type type)
    {
        return type == null ? "disabled" : GetTypeName(type);
    }
}
