using System.Reflection;
using Easy.Platform.AzureFileStorage;
using Easy.Platform.Common;
using Easy.Platform.EfCore;
using Easy.Platform.FirebasePushNotification;
using Easy.Platform.HangfireBackgroundJob;
using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.MongoDB;
using Easy.Platform.RabbitMQ;
using Easy.Platform.RedisCache;
using FluentAssertions;
using Microsoft.Extensions.Configuration;

namespace Easy.Platform.Tests.Unit.Common.Modules;

/// <summary>
/// Property-style contract suite that DISCOVERS every platform module class by reflection and asserts the
/// invariants that must hold for ALL of them — including modules added after these tests were written.
/// <para>
/// Example-based tests pin the modules that exist today; this suite pins the RULE. That distinction matters
/// here because the module set grows: each new provider (a new broker, a new cache, a new storage backend)
/// adds a module class, and every one of them must satisfy the same construction and lifecycle contract or
/// it will fail at application startup rather than at build time.
/// </para>
/// </summary>
public class AllPlatformModuleTypesContractTests : PlatformModuleTestBase
{
    /// <summary>
    /// The assemblies that ship platform module classes. Anchored by a type per assembly rather than by
    /// name string, so an assembly rename breaks the build instead of silently shrinking coverage to zero.
    /// </summary>
    private static readonly Assembly[] PlatformAssemblies =
    [
        typeof(PlatformModule).Assembly,
        typeof(Easy.Platform.AspNetCore.PlatformAspNetCoreModule).Assembly,
        typeof(PlatformAzureFileStorageModule).Assembly,
        typeof(PlatformEfCorePersistenceModule<>).Assembly,
        typeof(FireBasePushNotificationPlatformModule).Assembly,
        typeof(PlatformHangfireBackgroundJobModule).Assembly,
        typeof(PlatformMongoDbPersistenceModule<>).Assembly,
        typeof(PlatformRabbitMqMessageBusModule).Assembly,
        typeof(PlatformRedisCacheModule).Assembly
    ];

    public static TheoryData<Type> AllModuleTypes()
    {
        var data = new TheoryData<Type>();

        foreach (var moduleType in DiscoverAllModuleTypes())
            data.Add(moduleType);

        return data;
    }

    private static List<Type> DiscoverAllModuleTypes()
    {
        return PlatformAssemblies
            .Distinct()
            .SelectMany(assembly => assembly.GetTypes())
            .Where(type => type.IsClass && type != typeof(PlatformModule) && type.IsAssignableTo(typeof(PlatformModule)))
            .OrderBy(type => type.FullName, StringComparer.Ordinal)
            .ToList();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-030")]
    public void Discovery_FindsTheKnownModuleClasses_AcrossEveryPlatformAssembly()
    {
        var discoveredModuleTypes = DiscoverAllModuleTypes();

        // A census, not a cap: renaming or deleting any of these breaks loudly, while ADDING a module is
        // free (and is automatically picked up by every [Theory] below).
        discoveredModuleTypes.Should().Contain(
        [
            typeof(Easy.Platform.Application.PlatformApplicationModule),
            typeof(Easy.Platform.Domain.PlatformDomainModule),
            typeof(Easy.Platform.Infrastructures.PlatformInfrastructureModule),
            typeof(Easy.Platform.Persistence.PlatformPersistenceModule),
            typeof(PlatformCachingModule),
            typeof(Easy.Platform.Infrastructures.MessageBus.PlatformMessageBusModule),
            typeof(Easy.Platform.Infrastructures.BackgroundJob.PlatformBackgroundJobModule),
            typeof(Easy.Platform.Infrastructures.FileStorage.PlatformFileStorageModule),
            typeof(Easy.Platform.AspNetCore.PlatformAspNetCoreModule),
            typeof(PlatformAzureFileStorageModule),
            typeof(FireBasePushNotificationPlatformModule),
            typeof(PlatformHangfireBackgroundJobModule),
            typeof(PlatformRabbitMqMessageBusModule),
            typeof(PlatformRedisCacheModule)
        ]);

        // Established empirically (dimensional review, plans/reports/dim-review-module-contracts-260819.md):
        // the 14 named types above plus 5 further OPEN GENERIC Type objects that reflection also returns —
        // PlatformPersistenceModule<>, PlatformEfCorePersistenceModule<>, and PlatformMongoDbPersistenceModule<>
        // in its three declared arities (<T>, <T,T>, <T,T,T>) — total 19. Test doubles CANNOT participate: this
        // discovery reads only PlatformAssemblies (the nine production assemblies below), never
        // Easy.Platform.Tests.Unit, so the previous reason string's claim was factually wrong.
        discoveredModuleTypes.Should().HaveCountGreaterThanOrEqualTo(
            19,
            "the 14 named types above plus the persistence layer's open generic module definitions "
            + "(PlatformPersistenceModule<>, PlatformEfCorePersistenceModule<>, and PlatformMongoDbPersistenceModule<> "
            + "in its three arities) are additional Type objects returned by reflection — not test doubles, which "
            + "are excluded from PlatformAssemblies entirely");
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-PLATMOD-031")]
    [MemberData(nameof(AllModuleTypes))]
    public void EveryModuleType_ExposesTheServiceProviderAndConfigurationConstructor(Type moduleType)
    {
        // Modules are resolved from the DI container by type. Without this exact constructor shape the
        // container cannot build the module, and the failure appears only at application startup.
        var hasPlatformModuleConstructor = moduleType
            .GetConstructors(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance)
            .Any(constructor =>
            {
                var parameters = constructor.GetParameters();

                return parameters.Length >= 2
                       && parameters[0].ParameterType == typeof(IServiceProvider)
                       && parameters[1].ParameterType == typeof(IConfiguration);
            });

        hasPlatformModuleConstructor.Should().BeTrue(
            $"{moduleType.Name} must accept (IServiceProvider, IConfiguration) so the platform can construct it from the container");
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-PLATMOD-032")]
    [MemberData(nameof(AllModuleTypes))]
    public void EveryModuleType_IsPubliclySubclassable(Type moduleType)
    {
        moduleType.IsPublic.Should().BeTrue($"{moduleType.Name} must be reachable by host applications that subclass or register it");
        moduleType.IsSealed.Should().BeFalse(
            $"{moduleType.Name} must stay open for extension — the platform's module design expects host applications to derive from it");
    }

    /// <summary>
    /// The subset of <see cref="DiscoverAllModuleTypes" /> that declares at least one
    /// <c>*InitializationPriority</c> constant of its own. Most discovered types declare none (they inherit
    /// their tier), so <see cref="EveryDeclaredDefaultPriorityConstant_IsAPositiveMultipleOfTheTierGap" /> is
    /// scoped to exactly the types it can say anything about — a type with zero declared constants would
    /// otherwise run zero assertions and still report a green [Theory] case.
    /// </summary>
    private static List<Type> DiscoverModuleTypesWithDeclaredPriorityConstants()
    {
        return DiscoverAllModuleTypes()
            .Where(type => type
                .GetFields(BindingFlags.Public | BindingFlags.Static | BindingFlags.DeclaredOnly)
                .Any(field => field.IsLiteral && field.FieldType == typeof(int) && field.Name.Contains("InitializationPriority", StringComparison.Ordinal)))
            .ToList();
    }

    public static TheoryData<Type> ModuleTypesWithDeclaredPriorityConstants()
    {
        var data = new TheoryData<Type>();

        foreach (var moduleType in DiscoverModuleTypesWithDeclaredPriorityConstants())
            data.Add(moduleType);

        return data;
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-033")]
    public void ModuleTypesWithDeclaredPriorityConstants_DoesNotSilentlyDropToZero()
    {
        // The [Theory] below early-filters to types that declare a priority constant, so its rows alone do not
        // prove the filter ever matched anything. This floor pins that at least one platform module tier still
        // declares its own constant — if discovery ever drops to zero, this fails loudly instead of the theory
        // silently reporting zero, filtered-away, all-green cases.
        DiscoverModuleTypesWithDeclaredPriorityConstants().Should().HaveCountGreaterThanOrEqualTo(
            1,
            "at least one platform module tier (e.g. the infrastructure/persistence/dependent-on-persistence "
            + "tiers) declares its own *InitializationPriority constant, and this suite exists to pin its shape");
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-PLATMOD-033")]
    [MemberData(nameof(ModuleTypesWithDeclaredPriorityConstants))]
    public void EveryDeclaredDefaultPriorityConstant_IsAPositiveMultipleOfTheTierGap(Type moduleType)
    {
        var declaredPriorityConstants = moduleType
            .GetFields(BindingFlags.Public | BindingFlags.Static | BindingFlags.DeclaredOnly)
            .Where(field => field.IsLiteral && field.FieldType == typeof(int) && field.Name.Contains("InitializationPriority", StringComparison.Ordinal))
            .ToList();

        // The data source above selected moduleType BECAUSE it declares at least one such constant; this
        // guards against the two lists silently drifting apart.
        declaredPriorityConstants.Should().NotBeEmpty($"{moduleType.Name} was selected by {nameof(ModuleTypesWithDeclaredPriorityConstants)} for declaring one");

        foreach (var priorityConstant in declaredPriorityConstants)
        {
            var priorityValue = (int)priorityConstant.GetRawConstantValue()!;

            priorityValue.Should().BePositive($"{moduleType.Name}.{priorityConstant.Name} orders startup; zero or negative would sort below every real tier");
            (priorityValue % PlatformModule.InitializationPriorityTierGap)
                .Should()
                .Be(0, $"{moduleType.Name}.{priorityConstant.Name} must land ON a tier boundary — an off-grid value creates an unintended extra parallel wave");
        }
    }

    /// <summary>
    /// The subset of <see cref="DiscoverAllModuleTypes" /> that can actually be constructed: concrete
    /// (non-abstract) and closed (no open generic parameters). Abstract bases and open generics are covered by
    /// the type-level theories above, which do not need an instance.
    /// </summary>
    private static List<Type> DiscoverInstantiableModuleTypes()
    {
        return DiscoverAllModuleTypes()
            .Where(type => !type.IsAbstract && !type.ContainsGenericParameters)
            .ToList();
    }

    public static TheoryData<Type> InstantiableModuleTypes()
    {
        var data = new TheoryData<Type>();

        foreach (var moduleType in DiscoverInstantiableModuleTypes())
            data.Add(moduleType);

        return data;
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-034")]
    public void InstantiableModuleTypeDiscovery_DoesNotSilentlyDropToZero()
    {
        // The [Theory] below is scoped to instantiable types, so its rows alone do not prove any of them ran a
        // real construction. This floor pins that at least PlatformCachingModule — the platform's only
        // concrete, non-generic module — is always discovered; if it (or every instantiable type) ever drops
        // out, this fails loudly instead of the theory silently reporting zero cases.
        DiscoverInstantiableModuleTypes().Should().HaveCountGreaterThanOrEqualTo(
            1,
            "PlatformCachingModule is a concrete, non-generic module and must always be discovered and constructed");
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-PLATMOD-034")]
    [MemberData(nameof(InstantiableModuleTypes))]
    public void EveryInstantiableModuleType_SatisfiesTheInstanceLevelContract(Type moduleType)
    {
        var (services, configuration) = NewHost();

        var module = CreateModule(moduleType, services, configuration);

        module.InitializationPriority.Should().BePositive($"{moduleType.Name} must sort into a real startup tier");
        (module.InitializationPriority % PlatformModule.InitializationPriorityTierGap).Should().Be(0);

        module.TracingSources().Should().NotBeNull($"{moduleType.Name}.TracingSources is aggregated with others — null would break tracing setup");
        module.GetDependentModuleTypes().Should().NotBeNull($"{moduleType.Name}.GetDependentModuleTypes is enumerated during registration — null would throw");

        module.GetAssembliesForServiceScanning()
            .Should()
            .NotBeEmpty()
            .And.Contain(moduleType.Assembly, $"{moduleType.Name} must at minimum scan its own assembly for services");

        module.Assembly.Should().BeSameAs(moduleType.Assembly);
        module.AreServicesRegistered.Should().BeFalse("construction must never perform registration as a side effect");
        module.InitExecuted.Should().BeFalse("construction must never perform initialization as a side effect");

        module.Dispose();
    }
}
