using Easy.Platform.Common;
using Easy.Platform.Common.DependencyInjection;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Tests.Unit.Common.Modules;

/// <summary>
/// Covers <see cref="PlatformRegisterModuleServiceCollectionExtensions" /> — the single entry point every
/// host application uses to attach a module tree to its container.
/// <para>
/// This extension is where a module becomes resolvable, where its dependency tree is pulled in, and where
/// already-registered modules are told a newcomer arrived. Each of those is a registration-time contract:
/// getting any of them wrong produces a container that builds fine and then fails at startup.
/// </para>
/// </summary>
public class PlatformModuleRegistrationExtensionsTests : PlatformModuleTestBase
{
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-050")]
    public void RegisterModule_MakesTheModuleResolvable_ByItsOwnTypeAndAsAPlatformModule()
    {
        var (services, _) = NewHost();

        services.RegisterModule<LeafTestPlatformModule>();
        var serviceProvider = services.BuildServiceProvider();

        serviceProvider.GetService<LeafTestPlatformModule>().Should().NotBeNull("host code resolves modules by their concrete type");
        serviceProvider.GetServices<PlatformModule>()
            .Should()
            .Contain(module => module.GetType() == typeof(LeafTestPlatformModule),
                "the platform enumerates all PlatformModule registrations to drive initialization and cross-module notification");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-050")]
    public void RegisterModule_ExposesTheServiceCollectionItself_ForLaterLifecycleSteps()
    {
        var (services, _) = NewHost();

        services.RegisterModule<LeafTestPlatformModule>();

        services.BuildServiceProvider()
            .GetService<IServiceCollection>()
            .Should()
            .BeSameAs(
                services,
                "module initialization re-reads the original collection (for example to resolve dependent modules), "
                + "so the collection must be reachable from the built container");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-051")]
    public void AFreshlyResolvedModule_DefaultsToRoot_BecauseChildNessIsStampedByTheDependencyWalk()
    {
        var (services, _) = NewHost();

        // Registration DOES set IsChildModule, but it sets it on the instance produced by the throwaway
        // provider that registration builds internally. Any provider built later produces new singleton
        // instances, which start at the IsChildModule default. This is not a leak in the design: the
        // authoritative stamping happens in GetDependentModules(), which every initialization pass runs.
        // Pinning it here stops a future reader from "fixing" the flag in the wrong place.
        services.RegisterModule<LeafTestPlatformModule>(isChildModule: true);

        services.BuildServiceProvider().GetRequiredService<LeafTestPlatformModule>()
            .IsChildModule.Should().BeFalse("the registration-time flag belongs to the registration-time instance, not to the container");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-051")]
    public void TheDependencyWalk_IsWhatEstablishesChildNess_OnTheInstancesItReturns()
    {
        var (services, _) = NewHost();
        services.RegisterModule<ParentTestPlatformModule>();

        var parent = services.BuildServiceProvider().GetRequiredService<ParentTestPlatformModule>();
        var dependentModules = parent.GetDependentModules(services);

        dependentModules.Should().OnlyContain(dependentModule => dependentModule.IsChildModule);
        parent.IsRootModule.Should().BeTrue(
            "nothing claimed the host-registered entry point as a dependency, so it keeps the root duties: "
            + "distributed tracing and performance profiling setup");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-052")]
    public void RegisterModule_PullsInTheWholeDependencyTree_Transitively()
    {
        var (services, _) = NewHost();

        services.RegisterModule<GrandParentTestPlatformModule>();
        var serviceProvider = services.BuildServiceProvider();

        serviceProvider.GetService<GrandParentTestPlatformModule>().Should().NotBeNull();
        serviceProvider.GetService<ParentTestPlatformModule>().Should().NotBeNull("declared directly by the grand-parent");
        serviceProvider.GetService<LeafTestPlatformModule>()
            .Should()
            .NotBeNull("declared by the parent — the host must not have to know about its dependencies' dependencies");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-052")]
    public void RegisterModule_MarksTransitivelyPulledModulesAsChildren()
    {
        var (services, _) = NewHost();
        services.RegisterModule<GrandParentTestPlatformModule>();

        var grandParent = services.BuildServiceProvider().GetRequiredService<GrandParentTestPlatformModule>();

        grandParent.GetDependentModules(services)
            .Should()
            .HaveCount(2)
            .And.OnlyContain(dependentModule => dependentModule.IsChildModule,
                "both the directly declared dependency and the one it pulled in transitively are somebody's "
                + "dependency, so neither may take on the root module's tracing and profiling duties");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-053")]
    public void RegisterModule_NotifiesAlreadyRegisteredModules_AboutTheNewcomer()
    {
        var (services, _) = NewHost();

        services.RegisterModule<ObservingTestPlatformModule>();
        services.RegisterModule<SecondLeafTestPlatformModule>();

        ObservingTestPlatformModule.ObservedNewlyRegisteredModuleTypesFor(services)
            .Should()
            .Contain(
                typeof(SecondLeafTestPlatformModule),
                "this callback is how the caching module discovers cache items in modules registered AFTER it — "
                + "without it, registration order would silently change which services get scanned");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-053")]
    public void RegisterModule_DoesNotNotifyAModuleAboutItself()
    {
        var (services, _) = NewHost();

        services.RegisterModule<ObservingTestPlatformModule>();

        ObservingTestPlatformModule.ObservedNewlyRegisteredModuleTypesFor(services)
            .Should()
            .NotContain(typeof(ObservingTestPlatformModule), "self-notification would re-scan the module's own assembly a second time");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-054")]
    public void RegisterModule_RejectsATypeThatIsNotAPlatformModule()
    {
        var (services, _) = NewHost();

        var registerNonModule = () => services.RegisterModule(typeof(NotAPlatformModule));

        registerNonModule.Should()
            .Throw<ArgumentException>()
            .WithMessage("*must be inherit from PlatformModule*");
    }

    // TC-PLATMOD-055 ("RepeatedRegistration_StillYieldsASingleModuleInstance_OnThePlatformModuleServiceType")
    // was removed here: it duplicated TC-PLATMOD-111 in PlatformModuleRegistrationIdempotencyTests.cs, which
    // covers the identical repeated-registration scenario with a strictly stronger assertion (BeSameAs
    // instance-identity across every resolution point, vs. this test's Distinct().ContainSingle() which only
    // proved the enumerable had one element and could not tell "one instance" apart from "two equal-by-value
    // instances"). See plans/reports/cr-r2-tests-modules-cqrs.md finding X2.

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-056")]
    public void CleanupRegistrationTracking_IsSafeForACollectionThatWasNeverTracked()
    {
        var (services, _) = NewHost();

        var cleanupUntrackedCollection = () => PlatformModule.CleanupRegistrationTracking(services);

        cleanupUntrackedCollection.Should().NotThrow(
            "test teardown calls this unconditionally, so it must tolerate collections that never registered a module");
    }
}
