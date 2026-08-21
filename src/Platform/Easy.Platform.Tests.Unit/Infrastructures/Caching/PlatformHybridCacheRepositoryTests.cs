using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Infrastructures.Caching.BuiltInCacheRepositories;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Easy.Platform.Tests.Unit.Infrastructures.Caching;

/// <summary>
/// Behavioral unit tests for <see cref="PlatformHybridCacheRepository" />, focused on the ONE invariant that
/// distinguishes it from every sibling repository: it WRITES through <see cref="HybridCache" /> but INHERITS a
/// read path that goes through the raw <see cref="IDistributedCache" />. Anything the platform writes and then
/// reads back ITSELF therefore must not take the HybridCache route.
/// <para>
/// <see cref="HybridCache" /> does not store raw values in its L2 - it frames every L2 entry in its own payload
/// envelope (carrying the key, the tags and the creation timestamp so a read can be validated against tag
/// invalidation; see the <c>HybridCachePayload</c> / <c>FormatNotRecognized</c> / <c>ExpiredByTag</c> machinery
/// inside Microsoft.Extensions.Caching.Hybrid). The inherited raw-JSON read path cannot parse that envelope. The
/// global cached-keys REGISTRY is exactly such a self-read structure: written on every mutation, read back by
/// <c>LoadGlobalAllRequestCachedKeys</c> to drive predicate and collection invalidation.
/// </para>
/// <para>
/// Source under test:
/// <c>src/Platform/Easy.Platform/Infrastructures/Caching/BuiltInCacheRepositories/PlatformHybridCacheRepository.cs</c>.
/// </para>
/// <para>Traceability: TECHNICAL-ONLY ids <c>TC-PLATREPO-097</c>.</para>
/// </summary>
public class PlatformHybridCacheRepositoryTests : PlatformUnitTestBase
{
    // TC-PLATREPO-097: The global-keys registry is written through the SAME primitive its read path uses, and
    // still carries the never-expire intent. Routing this write through HybridCache instead (as an override once
    // did) leaves the entry unparseable by the inherited raw read path - and, because it is deliberately written
    // to never expire, unable to even self-heal by expiring.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-097")]
    public async Task GlobalKeysRegistryWrite_GoesToTheDistributedCacheTheReadPathUses_NotThroughHybridCache()
    {
        using var harness = HybridCacheRepositoryHarness.Create();

        var trackedKey = HybridCacheRepositoryHarness.Key("registry-symmetry");

        harness.SeedValue(trackedKey, "value");
        harness.SeedRegistry(trackedKey);

        // Rewrites the registry WITHOUT going through SetAsync, so this test observes the registry write in
        // isolation from value writing and tag association.
        await harness.Repository.ProcessClearDeprecatedGlobalRequestCachedKeys();

        var registryKey = harness.Repository.GetGlobalAllRequestCachedKeysCacheKey();

        harness.VerifyWrittenThroughHybridCache(
            registryKey,
            Times.Never(),
            "the registry is read back through the raw IDistributedCache, so it must be WRITTEN there too");

        // Positive counterpart to the assertion above, and the reason it cannot pass vacuously: the registry
        // really was rewritten, through IDistributedCache.SetAsync. The seeding helpers deliberately use
        // SetRawBytes, which captures NO options, so a non-null capture here can only have come from a genuine
        // repository write through the distributed cache.
        var capturedOptions = harness.DistributedCache.GetCapturedOptions(registryKey.ToString());

        capturedOptions.Should().NotBeNull("the registry must have been rewritten through the distributed cache, not merely left as seeded");

        // The never-expire intent survives the choice of write primitive. MapToDistributedCacheEntryOptions
        // honours PlatformCacheEntryOptions.NeverExpire on BOTH axes (compare TC-PLATREPO-093), which the hybrid
        // mapper's single Expiration field could only ever approximate with a finite stand-in duration.
        capturedOptions!.AbsoluteExpirationRelativeToNow
            .Should()
            .BeNull("the registry must outlive every key it tracks");
        capturedOptions.SlidingExpiration
            .Should()
            .BeNull("a sliding expiration would expire the registry on a low-traffic service - the same loss of invalidation");

        // Symmetry proof in its strongest available form: what the repository WROTE is what the repository's OWN
        // read path parses back.
        (await harness.Repository.GetAsync<List<PlatformCacheKey>>(registryKey))
            .Should()
            .Contain(trackedKey, "a registry that cannot be read back is an EMPTY registry, which silently disables predicate and collection invalidation");
    }

    // TC-PLATREPO-097: The business outcome the registry exists for. Predicate invalidation walks the registry
    // and then must PERSIST the shrunken registry somewhere its own next read can see - otherwise the removed key
    // is resurrected on the next read and the eviction silently un-does itself.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-097")]
    public async Task RemoveAsyncByPredicate_EvictsTheMatchingKeyThroughHybridCacheAndPersistsTheShrunkenRegistry()
    {
        using var harness = HybridCacheRepositoryHarness.Create();

        var matching = HybridCacheRepositoryHarness.Key("predicate-match");
        var unrelated = HybridCacheRepositoryHarness.Key("predicate-no-match");

        harness.SeedValue(matching, "matching-value");
        harness.SeedValue(unrelated, "unrelated-value");
        harness.SeedRegistry(matching, unrelated);

        await harness.Repository.RemoveAsync(key => key.RequestKey == matching.RequestKey);

        // Precondition AND outcome in one: HybridCache genuinely IS this repository's eviction primitive (so the
        // registry exception asserted by the sibling test is a deliberate exception, not a repository that never
        // touches HybridCache), and the predicate really did select only the matching key.
        harness.VerifyRemovedThroughHybridCache(matching, Times.AtLeastOnce(), "predicate invalidation must evict the key the registry recorded");
        harness.VerifyRemovedThroughHybridCache(unrelated, Times.Never(), "the predicate did not match this key");

        var registryKey = harness.Repository.GetGlobalAllRequestCachedKeysCacheKey();

        var registryAfterRemove = await harness.Repository.GetAsync<List<PlatformCacheKey>>(registryKey);

        registryAfterRemove.Should().NotContain(matching, "the shrunken registry must be written where the repository's own read path will see it");
        registryAfterRemove.Should().Contain(unrelated, "an untouched key must survive the rewrite");
    }

    /// <summary>
    /// Owns one isolated <see cref="PlatformHybridCacheRepository" />: a capturing
    /// <see cref="IDistributedCache" /> resolved from the service provider (the repository reads it from there,
    /// not from a constructor argument) plus a <see cref="HybridCache" /> test double that RECORDS which keys
    /// were routed through it.
    /// <para>
    /// The double intentionally records without storing, and the tests are written so that nothing depends on it
    /// storing: state is seeded directly into the distributed cache, and every exercised path either reads that
    /// seeded state or writes through the distributed cache. A HybridCache-routed write is therefore invisible to
    /// the read path here - which is precisely the production behavior being guarded, since the real library's L2
    /// entry is an envelope the raw read path cannot parse.
    /// </para>
    /// </summary>
    private sealed class HybridCacheRepositoryHarness : IDisposable
    {
        private readonly ServiceProvider serviceProvider;

        private HybridCacheRepositoryHarness(
            ServiceProvider serviceProvider,
            InMemoryTestDistributedCache distributedCache,
            Mock<HybridCache> hybridCache,
            PlatformHybridCacheRepository repository)
        {
            this.serviceProvider = serviceProvider;
            DistributedCache = distributedCache;
            HybridCache = hybridCache;
            Repository = repository;
        }

        public InMemoryTestDistributedCache DistributedCache { get; }

        public Mock<HybridCache> HybridCache { get; }

        public PlatformHybridCacheRepository Repository { get; }

        public void Dispose()
        {
            Repository.Dispose();
            serviceProvider.Dispose();
        }

        /// <summary>Builds a key inside this suite's own collection so nothing collides with other suites.</summary>
        public static PlatformCacheKey Key(string requestKey)
        {
            return new PlatformCacheKey(CachingTestFactory.TestApplicationName, "hybrid-unit-test-collection", requestKey);
        }

        public static HybridCacheRepositoryHarness Create()
        {
            var distributedCache = new InMemoryTestDistributedCache();
            var hybridCache = new Mock<HybridCache>();

            // PlatformHybridCacheRepository.GetDistributedCache() resolves IDistributedCache from the service
            // provider rather than from a constructor argument, so the capturing double has to be registered.
            var serviceProvider = CachingTestFactory.BuildServiceProvider(
                services => services.AddSingleton<IDistributedCache>(distributedCache));

            var repository = CachingTestFactory.CreateHybridRepository(serviceProvider, hybridCache.Object);

            return new HybridCacheRepositoryHarness(serviceProvider, distributedCache, hybridCache, repository);
        }

        /// <summary>
        /// Writes a value straight into the backing store, bypassing the repository. Uses <c>SetRawBytes</c>, which
        /// captures NO <see cref="DistributedCacheEntryOptions" /> - that is what lets a test tell a seeded entry
        /// apart from one the repository genuinely wrote.
        /// </summary>
        public void SeedValue<T>(PlatformCacheKey cacheKey, T value)
        {
            DistributedCache.SetRawBytes(cacheKey.ToString(), PlatformJsonSerializer.SerializeToUtf8Bytes(value));
        }

        /// <summary>Seeds the global cached-keys registry with exactly the supplied keys.</summary>
        public void SeedRegistry(params PlatformCacheKey[] cacheKeys)
        {
            SeedValue(Repository.GetGlobalAllRequestCachedKeysCacheKey(), cacheKeys.ToList());
        }

        public void VerifyWrittenThroughHybridCache(PlatformCacheKey cacheKey, Times times, string because)
        {
            HybridCache.Verify(
                cache => cache.SetAsync(
                    cacheKey.ToString(),
                    It.IsAny<byte[]>(),
                    It.IsAny<HybridCacheEntryOptions>(),
                    It.IsAny<IEnumerable<string>>(),
                    It.IsAny<CancellationToken>()),
                times,
                because);
        }

        public void VerifyRemovedThroughHybridCache(PlatformCacheKey cacheKey, Times times, string because)
        {
            HybridCache.Verify(
                cache => cache.RemoveAsync(cacheKey.ToString(), It.IsAny<CancellationToken>()),
                times,
                because);
        }
    }
}
