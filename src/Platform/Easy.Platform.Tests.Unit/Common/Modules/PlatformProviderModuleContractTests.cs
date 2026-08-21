using Easy.Platform.AspNetCore;
using Easy.Platform.AzureFileStorage;
using Easy.Platform.FirebasePushNotification;
using Easy.Platform.HangfireBackgroundJob;
using Easy.Platform.Infrastructures;
using Easy.Platform.Infrastructures.BackgroundJob;
using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Infrastructures.FileStorage;
using Easy.Platform.Infrastructures.MessageBus;
using Easy.Platform.MongoDB;
using Easy.Platform.Persistence;
using Easy.Platform.RabbitMQ;
using Easy.Platform.RedisCache;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Modules;

/// <summary>
/// Covers the PROVIDER module classes — the concrete adapters that bind a platform capability to a
/// specific technology (ASP.NET Core, MongoDB, EF Core, RabbitMQ, Redis, Azure Blob Storage, Hangfire,
/// Firebase).
/// <para>
/// The decisive property of a provider module is WHICH layer base it derives from, because that choice —
/// not the provider's own code — determines its startup tier, the services scanned into it, and the
/// helpers registered for it. A provider attached to the wrong base compiles cleanly and then initializes
/// in the wrong order, which is the failure mode these tests exist to prevent.
/// </para>
/// </summary>
public class PlatformProviderModuleContractTests : PlatformModuleTestBase
{
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-070")]
    public void EveryProviderModule_DerivesFromTheLayerBaseThatMatchesItsCapability()
    {
        typeof(PlatformRabbitMqMessageBusModule).BaseType
            .Should().Be(typeof(PlatformMessageBusModule), "RabbitMQ is a message-bus provider");

        typeof(PlatformRedisCacheModule).BaseType
            .Should().Be(typeof(PlatformCachingModule), "Redis is a caching provider");

        typeof(PlatformAzureFileStorageModule).BaseType
            .Should().Be(typeof(PlatformFileStorageModule), "Azure Blob Storage is a file-storage provider");

        typeof(PlatformHangfireBackgroundJobModule).BaseType
            .Should().Be(typeof(PlatformBackgroundJobModule), "Hangfire is a background-job provider");

        typeof(FireBasePushNotificationPlatformModule).BaseType
            .Should().Be(typeof(PlatformInfrastructureModule), "push notification has no dedicated layer base, so it attaches directly to infrastructure");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-070")]
    public void PersistenceProviderModules_DeriveFromTheDbContextTypedPersistenceBase()
    {
        typeof(Easy.Platform.EfCore.PlatformEfCorePersistenceModule<>).BaseType!.GetGenericTypeDefinition()
            .Should().Be(typeof(PlatformPersistenceModule<>), "EF Core is a persistence provider bound to a DbContext type");

        typeof(PlatformMongoDbPersistenceModule<,,>).BaseType!.GetGenericTypeDefinition()
            .Should().Be(typeof(PlatformPersistenceModule<>), "MongoDB is a persistence provider bound to a DbContext type");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-071")]
    public void EveryProviderModule_InheritsTheStartupTierOfItsLayer()
    {
        // Tier is inherited, never restated by the provider. Asserting it here is what catches a provider
        // that quietly overrides InitializationPriority and reorders startup for every host using it.
        typeof(PlatformRabbitMqMessageBusModule).Should().BeAssignableTo<PlatformInfrastructureModule>();
        typeof(PlatformRedisCacheModule).Should().BeAssignableTo<PlatformInfrastructureModule>();
        typeof(PlatformAzureFileStorageModule).Should().BeAssignableTo<PlatformInfrastructureModule>();
        typeof(FireBasePushNotificationPlatformModule).Should().BeAssignableTo<PlatformInfrastructureModule>();

        typeof(PlatformHangfireBackgroundJobModule).Should().BeAssignableTo<PlatformBackgroundJobModule>();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-072")]
    public void MongoDbProvider_DeclaresItsOwnConnectionPoolCeiling_ShadowingTheGenericPersistenceDefault()
    {
        // The pool-ceiling field lives on an OPEN generic type. Reflection cannot read a static field's VALUE
        // through an open generic type definition (the CLR rejects "late bound operations ... for which
        // ContainsGenericParameters is true"), so the type must be closed first. TestMongoDbContextDouble /
        // TestMongoClientDouble (PlatformProviderModuleTestDoubles.cs) satisfy the three generic constraints
        // and are NEVER instantiated — closing the type is enough to obtain a real field handle; no connection
        // is opened and no DbContext runs.
        var closedMongoPersistenceModuleType = typeof(PlatformMongoDbPersistenceModule<,,>)
            .MakeGenericType(typeof(TestMongoDbContextDouble), typeof(TestMongoClientDouble), typeof(PlatformMongoOptions<TestMongoDbContextDouble>));

        var mongoPoolSizeField = closedMongoPersistenceModuleType.GetField(nameof(PlatformPersistenceModule.DefaultRecommendedMaxPoolSize));

        mongoPoolSizeField.Should().NotBeNull();
        mongoPoolSizeField!.DeclaringType!.GetGenericTypeDefinition()
            .Should()
            .Be(
                typeof(PlatformMongoDbPersistenceModule<,,>),
                "if this field stopped being declared here it would silently fall back to the relational default and throttle the Mongo driver");

        var mongoMaxPoolSize = (int)mongoPoolSizeField.GetValue(null)!;

        // Pin the RELATIONSHIP, not an independent floor: Mongo connections are lighter than a relational
        // driver's (no server-side process per connection), so the Mongo ceiling must sit STRICTLY ABOVE the
        // generic floor — not merely restate a separately-passing lower bound. The generic floor's own sanity
        // check (>= 20) is pinned once, in
        // PlatformLayerModuleContractTests.PersistenceRetryPolicy_IsMorePatientOutsideDevelopment.
        mongoMaxPoolSize
            .Should()
            .BeGreaterThan(
                PlatformPersistenceModule.DefaultRecommendedMaxPoolSize,
                "the Mongo driver multiplexes far more concurrent operations per connection than the generic "
                + "relational default assumes, so its ceiling must exceed the generic floor, not merely equal or undercut it");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-073")]
    public void HangfireProvider_KeepsAWorkerCountFloor_SoJobsStillDrainOnSmallHosts()
    {
        PlatformHangfireBackgroundJobModule.DefaultBackgroundJobServerOptionsWorkerCount
            .Should()
            .BeGreaterThanOrEqualTo(
                5,
                "the worker count is derived from host parallelism, but a single-core container would otherwise "
                + "compute a handful of workers and stall the recurring-job queue behind one slow job");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-074")]
    public void AzureFileStorageProvider_PinsAnExplicitRetryBudget()
    {
        PlatformAzureFileStorageModule.DefaultBlobClientRetryMaxRetries.Should().BePositive();

        PlatformAzureFileStorageModule.DefaultBlobClientRetryDelay
            .Should()
            .BeLessThan(
                PlatformAzureFileStorageModule.DefaultBlobClientRetryMaxDelay,
                "the initial back-off must leave room to grow, otherwise exponential retry degenerates to a fixed delay");

        PlatformAzureFileStorageModule.DefaultBlobClientNetworkTimeout
            .Should()
            .BeGreaterThan(
                PlatformAzureFileStorageModule.DefaultBlobClientRetryMaxDelay,
                "a network timeout shorter than the longest back-off would cancel the request before its own retry could run");
    }

    // NOTE: TC-PLATMOD-080..083 (dashboard credential validation + retry-option defaults) were deliberately
    // REMOVED from here — code review round 2, finding A1 (plans/reports/cr-r2-tests-modules-cqrs.md). The
    // whole block was a duplicate, and a strictly WEAKER one, of
    // PlatformBackgroundJobModuleOptionsTests (TC-PLATJOB-060..068) in
    // Infrastructures/BackgroundJob/PlatformBackgroundJobModuleOptionsTests.cs, which lives in the options'
    // own directory and carries superset InlineData rows plus message assertions this file lacked. This
    // file's stated subject (see the class doc above) is which LAYER BASE a provider module derives from;
    // dashboard-option validation was off-topic here even before the duplication.

    [Theory]
    [Trait("TechnicalSpec", "TC-PLATMOD-090")]
    [InlineData(typeof(ConcreteTestRabbitMqMessageBusModule))]
    [InlineData(typeof(ConcreteTestRedisCacheModule))]
    [InlineData(typeof(ConcreteTestAzureFileStorageModule))]
    [InlineData(typeof(ConcreteTestFireBasePushNotificationModule))]
    public void InfrastructureProviderInstances_ReportTheInfrastructureTier(Type providerModuleType)
    {
        var (services, configuration) = NewHost();

        CreateModule(providerModuleType, services, configuration)
            .InitializationPriority
            .Should()
            .Be(
                PlatformInfrastructureModule.DefaultInitializationPriority,
                $"{providerModuleType.Name} must start with the rest of infrastructure — before persistence migrates");
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-PLATMOD-091")]
    [InlineData(typeof(ConcreteTestAspNetCoreModule))]
    [InlineData(typeof(ConcreteTestRabbitMqMessageBusModule))]
    [InlineData(typeof(ConcreteTestRedisCacheModule))]
    [InlineData(typeof(ConcreteTestAzureFileStorageModule))]
    [InlineData(typeof(ConcreteTestFireBasePushNotificationModule))]
    public void ConstructingAProviderModule_IsInert(Type providerModuleType)
    {
        var (services, configuration) = NewHost();
        var descriptorCountBeforeConstruction = services.Count;

        var providerModule = CreateModule(providerModuleType, services, configuration);

        // Provider modules wrap brokers, caches and storage accounts. Construction must never connect or
        // register: modules are built during container assembly, long before the host decides to start.
        providerModule.AreServicesRegistered.Should().BeFalse();
        providerModule.InitExecuted.Should().BeFalse();
        services.Count.Should().Be(descriptorCountBeforeConstruction, "construction must not mutate the service collection");

        providerModule.Dispose();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-092")]
    public void AspNetCoreModule_ScansOnlyItsOwnAssembly_LikeAnApplicationModule()
    {
        var (services, configuration) = NewHost();

        CreateModule<DerivedFromConcreteTestAspNetCoreModule>(services, configuration)
            .GetAssembliesForServiceScanning()
            .Should()
            .ContainSingle(
                "an API host must not inherit its parent host's controllers, CQRS handlers and hosted services "
                + "by accident — the ASP.NET Core module narrows the ancestor walk exactly as the application module does")
            .Which.Should()
            .BeSameAs(typeof(DerivedFromConcreteTestAspNetCoreModule).Assembly);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-092")]
    public void AspNetCoreModule_AttachesDirectlyToTheModuleBase_AndSitsOnTheBaseTier()
    {
        var (services, configuration) = NewHost();

        typeof(PlatformAspNetCoreModule).BaseType
            .Should()
            .Be(typeof(Easy.Platform.Common.PlatformModule), "the HTTP host is an entry point, not an infrastructure or persistence provider");

        CreateModule<ConcreteTestAspNetCoreModule>(services, configuration)
            .InitializationPriority
            .Should()
            .Be(
                Easy.Platform.Common.PlatformModule.DefaultInitializationPriority,
                "the HTTP host settles last, once every tier it serves traffic from is online");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-093")]
    public void AspNetCoreModule_ContributesTracerInstrumentation()
    {
        var (services, configuration) = NewHost();

        CreateModule<ConcreteTestAspNetCoreModule>(services, configuration)
            .AdditionalTracingSetup
            .Should()
            .NotBeNull(
                "the HTTP host is where incoming requests and outgoing HTTP calls enter the trace; without this "
                + "hook every trace would start at the CQRS handler and lose its caller");
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-PLATMOD-093")]
    [InlineData(typeof(ConcreteTestRabbitMqMessageBusModule))]
    [InlineData(typeof(ConcreteTestRedisCacheModule))]
    public void ProviderModules_PublishDistinctTracingSources(Type providerModuleType)
    {
        var (services, configuration) = NewHost();

        CreateModule(providerModuleType, services, configuration)
            .TracingSources()
            .Should()
            .NotBeEmpty($"{providerModuleType.Name} owns an activity source that must reach the tracer provider")
            .And.OnlyHaveUniqueItems();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-084")]
    public void MongoClassMapRegistry_StartsFromASharedProcessWideRegistry()
    {
        // These registries are process-global ON PURPOSE (the Mongo driver's own registration is static).
        // `NotBeNull()` on a get-only auto-property initialized inline is a tautology — it cannot fail without
        // a compile-breaking edit. What the method name actually claims ("shared", "process-wide") is that
        // repeated reads return the SAME instance rather than a freshly allocated one; asserting reference
        // identity across two reads is what catches turning either property into `=> new HashSet<Type>()`
        // (computed per access instead of field-backed), which would silently split the registry so the same
        // type reads "unregistered" from one call site and "registered" from another.
        PlatformMongoDbPersistenceModuleCache.RegisteredClassMapTypes
            .Should()
            .BeSameAs(
                PlatformMongoDbPersistenceModuleCache.RegisteredClassMapTypes,
                "the class-map registry must be one shared instance across every read, not recomputed per access");

        PlatformMongoDbPersistenceModuleCache.RegisteredSerializerTypes
            .Should()
            .BeSameAs(
                PlatformMongoDbPersistenceModuleCache.RegisteredSerializerTypes,
                "the serializer registry must be one shared instance across every read, not recomputed per access");

        PlatformMongoDbPersistenceModuleCache.RegistrationLock
            .Should()
            .BeSameAs(
                PlatformMongoDbPersistenceModuleCache.RegistrationLock,
                "a single shared lock guards both registries; splitting it would allow two lock orders and a deadlock");
    }
}
