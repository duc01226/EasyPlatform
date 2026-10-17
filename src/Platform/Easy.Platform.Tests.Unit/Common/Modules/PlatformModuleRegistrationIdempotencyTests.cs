using System.Reflection;
using Easy.Platform.Common;
using Easy.Platform.Common.DependencyInjection;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Tests.Unit.Common.Modules;

/// <summary>
/// Regression cover for two registration-time defects that were fixed together: the
/// <see cref="PlatformModule.RegisterOncePerAssembly" /> dedup key, and the idempotency of
/// <see cref="PlatformRegisterModuleServiceCollectionExtensions.RegisterModule(IServiceCollection, Type, bool)" />.
/// <para>
/// Both defects share one shape: a guard that LOOKS like it deduplicates, and does dedup the single case the
/// codebase happened to exercise, while silently doing the wrong thing for the second case. Neither produced a
/// crash, a log line, or a failing test — which is exactly why they need pinning tests rather than a comment.
/// </para>
/// <para>
/// These tests are deliberately written so each FAILS against the pre-fix source. A regression test that also
/// passes before the fix pins nothing.
/// </para>
/// </summary>
public class PlatformModuleRegistrationIdempotencyTests : PlatformModuleTestBase
{
    // Two genuinely distinct assemblies. Anchoring each by a type (rather than by name string) means an assembly
    // rename or a project split breaks the BUILD here instead of silently collapsing these to one assembly and
    // turning the per-assembly tests into tautologies.
    private static readonly Assembly PlatformAssembly = typeof(PlatformModule).Assembly;
    private static readonly Assembly TestAssembly = typeof(PlatformModuleRegistrationIdempotencyTests).Assembly;

    // ---------------------------------------------------------------------------------------------------------
    // RegisterOncePerAssembly — the dedup key must identify the (action, assembly) PAIR.
    // ---------------------------------------------------------------------------------------------------------

    // TC-PLATMOD-100: Two DISTINCT actions over the same assembly must BOTH execute.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-100")]
    public void RegisterOncePerAssembly_WithTwoDistinctActionsOverOneAssembly_RunsBothActions()
    {
        // This is the defect case. The key used to be built from `perCollectionRegistry.ContainsKey(actionName)` —
        // a BOOL — rather than from actionName. Since an action name is never itself a key in that registry, the
        // lookup was always false, so every action name rendered to the same "Action:False" prefix and collapsed
        // onto ONE key per assembly. The FIRST action registered fine; every later action over the same assembly
        // was silently skipped. It stayed invisible only because RegisterCqrs was the sole caller.
        var (services, configuration) = NewHost();
        var module = CreateAssemblyScanModule(services, configuration);

        var firstActionRuns = new List<Assembly>();
        var secondActionRuns = new List<Assembly>();

        module.RunOncePerAssembly(firstActionRuns.Add, [PlatformAssembly], "RegisterCqrs");
        module.RunOncePerAssembly(secondActionRuns.Add, [PlatformAssembly], "RegisterValidators");

        firstActionRuns.Should().Equal(PlatformAssembly);
        secondActionRuns.Should()
            .BeEquivalentTo(
                [PlatformAssembly],
                "a second, unrelated registration action over the same assembly is a different unit of work — "
                + "deduplicating it against the first would silently skip its registrations and produce a container "
                + "that builds successfully and then fails at resolve time");
    }

    // TC-PLATMOD-101: The SAME action over the same assembly must still run exactly once.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-101")]
    public void RegisterOncePerAssembly_WithTheSameActionRepeated_RunsItOnlyOnce()
    {
        // The counter-guard for TC-PLATMOD-100. Without it, "make both actions run" is satisfiable by deleting the
        // dedup entirely — which would re-run MediatR assembly scanning once per dependent module and duplicate
        // every pipeline-behavior registration.
        var (services, configuration) = NewHost();
        var module = CreateAssemblyScanModule(services, configuration);

        var runs = new List<Assembly>();

        module.RunOncePerAssembly(runs.Add, [PlatformAssembly], "RegisterCqrs");
        module.RunOncePerAssembly(runs.Add, [PlatformAssembly], "RegisterCqrs");
        module.RunOncePerAssembly(runs.Add, [PlatformAssembly], "RegisterCqrs");

        runs.Should().BeEquivalentTo([PlatformAssembly], "the whole point of the helper is that a repeated action is a no-op");
    }

    // TC-PLATMOD-102: One action over two assemblies must run once PER assembly.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-102")]
    public void RegisterOncePerAssembly_WithOneActionOverTwoAssemblies_RunsOncePerAssembly()
    {
        // The assembly half of the composite key. A key that dropped the assembly would scan only the first one,
        // so handlers living in a parent module's assembly would never be registered.
        var (services, configuration) = NewHost();
        var module = CreateAssemblyScanModule(services, configuration);

        var runs = new List<Assembly>();

        module.RunOncePerAssembly(runs.Add, [PlatformAssembly, TestAssembly], "RegisterCqrs");
        // Repeat to prove the second pass adds nothing — dedup holds per assembly, not just per call.
        module.RunOncePerAssembly(runs.Add, [PlatformAssembly, TestAssembly], "RegisterCqrs");

        runs.Should().BeEquivalentTo([PlatformAssembly, TestAssembly]);
    }

    // TC-PLATMOD-103: The registry is scoped per IServiceCollection, not per process.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-103")]
    public void RegisterOncePerAssembly_TracksSeparatelyPerServiceCollection()
    {
        // The bookkeeping lives in a PROCESS-WIDE static dictionary keyed by IServiceCollection. If that key were
        // ever dropped, one host's registration would suppress another's — which in a test process means one test
        // silently disabling a later test's registrations, and in a real process means a second composition root
        // (integration-test host, in-process worker) coming up half-registered.
        var (firstServices, firstConfiguration) = NewHost();
        var (secondServices, secondConfiguration) = NewHost();

        var firstRuns = new List<Assembly>();
        var secondRuns = new List<Assembly>();

        CreateAssemblyScanModule(firstServices, firstConfiguration).RunOncePerAssembly(firstRuns.Add, [PlatformAssembly], "RegisterCqrs");
        CreateAssemblyScanModule(secondServices, secondConfiguration).RunOncePerAssembly(secondRuns.Add, [PlatformAssembly], "RegisterCqrs");

        firstRuns.Should().Equal(PlatformAssembly);
        secondRuns.Should().BeEquivalentTo([PlatformAssembly], "a second host composes its own container and must register into it from scratch");
    }

    // ---------------------------------------------------------------------------------------------------------
    // RegisterModule — registering the same module type twice must not duplicate the module.
    // ---------------------------------------------------------------------------------------------------------

    // TC-PLATMOD-110: A repeated RegisterModule must not add a second descriptor for the module type.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-110")]
    public void RegisterModule_CalledTwiceForTheSameModuleType_RegistersTheModuleOnlyOnce()
    {
        var (services, _) = NewHost();

        services.RegisterModule<LeafTestPlatformModule>();
        services.RegisterModule<LeafTestPlatformModule>();

        services.Count(descriptor => descriptor.ServiceType == typeof(LeafTestPlatformModule))
            .Should()
            .Be(1, "the concrete module type must resolve to exactly one registration");
        services.Count(descriptor => descriptor.ServiceType == typeof(PlatformModule))
            .Should()
            .Be(1, "the platform drives initialization by enumerating PlatformModule registrations");
    }

    // TC-PLATMOD-111: A repeated RegisterModule must not produce a second, uninitialized module INSTANCE.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-111")]
    public void RegisterModule_CalledTwiceForTheSameModuleType_ResolvesToASingleInstance()
    {
        // Descriptor counting alone is not enough, and instance identity is the half that actually mattered.
        // RegisterModule now exits before a second temporary provider can construct/register the same module type,
        // while the concrete and PlatformModule descriptors continue to resolve the same singleton from the final
        // service provider.
        var (services, _) = NewHost();

        services.RegisterModule<LeafTestPlatformModule>();
        services.RegisterModule<LeafTestPlatformModule>();

        var serviceProvider = services.BuildServiceProvider();

        var concreteResolutions = serviceProvider.GetServices<LeafTestPlatformModule>().ToList();
        concreteResolutions.Should().ContainSingle("a duplicate here is an uninitialized module handed to whoever resolves the concrete type");

        var platformModuleResolutions = serviceProvider.GetServices<PlatformModule>().Where(module => module is LeafTestPlatformModule).ToList();
        platformModuleResolutions.Should().ContainSingle();

        platformModuleResolutions.Single()
            .Should()
            .BeSameAs(
                concreteResolutions.Single(),
                "the instance the platform initializes and the instance application code resolves must be the same object — "
                + "otherwise initialization lands on a module nobody uses");
    }

    // TC-PLATMOD-112: A diamond dependency reaches the repeat path on an ORDINARY startup.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-112")]
    public void RegisterModule_WithADiamondDependency_RegistersTheSharedModuleOnlyOnce()
    {
        // This is why the repeat path is not a hypothetical. GrandParent -> Parent -> Leaf, plus Parent registered
        // directly: Leaf is reached twice by a completely normal module graph, with no repeated call by the host.
        var (services, _) = NewHost();

        services.RegisterModule<GrandParentTestPlatformModule>();
        services.RegisterModule<ParentTestPlatformModule>();

        var serviceProvider = services.BuildServiceProvider();

        serviceProvider.GetServices<LeafTestPlatformModule>().Should().ContainSingle("the shared leaf of a diamond is reached twice but is still one module");
        serviceProvider.GetServices<ParentTestPlatformModule>().Should().ContainSingle();
        serviceProvider.GetServices<PlatformModule>()
            .GroupBy(module => module.GetType())
            .Should()
            .OnlyContain(group => group.Count() == 1, "no module type may appear twice in the collection the platform initializes");
    }

    // TC-PLATMOD-114: A diamond must not repeat the shared module's registration side effects.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-114")]
    public void RegisterModule_WithADiamondDependency_RunsSharedModuleRegistrationSideEffectsOnce()
    {
        var (services, _) = NewHost();

        services.RegisterModule<SideEffectGrandParentTestPlatformModule>();
        services.RegisterModule<SideEffectParentTestPlatformModule>();

        services.Count(descriptor => descriptor.ServiceType == typeof(SideEffectRegistrationMarker))
            .Should()
            .Be(1, "a shared module's registration side effects must converge with its module descriptor");
    }

    // TC-PLATMOD-114: The same guarantee for a TRUE diamond — two sibling branches share one leaf.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-114")]
    public void RegisterModule_WithATrueDiamondDependency_RunsSharedLeafRegistrationSideEffectsOnce()
    {
        var (services, _) = NewHost();

        services.RegisterModule<SideEffectDiamondRootTestPlatformModule>();

        services.Count(descriptor => descriptor.ServiceType == typeof(SideEffectRegistrationMarker))
            .Should()
            .Be(1, "the leaf reached through both diamond branches must register its side effects once");
        services.Count(descriptor => descriptor.ServiceType == typeof(SideEffectLeafTestPlatformModule))
            .Should()
            .Be(1, "the shared leaf must be one module descriptor");
        services.Count(descriptor => descriptor.ServiceType == typeof(SideEffectLeftBranchTestPlatformModule)).Should().Be(1);
        services.Count(descriptor => descriptor.ServiceType == typeof(SideEffectRightBranchTestPlatformModule)).Should().Be(1);
    }

    // TC-PLATMOD-113: The idempotency guard must key on the module TYPE, not suppress unrelated modules.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-113")]
    public void RegisterModule_ForADifferentModuleType_IsNotSuppressedByAnEarlierRegistration()
    {
        // The counter-guard for TC-PLATMOD-110/111: an over-broad "already registered a module" check would make
        // the container come up with only the first module — the exact failure mode the dedup-key defect above had.
        var (services, _) = NewHost();

        services.RegisterModule<LeafTestPlatformModule>();
        services.RegisterModule<SecondLeafTestPlatformModule>();

        var serviceProvider = services.BuildServiceProvider();

        serviceProvider.GetService<LeafTestPlatformModule>().Should().NotBeNull();
        serviceProvider.GetService<SecondLeafTestPlatformModule>().Should().NotBeNull("a distinct module type is distinct work and must still register");
    }

    private static AssemblyScanRecordingModule CreateAssemblyScanModule(IServiceCollection services, IConfiguration configuration)
    {
        var module = new AssemblyScanRecordingModule(services.BuildServiceProvider(), configuration);

        // RegisterOncePerAssembly keys its bookkeeping by the module's ServiceCollection, which is assigned by
        // RegisterServices. Constructing the module alone leaves it null, so the helper would key every module in
        // the process onto one null-keyed registry.
        module.RegisterServices(services);

        return module;
    }

    /// <summary>
    /// Exposes the protected <see cref="PlatformModule.RegisterOncePerAssembly" /> so the helper can be driven
    /// directly. Testing it through <c>RegisterCqrs</c> instead would require MediatR assembly scanning and would
    /// only ever exercise ONE action name — the single case the defect happened not to break.
    /// </summary>
    private sealed class AssemblyScanRecordingModule : PlatformModule
    {
        public AssemblyScanRecordingModule(IServiceProvider serviceProvider, IConfiguration configuration)
            : base(serviceProvider, configuration) { }

        public void RunOncePerAssembly(Action<Assembly> action, List<Assembly> assemblies, string actionName)
        {
            RegisterOncePerAssembly(action, assemblies, actionName);
        }
    }
}
