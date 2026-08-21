using Easy.Platform.Common.Utils;
using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Tests.Unit.Infrastructures.Caching;

/// <summary>
/// Behavioral unit tests for <see cref="PlatformCollectionCacheRepository{TCollectionCacheKeyProvider}" /> and
/// its three concrete variants (Memory / Distributed / Hybrid).
/// <para>Source under test: <c>src/Platform/Easy.Platform/Infrastructures/Caching/PlatformCollectionCacheRepository.cs:172,478,497,516</c>.</para>
/// <para>
/// Traceability: TECHNICAL-ONLY ids <c>TC-PLATREPO-040..049</c> and <c>TC-PLATREPO-085</c>. Listing every range
/// the file actually uses is what keeps id allocation collision-free - an under-declared range here is how a
/// duplicate id gets chosen (see the note on <c>PlatformCacheRepositoryTests</c>).
/// </para>
/// </summary>
public class PlatformCollectionCacheRepositoryTests : PlatformUnitTestBase
{
    // TC-PLATREPO-040: Each concrete variant declares exactly one cache repository type.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-040")]
    public void ConcreteVariants_DeclareTheirOwnCacheRepositoryType()
    {
        using var harness = CollectionCacheHarness.Create();

        harness.MemoryCollectionRepository.CacheRepositoryType().Should().Be(PlatformCacheRepositoryType.Memory);
        harness.DistributedCollectionRepository.CacheRepositoryType().Should().Be(PlatformCacheRepositoryType.Distributed);
        harness.HybridCollectionRepository.CacheRepositoryType().Should().Be(PlatformCacheRepositoryType.Hybrid);
    }

    // TC-PLATREPO-041: A variant writes into the repository its OWN type selects, not any other.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-041")]
    public async Task SetAsync_WritesIntoTheRepositorySelectedByTheVariantsOwnCacheRepositoryType()
    {
        using var harness = CollectionCacheHarness.Create();

        await harness.MemoryCollectionRepository.SetAsync("memory-only-value", cacheOptions: null, requestKey: "shared-request-key");

        // The value must be readable through the Memory-backed store and ABSENT from the Distributed one.
        (await harness.MemoryCollectionRepository.GetAsync<string>("shared-request-key")).Should().Be("memory-only-value");
        (await harness.DistributedCollectionRepository.GetAsync<string>("shared-request-key"))
            .Should()
            .BeNull("the Distributed variant resolves a DIFFERENT backing repository");

        await harness.DistributedCollectionRepository.SetAsync("distributed-only-value", cacheOptions: null, requestKey: "shared-request-key");

        (await harness.DistributedCollectionRepository.GetAsync<string>("shared-request-key")).Should().Be("distributed-only-value");
        (await harness.MemoryCollectionRepository.GetAsync<string>("shared-request-key"))
            .Should()
            .Be("memory-only-value", "the Distributed write must not disturb the Memory entry");
    }

    // TC-PLATREPO-042: The key provider decides the Context/Collection of every key the repository touches.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-042")]
    public async Task CollectionRepository_StoresUnderTheKeyProvidersContextAndCollection()
    {
        using var harness = CollectionCacheHarness.Create();

        await harness.MemoryCollectionRepository.SetAsync("value", cacheOptions: null, requestKey: "key-shape");

        var expectedKey = new PlatformCacheKey(
            TestCollectionCacheKeyProvider.TestContext,
            TestCollectionCacheKeyProvider.TestCollection,
            "key-shape");

        harness.MemoryDistributedCache.ContainsKey(expectedKey.ToString())
            .Should()
            .BeTrue("the collection repository must derive its key from the key provider");
    }

    // TC-PLATREPO-043: The requestKeyParts overload produces a multi-part key distinct from the joined string.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-043")]
    public async Task SetAsyncWithRequestKeyParts_ProducesADistinctMultiPartKey()
    {
        using var harness = CollectionCacheHarness.Create();

        await harness.MemoryCollectionRepository.SetAsync("parts-value", cacheOptions: null, requestKeyParts: ["tenant", "user"]);

        (await harness.MemoryCollectionRepository.GetAsync<string>(["tenant", "user"])).Should().Be("parts-value");

        // The parts-built key is NOT the same entry as the naively joined single request key.
        (await harness.MemoryCollectionRepository.GetAsync<string>("tenantuser")).Should().BeNull();
        (await harness.MemoryCollectionRepository.GetAsync<string>("tenant-+-user")).Should().BeNull();
    }

    // TC-PLATREPO-044: The default request key produces the collection's "All" entry.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-044")]
    public async Task CollectionRepository_StoresTheDefaultRequestKeyAsTheCollectionWideEntry()
    {
        using var harness = CollectionCacheHarness.Create();

        // NOTE: the requestKey and requestKeyParts overloads BOTH have every parameter optional, so a
        // caller can never actually omit the request key - the call would be ambiguous at compile time.
        // The "no request key supplied" default is therefore exercised at the key-provider level in
        // TC-PLATREPO-049; here the documented default value is passed explicitly.
        // NOTE: PlatformContextCacheKeyProvider.DefaultRequestKey and PlatformCacheKey.DefaultRequestKey are
        // the SAME constant value (the former is declared as an alias of the latter) - this test deliberately
        // uses each name at the call site closest to where it is declared (the API parameter's own default vs
        // the raw key builder), not as an accidental mix.
        await harness.MemoryCollectionRepository.SetAsync(
            "default-key-value",
            cacheOptions: null,
            requestKey: PlatformContextCacheKeyProvider.DefaultRequestKey);

        var defaultKey = new PlatformCacheKey(
            TestCollectionCacheKeyProvider.TestContext,
            TestCollectionCacheKeyProvider.TestCollection,
            PlatformCacheKey.DefaultRequestKey);

        harness.MemoryDistributedCache.ContainsKey(defaultKey.ToString()).Should().BeTrue();
        (await harness.MemoryCollectionRepository.GetAsync<string>(PlatformContextCacheKeyProvider.DefaultRequestKey))
            .Should()
            .Be("default-key-value");
    }

    // TC-PLATREPO-045: Cache-aside through a collection repository calls the origin once, then never again.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-045")]
    public async Task CacheRequestAsync_ThroughACollectionRepository_CallsTheOriginOnMissAndNotOnHit()
    {
        using var harness = CollectionCacheHarness.Create();

        var missInvocationCount = 0;

        var missResult = await harness.MemoryCollectionRepository.CacheRequestAsync(
            () =>
            {
                Interlocked.Increment(ref missInvocationCount);

                return Task.FromResult("origin-value");
            },
            "cache-aside-miss",
            absoluteExpirationInSeconds: null);

        missResult.Should().Be("origin-value");
        missInvocationCount.Should().Be(1);

        // The miss result is returned immediately; the cache write itself happens in the background
        // (PlatformCacheRepository.cs:463-473). Poll for it - deleting that write-behind entirely would still
        // leave every assertion above green (surviving mutant H1).
        string? writtenValue = null;

        await Util.TaskRunner.WaitUntilAsync(
            async () =>
            {
                writtenValue = await harness.MemoryCollectionRepository.GetAsync<string>("cache-aside-miss");

                return writtenValue != null;
            },
            maxWaitSeconds: 5,
            waitIntervalSeconds: 0.05,
            waitForMsg: "cache-aside miss must populate the store via the write-behind background task");

        writtenValue.Should().Be("origin-value", "the write-behind background write must actually persist the origin value");

        await harness.MemoryCollectionRepository.SetAsync("primed-value", cacheOptions: null, requestKey: "cache-aside-hit");

        var hitInvocationCount = 0;

        var hitResult = await harness.MemoryCollectionRepository.CacheRequestAsync(
            () =>
            {
                Interlocked.Increment(ref hitInvocationCount);

                return Task.FromResult("should-never-be-used");
            },
            "cache-aside-hit",
            absoluteExpirationInSeconds: null);

        hitResult.Should().Be("primed-value");
        hitInvocationCount.Should().Be(0);
    }

    // TC-PLATREPO-046: RemoveCollectionAsync clears only the provider's own collection.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-046")]
    public async Task RemoveCollectionAsync_ClearsOnlyTheProvidersOwnCollection()
    {
        using var harness = CollectionCacheHarness.Create();

        await harness.MemoryCollectionRepository.SetAsync("in-collection", cacheOptions: null, requestKey: "a");

        var otherCollectionKey = new PlatformCacheKey(
            TestCollectionCacheKeyProvider.TestContext,
            OtherTestCollectionCacheKeyProvider.OtherCollection,
            "a");

        await harness.MemoryCacheRepository.SetAsync(otherCollectionKey, "in-other-collection", cacheOptions: null);

        await harness.MemoryCacheRepository.RemoveCollectionAsync<TestCollectionCacheKeyProvider>();

        (await harness.MemoryCollectionRepository.GetAsync<string>("a")).Should().BeNull();
        (await harness.MemoryCacheRepository.GetAsync<string>(otherCollectionKey))
            .Should()
            .Be("in-other-collection", "another collection must be untouched");
    }

    // TC-PLATREPO-047: MatchCollectionKeyPredicate matches only keys of the provider's own context+collection.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-047")]
    public void MatchCollectionKeyPredicate_MatchesOnlyTheProvidersOwnContextAndCollection()
    {
        var keyProvider = new TestCollectionCacheKeyProvider();
        var predicate = keyProvider.MatchCollectionKeyPredicate();

        predicate(keyProvider.GetKey("anything")).Should().BeTrue();
        predicate(new OtherTestCollectionCacheKeyProvider().GetKey("anything")).Should().BeFalse();
        predicate(new PlatformCacheKey("different-context", TestCollectionCacheKeyProvider.TestCollection, "anything")).Should().BeFalse();
    }

    // TC-PLATREPO-048: A provider missing its Context or Collection is rejected before any key is built.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-048")]
    public void GetKey_WhenProviderIsMissingContextOrCollection_Throws()
    {
        var missingBoth = new PlatformCollectionCacheKeyProvider();
        var missingCollection = new PlatformCollectionCacheKeyProvider { Context = "ctx" };

        var missingBothAct = () => missingBoth.GetKey("req");
        var missingCollectionAct = () => missingCollection.GetKey("req");

        missingBothAct.Should().Throw<Exception>().WithMessage("Context and Collection must be not null");
        missingCollectionAct.Should().Throw<Exception>().WithMessage("Context and Collection must be not null");

        var valid = new PlatformCollectionCacheKeyProvider { Context = "ctx", Collection = "coll" };

        valid.GetKey("req").ToString().Should().Be($"{PlatformCacheKey.KeyEncodingVersionPrefix}ctx---:coll---:req");
    }

    // TC-PLATREPO-049: A null request key degrades to the default rather than producing an empty key part.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-049")]
    public void GetKey_WithNullRequestKeyOrEmptyParts_FallsBackToTheDefaultRequestKey()
    {
        var keyProvider = new TestCollectionCacheKeyProvider();

        var fromNullRequestKey = keyProvider.GetKey((string)null);
        var fromNullParts = keyProvider.GetKey((string[])null);
        var fromEmptyParts = keyProvider.GetKey([]);

        fromNullRequestKey.RequestKey.Should().Be(PlatformCacheKey.DefaultRequestKey);
        fromNullParts.RequestKey.Should().Be(PlatformCacheKey.BuildRequestKey([PlatformCacheKey.DefaultRequestKey]));
        fromEmptyParts.RequestKey.Should().Be(PlatformCacheKey.BuildRequestKey([PlatformCacheKey.DefaultRequestKey]));

        // Reported as a source-design finding (M3), pinned rather than silently endorsed: the two "no request
        // key" overloads DISAGREE on the resulting RequestKey - "All" through the string overload vs "(All)"
        // through the parts overload - so a value written through one overload is never read back through the
        // other, even though both callers mean "the collection-wide entry".
        fromNullRequestKey.Should().NotBe(fromNullParts, "the string and parts overloads render two DIFFERENT cache entries for the same logical 'no request key' input");
    }

    // TC-PLATREPO-085: A Context/Collection containing the folder separator is sanitised when a key is BUILT
    // (PlatformCacheKey.AutoFixKeyPartValue) - the predicate must sanitise its OWN side the same way, or a
    // real provider whose Context/Collection legitimately contains ":" would never match its own stored keys.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-085")]
    public void MatchCollectionKeyPredicate_MatchesItsOwnStoredKeys_WhenContextOrCollectionContainsTheFolderSeparator()
    {
        // Precondition: the raw values really do contain the separator the predicate must sanitise around.
        SeparatorBearingCollectionCacheKeyProvider.RawContext.Should().Contain(PlatformCacheKey.SpecialDistributedCacheKeyFolderSeparator);
        SeparatorBearingCollectionCacheKeyProvider.RawCollection.Should().Contain(PlatformCacheKey.SpecialDistributedCacheKeyFolderSeparator);

        var keyProvider = new SeparatorBearingCollectionCacheKeyProvider();
        var predicate = keyProvider.MatchCollectionKeyPredicate();

        var ownKey = keyProvider.GetKey("anything");

        predicate(ownKey).Should().BeTrue("MatchCollectionKeyPredicate must sanitise Context/Collection the same way GetKey does (H4) - otherwise RemoveCollectionAsync becomes a silent no-op for this provider");
    }

    /// <summary>
    /// Builds one isolated stack: two DISTINCT backing stores (memory and distributed) behind a real
    /// <see cref="PlatformCacheRepositoryProvider" />, plus the three collection repository variants.
    /// </summary>
    private sealed class CollectionCacheHarness : IDisposable
    {
        private readonly ServiceProvider serviceProvider;

        private CollectionCacheHarness(ServiceProvider serviceProvider, TestCollectionCacheKeyProvider keyProvider)
        {
            this.serviceProvider = serviceProvider;

            MemoryDistributedCache = new InMemoryTestDistributedCache();
            DistributedDistributedCache = new InMemoryTestDistributedCache();

            MemoryCacheRepository = CachingTestFactory.CreateMemoryRepository(serviceProvider, distributedCache: MemoryDistributedCache);

            DistributedCacheRepository = CachingTestFactory.CreateDistributedRepository(serviceProvider, distributedCache: DistributedDistributedCache);

            CacheRepositoryProvider = new PlatformCacheRepositoryProvider(
                serviceProvider,
                [MemoryCacheRepository, DistributedCacheRepository]);

            MemoryCollectionRepository = new PlatformCollectionMemoryCacheRepository<TestCollectionCacheKeyProvider>(
                CacheRepositoryProvider,
                keyProvider,
                serviceProvider);

            DistributedCollectionRepository = new PlatformCollectionDistributedCacheRepository<TestCollectionCacheKeyProvider>(
                CacheRepositoryProvider,
                keyProvider,
                serviceProvider);

            HybridCollectionRepository = new PlatformCollectionHybridCacheRepository<TestCollectionCacheKeyProvider>(
                CacheRepositoryProvider,
                keyProvider,
                serviceProvider);
        }

        public InMemoryTestDistributedCache MemoryDistributedCache { get; }

        public InMemoryTestDistributedCache DistributedDistributedCache { get; }

        public TestMemoryCacheRepository MemoryCacheRepository { get; }

        public TestDistributedCacheRepository DistributedCacheRepository { get; }

        public PlatformCacheRepositoryProvider CacheRepositoryProvider { get; }

        public PlatformCollectionMemoryCacheRepository<TestCollectionCacheKeyProvider> MemoryCollectionRepository { get; }

        public PlatformCollectionDistributedCacheRepository<TestCollectionCacheKeyProvider> DistributedCollectionRepository { get; }

        public PlatformCollectionHybridCacheRepository<TestCollectionCacheKeyProvider> HybridCollectionRepository { get; }

        public void Dispose()
        {
            MemoryCacheRepository.Dispose();
            DistributedCacheRepository.Dispose();
            serviceProvider.Dispose();
        }

        public static CollectionCacheHarness Create()
        {
            var keyProvider = new TestCollectionCacheKeyProvider();

            var serviceProvider = CachingTestFactory.BuildServiceProvider(services => services.AddSingleton(keyProvider));

            return new CollectionCacheHarness(serviceProvider, keyProvider);
        }
    }
}
