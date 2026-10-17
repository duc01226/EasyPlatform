using System.Reflection;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Common;

/// <summary>
/// Validates the complete module composition at the root readiness boundary.
/// </summary>
/// <remarks>
/// This validator is provider-neutral and ASP.NET-agnostic. It checks logical ownership and final service
/// registrations; it never resolves a database, serializes configuration, or coordinates a distributed transaction.
/// Store-composition rules shared with the message-bus store registry live in <see cref="PlatformModuleCompositionRules" />.
/// </remarks>
public sealed class PlatformModuleCompositionValidator
{
    /// <summary>
    /// Validates a composition and throws a redacted, deterministic exception when it is invalid.
    /// </summary>
    /// <param name="options">The composition metadata and final service descriptors.</param>
    public static void Validate(PlatformModuleCompositionOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        var registry = options.MessageBusStoreRegistry;
        var strictValidationEnabled = options.StrictValidationEnabled || registry?.IsStrictValidationEnabled == true;

        if (!strictValidationEnabled)
            return;

        var diagnostics = new List<string>();
        var descriptors = ValidateMessageBusRegistry(options, registry, diagnostics);

        ValidateControllerAssemblies(options.ControllerAssemblies, diagnostics);
        ValidateSingleApplicationSettingContext(options, registry, diagnostics);
        ValidateMessageBusInfrastructure(options, descriptors, diagnostics);
        ValidateRegisteredModules(options, registry, descriptors, diagnostics);
        ValidateSeederOwnership(options, registry, diagnostics);
        ValidateMessageBusComponentCoverage(options, registry, descriptors, diagnostics);

        if (diagnostics.Count > 0)
            throw new PlatformModuleCompositionException(diagnostics);
    }

    private static IReadOnlyList<PlatformModuleCompositionStoreDescriptor> ValidateMessageBusRegistry(
        PlatformModuleCompositionOptions options,
        IPlatformModuleCompositionMetadataSource registry,
        List<string> diagnostics)
    {
        if (registry == null)
            return [];

        IReadOnlyList<PlatformModuleCompositionStoreDescriptor> descriptors;

        try
        {
            // Descriptors force the registry to surface duplicate identities and conflicting persistence contracts
            // before the host initializes any dependent module.
            descriptors = registry.DescriptorMetadata;
        }
        catch (InvalidOperationException exception)
        {
            diagnostics.Add(exception.Message);
            return [];
        }

        var applicationLanes = registry.ApplicationLaneMetadata;
        var bindings = registry.BindingMetadata;
        var persistenceStores = registry.PersistenceStoreMetadata;

        diagnostics.AddRange(PlatformModuleCompositionRules.FindApplicationLaneBindingErrors(applicationLanes, bindings));
        diagnostics.AddRange(PlatformModuleCompositionRules.FindConflictingPersistenceContractErrors(persistenceStores));
        diagnostics.AddRange(PlatformModuleCompositionRules.FindUnboundRuntimePersistenceStoreErrors(persistenceStores, bindings));

        foreach (var binding in bindings)
        {
            if (!persistenceStores.Any(store => store.IsRuntimeEnabled &&
                                                store.StoreKey == binding.StoreKey &&
                                                store.PersistenceModuleType == binding.PersistenceModuleType))
            {
                diagnostics.Add(
                    $"Message-bus binding for key '{binding.StoreKey}' selects persistence '{GetTypeName(binding.PersistenceModuleType)}', but no compatible runtime persistence contribution exists.");
            }

            if (!applicationLanes.Any(lane => lane.StoreKey == binding.StoreKey && lane.ApplicationModuleType == binding.ApplicationModuleType))
            {
                diagnostics.Add(
                    $"Message-bus binding for key '{binding.StoreKey}' has no application contribution for '{GetTypeName(binding.ApplicationModuleType)}'.");
            }
        }

        foreach (var descriptor in descriptors)
        {
            ValidateDescriptor(options, descriptor, diagnostics);
        }

        // A legacy route is safe only when it has one effective store and one effective lane. Aliases remain
        // valid strict compositions, but their producers/consumers must select the lane explicitly; the component
        // coverage check below catches any explicitly supplied legacy route metadata.
        var effectiveLaneCount = descriptors.Sum(descriptor => descriptor.ApplicationLanes.Count);
        if (effectiveLaneCount == 0)
            diagnostics.Add("Strict message-bus composition has no effective application lane.");

        return descriptors;
    }

    private static void ValidateDescriptor(
        PlatformModuleCompositionOptions options,
        PlatformModuleCompositionStoreDescriptor descriptor,
        List<string> diagnostics)
    {
        if (!descriptor.IsRuntimeEnabled)
            return;

        if (descriptor.UnitOfWorkManagerServiceType == null || !descriptor.HasUnitOfWorkManagerFactory)
            diagnostics.Add($"Message-bus store '{descriptor.StoreKey}' has no compatible unit-of-work manager contract.");

        if (descriptor.UnitOfWorkServiceType == null || !descriptor.HasUnitOfWorkFactory)
            diagnostics.Add($"Message-bus store '{descriptor.StoreKey}' has no provider-specific unit-of-work contract.");

        var hasInboxRepositoryType = descriptor.InboxRepositoryServiceType != null;
        var hasInboxRepositoryFactory = descriptor.HasInboxRepositoryFactory;
        if (hasInboxRepositoryType != hasInboxRepositoryFactory)
            diagnostics.Add($"Message-bus store '{descriptor.StoreKey}' has an incomplete inbox repository contract.");

        var hasOutboxRepositoryType = descriptor.OutboxRepositoryServiceType != null;
        var hasOutboxRepositoryFactory = descriptor.HasOutboxRepositoryFactory;
        if (hasOutboxRepositoryType != hasOutboxRepositoryFactory)
            diagnostics.Add($"Message-bus store '{descriptor.StoreKey}' has an incomplete outbox repository contract.");

        if (options.ServiceCollection == null)
            return;

        // Persistence-module and application-module registrations are required once by ValidateRegisteredModules.
        RequireServiceRegistration(
            options.ServiceCollection,
            descriptor.UnitOfWorkManagerServiceType,
            $"unit-of-work manager for store '{descriptor.StoreKey}'",
            diagnostics);
        RequireServiceRegistration(
            options.ServiceCollection,
            descriptor.UnitOfWorkServiceType,
            $"provider-specific unit-of-work for store '{descriptor.StoreKey}'",
            diagnostics);

        if (descriptor.IsInboxEnabled)
            RequireServiceRegistration(
                options.ServiceCollection,
                descriptor.InboxRepositoryServiceType,
                $"inbox repository for store '{descriptor.StoreKey}'",
                diagnostics);

        if (descriptor.IsOutboxEnabled)
            RequireServiceRegistration(
                options.ServiceCollection,
                descriptor.OutboxRepositoryServiceType,
                $"outbox repository for store '{descriptor.StoreKey}'",
                diagnostics);
    }

    private static void ValidateControllerAssemblies(
        IEnumerable<Assembly> controllerAssemblies,
        List<string> diagnostics)
    {
        foreach (var assembly in controllerAssemblies ?? [])
        {
            if (assembly == null)
            {
                diagnostics.Add("Controller discovery metadata contains a null assembly.");
                continue;
            }

            if (string.IsNullOrWhiteSpace(assembly.FullName ?? assembly.GetName().Name))
                diagnostics.Add("Controller discovery metadata contains an assembly without a stable identity.");
        }
    }

    private static void ValidateSingleApplicationSettingContext(
        PlatformModuleCompositionOptions options,
        IPlatformModuleCompositionMetadataSource registry,
        List<string> diagnostics)
    {
        if (options.ServiceCollection == null)
            return;

        var applicationLaneCount = registry?.ApplicationLaneMetadata.Count ?? 0;
        var settingContextRegistrations = options.ApplicationSettingContextRegistrationCount;

        if (applicationLaneCount > 0 && settingContextRegistrations == 0)
            diagnostics.Add("Strict application composition requires one unqualified IPlatformApplicationSettingContext registration.");
        else if (settingContextRegistrations > 1)
            diagnostics.Add(
                $"Strict application composition has {settingContextRegistrations} unqualified IPlatformApplicationSettingContext registrations; exactly one is supported.");
    }

    private static void ValidateMessageBusInfrastructure(
        PlatformModuleCompositionOptions options,
        IReadOnlyCollection<PlatformModuleCompositionStoreDescriptor> descriptors,
        List<string> diagnostics)
    {
        if (options.ServiceCollection == null || descriptors.Count == 0)
            return;

        var hasInboxStore = descriptors.Any(descriptor => descriptor.IsInboxEnabled);
        var hasOutboxStore = descriptors.Any(descriptor => descriptor.IsOutboxEnabled);

        if (hasInboxStore)
        {
            RequireMetadataRegistration(options.HasMessageBusScannerRegistration, "message-bus scanner", diagnostics);
            RequireMetadataRegistration(options.HasInboxConsumerWorkerRegistration, "inbox consumer worker", diagnostics);
            RequireMetadataRegistration(options.HasInboxCleanerWorkerRegistration, "inbox cleaner worker", diagnostics);
        }

        if (hasOutboxStore)
        {
            RequireMetadataRegistration(options.HasApplicationProducerRegistration, "application message-bus producer", diagnostics);
            RequireMetadataRegistration(options.HasKeyedApplicationProducerRegistration, "keyed application message-bus producer", diagnostics);
            RequireMetadataRegistration(options.HasOutboxSenderWorkerRegistration, "outbox sender worker", diagnostics);
            RequireMetadataRegistration(options.HasOutboxCleanerWorkerRegistration, "outbox cleaner worker", diagnostics);
        }

        if (options.MessageBusStoreRegistry != null)
            RequireMetadataRegistration(options.HasMessageBusStoreRegistryRegistration, "message-bus store registry", diagnostics);
    }

    private static void ValidateRegisteredModules(
        PlatformModuleCompositionOptions options,
        IPlatformModuleCompositionMetadataSource registry,
        IReadOnlyCollection<PlatformModuleCompositionStoreDescriptor> descriptors,
        List<string> diagnostics)
    {
        if (options.ServiceCollection == null || registry == null)
            return;

        foreach (var applicationLane in registry.ApplicationLaneMetadata)
        {
            RequireServiceRegistration(
                options.ServiceCollection,
                applicationLane.ApplicationModuleType,
                $"application module '{GetTypeName(applicationLane.ApplicationModuleType)}'",
                diagnostics);
        }

        foreach (var descriptor in descriptors)
        {
            RequireServiceRegistration(
                options.ServiceCollection,
                descriptor.PersistenceModuleType,
                $"persistence module '{GetTypeName(descriptor.PersistenceModuleType)}'",
                diagnostics);
        }
    }

    private static void ValidateSeederOwnership(
        PlatformModuleCompositionOptions options,
        IPlatformModuleCompositionMetadataSource registry,
        List<string> diagnostics)
    {
        if (registry == null)
            return;

        var lanes = registry.ApplicationLaneMetadata;

        diagnostics.AddRange(PlatformModuleCompositionRules.FindDeclaredSeederOwnershipErrors(lanes));
        diagnostics.AddRange(PlatformModuleCompositionRules.FindRegisteredSeederOwnershipErrors(lanes, options.RegisteredSeederTypes));
    }

    private static void ValidateMessageBusComponentCoverage(
        PlatformModuleCompositionOptions options,
        IPlatformModuleCompositionMetadataSource registry,
        IReadOnlyCollection<PlatformModuleCompositionStoreDescriptor> descriptors,
        List<string> diagnostics)
    {
        if (registry == null)
            return;

        ValidateMessageBusComponents(GetComponentTypes(options.RegisteredConsumerTypes), "consumer", options, registry, descriptors, diagnostics);
        ValidateMessageBusComponents(GetComponentTypes(options.RegisteredProducerTypes), "producer", options, registry, descriptors, diagnostics);
    }

    private static void ValidateMessageBusComponents(
        List<Type> componentTypes,
        string componentKind,
        PlatformModuleCompositionOptions options,
        IPlatformModuleCompositionMetadataSource registry,
        IReadOnlyCollection<PlatformModuleCompositionStoreDescriptor> descriptors,
        List<string> diagnostics)
    {
        ValidateDuplicateComponentIds(componentTypes, componentKind, diagnostics);

        foreach (var componentType in componentTypes.Distinct())
        {
            // Platform built-ins are shared infrastructure, not an application lane. They are registered alongside
            // application components and therefore must not be mistaken for an unowned module contribution.
            if (IsInfrastructureComponent(componentType, options))
                continue;

            ValidateComponentLaneCoverage(componentType, componentKind, registry, diagnostics);
            ValidateLegacyRoute(componentType, componentKind, descriptors, diagnostics);
        }
    }

    private static List<Type> GetComponentTypes(
        IReadOnlyCollection<Type> explicitlySuppliedTypes)
    {
        return explicitlySuppliedTypes?.Where(type => type != null).ToList() ?? [];
    }

    private static void ValidateLegacyRoute(
        Type componentType,
        string componentKind,
        IReadOnlyCollection<PlatformModuleCompositionStoreDescriptor> descriptors,
        List<string> diagnostics)
    {
        if (descriptors.Count > 1 && !OverridesRouteProperty(componentType, "MessageBusStoreKey"))
            diagnostics.Add(
                $"Message-bus {componentKind} '{GetTypeName(componentType)}' uses the unqualified store path while multiple stores are composed; override MessageBusStoreKey or use an explicit keyed {componentKind} route.");

        if (descriptors.Any(descriptor => descriptor.ApplicationLanes.Count > 1) &&
            !OverridesRouteProperty(componentType, "MessageBusApplicationName"))
            diagnostics.Add(
                $"Message-bus {componentKind} '{GetTypeName(componentType)}' uses an unqualified application lane while a store has multiple application lanes; override MessageBusApplicationName or use an explicit keyed {componentKind} route.");
    }

    private static bool OverridesRouteProperty(Type componentType, string propertyName)
    {
        for (var currentType = componentType; currentType != null; currentType = currentType.BaseType)
        {
            var property = currentType.GetProperty(
                propertyName,
                BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly);

            if (property?.GetMethod == null)
                continue;

            return property.GetMethod.IsVirtual &&
                   property.GetMethod.GetBaseDefinition().DeclaringType != property.GetMethod.DeclaringType;
        }

        return false;
    }

    private static void ValidateDuplicateComponentIds(
        IEnumerable<Type> componentTypes,
        string componentKind,
        List<string> diagnostics)
    {
        foreach (var group in componentTypes
                     .GroupBy(GetTypeName, StringComparer.Ordinal)
                     .Where(group => group.Count() > 1)
                     .OrderBy(group => group.Key, StringComparer.Ordinal))
        {
            diagnostics.Add(
                $"Message-bus {componentKind} identity '{group.Key}' is registered more than once.");
        }
    }

    private static void ValidateComponentLaneCoverage(
        Type componentType,
        string componentKind,
        IPlatformModuleCompositionMetadataSource registry,
        List<string> diagnostics)
    {
        var laneCount = registry.ApplicationLaneMetadata.Count(lane => lane.ApplicationAssembly == componentType.Assembly);

        if (laneCount == 0)
        {
            diagnostics.Add(
                $"Message-bus {componentKind} '{GetTypeName(componentType)}' is not covered by an application lane.");
        }
        else if (laneCount > 1)
        {
            diagnostics.Add(
                $"Message-bus {componentKind} '{GetTypeName(componentType)}' is covered by multiple application lanes; an explicit keyed route is required.");
        }
    }

    private static void RequireServiceRegistration(
        IServiceCollection serviceCollection,
        Type serviceType,
        string description,
        List<string> diagnostics)
    {
        if (serviceType == null)
            return;

        if (!serviceCollection.Any(descriptor =>
                descriptor.ServiceType == serviceType ||
                descriptor.ImplementationType == serviceType ||
                descriptor.ImplementationInstance?.GetType() == serviceType))
        {
            diagnostics.Add($"Required {description} service '{GetTypeName(serviceType)}' is not registered.");
        }
    }

    private static void RequireMetadataRegistration(bool isRegistered, string description, List<string> diagnostics)
    {
        if (!isRegistered)
            diagnostics.Add($"Required {description} registration is not present in the final service collection.");
    }

    private static bool IsInfrastructureComponent(Type componentType, PlatformModuleCompositionOptions options)
    {
        return options?.InfrastructureAssemblies?.Contains(componentType.Assembly) == true;
    }

    private static string GetTypeName(Type type)
    {
        return PlatformModuleCompositionRules.GetTypeName(type);
    }
}
