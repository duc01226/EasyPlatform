using System.Collections.Concurrent;
using System.Reflection;
using Easy.Platform.MongoDB;
using Easy.Platform.MongoDB.Serializer.Providers;
using FluentAssertions;
using MongoDB.Bson.Serialization;

namespace Easy.Platform.Tests.Unit.MongoDB;

/// <summary>
/// Guards the invariant behind <see cref="PlatformMongoDbPersistenceModuleCache.EnsureHybridEnumSerializationProviderRegistered" />:
/// the hybrid enum provider reaches the driver's provider chain AT MOST ONCE per process, no matter how many modules opt in
/// via <c>SupportHybridEnumSerialization</c> or how many threads arrive together.
/// <para />
/// The business intent is bounded serializer-resolution cost. <see cref="BsonSerializer.RegisterSerializationProvider" />
/// PUSHES onto a stack and never rejects a duplicate, so an unguarded call site fails silently rather than loudly: the chain
/// simply grows, and every extra copy is consulted (returning <c>null</c>) on each cache-miss lookup for a NON-enum type
/// before the driver's own defaults are reached. Remove the guard and <c>Concurrent_*</c> below sees a chain of N.
/// <para />
/// These tests deliberately share one process-global registration — the provider chain cannot be unregistered — so they
/// assert DELTA against a snapshot taken at entry instead of an absolute count, and stay correct whatever ran first.
/// </summary>
[Collection(nameof(PlatformHybridEnumSerializationProviderRegistrationTests))]
[CollectionDefinition(nameof(PlatformHybridEnumSerializationProviderRegistrationTests), DisableParallelization = true)]
public class PlatformHybridEnumSerializationProviderRegistrationTests
{
    private const int ConcurrentCallerCount = 32;

    [Fact]
    public void EnsureRegistered_ConcurrentCallers_AddsProviderToDriverChainExactlyOnce()
    {
        var providerCountBefore = CountHybridProvidersOnDriverChain();
        var alreadyRegistered = PlatformMongoDbPersistenceModuleCache.RegisteredHybridEnumSerializationProvider;

        using var startTogether = new Barrier(ConcurrentCallerCount);

        var callers = Enumerable.Range(0, ConcurrentCallerCount)
            .Select(_ => Task.Factory.StartNew(
                () =>
                {
                    startTogether.SignalAndWait();

                    return PlatformMongoDbPersistenceModuleCache.EnsureHybridEnumSerializationProviderRegistered();
                },
                TaskCreationOptions.LongRunning))
            .ToArray();

        var act = () => Task.WaitAll(callers);
        act.Should().NotThrow();

        // Exactly one caller may claim the registration — and only when nothing had registered it yet.
        callers.Count(caller => caller.Result).Should().Be(alreadyRegistered ? 0 : 1);

        PlatformMongoDbPersistenceModuleCache.RegisteredHybridEnumSerializationProvider.Should().BeTrue();

        // The real assertion: the DRIVER's chain grew by one at most, never by ConcurrentCallerCount.
        CountHybridProvidersOnDriverChain()
            .Should()
            .Be(alreadyRegistered ? providerCountBefore : providerCountBefore + 1);
    }

    [Fact]
    public void EnsureRegistered_CalledAgainAfterRegistration_IsANoOpAndLeavesChainUnchanged()
    {
        PlatformMongoDbPersistenceModuleCache.EnsureHybridEnumSerializationProviderRegistered();

        var providerCountAfterFirst = CountHybridProvidersOnDriverChain();

        PlatformMongoDbPersistenceModuleCache.EnsureHybridEnumSerializationProviderRegistered()
            .Should()
            .BeFalse("the provider is already on the chain, so a second call must claim nothing");

        CountHybridProvidersOnDriverChain().Should().Be(providerCountAfterFirst);
    }

    /// <summary>
    /// Reads the driver's provider stack reflectively — <see cref="BsonSerializer" /> exposes no way to enumerate it, and
    /// counting the real chain is the only assertion that would actually catch unbounded growth. Asserting our own flag
    /// instead would just be testing the flag against itself.
    /// </summary>
    private static int CountHybridProvidersOnDriverChain()
    {
        var registry = BsonSerializer.SerializerRegistry;

        var providersField = registry.GetType()
                                 .GetField("_serializationProviders", BindingFlags.Instance | BindingFlags.NonPublic)
                             ?? throw new InvalidOperationException(
                                 $"MongoDB driver changed shape: no '_serializationProviders' field on {registry.GetType().FullName}. " +
                                 "Update this probe — do NOT weaken the assertion to keep the test green.");

        var providers = (ConcurrentStack<IBsonSerializationProvider>)providersField.GetValue(registry);

        return providers!.Count(provider => provider is PlatformHybridEnumSerializationProvider);
    }
}
