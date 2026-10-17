#region

using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Common;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.MongoDB.Domain.Repositories;
using Easy.Platform.MongoDB.Domain.UnitOfWork;
using Easy.Platform.MongoDB.Helpers;
using Easy.Platform.MongoDB.Mapping;
using Easy.Platform.MongoDB.Migration;
using Easy.Platform.MongoDB.Serializer.Abstract;
using Easy.Platform.MongoDB.Serializer.Providers;
using Easy.Platform.MongoDB.Services;
using Easy.Platform.Persistence;
using Easy.Platform.Persistence.DataMigration;
using Easy.Platform.Persistence.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using MongoDB.Bson.Serialization;
using MongoDB.Driver.Core.Extensions.DiagnosticSources;
using OpenTelemetry.Trace;

#endregion

namespace Easy.Platform.MongoDB;

/// <summary>
///     <inheritdoc cref="PlatformPersistenceModule{TDbContext}" />
/// </summary>
public abstract class PlatformMongoDbPersistenceModule<TDbContext, TClientContext, TMongoOptions> : PlatformPersistenceModule<TDbContext>
    where TDbContext : PlatformMongoDbContext<TDbContext>
    where TClientContext : class, IPlatformMongoClient<TDbContext>
    where TMongoOptions : PlatformMongoOptions<TDbContext>
{
    /// <summary>
    /// Default maximum connection pool size for MongoDB drivers.
    /// Shadows <see cref="PlatformPersistenceModule.DefaultRecommendedMaxPoolSize"/> with a higher value
    /// because MongoDB connections are lighter than PostgreSQL (no server-side process per connection).
    /// </summary>
    /// <remarks>
    /// MongoDB driver default is 100. Formula: <c>Max(ProcessorCount * 25, 100)</c>.
    /// Floor of 100 ensures we never fall below MongoDB's own default (the previous *4 multiplier
    /// undershot the default on machines with fewer than 25 cores — typical for containers/VMs).
    /// The *25 multiplier reflects that async MongoDB operations are short-lived (~1-5ms),
    /// so each core can sustain many concurrent in-flight operations without blocking.
    /// Override per-environment via appsettings "Mongo:MaxConnectionPoolSize"
    /// or MongoDB connection string <c>maxPoolSize=N</c>.
    /// </remarks>
    public static new readonly int DefaultRecommendedMaxPoolSize = Math.Max(PlatformEnvironment.EffectiveProcessorCount * 25, 100);

    public PlatformMongoDbPersistenceModule(
        IServiceProvider serviceProvider,
        IConfiguration configuration) : base(serviceProvider, configuration)
    {
    }

    /// <summary>
    /// Gets the recommended maximum connection pool size for MongoDB.
    /// </summary>
    /// <remarks>
    /// Reads "Mongo:MaxConnectionPoolSize" from configuration,
    /// falling back to <see cref="DefaultRecommendedMaxPoolSize"/> (Max(ProcessorCount * 25, 100)).
    /// </remarks>
    protected override int GetRecommendedMaxPoolSize()
    {
        return Configuration.GetValue<int?>("Mongo:MaxConnectionPoolSize")
               ?? DefaultRecommendedMaxPoolSize;
    }

    /// <summary>
    /// Max-connecting per CPU, following the platform convention <c>Max(EffectiveProcessorCount * ratio, floor)</c>
    /// used by <see cref="DefaultRecommendedMaxPoolSize" /> (ratio 25) and <c>Util.TaskRunner</c> (I/O 10, compute 2).
    /// </summary>
    /// <remarks>
    /// Ratio 2 is chosen AGAINST the pool's ratio of 25 so the pair scales together and cold-pool warm time stays
    /// CONSTANT at <c>25 / 2 ≈ 12.5</c> handshakes on every machine size — roughly 0.25-0.5s at a realistic 20-40ms
    /// handshake (TCP + TLS + SCRAM). Because both sides derive from the same processor count, overriding neither
    /// nor scaling the host can silently un-pair them.
    /// </remarks>
    public const int DefaultNumberOfMaxConnectingPerCpuRatio = 2;

    /// <summary>
    /// Floor, paired with <see cref="DefaultRecommendedMaxPoolSize" />'s floor of 100 at the same ~12.5 ratio.
    /// Load-bearing in Development: <c>PlatformEnvironment.EffectiveProcessorCount</c> is CAPPED AT 4 there, so the
    /// CPU term alone would yield 8 on a 4-core cap and as little as 2-4 on a constrained container — i.e. barely
    /// above the driver default that caused the wait-queue overflow this setting exists to prevent.
    /// </summary>
    public const int MinRecommendedMaxConnecting = 8;

    /// <summary>
    /// Static counterpart of <see cref="GetRecommendedMaxConnecting" /> for callers with no module instance
    /// (e.g. Hangfire storage setup). Prefer the instance method, which honours per-environment configuration.
    /// </summary>
    public static readonly int DefaultRecommendedMaxConnecting =
        Math.Max(PlatformEnvironment.EffectiveProcessorCount * DefaultNumberOfMaxConnectingPerCpuRatio, MinRecommendedMaxConnecting);

    /// <summary>
    /// Gets the recommended MongoDB <c>maxConnecting</c> — the cap on connections being ESTABLISHED concurrently.
    /// This is NOT a pool size: it throttles handshakes, it does not bound how many connections may exist.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Reads "Mongo:MaxConnecting" from configuration, falling back to <see cref="DefaultRecommendedMaxConnecting" />
    /// (<c>Max(EffectiveProcessorCount * 2, 8)</c>) — same shape as <see cref="GetRecommendedMaxPoolSize" />.
    /// </para>
    /// <para>
    /// <strong>Why the driver default of 2 is not enough here.</strong> That default comes from MongoDB's CMAP spec and is
    /// identical across all official drivers. It is deliberately conservative: it prevents a connection storm when a pool is
    /// cold — server restart, failover, deploy, traffic spike — because each new connection costs a TCP handshake, optionally
    /// TLS, plus multi-round-trip SCRAM auth that is expensive ON THE SERVER, exactly when it is least able to absorb it.
    /// But 2 is only safe when the pool it feeds is small. Pairing <c>maxConnecting: 2</c> with a 100-500 connection pool is
    /// incoherent: warming that pool two-at-a-time takes seconds, during which every operation queues and the wait queue
    /// overflows (<c>MongoWaitQueueFullException</c>) — the pool never gets a chance to fill.
    /// </para>
    /// <para>
    /// <strong>This is NOT a pool size.</strong> It throttles the RATE of connection establishment; it does not bound how
    /// many connections may exist. Keep it far below the pool size — the two are paired via their CPU ratios (2 vs 25), so
    /// warm time stays constant rather than drifting as either side is tuned.
    /// </para>
    /// <para>
    /// <strong>Blast-radius caveat.</strong> Concurrent handshakes against one server total <c>processCount * maxConnecting</c>,
    /// and a client cannot know the fleet size. On a large fleet sharing one cluster, set "Mongo:MaxConnecting" explicitly
    /// per environment rather than relying on this CPU-derived default.
    /// </para>
    /// <para>
    /// NOT applied automatically by the platform — each persistence module opts in explicitly, so raising the throttle
    /// against a shared database is always a visible, per-service decision rather than a silent framework default.
    /// </para>
    /// </remarks>
    protected virtual int GetRecommendedMaxConnecting()
    {
        return Configuration.GetValue<int?>("Mongo:MaxConnecting")
               ?? DefaultRecommendedMaxConnecting;
    }

    /// <summary>
    /// Gets a value indicating whether hybrid enum serialization is supported by this implementation.
    /// </summary>
    /// <remarks>Hybrid enum serialization allows enums to be serialized using both their numeric and string
    /// representations, improving compatibility across different consumers. Override this property in derived classes
    /// to enable hybrid serialization if supported.</remarks>
    public virtual bool SupportHybridEnumSerialization => false;

    public override Action<TracerProviderBuilder> AdditionalTracingSetup =>
        builder => builder.AddSource(typeof(DiagnosticsActivityEventSubscriber).Assembly.GetName().Name!);

    public static void RegisterClassMapType(Type platformMongoClassMapType)
    {
        // Locked so the contains-check and the RegisterClassMap() it guards are ONE atomic step. Unlocked, two modules
        // registering concurrently in the same process (parallel test collections, or any multi-DbContext startup) can both
        // observe "not registered" and both call through to BsonClassMap.RegisterClassMap, whose static registry throws
        // ArgumentException on the duplicate key instead of ignoring it.
        lock (PlatformMongoDbPersistenceModuleCache.RegistrationLock)
        {
            if (PlatformMongoDbPersistenceModuleCache.RegisteredClassMapTypes.NotContains(platformMongoClassMapType))
            {
                Activator.CreateInstance(platformMongoClassMapType).As<IPlatformMongoClassMapping>().RegisterClassMap();
                PlatformMongoDbPersistenceModuleCache.RegisteredClassMapTypes.Add(platformMongoClassMapType);
            }
        }
    }

    protected abstract void ConfigureMongoOptions(PlatformMongoOptions<TDbContext> options);

    protected void ExecuteConfigureMongoOptions(PlatformMongoOptions<TDbContext> options)
    {
        ConfigureMongoOptions(options);
        if (ForCrossDbMigrationOnly) options.MinConnectionPoolSize = 0;
    }

    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);

        // Register navigation property BSON ignore convention
        Conventions.PlatformMongoNavigationConventionRegistration.EnsureRegistered();

        serviceCollection.RegisterAllForImplementation<TDbContext>(ServiceLifeTime.Transient);
        serviceCollection.Configure<TMongoOptions>(ExecuteConfigureMongoOptions);
        serviceCollection.Configure<PlatformMongoOptions<TDbContext>>(ExecuteConfigureMongoOptions);

        serviceCollection.RegisterAllForImplementation<TClientContext>(ServiceLifeTime.Singleton);
        serviceCollection.Register<IPlatformMongoClient<TDbContext>>(sp => sp.GetRequiredService<TClientContext>(), ServiceLifeTime.Singleton);
        serviceCollection.Register(
            typeof(IPlatformMongoDatabase<TDbContext>),
            sp => new PlatformMongoDatabase<TDbContext>(
                sp.GetRequiredService<IPlatformMongoClient<TDbContext>>()
                    .MongoClient.GetDatabase(sp.GetRequiredService<IOptions<PlatformMongoOptions<TDbContext>>>().Value.Database)),
            ServiceLifeTime.Singleton);

        serviceCollection.Register<PlatformMongoDbContext<TDbContext>, TDbContext>();

        if (!ForCrossDbMigrationOnly) RegisterMongoDbUow(serviceCollection);

        BsonClassMapHelper.TryRegisterClassMapWithDefaultInitializer<PlatformDataMigrationHistory>();
        BsonClassMapHelper.TryRegisterClassMapWithDefaultInitializer<PlatformMongoMigrationHistory>();
        AutoRegisterAllSerializers();
        AutoRegisterAllClassMap();

        if (!ForCrossDbMigrationOnly || serviceCollection.All(p => p.ServiceType != typeof(IPlatformFullTextSearchPersistenceService)))
            serviceCollection.Register<IPlatformFullTextSearchPersistenceService>(FullTextSearchPersistenceServiceProvider);

        RegisterMessageBusStoreContribution(
            serviceCollection,
            ForCrossDbMigrationOnly ? null : typeof(IPlatformMongoDbPersistenceUnitOfWork<TDbContext>));
    }

    /// <summary>
    /// Default return <see cref="MongoDbPlatformFullTextSearchPersistenceService" />
    /// Override the default instance with new class to NOT USE DEFAULT LIKE OPERATION FOR BETTER PERFORMANCE
    /// </summary>
    /// <param name="serviceProvider"></param>
    /// <returns></returns>
    protected virtual MongoDbPlatformFullTextSearchPersistenceService FullTextSearchPersistenceServiceProvider(IServiceProvider serviceProvider)
    {
        return new MongoDbPlatformFullTextSearchPersistenceService(serviceProvider);
    }

    protected virtual void AutoRegisterAllClassMap()
    {
        AllClassMapTypes().ForEach(RegisterClassMapType);
    }

    protected virtual void AutoRegisterAllSerializers()
    {
        var allSerializerTypes = GetType()
            .Assembly.GetTypes()
            .Where(p => p.IsAssignableToGenericType(typeof(IPlatformMongoAutoRegisterBaseSerializer<>)) &&
                        p.IsClass &&
                        !p.IsAbstract)
            .ToList();
        var allBuiltInSerializerTypes = typeof(PlatformMongoDbPersistenceModule<>).Assembly.GetTypes()
            .Where(p => p.IsAssignableToGenericType(typeof(IPlatformMongoAutoRegisterBaseSerializer<>)) &&
                        p.IsClass &&
                        !p.IsAbstract)
            .ToList();

        allSerializerTypes.Concat(allBuiltInSerializerTypes)
            .ToList()
            .ForEach(p =>
            {
                var serializerHandleValueType = p.GetInterfaces()
                    .First(p => p.IsAssignableToGenericType(typeof(IPlatformMongoAutoRegisterBaseSerializer<>)))
                    .GetGenericArguments()[0];

                // Same atomicity requirement as RegisterClassMapType: BsonSerializer's static registry rejects a second
                // registration for a value type (BsonSerializationException "There is already a serializer registered for
                // type X"), so the check and the RegisterSerializer call must not be separable by another thread.
                lock (PlatformMongoDbPersistenceModuleCache.RegistrationLock)
                {
                    if (!PlatformMongoDbPersistenceModuleCache.RegisteredSerializerTypes.Contains(serializerHandleValueType))
                    {
                        BsonSerializer.RegisterSerializer(
                            serializerHandleValueType,
                            (IPlatformMongoBaseSerializer)Activator.CreateInstance(p));

                        PlatformMongoDbPersistenceModuleCache.RegisteredSerializerTypes.Add(serializerHandleValueType);
                    }
                }
            });

        // Lives on the non-generic cache class, per this file's own rationale for that class: static state on a generic
        // class is per-closed-generic, and "at most once PER PROCESS" must not fragment per TDbContext.
        if (SupportHybridEnumSerialization) PlatformMongoDbPersistenceModuleCache.EnsureHybridEnumSerializationProviderRegistered();
    }

    protected override void RegisterInboxEventBusMessageRepository(IServiceCollection serviceCollection)
    {
        if (!IsInboxBusMessageEnabled())
            return;

        base.RegisterInboxEventBusMessageRepository(serviceCollection);

        // Register Default InboxBusMessageRepository if not existed custom inherited IPlatformInboxBusMessageRepository in assembly
        if (serviceCollection.All(p => p.ServiceType != typeof(IPlatformInboxBusMessageRepository<TDbContext>)))
        {
            serviceCollection.RegisterAllForImplementation<PlatformDefaultMongoDbInboxBusMessageRepository<TDbContext>>();
            serviceCollection.Register<IPlatformInboxBusMessageRepository, PlatformDefaultMongoDbInboxBusMessageRepository<TDbContext>>();
            serviceCollection.Register<IPlatformInboxBusMessageRepository<TDbContext>, PlatformDefaultMongoDbInboxBusMessageRepository<TDbContext>>();
        }

        // Register Default MongoInboxBusMessageClassMapping if not existed custom inherited PlatformMongoInboxBusMessageClassMapping in assembly
        if (!AllClassMapTypes().Any(p => p.IsAssignableTo(typeof(PlatformMongoInboxBusMessageClassMapping))))
            RegisterClassMapType(typeof(PlatformDefaultMongoInboxBusMessageClassMapping));
    }

    protected override void RegisterOutboxEventBusMessageRepository(IServiceCollection serviceCollection)
    {
        if (!IsOutboxBusMessageEnabled())
            return;

        base.RegisterOutboxEventBusMessageRepository(serviceCollection);

        // Register Default OutboxEventBusMessageRepository if not existed custom inherited IPlatformOutboxEventBusMessageRepository in assembly
        if (serviceCollection.All(p => p.ServiceType != typeof(IPlatformOutboxBusMessageRepository<TDbContext>)))
        {
            serviceCollection.RegisterAllForImplementation<PlatformDefaultMongoDbOutboxBusMessageRepository<TDbContext>>();
            serviceCollection.Register<IPlatformOutboxBusMessageRepository, PlatformDefaultMongoDbOutboxBusMessageRepository<TDbContext>>();
            serviceCollection.Register<IPlatformOutboxBusMessageRepository<TDbContext>, PlatformDefaultMongoDbOutboxBusMessageRepository<TDbContext>>();
        }

        // Register Default MongoOutboxBusMessageClassMapping if not existed custom inherited PlatformMongoOutboxBusMessageClassMapping in assembly
        if (!AllClassMapTypes().Any(p => p.IsAssignableTo(typeof(PlatformMongoOutboxBusMessageClassMapping))))
            RegisterClassMapType(typeof(PlatformDefaultMongoOutboxBusMessageClassMapping));
    }

    protected List<Type> AllClassMapTypes()
    {
        return GetType()
            .Assembly.GetTypes()
            .Where(p => p.IsAssignableTo(typeof(IPlatformMongoClassMapping)) && !p.IsAbstract && p.IsClass)
            .ToList();
    }

    private void RegisterMongoDbUow(IServiceCollection serviceCollection)
    {
        serviceCollection.RegisterAllFromType<IPlatformMongoDbPersistenceUnitOfWork<TDbContext>>(GetAssembliesForServiceScanning());
        // Register default PlatformMongoDbUnitOfWork if not exist implementation in the concrete inherit persistence module
        if (serviceCollection.NotExist(p => p.ServiceType == typeof(IPlatformMongoDbPersistenceUnitOfWork<TDbContext>)))
            serviceCollection.RegisterAllForImplementation<PlatformMongoDbPersistenceUnitOfWork<TDbContext>>();

        serviceCollection.RegisterAllFromType<IPlatformUnitOfWork>(GetAssembliesForServiceScanning());
        // Register default PlatformMongoDbUnitOfWork for IUnitOfWork if not existing register for IUnitOfWork
        if (serviceCollection.NotExist(p => p.ServiceType == typeof(IPlatformUnitOfWork) &&
                                            p.ImplementationType?.IsAssignableTo(typeof(IPlatformMongoDbPersistenceUnitOfWork<TDbContext>)) == true))
            serviceCollection.Register<IPlatformUnitOfWork, PlatformMongoDbPersistenceUnitOfWork<TDbContext>>();
    }
}

public abstract class PlatformMongoDbPersistenceModule<TDbContext, TClientContext>
    : PlatformMongoDbPersistenceModule<TDbContext, TClientContext, PlatformMongoOptions<TDbContext>>
    where TDbContext : PlatformMongoDbContext<TDbContext>
    where TClientContext : class, IPlatformMongoClient<TDbContext>
{
    protected PlatformMongoDbPersistenceModule(
        IServiceProvider serviceProvider,
        IConfiguration configuration) : base(serviceProvider, configuration)
    {
    }
}

public abstract class PlatformMongoDbPersistenceModule<TDbContext>
    : PlatformMongoDbPersistenceModule<TDbContext, PlatformMongoClient<TDbContext>>
    where TDbContext : PlatformMongoDbContext<TDbContext>
{
    protected PlatformMongoDbPersistenceModule(
        IServiceProvider serviceProvider,
        IConfiguration configuration) : base(serviceProvider, configuration)
    {
    }
}

/// <summary>
/// Could not store singleton cache in generic class because it will be singleton only for a specific generic type.
/// This class to serve singleton cache for PlatformMongoDbPersistenceModule
/// </summary>
public abstract class PlatformMongoDbPersistenceModuleCache
{
    /// <summary>
    /// Guards every check-then-act that the PLATFORM performs against the process-global MongoDB registration state —
    /// both the two sets below and the driver's own static <see cref="MongoDB.Bson.Serialization.BsonClassMap" /> /
    /// <see cref="BsonSerializer" /> registries they mirror. Every platform entry point that registers a class map or a
    /// serializer takes THIS lock:
    /// <see cref="PlatformMongoDbPersistenceModule{TDbContext,TClientContext,TMongoOptions}.RegisterClassMapType" />,
    /// <see cref="Mapping.PlatformMongoClassMapping.RegisterClassMapIfNotRegistered{TEntity}" />,
    /// <see cref="Utils.BsonClassMapUtil.TryRegisterClassMap{TClassMap}" />,
    /// <c>BsonClassMapHelper.TryRegisterClassMapWithDefaultInitializer</c> and
    /// <c>PlatformMongoDbPersistenceModule.RegisterHybridEnumSerializationProviderOnce</c>. A NEW registration site must take it too — a
    /// second lock over this same registry would exclude nothing, since mutual exclusion only holds between callers of
    /// the SAME lock.
    /// <para />
    /// It cannot reach service code that calls <c>BsonClassMap.RegisterClassMap</c> directly instead of going through a
    /// platform entry point. Such code is safe only because
    /// <see cref="PlatformMongoDbPersistenceModule{TDbContext,TClientContext,TMongoOptions}.RegisterClassMapType" /> holds
    /// this lock across the whole <see cref="Mapping.IPlatformMongoClassMapping.RegisterClassMap" /> call, which is why the
    /// lock lives at that outer boundary rather than only inside the platform's own helpers.
    /// <para />
    /// <b>Why one shared lock and not a concurrent collection.</b> The invariant is not "the set is safe to mutate", it is
    /// "the driver registration happens exactly once". Those are different: swapping in a <c>ConcurrentDictionary</c> would
    /// make the bookkeeping thread-safe while STILL letting two threads pass the check and both call
    /// <c>RegisterClassMap</c>/<c>RegisterSerializer</c> — which throw on the second call, because the driver's registries
    /// are append-only and reject duplicates. Only holding a lock ACROSS the check and the driver call makes the pair atomic.
    /// <para />
    /// One lock (not one per set) because a single class-map registration reaches both registries and nests
    /// <see cref="PlatformMongoDbPersistenceModule{TDbContext,TClientContext,TMongoOptions}.RegisterClassMapType" /> into
    /// <c>PlatformMongoClassMapping.RegisterClassMapIfNotRegistered</c>; two locks could be taken in either order and deadlock.
    /// C# <c>lock</c> is re-entrant on the same thread, so the nesting is safe.
    /// <para />
    /// Contention is irrelevant: this runs once per module at startup, never on a request path.
    /// </summary>
    public static readonly Lock RegistrationLock = new();

    public static HashSet<Type> RegisteredClassMapTypes { get; } = [];
    public static HashSet<Type> RegisteredSerializerTypes { get; } = [];

    /// <summary>
    /// Whether <see cref="PlatformHybridEnumSerializationProvider" /> is already on the driver's provider chain.
    /// <para />
    /// A plain bool with no <c>volatile</c> because every read and write happens inside <see cref="RegistrationLock" />,
    /// which supplies the memory barrier.
    /// </summary>
    public static bool RegisteredHybridEnumSerializationProvider { get; private set; }

    /// <summary>
    /// Adds <see cref="PlatformHybridEnumSerializationProvider" /> to the driver's provider chain at most once per process.
    /// Returns <c>true</c> when THIS call performed the registration, <c>false</c> when it was already present.
    /// <para />
    /// Unlike the class-map and serializer registrations, <see cref="BsonSerializer.RegisterSerializationProvider" /> does
    /// NOT reject a duplicate — it PUSHES onto a stack of providers. So the failure mode is not an exception but silent
    /// growth: every opted-in module appends another identical provider, and each one is consulted (returning <c>null</c>)
    /// on every cache-miss lookup for a NON-enum type before the chain reaches the driver's own defaults. Collapsing N to 1
    /// is behaviour-preserving precisely because the provider is stateless — every instance resolves every type identically.
    /// <para />
    /// Guarded by <see cref="RegistrationLock" /> rather than a private lock, so this registration site obeys the same
    /// one-lock rule as the others; two locks over the driver's process-global registration state would exclude nothing.
    /// <para />
    /// Note the asymmetry this makes visible: the opt-in is per-module but <see cref="BsonSerializer" /> is process-global,
    /// so ONE module opting in applies hybrid enum handling to every module in the process. That is inherent to the driver's
    /// static registry, not introduced by this guard.
    /// </summary>
    public static bool EnsureHybridEnumSerializationProviderRegistered()
    {
        lock (RegistrationLock)
        {
            if (RegisteredHybridEnumSerializationProvider) return false;

            BsonSerializer.RegisterSerializationProvider(new PlatformHybridEnumSerializationProvider());
            RegisteredHybridEnumSerializationProvider = true;

            return true;
        }
    }
}
