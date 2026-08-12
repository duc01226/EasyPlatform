using Easy.Platform.MongoDB.Mapping;
using Easy.Platform.MongoDB.Utils;
using FluentAssertions;
using MongoDB.Bson.Serialization;

namespace Easy.Platform.Tests.Unit.MongoDB;

/// <summary>
/// Guards the invariant behind <c>PlatformMongoDbPersistenceModuleCache.RegistrationLock</c>: a class map is registered
/// EXACTLY ONCE even when several threads reach the same registration entry point together.
/// <para />
/// The business intent protected here is startup survivability, not bookkeeping tidiness.
/// <see cref="BsonClassMap.IsClassMapRegistered" /> and <see cref="BsonClassMap.RegisterClassMap{TClass}(Action{BsonClassMap{TClass}})" />
/// are two separate operations against a process-global registry that REJECTS duplicates, so an unguarded check-then-act
/// lets two callers both observe "not registered" and the loser throws
/// <c>ArgumentException: An item with the same key has already been added</c> — taking the whole host down at startup.
/// Remove the lock from either entry point and <c>Concurrent_*</c> below starts throwing.
/// <para />
/// Every test uses its OWN throwaway entity type: the driver's registry is process-global and append-only, so sharing a
/// type across tests would make them order-dependent.
/// </summary>
public class PlatformMongoClassMapRegistrationConcurrencyTests
{
    private const int ConcurrentCallerCount = 32;

    [Fact]
    public void RegisterClassMapIfNotRegistered_CalledTwiceSequentially_RegistersOnceAndDoesNotThrow()
    {
        var act = () =>
        {
            PlatformMongoClassMapping.RegisterClassMapIfNotRegistered<SequentialEntity>(cm => cm.AutoMap());
            PlatformMongoClassMapping.RegisterClassMapIfNotRegistered<SequentialEntity>(cm => cm.AutoMap());
        };

        act.Should().NotThrow();
        BsonClassMap.IsClassMapRegistered(typeof(SequentialEntity)).Should().BeTrue();
    }

    [Fact]
    public void RegisterClassMapIfNotRegistered_ConcurrentCallersForSameType_RegistersOnceAndDoesNotThrow()
    {
        AssertRegistersExactlyOnceUnderConcurrency<ConcurrentClassMapEntity>(
            () => PlatformMongoClassMapping.RegisterClassMapIfNotRegistered<ConcurrentClassMapEntity>(cm => cm.AutoMap()));
    }

    [Fact]
    public void TryRegisterClassMap_ConcurrentCallersForSameType_RegistersOnceAndDoesNotThrow()
    {
        AssertRegistersExactlyOnceUnderConcurrency<ConcurrentUtilEntity>(
            () => BsonClassMapUtil.TryRegisterClassMap<ConcurrentUtilEntity>(cm => cm.AutoMap()));
    }

    /// <summary>
    /// Releases all callers from a <see cref="Barrier" /> so they hit the check-then-act in the same instant — without the
    /// rendezvous the threads would naturally stagger and an unguarded implementation would usually pass by luck.
    /// </summary>
    private static void AssertRegistersExactlyOnceUnderConcurrency<TEntity>(Action register)
    {
        BsonClassMap.IsClassMapRegistered(typeof(TEntity))
            .Should()
            .BeFalse("the test owns this throwaway type, so nothing may have registered it before the race starts");

        using var startTogether = new Barrier(ConcurrentCallerCount);

        var callers = Enumerable.Range(0, ConcurrentCallerCount)
            .Select(_ => Task.Factory.StartNew(
                () =>
                {
                    startTogether.SignalAndWait();
                    register();
                },
                TaskCreationOptions.LongRunning))
            .ToArray();

        // Aggregates every thread's failure instead of surfacing only the first, so a genuine race reports its real shape.
        var act = () => Task.WaitAll(callers);

        act.Should().NotThrow();
        BsonClassMap.IsClassMapRegistered(typeof(TEntity)).Should().BeTrue();
        BsonClassMap.GetRegisteredClassMaps()
            .Count(classMap => classMap.ClassType == typeof(TEntity))
            .Should()
            .Be(1);
    }

    private sealed class SequentialEntity
    {
        public string Id { get; set; }
    }

    private sealed class ConcurrentClassMapEntity
    {
        public string Id { get; set; }
    }

    private sealed class ConcurrentUtilEntity
    {
        public string Id { get; set; }
    }
}
