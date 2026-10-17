using System.Diagnostics;
using BenchmarkDotNet.Attributes;
using Easy.Platform.Application;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Infrastructures.Caching.BuiltInCacheRepositories;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Easy.Platform.Benchmark;

/// <summary>
/// Measures the existing registry write algorithm with100 live values and increasing stale identity counts.
/// Before/after sweep runs keep those100 values, their128-character payloads and the updated key identical.
/// Raw fixture preload models already expired values without timing O(K²) setup through public SetAsync.
/// This component experiment neither models distributed races nor certifies HTTP capacity.
/// </summary>
[MemoryDiagnoser(false)]
public class CacheRegistryBenchmarkExecutor : IDisposable
{
    private const int LiveValueCount = 100;
    private const string Collection = "working-values";
    private static readonly string Value = new('v', 128);
    private ServiceProvider services = null!;
    private MemoryDistributedCache backingCache = null!;
    private PlatformMemoryCacheRepository repository = null!;
    private PlatformCacheKey updatedKey;

    [Params(1000, 10000, 100000)]
    public int RegistrySize { get; set; }

    [Params(false, true)]
    public bool SweepBeforeWrites { get; set; }

    [GlobalSetup]
    public async Task Setup()
    {
        services = new ServiceCollection().AddSingleton<IConfiguration>(new ConfigurationBuilder().Build()).BuildServiceProvider();
        var settings = new PlatformCacheSettings();
        settings.SlowWarning.IsEnabled = false;
        backingCache = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
        var context = new PlatformApplicationSettingContext(services) { ApplicationName = "CacheRegistryBenchmark" };
        repository = new PlatformMemoryCacheRepository(NullLoggerFactory.Instance, services, settings, context, backingCache);
        var keys = Enumerable.Range(0, RegistrySize).Select(index => new PlatformCacheKey(context.ApplicationName, Collection, $"key-{index:D6}")).ToList();
        updatedKey = keys[0];
        var serializedValue = PlatformJsonSerializer.SerializeToUtf8Bytes(Value);
        foreach (var key in keys.Take(LiveValueCount))
            await backingCache.SetAsync(key, serializedValue, new DistributedCacheEntryOptions());
        await backingCache.SetAsync(repository.GetGlobalAllRequestCachedKeysCacheKey(), PlatformJsonSerializer.SerializeToUtf8Bytes(keys), new DistributedCacheEntryOptions());
        // Create the normal context/collection tag metadata outside the measured operation.
        await repository.SetAsync(updatedKey, Value, PlatformCacheEntryOptions.NeverExpireOptions());
        var before = await Registry();
        if (before.Count(key => key.Collection == Collection) != RegistrySize)
            throw new InvalidOperationException("Registry fixture does not contain the declared working-set identities.");

        double? cleanupMilliseconds = null;
        if (SweepBeforeWrites)
        {
            var stopwatch = Stopwatch.StartNew();
            await repository.ProcessClearDeprecatedGlobalRequestCachedKeys();
            cleanupMilliseconds = stopwatch.Elapsed.TotalMilliseconds;
        }
        var after = await Registry();
        var expectedCount = SweepBeforeWrites ? LiveValueCount : RegistrySize;
        if (after.Count(key => key.Collection == Collection) != expectedCount)
            throw new InvalidOperationException("Cleanup lost live keys or retained stale identities.");
        var raw = await backingCache.GetAsync(repository.GetGlobalAllRequestCachedKeysCacheKey());
        Console.WriteLine("CacheRegistryFixture " + PlatformJsonSerializer.Serialize(new
        {
            RegistrySize, SweepBeforeWrites, LiveValueCount, PayloadCharacters = Value.Length,
            BeforeIdentities = before.Count, AfterIdentities = after.Count, RegistryBytes = raw?.Length,
            CleanupMilliseconds = cleanupMilliseconds,
        }));
    }

    [Benchmark]
    public Task WriteExistingLiveValue() => repository.SetAsync(updatedKey, Value, PlatformCacheEntryOptions.NeverExpireOptions());

    [GlobalCleanup]
    public async Task Cleanup()
    {
        try
        {
            if (await repository.GetAsync<string>(updatedKey) != Value)
                throw new InvalidOperationException("Timed writes did not preserve the live payload.");
            var keys = await Registry();
            if (!keys.Contains(updatedKey) || keys.Count(key => key.Collection == Collection) != (SweepBeforeWrites ? LiveValueCount : RegistrySize))
                throw new InvalidOperationException("Timed writes changed the fixture cardinality.");
        }
        finally
        {
            Dispose();
        }
    }

    public void Dispose()
    {
        repository?.Dispose();
        services?.Dispose();
        GC.SuppressFinalize(this);
    }

    private Task<List<PlatformCacheKey>> Registry() => repository.GetAsync<List<PlatformCacheKey>>(repository.GetGlobalAllRequestCachedKeysCacheKey());
}
