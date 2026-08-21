using System.Collections.Concurrent;
using Easy.Platform.Application;
using Easy.Platform.Common.BackgroundLock;
using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Infrastructures.Caching.BuiltInCacheRepositories;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Easy.Platform.Tests.Unit.Infrastructures.Caching;

/// <summary>
/// Deterministic in-process <see cref="IDistributedCache" /> used as the storage seam for the cache
/// repository unit tests. Every entry lives in this instance only, so tests are parallel-safe and
/// infinitely repeatable - no shared mutable static state, no external infrastructure.
/// </summary>
public sealed class InMemoryTestDistributedCache : IDistributedCache
{
    private readonly ConcurrentDictionary<string, byte[]> store = new(StringComparer.Ordinal);

    /// <summary>
    /// Captures the <see cref="DistributedCacheEntryOptions" /> passed to the most recent Set/SetAsync for each
    /// key - a real <see cref="IDistributedCache" /> discards it into the backing store's own expiry engine, so
    /// this is the only seam from which a test can observe what expiry was actually WRITTEN, as opposed to which
    /// <see cref="PlatformCacheEntryOptions" /> object was merely selected.
    /// </summary>
    private readonly ConcurrentDictionary<string, DistributedCacheEntryOptions> capturedOptions = new(StringComparer.Ordinal);

    public IReadOnlyCollection<string> Keys
    {
        get { return store.Keys.ToList(); }
    }

    /// <summary>Returns the options captured on the most recent Set/SetAsync for the key, or null if never set.</summary>
    public DistributedCacheEntryOptions? GetCapturedOptions(string key)
    {
        return capturedOptions.TryGetValue(key, out var options) ? options : null;
    }

    public byte[]? Get(string key)
    {
        return store.TryGetValue(key, out var value) ? value : null;
    }

    public Task<byte[]?> GetAsync(string key, CancellationToken token = default)
    {
        return Task.FromResult(Get(key));
    }

    public void Refresh(string key)
    {
        // No sliding expiration semantics are needed for these tests.
    }

    public Task RefreshAsync(string key, CancellationToken token = default)
    {
        return Task.CompletedTask;
    }

    public void Remove(string key)
    {
        store.TryRemove(key, out _);
    }

    public Task RemoveAsync(string key, CancellationToken token = default)
    {
        Remove(key);

        return Task.CompletedTask;
    }

    public void Set(string key, byte[] value, DistributedCacheEntryOptions options)
    {
        store[key] = value;
        capturedOptions[key] = options;
    }

    public Task SetAsync(string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token = default)
    {
        Set(key, value, options);

        return Task.CompletedTask;
    }

    public bool ContainsKey(string key)
    {
        return store.ContainsKey(key);
    }

    /// <summary>Writes raw bytes bypassing serialization - used to simulate corrupted cache payloads.</summary>
    public void SetRawBytes(string key, byte[] value)
    {
        store[key] = value;
    }
}

/// <summary>
/// Concrete subclass of the REAL <see cref="PlatformCacheRepository" /> so the abstract class's own
/// logic (get/set/remove/tagging/cache-aside) is exercised end to end against an in-memory store.
/// Only <see cref="PlatformCacheRepository.GetDistributedCache" /> is supplied by the test.
/// </summary>
public abstract class TestCacheRepositoryBase : PlatformCacheRepository
{
    private readonly IDistributedCache distributedCache;

    protected TestCacheRepositoryBase(
        IServiceProvider serviceProvider,
        ILoggerFactory loggerFactory,
        PlatformCacheSettings cacheSettings,
        IPlatformApplicationSettingContext applicationSettingContext,
        IDistributedCache distributedCache) : base(serviceProvider, loggerFactory, cacheSettings, applicationSettingContext)
    {
        this.distributedCache = distributedCache;
    }

    /// <summary>Exposes the protected tag-key builder for assertion.</summary>
    public PlatformCacheKey BuildTagKeyForTest(string tag)
    {
        return BuildTagKey(tag);
    }

    /// <summary>
    /// Exposes the protected <see cref="HybridCache" /> options mapper for DIRECT assertion.
    /// <para>
    /// The mapper is only ever reached in production through <c>PlatformHybridCacheRepository</c>, whose write
    /// hands its output straight to a real <see cref="HybridCache" /> - an object that discards the options into
    /// its own expiry engine, so nothing observable comes back out. Without this seam the mapper's whole
    /// never-expire branch (and the overflow-safe duration it returns) is unobservable, and deleting it changes
    /// no test outcome. This mirrors <see cref="BuildTagKeyForTest" /> rather than introducing a capturing
    /// <see cref="HybridCache" /> double, because the value under test is the mapping itself, not the call.
    /// </para>
    /// </summary>
    public HybridCacheEntryOptions MapToHybridCacheEntryOptionsForTest(PlatformCacheEntryOptions? options)
    {
        return MapToHybridCacheEntryOptions(options);
    }

    protected override IDistributedCache GetDistributedCache()
    {
        return distributedCache;
    }
}

/// <summary>Classifies as <see cref="PlatformCacheRepositoryType.Distributed" />.</summary>
public sealed class TestDistributedCacheRepository : TestCacheRepositoryBase, IPlatformDistributedCacheRepository
{
    public TestDistributedCacheRepository(
        IServiceProvider serviceProvider,
        ILoggerFactory loggerFactory,
        PlatformCacheSettings cacheSettings,
        IPlatformApplicationSettingContext applicationSettingContext,
        IDistributedCache distributedCache) : base(serviceProvider, loggerFactory, cacheSettings, applicationSettingContext, distributedCache)
    {
    }
}

/// <summary>Classifies as <see cref="PlatformCacheRepositoryType.Memory" />.</summary>
public sealed class TestMemoryCacheRepository : TestCacheRepositoryBase, IPlatformMemoryCacheRepository
{
    public TestMemoryCacheRepository(
        IServiceProvider serviceProvider,
        ILoggerFactory loggerFactory,
        PlatformCacheSettings cacheSettings,
        IPlatformApplicationSettingContext applicationSettingContext,
        IDistributedCache distributedCache) : base(serviceProvider, loggerFactory, cacheSettings, applicationSettingContext, distributedCache)
    {
    }
}

/// <summary>
/// Implements BOTH marker interfaces. The provider classifies by the FIRST matching check, so this
/// type must land on Distributed, never Memory.
/// </summary>
public sealed class TestDualClassificationCacheRepository
    : TestCacheRepositoryBase, IPlatformDistributedCacheRepository, IPlatformMemoryCacheRepository
{
    public TestDualClassificationCacheRepository(
        IServiceProvider serviceProvider,
        ILoggerFactory loggerFactory,
        PlatformCacheSettings cacheSettings,
        IPlatformApplicationSettingContext applicationSettingContext,
        IDistributedCache distributedCache) : base(serviceProvider, loggerFactory, cacheSettings, applicationSettingContext, distributedCache)
    {
    }
}

/// <summary>Implements no classification marker at all - the provider must reject it.</summary>
public sealed class TestUnclassifiableCacheRepository : TestCacheRepositoryBase
{
    public TestUnclassifiableCacheRepository(
        IServiceProvider serviceProvider,
        ILoggerFactory loggerFactory,
        PlatformCacheSettings cacheSettings,
        IPlatformApplicationSettingContext applicationSettingContext,
        IDistributedCache distributedCache) : base(serviceProvider, loggerFactory, cacheSettings, applicationSettingContext, distributedCache)
    {
    }
}

/// <summary>
/// A repository whose cache READ always fails. Proves the cache-aside path treats an unreadable cache
/// as a miss instead of propagating the failure to the caller.
/// </summary>
public sealed class TestThrowingGetCacheRepository : TestCacheRepositoryBase
{
    public TestThrowingGetCacheRepository(
        IServiceProvider serviceProvider,
        ILoggerFactory loggerFactory,
        PlatformCacheSettings cacheSettings,
        IPlatformApplicationSettingContext applicationSettingContext,
        IDistributedCache distributedCache) : base(serviceProvider, loggerFactory, cacheSettings, applicationSettingContext, distributedCache)
    {
    }

    public override Task<T> GetAsync<T>(PlatformCacheKey cacheKey, CancellationToken token = default)
    {
        throw new InvalidOperationException("Simulated cache read failure");
    }
}

/// <summary>Collection cache key provider with a fixed context/collection pair for the collection cache tests.</summary>
public sealed class TestCollectionCacheKeyProvider : PlatformCollectionCacheKeyProvider
{
    public const string TestContext = "platform-caching-unit-tests";
    public const string TestCollection = "collection-cache-tests";

    public TestCollectionCacheKeyProvider()
    {
        Context = TestContext;
        Collection = TestCollection;
    }
}

/// <summary>A SECOND provider, used to prove one collection's keys never match another collection's predicate.</summary>
public sealed class OtherTestCollectionCacheKeyProvider : PlatformCollectionCacheKeyProvider
{
    public const string OtherCollection = "other-collection-cache-tests";

    public OtherTestCollectionCacheKeyProvider()
    {
        Context = TestCollectionCacheKeyProvider.TestContext;
        Collection = OtherCollection;
    }
}

/// <summary>
/// A collection provider whose raw Context/Collection deliberately CONTAIN the distributed-cache folder
/// separator. <see cref="PlatformCacheKey" /> sanitises both at key-construction time
/// (<c>AutoFixKeyPartValue</c>), so <c>MatchCollectionKeyPredicate</c> must sanitise its own side of the
/// comparison the same way, or a provider like this one would never match its own stored keys.
/// </summary>
public sealed class SeparatorBearingCollectionCacheKeyProvider : PlatformCollectionCacheKeyProvider
{
    public const string RawContext = "tenant:acme";
    public const string RawCollection = "billing:invoices";

    public SeparatorBearingCollectionCacheKeyProvider()
    {
        Context = RawContext;
        Collection = RawCollection;
    }
}

/// <summary>Shared construction helpers for the caching unit tests.</summary>
public static class CachingTestFactory
{
    public const string TestApplicationName = "PlatformCachingUnitTests";

    /// <summary>
    /// A deliberately NON-NULL sliding-expiration default for the harness settings.
    /// <para>
    /// <see cref="PlatformCacheEntryOptions.UnusedExpirationInSeconds" /> is null by design on a bare
    /// <see cref="PlatformCacheEntryOptions" /> (sliding expiration is opt-in - see TC-PLATREPO-020). If the
    /// harness left the SETTINGS default at that null too, then the settings-default fallback in
    /// <c>MapToDistributedCacheEntryOptions</c> would itself yield null, and every
    /// "NeverExpireOptions() writes NO sliding expiration" assertion would be VACUOUS: replacing the never-expire
    /// branch's <c>SlidingExpiration = null</c> with <c>CacheSettings.DefaultCacheEntryOptions.SlidingExpiration()</c>
    /// would keep them all green, while a real application supplying a non-null sliding default (exactly what
    /// <see cref="PlatformConfigurationCacheEntryOptions" /> exists to do) would give the never-expiring
    /// global-keys registry a sliding expiration - and on a low-traffic service the registry would EXPIRE, which
    /// is the very defect class TC-PLATREPO-093 was written to close.
    /// </para>
    /// <para>
    /// The value is never reached as an actual timeout: <see cref="InMemoryTestDistributedCache" /> stores entries
    /// in a dictionary and runs no expiry engine, so this only ever affects what the tests can OBSERVE about the
    /// options that were written.
    /// </para>
    /// </summary>
    public const double DefaultUnusedExpirationInSeconds = 60;

    /// <summary>
    /// Builds a service provider carrying only what <see cref="PlatformCacheRepository" /> resolves:
    /// the background-action permit pool registry used by the write-behind cache population path.
    /// <para>
    /// The pool is configured to REJECT admission so the queued action runs fail-open immediately via
    /// <c>Task.Run</c> (see <c>Util.TaskRunner.QueueActionInBackground</c>) INSTEAD of waiting on a permit
    /// lease. That removes the pool-admission timing dependency ONLY - the write itself is still genuinely
    /// asynchronous background work, so any assertion that depends on it landing (e.g. cache-aside
    /// write-behind population) must poll for it (<c>Util.TaskRunner.WaitUntilAsync</c>), never assume it is
    /// already done by the time the awaited call returns. A harness disposed before that poll completes would
    /// race the write; keep any such assertion INSIDE the `using` scope, before disposal.
    /// </para>
    /// </summary>
    public static ServiceProvider BuildServiceProvider(Action<IServiceCollection>? configure = null)
    {
        var permitPool = new Mock<IPlatformBackgroundActionPermitPool>();

        permitPool.Setup(p => p.Name).Returns("CacheWrite-Test");
        permitPool.Setup(p => p.AcquireAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((IPlatformBackgroundActionPermitPool.IPermit?)null);

        var registry = new Mock<IPlatformBackgroundActionPermitPoolRegistry>();

        registry.Setup(r => r.Get(It.IsAny<string>())).Returns(permitPool.Object);

        var services = new ServiceCollection();

        services.AddSingleton(registry.Object);

        configure?.Invoke(services);

        return services.BuildServiceProvider();
    }

    public static IPlatformApplicationSettingContext BuildApplicationSettingContext(string applicationName = TestApplicationName)
    {
        var context = new Mock<IPlatformApplicationSettingContext>();

        context.Setup(c => c.ApplicationName).Returns(applicationName);

        return context.Object;
    }

    /// <summary>
    /// Cache settings with slow-warning DISABLED so tests never depend on wall-clock timing, and with a
    /// NON-NULL sliding-expiration default so the never-expire assertions are not vacuous - see
    /// <see cref="DefaultUnusedExpirationInSeconds" />.
    /// </summary>
    public static PlatformCacheSettings BuildCacheSettings()
    {
        var settings = new PlatformCacheSettings();

        settings.SlowWarning.IsEnabled = false;
        settings.DefaultCacheEntryOptions.UnusedExpirationInSeconds = DefaultUnusedExpirationInSeconds;

        return settings;
    }

    public static ILoggerFactory BuildLoggerFactory()
    {
        return NullLoggerFactory.Instance;
    }

    /// <summary>
    /// Builds a test repository through a caller-supplied, statically-typed constructor delegate rather than
    /// <c>Activator.CreateInstance</c> (M5) - a <see cref="TestCacheRepositoryBase" /> ctor signature change is
    /// then caught by the COMPILER at every call site, the same way the sibling type-contract file anchors its
    /// reflection targets (see <c>PlatformRepositoryTypeContractTests.cs:25-26</c>), instead of surfacing as a
    /// runtime <see cref="MissingMethodException" /> in whichever test happens to run first.
    /// <para>
    /// It lives HERE rather than in one test class because every argument it supplies is owned by this factory,
    /// and several suites build the same doubles. Reach for this overload only for a double constructed in ONE
    /// place; the repeatedly-built ones have named wrappers below so their pass-through lambda is written once.
    /// </para>
    /// <para>
    /// <paramref name="cacheSettings" /> and <paramref name="distributedCache" /> exist for harnesses that must
    /// hold the SAME instance they hand to the repository (so they can assert against it); left null, each call
    /// gets a fresh one.
    /// </para>
    /// </summary>
    public static TRepository CreateTestRepository<TRepository>(
        IServiceProvider serviceProvider,
        Func<IServiceProvider, ILoggerFactory, PlatformCacheSettings, IPlatformApplicationSettingContext, IDistributedCache, TRepository> factory,
        PlatformCacheSettings? cacheSettings = null,
        IDistributedCache? distributedCache = null)
        where TRepository : TestCacheRepositoryBase
    {
        return factory(
            serviceProvider,
            BuildLoggerFactory(),
            cacheSettings ?? BuildCacheSettings(),
            BuildApplicationSettingContext(),
            distributedCache ?? new InMemoryTestDistributedCache());
    }

    /// <summary>Named wrapper for the memory double, which several suites build repeatedly.</summary>
    public static TestMemoryCacheRepository CreateMemoryRepository(
        IServiceProvider serviceProvider,
        PlatformCacheSettings? cacheSettings = null,
        IDistributedCache? distributedCache = null)
    {
        return CreateTestRepository<TestMemoryCacheRepository>(
            serviceProvider,
            static (sp, lf, cs, ctx, dc) => new TestMemoryCacheRepository(sp, lf, cs, ctx, dc),
            cacheSettings,
            distributedCache);
    }

    /// <summary>Named wrapper for the distributed double, which several suites build repeatedly.</summary>
    public static TestDistributedCacheRepository CreateDistributedRepository(
        IServiceProvider serviceProvider,
        PlatformCacheSettings? cacheSettings = null,
        IDistributedCache? distributedCache = null)
    {
        return CreateTestRepository<TestDistributedCacheRepository>(
            serviceProvider,
            static (sp, lf, cs, ctx, dc) => new TestDistributedCacheRepository(sp, lf, cs, ctx, dc),
            cacheSettings,
            distributedCache);
    }

    /// <summary>
    /// Builds the REAL <see cref="PlatformHybridCacheRepository" />.
    /// <para>
    /// <paramref name="hybridCache" /> is REQUIRED rather than defaulted to null on purpose. A null is safe only
    /// where the test needs the repository's TYPE and never calls a hybrid-backed operation (the classification
    /// tests); anywhere else it is an NRE waiting for the first such call. Making it an argument the caller must
    /// supply keeps that judgement at the call site, where the test knows which of the two cases it is - a default
    /// would hand the unsafe one out silently.
    /// </para>
    /// </summary>
    public static PlatformHybridCacheRepository CreateHybridRepository(IServiceProvider serviceProvider, HybridCache hybridCache)
    {
        return new PlatformHybridCacheRepository(
            serviceProvider,
            BuildApplicationSettingContext(),
            BuildLoggerFactory(),
            BuildCacheSettings(),
            hybridCache);
    }
}
