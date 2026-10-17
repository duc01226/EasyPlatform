using System.Reflection;
using Easy.Platform.Application;
using Easy.Platform.Common;
using Easy.Platform.Common.Utils;
using Easy.Platform.Domain;
using Easy.Platform.Infrastructures;
using Easy.Platform.Infrastructures.BackgroundJob;
using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Infrastructures.FileStorage;
using Easy.Platform.Infrastructures.MessageBus;
using Easy.Platform.Persistence;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Modules;

/// <summary>
/// Covers the contract each LAYER module base adds on top of <see cref="PlatformModule" /> — the
/// application, domain, infrastructure, persistence, caching, message-bus, background-job and
/// file-storage tiers.
/// <para>
/// Layer bases exist to give every service in the platform the same shape per tier. When one of these
/// bases changes its inheritance, its priority, or the assemblies it scans, the change silently
/// propagates to every service built on it — which is exactly why these are pinned here rather than
/// rediscovered per service.
/// </para>
/// </summary>
public class PlatformLayerModuleContractTests : PlatformModuleTestBase
{
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-040")]
    public void LayerHierarchy_IsWiredAsDocumented()
    {
        typeof(PlatformApplicationModule).BaseType.Should().Be(typeof(PlatformModule));
        typeof(PlatformDomainModule).BaseType.Should().Be(typeof(PlatformModule));
        typeof(PlatformInfrastructureModule).BaseType.Should().Be(typeof(PlatformModule));
        typeof(PlatformPersistenceModule).BaseType.Should().Be(typeof(PlatformModule));

        // The infrastructure sub-tiers all funnel through PlatformInfrastructureModule so they inherit
        // its service scanning and helper registration.
        typeof(PlatformCachingModule).BaseType.Should().Be(typeof(PlatformInfrastructureModule));
        typeof(PlatformMessageBusModule).BaseType.Should().Be(typeof(PlatformInfrastructureModule));
        typeof(PlatformBackgroundJobModule).BaseType.Should().Be(typeof(PlatformInfrastructureModule));
        typeof(PlatformFileStorageModule).BaseType.Should().Be(typeof(PlatformInfrastructureModule));
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-041")]
    public void ApplicationModule_ScansOnlyItsOwnAssembly_NotItsAncestors()
    {
        var (services, configuration) = NewHost();

        var derivedApplicationModule = CreateModule<DerivedFromConcreteTestApplicationModule>(services, configuration);

        derivedApplicationModule.GetAssembliesForServiceScanning()
            .Should()
            .ContainSingle(
                "an application module deliberately narrows the base ancestor-walk to its OWN assembly — a "
                + "service must not inherit its parent service's CQRS handlers and domain services by accident")
            .Which.Should()
            .BeSameAs(typeof(DerivedFromConcreteTestApplicationModule).Assembly);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-041")]
    public void ApplicationModule_DeclaresTheNarrowedAssemblyScanOverride()
    {
        // Pinning the override's declaring type is what makes the narrowing above attributable to
        // PlatformApplicationModule rather than to the test double.
        typeof(PlatformApplicationModule)
            .GetMethod(nameof(PlatformModule.GetAssembliesForServiceScanning))!
            .DeclaringType
            .Should()
            .Be(typeof(PlatformApplicationModule));
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-042")]
    public void NonApplicationModule_WalksAncestorAssemblies_UpToTheFirstAbstractBase()
    {
        var (services, configuration) = NewHost();

        var leafModule = CreateModule<LeafTestPlatformModule>(services, configuration);
        var derivedFromProductionModule = CreateModule<DerivedFromProductionCachingModule>(services, configuration);

        leafModule.GetAssembliesForServiceScanning()
            .Should()
            .ContainSingle("its immediate base (PlatformModule) is abstract, so the ancestor walk stops immediately")
            .Which.Should()
            .BeSameAs(typeof(LeafTestPlatformModule).Assembly);

        // DerivedFromProductionCachingModule derives DIRECTLY from the PRODUCTION PlatformCachingModule, which
        // lives in the Easy.Platform assembly — a genuinely DIFFERENT assembly than this double's own
        // (Easy.Platform.Tests.Unit). A same-assembly ancestor double cannot distinguish "climbed the ancestor
        // chain" from "returned its own assembly twice" (both look like [testAssembly, testAssembly]); using a
        // cross-assembly ancestor — the real production scenario this test's name and comment describe, one
        // service's module deriving from another service's concrete module — makes the two outcomes distinct.
        derivedFromProductionModule.GetAssembliesForServiceScanning()
            .Should()
            .Equal(
                [typeof(PlatformCachingModule).Assembly, typeof(DerivedFromProductionCachingModule).Assembly],
                "the walk climbs through the NON-abstract ancestor first — a different service's module, living in "
                + "a different assembly — and only then adds the module's own assembly, so a service deriving from "
                + "another service's module inherits that module's scan target");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-043")]
    public void InfrastructureModule_SitsOnTheInfrastructureTier()
    {
        var (services, configuration) = NewHost();

        CreateModule<ConcreteTestInfrastructureModule>(services, configuration)
            .InitializationPriority.Should().Be(PlatformInfrastructureModule.DefaultInitializationPriority);

        CreateModule<ConcreteTestMessageBusModule>(services, configuration)
            .InitializationPriority.Should().Be(PlatformInfrastructureModule.DefaultInitializationPriority);

        CreateModule<ConcreteTestCachingModule>(services, configuration)
            .InitializationPriority.Should().Be(PlatformInfrastructureModule.DefaultInitializationPriority);

        CreateModule<ConcreteTestFileStorageModule>(services, configuration)
            .InitializationPriority.Should().Be(PlatformInfrastructureModule.DefaultInitializationPriority);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-043")]
    public void BackgroundJobModule_OptsDownToTheDependentOnPersistenceTier()
    {
        var (services, configuration) = NewHost();

        var backgroundJobModule = CreateModule<ConcreteTestBackgroundJobModule>(services, configuration);

        backgroundJobModule.InitializationPriority
            .Should()
            .Be(PlatformInfrastructureModule.DefaultDependentOnPersistenceInitInitializationPriority)
            .And.BeLessThan(
                PlatformInfrastructureModule.DefaultInitializationPriority,
                "it inherits from the infrastructure base but must NOT keep the infrastructure tier — its "
                + "job storage lives behind persistence migrations");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-043")]
    public void ApplicationAndDomainModules_StayOnTheBaseTier_SoTheySettleLast()
    {
        var (services, configuration) = NewHost();

        CreateModule<ConcreteTestApplicationModule>(services, configuration)
            .InitializationPriority.Should().Be(PlatformModule.DefaultInitializationPriority);

        CreateModule<ConcreteTestDomainModule>(services, configuration)
            .InitializationPriority.Should().Be(PlatformModule.DefaultInitializationPriority);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-044")]
    public void PersistenceModule_SitsOnThePersistenceTier_AndStartsWithMigrationIncomplete()
    {
        var (services, configuration) = NewHost();

        var persistenceModule = CreateModule<ConcreteTestPersistenceModule>(services, configuration);

        persistenceModule.InitializationPriority.Should().Be(PlatformPersistenceModule.DefaultInitializationPriority);
        persistenceModule.HasMigrationCompleted.Should().BeFalse("no migration has run on a freshly constructed module");
        persistenceModule.ForCrossDbMigrationOnly.Should().BeFalse("the default persistence module owns real repositories, not just a migration context");
        persistenceModule.DisableDatabaseInitialization.Should().BeFalse("database initialization is on by default");
        persistenceModule.MigrateDataCallCount.Should().Be(0, "construction must not touch the database");
        persistenceModule.InitializeDatabaseCallCount.Should().Be(0);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-045")]
    public void TypedPersistenceModule_NarrowsFullInitializationToAlsoRequireMigrationCompletion()
    {
        // The base defines full initialization as "init ran". The DbContext-typed persistence module
        // narrows it to "init ran AND migration finished", which is what stops dependent modules from
        // querying tables that have not been migrated yet. Asserting the override's declaring type is the
        // only way to pin this narrowing without standing up a real DbContext.
        var isFullyInitializedProperty = typeof(PlatformPersistenceModule<>)
            .GetProperty(nameof(PlatformModule.IsFullyInitialized), BindingFlags.Public | BindingFlags.Instance);

        isFullyInitializedProperty.Should().NotBeNull();
        isFullyInitializedProperty!.DeclaringType!.GetGenericTypeDefinition()
            .Should()
            .Be(
                typeof(PlatformPersistenceModule<>),
                "removing this override would let a persistence module report itself ready before migrations complete");

        // The un-typed base must NOT carry the narrowing — it has no migration of its own to wait for.
        typeof(PlatformModule)
            .GetProperty(nameof(PlatformModule.IsFullyInitialized))!
            .DeclaringType
            .Should()
            .Be(typeof(PlatformModule));
    }

    // The documented dev-vs-deployed mapping this test pins (PlatformPersistenceModule.cs XML docs on
    // DefaultDbInitAndMigrationRetryCount / DefaultDbInitAndMigrationRetryDelaySeconds): development retries
    // less and waits less between attempts because it restarts constantly and wants fast feedback; deployed
    // environments race a database that may still be starting, so they retry more and wait longer.
    private const int DevelopmentDbInitAndMigrationRetryCount = 12;
    private const int DeployedDbInitAndMigrationRetryCount = 30;
    private const int DevelopmentDbInitAndMigrationRetryDelaySeconds = 5;
    private const int DeployedDbInitAndMigrationRetryDelaySeconds = 10;

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-046")]
    public void PersistenceRetryPolicy_IsMorePatientOutsideDevelopment()
    {
        // Development restarts constantly and wants fast feedback; deployed environments race a database
        // that may still be starting, so they must retry longer. `BePositive()` alone pins NEITHER direction —
        // swapping the two ternary branches in source (PlatformPersistenceModule.cs: `IsDevelopment ? 12 : 30`
        // and `IsDevelopment ? 5 : 10` becoming `IsDevelopment ? 30 : 12` / `IsDevelopment ? 10 : 5`) makes
        // deployed environments LESS patient than dev — the exact inversion this test exists to catch — and
        // both numbers stay positive either way.
        //
        // Pinning the RELATIONSHIP means comparing the LIVE value (for whichever environment this suite
        // happens to run under) against the documented ground truth for that branch. A branch swap changes the
        // live value in EITHER environment, so this catches the inversion without mutating the process-wide
        // ASPNETCORE_ENVIRONMENT variable — which would race every other test in this parallel suite that
        // reads PlatformEnvironment.IsDevelopment / EffectiveProcessorCount.
        var (expectedRetryCount, expectedRetryDelaySeconds) = PlatformEnvironment.IsDevelopment
            ? (DevelopmentDbInitAndMigrationRetryCount, DevelopmentDbInitAndMigrationRetryDelaySeconds)
            : (DeployedDbInitAndMigrationRetryCount, DeployedDbInitAndMigrationRetryDelaySeconds);

        PlatformPersistenceModule.DefaultDbInitAndMigrationRetryCount.Should().Be(
            expectedRetryCount,
            "deployed environments must retry more than development, not merely a positive number of times");
        PlatformPersistenceModule.DefaultDbInitAndMigrationRetryDelaySeconds.Should().Be(
            expectedRetryDelaySeconds,
            "deployed environments must wait longer between retries than development, not merely a positive delay");

        PlatformPersistenceModule.RecommendedConnectionRetryDelay.Should().BeGreaterThan(TimeSpan.Zero);
        PlatformPersistenceModule.DefaultRecommendedMaxPoolSize.Should().BeGreaterThanOrEqualTo(20, "the pool floor keeps small hosts usable");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-049")]
    public void ConnectionPoolCeiling_CanServe_ThePlatformsOwnDefaultDbFanOut()
    {
        // The pool ceiling and the fan-out aimed at it are two halves of ONE contract, and the platform dispatches
        // the DB half itself: PlatformInboxConfig.MaxParallelProcessingMessagesCount and PlatformRabbitMqOptions
        // .MaxConcurrentProcessing both default to Util.TaskRunner.DefaultParallelIoTaskMaxConcurrent, whose XML doc
        // sanctions that ratio for work that waits on "DB, HTTP, queue, file". When the ceiling sits BELOW that
        // width, every caller that followed the documented default over-subscribes the pool and fails with "The
        // connection pool has been exhausted" only after burning the full connection timeout — which is exactly how
        // the ratio-4-vs-ratio-10 gap surfaced (40 seeding workers against a 20-connection pool).
        //
        // Pin the RELATIONSHIP, never either number alone: a bare floor like ">= 30" keeps passing when someone
        // re-states the pool ratio as an independent literal and the gap silently returns on any host with 5+ cores.
        // Both sides derive from PlatformEnvironment.EffectiveProcessorCount, so comparing the COMPUTED values holds
        // at every processor count this process could see, including the Development cap of 4.
        PlatformPersistenceModule.DefaultRecommendedMaxPoolSize
            .Should()
            .BeGreaterThanOrEqualTo(
                Util.TaskRunner.DefaultParallelIoTaskMaxConcurrent,
                "the platform's own inbox and message-bus consumers dispatch DB work at DefaultParallelIoTaskMaxConcurrent, "
                + "so a pool ceiling below that width is over-subscribed by the platform itself before any application code fans out");

        PlatformPersistenceModule.DefaultNumberOfMaxPoolSizePerCpuRatio
            .Should()
            .Be(
                Util.TaskRunner.DefaultNumberOfParallelIoTasksPerCpuRatio,
                "the pool ratio must stay DERIVED from the I/O fan-out ratio it serves — re-stating it as an independent "
                + "literal is precisely what let the two drift apart to 4-vs-10 and stay drifted as hosts scaled");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-047")]
    public void BackgroundJobStartupRetry_IsBounded_AndDashboardIsOptOutByDefault()
    {
        var (services, configuration) = NewHost();
        var backgroundJobModule = CreateModule<ConcreteTestBackgroundJobModule>(services, configuration);

        PlatformBackgroundJobModule.DefaultStartBackgroundJobProcessingRetryCount
            .Should()
            .BePositive("job processing startup races the job storage and must retry, but a non-positive count would never even try once");

        backgroundJobModule.AutoUseDashboardUi.Should().BeFalse(
            "the dashboard exposes job data and must be opted INTO by a host that has decided how to authenticate it");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-048")]
    public void ApplicationModule_PublishesTheApplicationTracingSources()
    {
        var (services, configuration) = NewHost();

        var applicationModule = CreateModule<ConcreteTestApplicationModule>(services, configuration);

        applicationModule.TracingSources()
            .Should()
            .NotBeEmpty("application modules contribute the command/query/background-job activity sources to the trace pipeline")
            .And.OnlyHaveUniqueItems();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-048")]
    public void PersistenceModule_PublishesTheRepositoryAndUnitOfWorkTracingSources()
    {
        var (services, configuration) = NewHost();

        var persistenceModule = CreateModule<ConcreteTestPersistenceModule>(services, configuration);

        persistenceModule.TracingSources()
            .Should()
            .NotBeEmpty()
            .And.OnlyHaveUniqueItems("a duplicated source name would be registered twice with the tracer provider");
    }
}
