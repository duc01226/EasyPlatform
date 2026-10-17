using System.Collections.Concurrent;
using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Tests.Unit.Infrastructures.Caching;

/// <summary>
/// Technical contract TC-CACHE-REGISTRATION-001: overwriting a registered value avoids redundant
/// metadata persistence while preserving backing-store recovery, invalidation and derived hooks.
/// </summary>
public class PlatformCacheRegistryRegistrationTests : PlatformUnitTestBase
{
    [Fact]
    [Trait("TechnicalSpec", "TC-CACHE-REGISTRATION-001")]
    public async Task ExistingRegistration_UpdatesPayloadAndTagsWithoutRewritingRegistry()
    {
        using var services = CachingTestFactory.BuildServiceProvider();
        var cache = new CountingCache();
        using var repository = new PlainRepository(services, cache);
        var key = Key("overwrite");
        await repository.SetAsync(key, "before", cacheOptions: null, tags: ["new-tag"]);
        var registry = repository.GetGlobalAllRequestCachedKeysCacheKey().ToString();
        var writes = cache.Writes(registry);
        var reads = cache.Reads(registry);

        await repository.SetAsync(key, "after", cacheOptions: null, tags: ["new-tag"]);

        (await repository.GetAsync<string>(key)).Should().Be("after");
        cache.Writes(registry).Should().Be(writes);
        cache.Reads(registry).Should().Be(reads + 1, "membership must be re-read from the backing store");
        (await repository.GetTaggedKeys("new-tag", CancellationToken.None)).Should().Contain(key);
        await repository.RemoveByTagsAsync(["new-tag"]);
        (await repository.GetAsync<string>(key)).Should().BeNull("overwrite still associates invalidation tags");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-CACHE-REGISTRATION-001")]
    public async Task MissingRegistry_IsRebuiltOnOverwriteWithNeverExpireOptions()
    {
        using var services = CachingTestFactory.BuildServiceProvider();
        var cache = new CountingCache();
        using var repository = new PlainRepository(services, cache);
        var key = Key("registry-loss");
        await repository.SetAsync(key, "before", cacheOptions: null);
        var registryKey = repository.GetGlobalAllRequestCachedKeysCacheKey();
        var registry = registryKey.ToString();
        (await repository.GetAsync<List<PlatformCacheKey>>(registryKey)).Should().Contain(key);
        await cache.RemoveAsync(registry);
        var writes = cache.Writes(registry);
        var reads = cache.Reads(registry);

        await repository.SetAsync(key, "after", cacheOptions: null);

        cache.Reads(registry).Should().Be(reads + 1);
        cache.Writes(registry).Should().Be(writes + 1);
        (await repository.GetAsync<List<PlatformCacheKey>>(registryKey)).Should().Contain(key);
        var options = cache.Inner.GetCapturedOptions(registry);
        options.Should().NotBeNull();
        options!.AbsoluteExpirationRelativeToNow.Should().BeNull();
        options.SlidingExpiration.Should().BeNull();
        await repository.RemoveAsync(candidate => candidate == key);
        (await repository.GetAsync<string>(key)).Should().BeNull();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-CACHE-REGISTRATION-001")]
    public async Task OtherInstanceRegistration_RemainsVisibleDuringOverwriteAndPredicateInvalidation()
    {
        using var services = CachingTestFactory.BuildServiceProvider();
        var cache = new CountingCache();
        using var first = new PlainRepository(services, cache);
        using var second = new PlainRepository(services, cache);
        var firstKey = Key("first");
        var secondKey = Key("second");
        await first.SetAsync(firstKey, "first-before", cacheOptions: null);
        await second.SetAsync(secondKey, "second-value", cacheOptions: null);
        var registry = first.GetGlobalAllRequestCachedKeysCacheKey();
        (await first.GetAsync<List<PlatformCacheKey>>(registry)).Should().Contain([firstKey, secondKey]);
        var writes = cache.Writes(registry.ToString());

        await first.SetAsync(firstKey, "first-after", cacheOptions: null);

        cache.Writes(registry.ToString()).Should().Be(writes);
        await first.RemoveAsync(candidate => candidate == secondKey);
        (await second.GetAsync<string>(secondKey)).Should().BeNull();
        (await first.GetAsync<string>(firstKey)).Should().Be("first-after");
        (await first.GetAsync<List<PlatformCacheKey>>(registry)).Should().Contain(firstKey).And.NotContain(secondKey);
    }

    [Theory]
    [InlineData(1, 1)]
    [InlineData(2, 1)]
    [InlineData(3, 0)]
    [InlineData(4, 0)]
    [Trait("TechnicalSpec", "TC-CACHE-REGISTRATION-001")]
    public async Task DerivedMutationDeclarations_PreserveOriginalVirtualDispatchAndRegistryRewrite(int kind, int expectedCalls)
    {
        using var services = CachingTestFactory.BuildServiceProvider();
        var cache = new CountingCache();
        using PlainRepository repository = kind switch
        {
            1 => new UpdateOverrideRepository(services, cache),
            2 => new SetOverrideRepository(services, cache),
            3 => new UpdateHidingRepository(services, cache),
            4 => new SetHidingRepository(services, cache),
            _ => throw new ArgumentOutOfRangeException(nameof(kind))
        };
        var key = Key("derived");
        await repository.SetAsync(key, "before", cacheOptions: null);
        var initialCalls = repository.HookCalls;
        var registry = repository.GetGlobalAllRequestCachedKeysCacheKey().ToString();
        var writes = cache.Writes(registry);

        await repository.SetAsync(key, "after", cacheOptions: null);

        repository.HookCalls.Should().Be(initialCalls + expectedCalls);
        cache.Writes(registry).Should().Be(writes + 1, "derived mutation declarations retain the original persistence path");
        (await repository.GetAsync<string>(key)).Should().Be("after");
    }

    private static PlatformCacheKey Key(string request) => new("registry-registration", "values", request);

    private class PlainRepository(IServiceProvider services, IDistributedCache cache) : TestCacheRepositoryBase(
        services, CachingTestFactory.BuildLoggerFactory(), CachingTestFactory.BuildCacheSettings(),
        CachingTestFactory.BuildApplicationSettingContext(), cache)
    {
        public int HookCalls { get; protected set; }
    }

    private sealed class UpdateOverrideRepository(IServiceProvider services, IDistributedCache cache) : PlainRepository(services, cache)
    {
        protected override Task UpdateGlobalCachedKeys(Action<ConcurrentDictionary<PlatformCacheKey, object>> updateCachedKeysAction)
        {
            HookCalls++;
            return base.UpdateGlobalCachedKeys(updateCachedKeysAction);
        }
    }

    private sealed class SetOverrideRepository(IServiceProvider services, IDistributedCache cache) : PlainRepository(services, cache)
    {
        protected override Task SetGlobalCachedKeysAsync(Func<ConcurrentDictionary<PlatformCacheKey, object>, Task> modifyGlobalCachedKeysFunc)
        {
            HookCalls++;
            return base.SetGlobalCachedKeysAsync(modifyGlobalCachedKeysFunc);
        }
    }

    private sealed class UpdateHidingRepository(IServiceProvider services, IDistributedCache cache) : PlainRepository(services, cache)
    {
        public new Task UpdateGlobalCachedKeys(Action<ConcurrentDictionary<PlatformCacheKey, object>> updateCachedKeysAction)
        {
            HookCalls++;
            return base.UpdateGlobalCachedKeys(updateCachedKeysAction);
        }
    }

    private sealed class SetHidingRepository(IServiceProvider services, IDistributedCache cache) : PlainRepository(services, cache)
    {
        public new Task SetGlobalCachedKeysAsync(Func<ConcurrentDictionary<PlatformCacheKey, object>, Task> modifyGlobalCachedKeysFunc)
        {
            HookCalls++;
            return base.SetGlobalCachedKeysAsync(modifyGlobalCachedKeysFunc);
        }
    }

    private sealed class CountingCache : IDistributedCache
    {
        private readonly ConcurrentDictionary<string, int> reads = new();
        private readonly ConcurrentDictionary<string, int> writes = new();
        public InMemoryTestDistributedCache Inner { get; } = new();
        public int Reads(string key) => reads.GetValueOrDefault(key);
        public int Writes(string key) => writes.GetValueOrDefault(key);
        public byte[]? Get(string key)
        {
            reads.AddOrUpdate(key, 1, (_, count) => count + 1);
            return Inner.Get(key);
        }
        public Task<byte[]?> GetAsync(string key, CancellationToken token = default) => Task.FromResult(Get(key));
        public void Set(string key, byte[] value, DistributedCacheEntryOptions options)
        {
            writes.AddOrUpdate(key, 1, (_, count) => count + 1);
            Inner.Set(key, value, options);
        }
        public Task SetAsync(string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token = default)
        {
            Set(key, value, options);
            return Task.CompletedTask;
        }
        public void Refresh(string key) => Inner.Refresh(key);
        public Task RefreshAsync(string key, CancellationToken token = default) => Inner.RefreshAsync(key, token);
        public void Remove(string key) => Inner.Remove(key);
        public Task RemoveAsync(string key, CancellationToken token = default) => Inner.RemoveAsync(key, token);
    }
}
