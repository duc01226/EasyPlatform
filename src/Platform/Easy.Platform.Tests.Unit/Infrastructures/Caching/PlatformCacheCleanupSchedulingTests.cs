using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Infrastructures.Caching.BuiltInCacheRepositories;
using FluentAssertions;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Internal;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Easy.Platform.Tests.Unit.Infrastructures.Caching;

/// <summary>TC-CACHE-CLEANUP-001..004: every actual cache backend is swept once; raw live invalidation metadata survives.</summary>
public class PlatformCacheCleanupSchedulingTests
{
    [Fact]
    [Trait("TechnicalSpec", "TC-CACHE-CLEANUP-001")]
    public async Task AllBackendsRegistered_SweepsMemoryDistributedAndHybridOnce()
    {
        using var services = CachingTestFactory.BuildServiceProvider();
        var provider = new Mock<IPlatformCacheRepositoryProvider>();
        var repositories = Enum.GetValues<PlatformCacheRepositoryType>().ToDictionary(type => type, _ => new Mock<IPlatformCacheRepository>());
        foreach (var (type, repository) in repositories)
        {
            repository.Setup(value => value.ProcessClearDeprecatedGlobalRequestCachedKeys()).Returns(Task.CompletedTask);
            provider.Setup(value => value.TryGet(type)).Returns(repository.Object);
        }
        using var service = new TestCleanupService(services, provider.Object);

        await service.Sweep();

        foreach (var repository in repositories.Values)
            repository.Verify(value => value.ProcessClearDeprecatedGlobalRequestCachedKeys(), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-CACHE-CLEANUP-002")]
    public async Task MemoryFallbackForEveryType_SweepsTheSharedInstanceOnce()
    {
        using var services = CachingTestFactory.BuildServiceProvider();
        var provider = new Mock<IPlatformCacheRepositoryProvider>();
        var memory = new Mock<IPlatformCacheRepository>();
        memory.Setup(value => value.ProcessClearDeprecatedGlobalRequestCachedKeys()).Returns(Task.CompletedTask);
        provider.Setup(value => value.TryGet(It.IsAny<PlatformCacheRepositoryType>())).Returns(memory.Object);
        using var service = new TestCleanupService(services, provider.Object);

        await service.Sweep();

        memory.Verify(value => value.ProcessClearDeprecatedGlobalRequestCachedKeys(), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-CACHE-CLEANUP-003")]
    public async Task MissingBackend_DoesNotPreventOtherBackendsFromBeingSwept()
    {
        using var services = CachingTestFactory.BuildServiceProvider();
        var provider = new Mock<IPlatformCacheRepositoryProvider>();
        var memory = new Mock<IPlatformCacheRepository>();
        memory.Setup(value => value.ProcessClearDeprecatedGlobalRequestCachedKeys()).Returns(Task.CompletedTask);
        provider.Setup(value => value.TryGet(PlatformCacheRepositoryType.Memory)).Returns(memory.Object);
        using var service = new TestCleanupService(services, provider.Object);

        await service.Sweep();

        memory.Verify(value => value.ProcessClearDeprecatedGlobalRequestCachedKeys(), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-CACHE-CLEANUP-004")]
    public async Task RealMemoryExpiry_SweepRemovesOnlyExpiredIdentitiesAndRetainsLiveInvalidation()
    {
        using var services = CachingTestFactory.BuildServiceProvider();
        var clock = new TestClock();
        var memory = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions { Clock = clock }));
        using var repository = new PlatformMemoryCacheRepository(NullLoggerFactory.Instance, services,
            CachingTestFactory.BuildCacheSettings(), CachingTestFactory.BuildApplicationSettingContext(), memory);
        var expired = new PlatformCacheKey("expiry-contract", "expired", "one");
        var live = new PlatformCacheKey("expiry-contract", "live", "two");
        var tagged = new PlatformCacheKey("expiry-contract", "tagged", "three");
        await repository.SetAsync(expired, "expired-value", new PlatformCacheEntryOptions { AbsoluteExpirationInSeconds = 2 });
        await repository.SetAsync(live, "live-value", PlatformCacheEntryOptions.NeverExpireOptions());
        await repository.SetAsync(tagged, "tagged-value", new PlatformCacheEntryOptions { AbsoluteExpirationInSeconds = 100 }, tags: ["live-tag"]);
        var provider = new Mock<IPlatformCacheRepositoryProvider>();
        provider.Setup(value => value.TryGet(PlatformCacheRepositoryType.Memory)).Returns(repository);
        using var service = new TestCleanupService(services, provider.Object);
        clock.UtcNow = clock.UtcNow.AddSeconds(3);
        (await repository.GetAsync<string>(expired)).Should().BeNull("the real backing cache must enforce expiration before sweeping");
        var before = await repository.GetAsync<List<PlatformCacheKey>>(repository.GetGlobalAllRequestCachedKeysCacheKey());
        before.Should().Contain(expired, "value expiry alone does not prune registry identities");

        await service.Sweep();
        await service.Sweep();

        var after = await repository.GetAsync<List<PlatformCacheKey>>(repository.GetGlobalAllRequestCachedKeysCacheKey());
        after.Should().NotContain(expired);
        after.Should().Contain(live).And.Contain(tagged);
        (await repository.GetAsync<string>(live)).Should().Be("live-value");
        await repository.RemoveByTagsAsync(["live-tag"]);
        (await repository.GetAsync<string>(tagged)).Should().BeNull();
        await repository.RemoveAsync(key => key.Collection == "live");
        (await repository.GetAsync<string>(live)).Should().BeNull();
    }

    private sealed class TestCleanupService(IServiceProvider services, IPlatformCacheRepositoryProvider provider)
        : PlatformAutoClearDeprecatedGlobalRequestCachedKeysBackgroundService(services, NullLoggerFactory.Instance, provider)
    {
        public Task Sweep() => IntervalProcessAsync(CancellationToken.None);
    }

    private sealed class TestClock : ISystemClock
    {
        public DateTimeOffset UtcNow { get; set; } = DateTimeOffset.UtcNow;
    }
}
