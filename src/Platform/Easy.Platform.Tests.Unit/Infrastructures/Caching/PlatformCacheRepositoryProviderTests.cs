using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Infrastructures.Caching.BuiltInCacheRepositories;
using Easy.Platform.RedisCache;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Easy.Platform.Tests.Unit.Infrastructures.Caching;

/// <summary>
/// Behavioral unit tests for <see cref="PlatformCacheRepositoryProvider" /> - the component that decides
/// WHICH cache repository a caller gets.
/// <para>Source under test: <c>src/Platform/Easy.Platform/Infrastructures/Caching/PlatformCacheRepositoryProvider.cs:55</c>.</para>
/// <para>Traceability: TECHNICAL-ONLY ids <c>TC-PLATREPO-030..039</c>.</para>
/// </summary>
public class PlatformCacheRepositoryProviderTests : PlatformUnitTestBase
{
    // TC-PLATREPO-030: Repositories are classified into Distributed / Memory / Hybrid by their marker type.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-030")]
    public void Get_ClassifiesEachRegisteredRepositoryByItsMarkerInterfaceOrBaseType()
    {
        using var serviceProvider = CachingTestFactory.BuildServiceProvider();

        var distributed = CachingTestFactory.CreateDistributedRepository(serviceProvider);
        var memory = CachingTestFactory.CreateMemoryRepository(serviceProvider);
        // null HybridCache: only the repository's TYPE participates in classification here, and no test in this file calls a hybrid-backed operation.
        var hybrid = CachingTestFactory.CreateHybridRepository(serviceProvider, hybridCache: null!);

        var provider = new PlatformCacheRepositoryProvider(serviceProvider, [distributed, memory, hybrid]);

        provider.Get(PlatformCacheRepositoryType.Distributed).Should().BeSameAs(distributed);
        provider.Get(PlatformCacheRepositoryType.Memory).Should().BeSameAs(memory);
        provider.Get(PlatformCacheRepositoryType.Hybrid).Should().BeSameAs(hybrid);
    }

    // TC-PLATREPO-031: Classification order MATTERS - a type matching two checks takes the FIRST one.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-031")]
    public void Get_WhenARepositoryImplementsBothDistributedAndMemoryMarkers_ClassifiesItAsDistributed()
    {
        using var serviceProvider = CachingTestFactory.BuildServiceProvider();

        var dualClassification = CachingTestFactory.CreateTestRepository<TestDualClassificationCacheRepository>(serviceProvider, static (sp, lf, cs, ctx, dc) => new TestDualClassificationCacheRepository(sp, lf, cs, ctx, dc));

        var provider = new PlatformCacheRepositoryProvider(serviceProvider, [dualClassification]);

        provider.Get(PlatformCacheRepositoryType.Distributed).Should().BeSameAs(dualClassification);

        // Proof that it did NOT also land in the Memory slot: asking for Memory without a fallback throws.
        var memoryAct = () => provider.Get(PlatformCacheRepositoryType.Memory, fallbackMemoryCacheIfNotExist: false);

        memoryAct.Should()
            .Throw<Exception>("the Distributed check runs FIRST, so the Memory slot must stay empty")
            .WithMessage("*Memory is not registered*");
    }

    // TC-PLATREPO-032: A repository matching NO classification is rejected loudly at construction time.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-032")]
    public void Constructor_WhenARepositoryMatchesNoClassification_Throws()
    {
        using var serviceProvider = CachingTestFactory.BuildServiceProvider();

        var unclassifiable = CachingTestFactory.CreateTestRepository<TestUnclassifiableCacheRepository>(serviceProvider, static (sp, lf, cs, ctx, dc) => new TestUnclassifiableCacheRepository(sp, lf, cs, ctx, dc));

        var act = () => new PlatformCacheRepositoryProvider(serviceProvider, [unclassifiable]);

        act.Should().Throw<Exception>().WithMessage("Unknown PlatformCacheRepositoryType*");
    }

    // TC-PLATREPO-033: When the SAME repository type is registered twice, the LAST registration wins.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-033")]
    public void Get_WhenTheSameRepositoryTypeIsRegisteredTwice_TheLastRegistrationWins()
    {
        using var serviceProvider = CachingTestFactory.BuildServiceProvider();

        var first = CachingTestFactory.CreateMemoryRepository(serviceProvider);
        var second = CachingTestFactory.CreateMemoryRepository(serviceProvider);

        first.Should().NotBeSameAs(second, "precondition: two distinct instances of the same type");

        var provider = new PlatformCacheRepositoryProvider(serviceProvider, [first, second]);

        provider.Get(PlatformCacheRepositoryType.Memory)
            .Should()
            .BeSameAs(second, "GroupBy(GetType()).Last() makes the LAST registration authoritative");
    }

    // TC-PLATREPO-034: An unregistered type silently falls back to Memory when the fallback is enabled.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-034")]
    public void Get_WhenRequestedTypeIsMissingAndFallbackEnabled_ReturnsTheMemoryRepository()
    {
        using var serviceProvider = CachingTestFactory.BuildServiceProvider();

        var memory = CachingTestFactory.CreateMemoryRepository(serviceProvider);

        var provider = new PlatformCacheRepositoryProvider(serviceProvider, [memory]);

        provider.Get(PlatformCacheRepositoryType.Distributed).Should().BeSameAs(memory);
        provider.Get(PlatformCacheRepositoryType.Hybrid).Should().BeSameAs(memory);

        // The default argument is Distributed with fallback enabled.
        provider.Get().Should().BeSameAs(memory);
    }

    // TC-PLATREPO-035: With the fallback DISABLED the missing type is reported instead of silently substituted.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-035")]
    public void Get_WhenRequestedTypeIsMissingAndFallbackDisabled_ThrowsNamingTheMissingType()
    {
        using var serviceProvider = CachingTestFactory.BuildServiceProvider();

        var memory = CachingTestFactory.CreateMemoryRepository(serviceProvider);

        var provider = new PlatformCacheRepositoryProvider(serviceProvider, [memory]);

        var act = () => provider.Get(PlatformCacheRepositoryType.Distributed, fallbackMemoryCacheIfNotExist: false);

        act.Should().Throw<Exception>().WithMessage("Type of Distributed is not registered");

        // A REGISTERED type is still returned normally with the fallback disabled.
        provider.Get(PlatformCacheRepositoryType.Memory, fallbackMemoryCacheIfNotExist: false).Should().BeSameAs(memory);
    }

    // TC-PLATREPO-036: TryGet swallows EVERY failure - including the missing-Memory fallback lookup.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-036")]
    public void TryGet_ReturnsNullInsteadOfThrowing_EvenWhenTheMemoryFallbackItselfIsMissing()
    {
        using var serviceProvider = CachingTestFactory.BuildServiceProvider();

        var distributed = CachingTestFactory.CreateDistributedRepository(serviceProvider);

        // NO memory repository is registered, so Get's fallback indexer lookup throws KeyNotFoundException.
        var provider = new PlatformCacheRepositoryProvider(serviceProvider, [distributed]);

        var directAct = () => provider.Get(PlatformCacheRepositoryType.Hybrid);

        directAct.Should().Throw<KeyNotFoundException>("precondition: the fallback lookup itself fails");

        provider.TryGet(PlatformCacheRepositoryType.Hybrid).Should().BeNull("TryGet must convert ANY failure into null");
        provider.TryGet(PlatformCacheRepositoryType.Distributed).Should().BeSameAs(distributed);
    }

    // TC-PLATREPO-037: GetCollection prefers the matching type, then falls back to the Memory collection repo.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-037")]
    public void GetCollection_PrefersTheRequestedTypeThenFallsBackToTheMemoryCollectionRepository()
    {
        var keyProvider = new TestCollectionCacheKeyProvider();

        using var serviceProvider = CachingTestFactory.BuildServiceProvider(services =>
        {
            services.AddSingleton(keyProvider);
            services.AddSingleton<IPlatformCollectionCacheRepository<TestCollectionCacheKeyProvider>>(sp =>
                new PlatformCollectionMemoryCacheRepository<TestCollectionCacheKeyProvider>(
                    sp.GetRequiredService<IPlatformCacheRepositoryProvider>(),
                    keyProvider,
                    sp));
            services.AddSingleton<IPlatformCollectionCacheRepository<TestCollectionCacheKeyProvider>>(sp =>
                new PlatformCollectionDistributedCacheRepository<TestCollectionCacheKeyProvider>(
                    sp.GetRequiredService<IPlatformCacheRepositoryProvider>(),
                    keyProvider,
                    sp));
            services.AddSingleton<IPlatformCacheRepositoryProvider>(sp => new PlatformCacheRepositoryProvider(
                sp,
                [CachingTestFactory.CreateMemoryRepository(sp)]));
        });

        var provider = serviceProvider.GetRequiredService<IPlatformCacheRepositoryProvider>();

        provider.GetCollection<TestCollectionCacheKeyProvider>(PlatformCacheRepositoryType.Distributed)
            .CacheRepositoryType()
            .Should()
            .Be(PlatformCacheRepositoryType.Distributed);

        provider.GetCollection<TestCollectionCacheKeyProvider>(PlatformCacheRepositoryType.Memory)
            .CacheRepositoryType()
            .Should()
            .Be(PlatformCacheRepositoryType.Memory);

        // Hybrid has no registered collection repository, so the Memory one is returned instead.
        provider.GetCollection<TestCollectionCacheKeyProvider>(PlatformCacheRepositoryType.Hybrid)
            .CacheRepositoryType()
            .Should()
            .Be(PlatformCacheRepositoryType.Memory);
    }

    // TC-PLATREPO-038: The REAL built-in memory repository classifies as Memory and stores/reads values.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-038")]
    public async Task PlatformMemoryCacheRepository_ClassifiesAsMemoryAndRoundTripsValues()
    {
        using var serviceProvider = CachingTestFactory.BuildServiceProvider();

        var memoryDistributedCache = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));

        using var repository = new PlatformMemoryCacheRepository(
            CachingTestFactory.BuildLoggerFactory(),
            serviceProvider,
            CachingTestFactory.BuildCacheSettings(),
            CachingTestFactory.BuildApplicationSettingContext(),
            memoryDistributedCache);

        var provider = new PlatformCacheRepositoryProvider(serviceProvider, [repository]);

        provider.Get(PlatformCacheRepositoryType.Memory).Should().BeSameAs(repository);

        var cacheKey = new PlatformCacheKey(CachingTestFactory.TestApplicationName, "builtin-memory", "round-trip");

        await repository.SetAsync(cacheKey, "memory-value", cacheOptions: null);

        (await repository.GetAsync<string>(cacheKey)).Should().Be("memory-value");
    }

    // TC-PLATREPO-039: The REAL hybrid and redis repositories classify as Hybrid and Distributed.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-039")]
    public void PlatformHybridAndRedisCacheRepositories_ClassifyAsHybridAndDistributed()
    {
        using var serviceProvider = CachingTestFactory.BuildServiceProvider();

        // null HybridCache: only the repository's TYPE participates in classification here, and no test in this file calls a hybrid-backed operation.
        using var hybrid = CachingTestFactory.CreateHybridRepository(serviceProvider, hybridCache: null!);

        using var redis = new PlatformRedisDistributedCacheRepository(
            serviceProvider,
            CachingTestFactory.BuildApplicationSettingContext(),
            CachingTestFactory.BuildLoggerFactory(),
            CachingTestFactory.BuildCacheSettings());

        var provider = new PlatformCacheRepositoryProvider(serviceProvider, [hybrid, redis]);

        provider.Get(PlatformCacheRepositoryType.Hybrid).Should().BeSameAs(hybrid);
        provider.Get(PlatformCacheRepositoryType.Distributed).Should().BeSameAs(redis);

        // Neither built-in registers itself as the Memory repository.
        var memoryAct = () => provider.Get(PlatformCacheRepositoryType.Memory, fallbackMemoryCacheIfNotExist: false);

        memoryAct.Should().Throw<Exception>().WithMessage("Type of Memory is not registered");
    }
}
