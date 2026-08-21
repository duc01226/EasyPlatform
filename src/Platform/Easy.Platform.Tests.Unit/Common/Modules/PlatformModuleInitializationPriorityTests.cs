using Easy.Platform.Application;
using Easy.Platform.Common;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Domain;
using Easy.Platform.Infrastructures;
using Easy.Platform.Infrastructures.BackgroundJob;
using Easy.Platform.Persistence;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Tests.Unit.Common.Modules;

/// <summary>
/// Covers the initialization-priority tier system that orders module startup.
/// <para>
/// Modules are grouped by priority and initialized highest-priority-first, with each tier running in
/// parallel internally (<c>PlatformModule.InitializeDependentModulesAsync</c>). The tiers therefore encode a
/// real startup dependency chain: infrastructure must be up before persistence migrates, persistence must
/// have migrated before background jobs schedule work against those tables, and application modules seed
/// data last. These are ordering INVARIANTS, not arbitrary constants — flipping any comparison below
/// reorders application startup and produces failures that surface only at runtime, in whichever
/// environment happens to be slowest.
/// </para>
/// <para>
/// Every test below pins the priority INPUTS. The ordering BEHAVIOUR those inputs exist to produce — the
/// descending-priority wave walk itself — is pinned by
/// <see cref="InitializeAsync_InitializesTheHigherPriorityTier_BeforeTheLowerPriorityTier" />, which is the only
/// test here that actually initializes modules; the constant-comparison tests all stay green if the sort
/// direction is reversed.
/// </para>
/// </summary>
public class PlatformModuleInitializationPriorityTests : PlatformModuleTestBase
{
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-020")]
    public void BaseDefaultPriority_AndTierGap_AreTheAnchorConstants()
    {
        PlatformModule.DefaultInitializationPriority.Should().Be(10);
        PlatformModule.InitializationPriorityTierGap.Should().Be(10);

        PlatformModule.InitializationPriorityTierGap.Should().BePositive(
            "every derived tier is expressed as base + (gap * N); a non-positive gap would collapse all tiers together");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-020")]
    public void EachTier_IsDerivedFromTheBaseAndGap_RatherThanHardCoded()
    {
        PlatformInfrastructureModule.DefaultInitializationPriority
            .Should()
            .Be(PlatformModule.DefaultInitializationPriority + (PlatformModule.InitializationPriorityTierGap * 3));

        PlatformPersistenceModule.DefaultInitializationPriority
            .Should()
            .Be(PlatformModule.DefaultInitializationPriority + (PlatformModule.InitializationPriorityTierGap * 2));

        PlatformInfrastructureModule.DefaultDependentOnPersistenceInitInitializationPriority
            .Should()
            .Be(PlatformModule.DefaultInitializationPriority + (PlatformModule.InitializationPriorityTierGap * 1));
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-021")]
    public void StartupOrder_InfrastructureBeforePersistenceBeforeBackgroundJobsBeforeApplication()
    {
        // Higher priority initializes FIRST (InitializeDependentModulesAsync orders descending).
        PlatformInfrastructureModule.DefaultInitializationPriority
            .Should()
            .BeGreaterThan(
                PlatformPersistenceModule.DefaultInitializationPriority,
                "message bus, caching and other infrastructure must be reachable before persistence starts migrating");

        PlatformPersistenceModule.DefaultInitializationPriority
            .Should()
            .BeGreaterThan(
                PlatformBackgroundJobModule.DefaultInitializationPriority,
                "background job storage lives in the database, so migrations must complete before the job "
                + "server starts scheduling against those tables");

        PlatformBackgroundJobModule.DefaultInitializationPriority
            .Should()
            .BeGreaterThan(
                PlatformModule.DefaultInitializationPriority,
                "application and domain modules seed data last, once every supporting tier is online");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-021")]
    public void BackgroundJobTier_IsTheDependentOnPersistenceTier()
    {
        PlatformBackgroundJobModule.DefaultInitializationPriority
            .Should()
            .Be(
                PlatformInfrastructureModule.DefaultDependentOnPersistenceInitInitializationPriority,
                "background jobs opt OUT of the general infrastructure tier precisely because they must wait "
                + "for persistence; that is the whole purpose of the dependent-on-persistence tier");

        PlatformBackgroundJobModule.DefaultInitializationPriority
            .Should()
            .BeLessThan(
                PlatformInfrastructureModule.DefaultInitializationPriority,
                "a background job module that kept the plain infrastructure priority would start before migrations");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-022")]
    public void TiersAreDistinct_SoGroupingByPriorityProducesTheIntendedNumberOfWaves()
    {
        var allTierPriorities = new[]
        {
            PlatformInfrastructureModule.DefaultInitializationPriority,
            PlatformPersistenceModule.DefaultInitializationPriority,
            PlatformBackgroundJobModule.DefaultInitializationPriority,
            PlatformModule.DefaultInitializationPriority
        };

        allTierPriorities.Should().OnlyHaveUniqueItems(
            "initialization groups modules by priority and runs each group in parallel; two tiers sharing a "
            + "value would silently merge into one parallel wave and destroy the ordering guarantee");
    }

    /// <summary>
    /// Expects tier priorities relative to the SAME anchor constants
    /// <see cref="EachTier_IsDerivedFromTheBaseAndGap_RatherThanHardCoded" /> pins, rather than as separate
    /// hardcoded literals. Retuning <see cref="PlatformModule.DefaultInitializationPriority" /> or
    /// <see cref="PlatformModule.InitializationPriorityTierGap" /> would otherwise break this theory with a
    /// "40 != 45"-shaped failure that reads as a test bug rather than as the intended, symbolic signal.
    /// </summary>
    public static TheoryData<Type, int> ModuleInstancesToTierPriority()
    {
        return new TheoryData<Type, int>
        {
            { typeof(ConcreteTestInfrastructureModule), PlatformInfrastructureModule.DefaultInitializationPriority },
            { typeof(DerivedFromConcreteTestInfrastructureModule), PlatformInfrastructureModule.DefaultInitializationPriority },
            { typeof(LeafTestPlatformModule), PlatformModule.DefaultInitializationPriority }
        };
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-PLATMOD-023")]
    [MemberData(nameof(ModuleInstancesToTierPriority))]
    public void ModuleInstances_ReportTheirTierPriority(Type moduleType, int expectedPriority)
    {
        var (services, configuration) = NewHost();

        var module = CreateModule(moduleType, services, configuration);

        module.InitializationPriority.Should().Be(
            expectedPriority,
            "priority is inherited down the module hierarchy unless a subclass deliberately overrides it");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-023")]
    public void DomainAndApplicationModules_DoNotOverrideInitializationPriority_SoTheyStayOnTheBaseTier()
    {
        // These two abstract bases deliberately do NOT override InitializationPriority. Asserting the
        // absence of an override is what protects the "seed data last" ordering: adding one here would
        // reorder startup for every service in the platform.
        typeof(PlatformDomainModule).GetProperty(nameof(PlatformModule.InitializationPriority))!
            .DeclaringType.Should().Be(typeof(PlatformModule));

        typeof(PlatformApplicationModule).GetProperty(nameof(PlatformModule.InitializationPriority))!
            .DeclaringType.Should().Be(typeof(PlatformModule));
    }

    /// <summary>
    /// The ONE test in this file that observes the ORDERING rather than the inputs that produce it.
    /// <para>
    /// Every other test here compares priority CONSTANTS to each other, or reads an instance's
    /// <see cref="PlatformModule.InitializationPriority" /> property. None of them runs
    /// <c>PlatformModule.InitializeDependentModulesAsync</c>, so none of them can see the
    /// <c>.OrderByDescending(p =&gt; p.Key)</c> that turns those constants into a startup order. Flipping that one
    /// call to <c>.OrderBy</c> leaves every tier constant, every relational comparison and every reported instance
    /// priority in this file untouched and still green — while application modules would seed data BEFORE
    /// persistence had migrated. This test is what makes that flip fail: it drives the real
    /// <see cref="PlatformModule.InitializeAsync" /> entry point over two children on different tiers and asserts
    /// the sequence they actually initialized in, so reversing the sort reverses the recorded sequence.
    /// </para>
    /// </summary>
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-024")]
    public async Task InitializeAsync_InitializesTheHigherPriorityTier_BeforeTheLowerPriorityTier()
    {
        var (services, _) = NewHost();
        services.RegisterModule<InitOrderParentTestPlatformModule>();

        var serviceProvider = services.BuildServiceProvider();
        var parentModule = serviceProvider.GetRequiredService<InitOrderParentTestPlatformModule>();

        // ARRANGE guard, not the assertion under test: an ORDER only exists if the two children land in DIFFERENT
        // priority groups. Equal priorities would merge them into a single parallel wave, where the recorded
        // sequence is decided by the thread pool — a green result would then mean nothing at all.
        serviceProvider.GetRequiredService<HighTierInitOrderTestPlatformModule>()
            .InitializationPriority
            .Should()
            .BeGreaterThan(
                serviceProvider.GetRequiredService<LowTierInitOrderTestPlatformModule>().InitializationPriority,
                "the two doubles must occupy distinct tiers for this test to be able to observe an order at all");

        await parentModule.InitializeAsync();

        ModuleInitializationOrderRecorder.InitializedModuleTypesInOrderFor(services)
            .Should()
            .Equal(
                [typeof(HighTierInitOrderTestPlatformModule), typeof(LowTierInitOrderTestPlatformModule)],
                "InitializeDependentModulesAsync groups dependent modules by priority and walks the groups in "
                + "DESCENDING priority order, awaiting each group before starting the next — so the higher tier "
                + "must be fully initialized before the lower tier begins. The exact sequence is asserted (rather "
                + "than mere containment) because both the ORDER and the absence of extra or missing waves are the "
                + "guarantee: sorting ascending instead would initialize the low tier first, which in production "
                + "means application modules seeding data before persistence has migrated");
    }
}
