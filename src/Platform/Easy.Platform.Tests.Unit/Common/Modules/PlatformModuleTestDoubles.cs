using System.Collections.Concurrent;
using Easy.Platform.Common;
using Easy.Platform.Infrastructures;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Tests.Unit.Common.Modules;

/// <summary>
/// Minimal concrete <see cref="PlatformModule" /> implementations used to exercise the module base
/// lifecycle without dragging in real infrastructure (databases, brokers, HTTP pipelines).
/// <para>
/// The production module classes are abstract precisely so that a host application supplies the
/// concrete registration; these doubles play that role for tests. They deliberately keep
/// <see cref="PlatformModule.InternalRegister" /> empty so that any observed registration is
/// attributable to the BASE class contract under test, not to a double's own behavior.
/// </para>
/// </summary>
public class LeafTestPlatformModule : PlatformModule
{
    public LeafTestPlatformModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    /// <summary>Counts how many times the base class actually performed registration work.</summary>
    public int InternalRegisterCallCount { get; private set; }

    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);
        InternalRegisterCallCount++;
    }
}

/// <summary>
/// Counts how many times the base class let <see cref="PlatformModule.InternalInit" /> through, so
/// tests can prove the initialization latch holds under concurrent entry.
/// </summary>
public class CountingInitTestPlatformModule : PlatformModule
{
    private int internalInitCallCount;

    public CountingInitTestPlatformModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    public int InternalInitCallCount => internalInitCallCount;

    protected override async Task InternalInit(IServiceScope serviceScope)
    {
        await base.InternalInit(serviceScope);
        Interlocked.Increment(ref internalInitCallCount);
    }
}

/// <summary>A second, distinct leaf module — lets tests prove per-type (not per-instance) behavior.</summary>
public class SecondLeafTestPlatformModule : PlatformModule
{
    public SecondLeafTestPlatformModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }
}

/// <summary>Depends on <see cref="LeafTestPlatformModule" /> — one level of dependency depth.</summary>
public class ParentTestPlatformModule : PlatformModule
{
    public ParentTestPlatformModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    public override List<Func<IConfiguration, Type>> GetDependentModuleTypes() => [_ => typeof(LeafTestPlatformModule)];
}

/// <summary>Depends on <see cref="ParentTestPlatformModule" /> — two levels, to prove deep-child flattening.</summary>
public class GrandParentTestPlatformModule : PlatformModule
{
    public GrandParentTestPlatformModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    public override List<Func<IConfiguration, Type>> GetDependentModuleTypes() => [_ => typeof(ParentTestPlatformModule)];
}

/// <summary>Declares a dependency on a type that is NOT a platform module — the guard-rail case.</summary>
public class InvalidDependencyTestPlatformModule : PlatformModule
{
    public InvalidDependencyTestPlatformModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    public override List<Func<IConfiguration, Type>> GetDependentModuleTypes() => [_ => typeof(NotAPlatformModule)];
}

/// <summary>A plain type used to prove module registration rejects non-module types.</summary>
public class NotAPlatformModule;

/// <summary>Publishes custom tracing sources so tracing aggregation can be observed.</summary>
public class TracingTestPlatformModule : PlatformModule
{
    public const string CustomSourceName = "Easy.Platform.Tests.Unit.CustomTracingSource";

    public TracingTestPlatformModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    public override string[] TracingSources() => [CustomSourceName];
}

/// <summary>
/// Records every <see cref="PlatformModule.OnNewOtherModuleRegistered" /> callback it receives, so tests
/// can assert the cross-module notification fan-out that module registration performs.
/// <para>
/// Observations are recorded against the <see cref="IServiceCollection" /> rather than on the instance,
/// because module registration builds its OWN service provider internally — the notified instance is
/// therefore never the instance a test resolves afterwards. Keying by the service collection also keeps
/// concurrently running test classes isolated, since every test owns a fresh collection.
/// </para>
/// </summary>
public class ObservingTestPlatformModule : PlatformModule
{
    private static readonly ConcurrentDictionary<IServiceCollection, ConcurrentBag<Type>> ObservationsByServiceCollection = new();

    public ObservingTestPlatformModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    public static List<Type> ObservedNewlyRegisteredModuleTypesFor(IServiceCollection serviceCollection)
    {
        return ObservationsByServiceCollection.TryGetValue(serviceCollection, out var observed) ? [.. observed] : [];
    }

    public static void ClearObservationsFor(IServiceCollection serviceCollection)
    {
        ObservationsByServiceCollection.TryRemove(serviceCollection, out _);
    }

    public override void OnNewOtherModuleRegistered(IServiceCollection serviceCollection, PlatformModule newOtherRegisterModule)
    {
        ObservationsByServiceCollection.GetOrAdd(serviceCollection, _ => []).Add(newOtherRegisterModule.GetType());
    }
}

/// <summary>
/// A concrete infrastructure module double. Inherits the infrastructure priority tier, and its
/// non-abstract form lets tests exercise the ancestor-assembly walk in
/// <see cref="PlatformModule.GetAssembliesForServiceScanning" />.
/// </summary>
public class ConcreteTestInfrastructureModule : PlatformInfrastructureModule
{
    public ConcreteTestInfrastructureModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }
}

/// <summary>Derives from a NON-abstract module so the ancestor-assembly walk has something to climb.</summary>
public class DerivedFromConcreteTestInfrastructureModule : ConcreteTestInfrastructureModule
{
    public DerivedFromConcreteTestInfrastructureModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }
}

/// <summary>
/// Records the ORDER in which modules actually reached <see cref="PlatformModule.InternalInit" />, so a test can
/// observe the descending-priority wave ordering that <c>PlatformModule.InitializeDependentModulesAsync</c>
/// produces — rather than only the priority constants that feed it.
/// <para>
/// This cannot be instance state on the double a test holds: <c>InitializeDependentModulesAsync</c> resolves the
/// child modules itself from the parent's own <see cref="PlatformModule.ServiceProvider" />, so the instances that
/// really initialize are reached through the container, not handed to the test. Recording is therefore keyed by
/// <see cref="IServiceCollection" /> — the same convention <see cref="ObservingTestPlatformModule" /> uses — which
/// keeps concurrently running test classes isolated, because every test owns a fresh collection. The entry is
/// removed in <c>PlatformModuleTestBase</c> teardown, so nothing survives into a later test or a later run.
/// </para>
/// <para>
/// Deliberately a NON-generic static class: static state on a generic type would give each closed construction its
/// own copy of the dictionary (and trips SonarAnalyzer S2743).
/// </para>
/// </summary>
public static class ModuleInitializationOrderRecorder
{
    /// <summary>
    /// A QUEUE, not a bag: this records a SEQUENCE, and the whole point of the assertion is which entry came
    /// first. <see cref="ConcurrentBag{T}" /> — the right choice for <see cref="ObservingTestPlatformModule" />,
    /// which only asserts membership — enumerates in an unspecified order and would make the ordering assertion
    /// meaningless.
    /// </summary>
    private static readonly ConcurrentDictionary<IServiceCollection, ConcurrentQueue<Type>> InitializedModuleTypesByServiceCollection = new();

    public static void RecordInitialized(IServiceCollection serviceCollection, Type moduleType)
    {
        InitializedModuleTypesByServiceCollection
            .GetOrAdd(serviceCollection, _ => new ConcurrentQueue<Type>())
            .Enqueue(moduleType);
    }

    public static List<Type> InitializedModuleTypesInOrderFor(IServiceCollection serviceCollection)
    {
        return InitializedModuleTypesByServiceCollection.TryGetValue(serviceCollection, out var initializedModuleTypes)
            ? [.. initializedModuleTypes]
            : [];
    }

    public static void ClearFor(IServiceCollection serviceCollection)
    {
        InitializedModuleTypesByServiceCollection.TryRemove(serviceCollection, out _);
    }
}

/// <summary>
/// Base for the doubles that report WHEN they were initialized, relative to each other.
/// </summary>
public abstract class InitOrderRecordingTestPlatformModule : PlatformModule
{
    protected InitOrderRecordingTestPlatformModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    protected override async Task InternalInit(IServiceScope serviceScope)
    {
        await base.InternalInit(serviceScope);

        // RegisterModule registers the host's own IServiceCollection into the container, so a module can recover
        // the exact per-test collection that owns it without the test having to reach in and hand it over.
        ModuleInitializationOrderRecorder.RecordInitialized(ServiceProvider.GetRequiredService<IServiceCollection>(), GetType());
    }
}

/// <summary>
/// The FIRST double to OVERRIDE <see cref="PlatformModule.InitializationPriority" /> — every other double in this
/// file inherits its tier, which is precisely why no ordering test was previously possible: two modules on the same
/// tier are grouped into ONE parallel wave, so their relative order is a race and can prove nothing.
/// <para>
/// Sits exactly one tier gap above the base tier. Expressed against the SAME anchor constants the production tiers
/// use, so retuning them moves this double with them instead of silently collapsing it onto the low tier.
/// </para>
/// </summary>
public class HighTierInitOrderTestPlatformModule : InitOrderRecordingTestPlatformModule
{
    public HighTierInitOrderTestPlatformModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    public override int InitializationPriority => DefaultInitializationPriority + InitializationPriorityTierGap;
}

/// <summary>
/// Stays on the base tier — the tier real application and domain modules occupy, the ones that must seed data LAST.
/// The override is written out rather than inherited so that the contrast with
/// <see cref="HighTierInitOrderTestPlatformModule" /> is visible at the point a reader needs it.
/// </summary>
public class LowTierInitOrderTestPlatformModule : InitOrderRecordingTestPlatformModule
{
    public LowTierInitOrderTestPlatformModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    public override int InitializationPriority => DefaultInitializationPriority;
}

/// <summary>
/// Declares one child on each tier, so initializing it exercises the real multi-wave path through
/// <c>PlatformModule.InitializeDependentModulesAsync</c>.
/// </summary>
public class InitOrderParentTestPlatformModule : PlatformModule
{
    public InitOrderParentTestPlatformModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    /// <summary>
    /// The LOW tier is declared FIRST on purpose. Declaration order is the order
    /// <see cref="PlatformModule.GetDependentModules" /> returns, and <c>GroupBy</c> preserves first-appearance
    /// order of its keys — so an implementation that simply initialized modules as declared, ignoring priority
    /// entirely, would produce low-then-high here. Declaring high first would let such an implementation pass by
    /// coincidence, and the test would stop measuring the priority sort at all.
    /// </summary>
    public override List<Func<IConfiguration, Type>> GetDependentModuleTypes() =>
    [
        _ => typeof(LowTierInitOrderTestPlatformModule),
        _ => typeof(HighTierInitOrderTestPlatformModule)
    ];
}
