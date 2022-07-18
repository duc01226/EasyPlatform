using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.MongoDB.Domain.Repositories;
using Easy.Platform.MongoDB.Domain.UnitOfWork;
using Easy.Platform.MongoDB.Extensions;
using Easy.Platform.MongoDB.Mapping;
using Easy.Platform.MongoDB.Migration;
using Easy.Platform.MongoDB.Serializer.Abstract;
using Easy.Platform.MongoDB.Services;
using Easy.Platform.Persistence;
using Easy.Platform.Persistence.DataMigration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson.Serialization;
using Polly;

namespace Easy.Platform.MongoDB
{
    public abstract class
        PlatformMongoDbPersistenceModule<TDbContext, TClientContext, TMongoOptions> : PlatformPersistenceModule<
            TDbContext>
        where TDbContext : class, IPlatformMongoDbContext<TDbContext>
        where TClientContext : class, IPlatformMongoClient<TDbContext>
        where TMongoOptions : PlatformMongoOptions<TDbContext>
    {
        public PlatformMongoDbPersistenceModule(
            IServiceProvider serviceProvider,
            IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected abstract void ConfigureMongoOptions(TMongoOptions options);

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);

            serviceCollection.Configure<TMongoOptions>(ConfigureMongoOptions);
            serviceCollection.Configure<PlatformMongoOptions<TDbContext>>(
                options => ConfigureMongoOptions(Activator.CreateInstance<TMongoOptions>()));

            serviceCollection.RegisterAllForImplementation(typeof(TClientContext), ServiceLifeTime.Singleton);
            serviceCollection.Register(
                typeof(IPlatformMongoClient<TDbContext>),
                provider => provider.GetService<TClientContext>(),
                ServiceLifeTime.Singleton);

            serviceCollection.Register(
                typeof(IPlatformMongoDbContext<TDbContext>),
                provider => provider.GetService<TDbContext>());

            serviceCollection.RegisterAllForImplementation(typeof(PlatformMongoDbUnitOfWork<TDbContext>));
            serviceCollection.RegisterAllFromType<IPlatformMongoDbUnitOfWork<TDbContext>>(
                ServiceLifeTime.Transient,
                Assembly,
                replaceIfExist: true,
                ServiceCollectionExtension.ReplaceServiceStrategy.ByService);
            if (!serviceCollection.Any(
                p => p.ServiceType == typeof(IUnitOfWork) &&
                     p.ImplementationType?.IsAssignableTo(typeof(IPlatformMongoDbUnitOfWork<TDbContext>)) == true))
            {
                serviceCollection.Register<IUnitOfWork, PlatformMongoDbUnitOfWork<TDbContext>>(
                    ServiceLifeTime.Transient);
            }

            RegisterPlatformDataMigrationHistoryClassMap();
            RegisterPlatformMigrationHistoryClassMap();
            AutoRegisterAllSerializers();
            AutoRegisterAllClassMap();
            RegisterBuiltInPersistenceServices(serviceCollection);
        }

        protected virtual void AutoRegisterAllClassMap()
        {
            var allClassMapTypes = AllClassMapTypes();

            allClassMapTypes.ForEach(
                p =>
                {
                    if (!PlatformMongoDbPersistenceModuleCache.RegisteredClassMapTypes.Contains(p))
                    {
                        Activator.CreateInstance(p);
                        PlatformMongoDbPersistenceModuleCache.RegisteredClassMapTypes.Add(p);
                    }
                });
        }

        protected virtual void AutoRegisterAllSerializers()
        {
            var allSerializerTypes = GetType()
                .Assembly.GetTypes()
                .Where(
                    p => p.IsAssignableToGenericType(typeof(IPlatformMongoAutoRegisterBaseSerializer<>)) &&
                         p.IsClass &&
                         !p.IsAbstract)
                .ToList();
            var allBuiltInSerializerTypes = typeof(PlatformMongoDbPersistenceModule<>).Assembly.GetTypes()
                .Where(
                    p => p.IsAssignableToGenericType(typeof(IPlatformMongoAutoRegisterBaseSerializer<>)) &&
                         p.IsClass &&
                         !p.IsAbstract)
                .ToList();

            allSerializerTypes.Concat(allBuiltInSerializerTypes)
                .ToList()
                .ForEach(
                    p =>
                    {
                        var serializerHandleValueType = p.GetInterfaces()
                            .First(
                                p => p.IsGenericType &&
                                     p.GetGenericTypeDefinition() == typeof(IPlatformMongoAutoRegisterBaseSerializer<>))
                            .GetGenericArguments()[0];

                        if (!PlatformMongoDbPersistenceModuleCache.RegisteredSerializerTypes.Contains(
                            serializerHandleValueType))
                        {
                            BsonSerializer.RegisterSerializer(
                                serializerHandleValueType,
                                (IPlatformMongoBaseSerializer)Activator.CreateInstance(p));

                            PlatformMongoDbPersistenceModuleCache.RegisteredSerializerTypes.Add(
                                serializerHandleValueType);
                        }
                    });
        }

        protected override async Task InternalInit(IServiceScope serviceScope)
        {
            await base.InternalInit(serviceScope);
            InitializeDbContext(serviceScope);
        }

        protected virtual void InitializeDbContext(IServiceScope serviceScope)
        {
            var db = serviceScope.ServiceProvider.GetRequiredService<TDbContext>();

            var retryCount = 10;

            //if the db server container is not created on run docker compose,
            //the migration action could fail for network related exception. So that we do retry to ensure that Initialize action run successfully.
            Policy.Handle<Exception>()
                .WaitAndRetry(
                    retryCount: retryCount,
                    sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                    onRetry: (
                        exception,
                        timeSpan,
                        retry,
                        ctx) =>
                    {
                        Logger.LogWarning(
                            exception,
                            "[{prefix}] Exception {ExceptionType} with message {Message} detected on attempt Initialize {retry} of {retries}",
                            typeof(TDbContext).Name,
                            exception.GetType().Name,
                            exception.Message,
                            retry,
                            retryCount);
                    })
                .ExecuteAndThrowFinalException(() => db.Initialize(serviceScope.ServiceProvider, IsDevEnvironment()));
        }

        protected override void RegisterInboxEventBusMessageRepository(IServiceCollection serviceCollection)
        {
            if (!EnableInboxEventBusMessageRepository())
                return;

            base.RegisterInboxEventBusMessageRepository(serviceCollection);

            // Register Default InboxBusMessageRepository if not existed custom inherited IPlatformInboxBusMessageRepository in assembly
            if (serviceCollection.All(p => p.ServiceType != typeof(IPlatformInboxBusMessageRepository)))
            {
                serviceCollection.Register(
                    typeof(IPlatformInboxBusMessageRepository),
                    typeof(PlatformDefaultMongoDbInboxBusMessageRepository<TDbContext>),
                    ServiceLifeTime.Transient);
            }

            // Register Default MongoInboxBusMessageClassMapping if not existed custom inherited PlatformMongoInboxBusMessageClassMapping in assembly
            if (!AllClassMapTypes().Any(p => p.IsAssignableTo(typeof(PlatformMongoInboxBusMessageClassMapping))))
            {
                Activator.CreateInstance(typeof(PlatformDefaultMongoInboxBusMessageClassMapping));
            }
        }

        protected override void RegisterOutboxEventBusMessageRepository(IServiceCollection serviceCollection)
        {
            if (!EnableOutboxEventBusMessageRepository())
                return;

            base.RegisterOutboxEventBusMessageRepository(serviceCollection);

            // Register Default OutboxEventBusMessageRepository if not existed custom inherited IPlatformOutboxEventBusMessageRepository in assembly
            if (serviceCollection.All(p => p.ServiceType != typeof(IPlatformOutboxBusMessageRepository)))
            {
                serviceCollection.Register(
                    typeof(IPlatformOutboxBusMessageRepository),
                    typeof(PlatformDefaultMongoDbOutboxBusMessageRepository<TDbContext>),
                    ServiceLifeTime.Transient);
            }

            // Register Default MongoOutboxBusMessageClassMapping if not existed custom inherited PlatformMongoOutboxBusMessageClassMapping in assembly
            if (!AllClassMapTypes().Any(p => p.IsAssignableTo(typeof(PlatformMongoOutboxBusMessageClassMapping))))
            {
                Activator.CreateInstance(typeof(PlatformDefaultMongoOutboxBusMessageClassMapping));
            }
        }

        protected List<Type> AllClassMapTypes()
        {
            var allClassMapTypes = GetType()
                .Assembly.GetTypes()
                .Where(p => p.IsAssignableTo(typeof(IPlatformMongoClassMapping)) && !p.IsAbstract && p.IsClass)
                .ToList();
            return allClassMapTypes;
        }

        private static void RegisterPlatformDataMigrationHistoryClassMap()
        {
            BsonClassMapExtension.TryRegisterClassMap<PlatformDataMigrationHistory>(
                cm =>
                {
                    cm.AutoMap();
                    cm.SetIgnoreExtraElements(true);
                });
        }

        private static void RegisterPlatformMigrationHistoryClassMap()
        {
            BsonClassMapExtension.TryRegisterClassMap<PlatformMongoMigrationHistory>(
                cm =>
                {
                    cm.AutoMap();
                    cm.SetIgnoreExtraElements(true);
                });
        }

        private static void RegisterBuiltInPersistenceServices(IServiceCollection serviceCollection)
        {
            serviceCollection.RegisterAllForImplementation<MongoDbPlatformFullTextSearchPersistenceService>(
                ServiceLifeTime.Transient);
        }
    }

    public abstract class PlatformMongoDbPersistenceModule<TDbContext, TClientContext>
        : PlatformMongoDbPersistenceModule<TDbContext, TClientContext, PlatformMongoOptions<TDbContext>>
        where TDbContext : class, IPlatformMongoDbContext<TDbContext>
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
        where TDbContext : class, IPlatformMongoDbContext<TDbContext>
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
        public static readonly HashSet<Type> RegisteredClassMapTypes = new HashSet<Type>();
        public static readonly HashSet<Type> RegisteredSerializerTypes = new HashSet<Type>();
    }
}
