using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.EventBus;
using AngularDotnetPlatform.Platform.DependencyInjection;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using AngularDotnetPlatform.Platform.Persistence;
using Microsoft.Extensions.Configuration;
using Polly;
using AngularDotnetPlatform.Platform.Extensions;
using AngularDotnetPlatform.Platform.MongoDB.Domain.Repositories;
using AngularDotnetPlatform.Platform.MongoDB.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.MongoDB.Helpers;
using AngularDotnetPlatform.Platform.MongoDB.Mapping;
using AngularDotnetPlatform.Platform.MongoDB.Migration;
using MongoDB.Bson.Serialization;
using AngularDotnetPlatform.Platform.MongoDB.Serializer.Abstract;
using Microsoft.Extensions.Options;

namespace AngularDotnetPlatform.Platform.MongoDB
{
    public abstract class PlatformMongoDbPersistenceModule<TDbContext, TClientContext, TMongoOptions> : PlatformPersistenceModule
        where TDbContext : class, IPlatformMongoDbContext<TDbContext>
        where TClientContext : class, IPlatformMongoClientContext<TDbContext>
        where TMongoOptions : PlatformMongoOptions<TDbContext>
    {
        protected readonly ILogger Logger;

        public PlatformMongoDbPersistenceModule(
            IServiceProvider serviceProvider,
            IConfiguration configuration) : base(serviceProvider, configuration)
        {
            Logger = serviceProvider?.GetService<ILoggerFactory>().CreateLogger(GetType());
        }

        protected abstract void ConfigureMongoOptions(TMongoOptions options);

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);

            serviceCollection.Configure<TMongoOptions>(ConfigureMongoOptions);
            serviceCollection.Configure<PlatformMongoOptions<TDbContext>>(options => ConfigureMongoOptions(Activator.CreateInstance<TMongoOptions>()));

            serviceCollection.RegisterAllForImplementation(typeof(TClientContext), ServiceLifeTime.Singleton);
            serviceCollection.Register(typeof(IPlatformMongoClientContext<TDbContext>), provider => provider.GetService<TClientContext>(), ServiceLifeTime.Singleton);

            serviceCollection.RegisterAllForImplementation(typeof(TDbContext));
            serviceCollection.Register(typeof(IPlatformMongoDbContext<TDbContext>), provider => provider.GetService<TDbContext>());

            serviceCollection.RegisterAllForImplementation(typeof(PlatformDefaultMongoDbUnitOfWork<TDbContext>));
            serviceCollection.RegisterAllFromType<IPlatformMongoDbUnitOfWork<TDbContext>>(
                ServiceLifeTime.Transient,
                Assembly,
                replaceIfExist: true,
                ServiceCollectionExtension.ReplaceServiceStrategy.ByService);
            if (!serviceCollection.Any(p => p.ServiceType == typeof(IUnitOfWork) &&
                                            p.ImplementationType?.IsAssignableTo(typeof(IPlatformMongoDbUnitOfWork<TDbContext>)) == true))
            {
                serviceCollection.Register<IUnitOfWork, PlatformDefaultMongoDbUnitOfWork<TDbContext>>(ServiceLifeTime.Transient);
            }

            RegisterBuiltInHelpers(serviceCollection);

            RegisterPlatformDataMigrationHistoryClassMap();
            AutoRegisterAllSerializers();
            AutoRegisterAllClassMap();
        }

        protected virtual void AutoRegisterAllClassMap()
        {
            var allClassMapTypes = AllClassMapTypes();

            allClassMapTypes.ForEach(p => Activator.CreateInstance(p));
        }

        protected virtual void AutoRegisterAllSerializers()
        {
            var allSerializerTypes = GetType().Assembly.GetTypes()
                .Where(p => p.IsAssignableToGenericType(typeof(IPlatformMongoBaseSerializer<>)) && p.IsClass && !p.IsAbstract)
                .ToList();

            allSerializerTypes.ForEach(p =>
            {
                var serializerHandleValueType = p.GetInterfaces()
                    .First(p => p.IsGenericType && p.GetGenericTypeDefinition() == typeof(IPlatformMongoBaseSerializer<>))
                    .GetGenericArguments()[0];
                BsonSerializer.RegisterSerializer(
                    serializerHandleValueType,
                    (IPlatformMongoBaseSerializer)Activator.CreateInstance(p));
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
                    onRetry: (exception, timeSpan, retry, ctx) =>
                    {
                        Logger.LogWarning(exception,
                            "[{prefix}] Exception {ExceptionType} with message {Message} detected on attempt Initialize {retry} of {retries}",
                            nameof(TDbContext),
                            exception.GetType().Name,
                            exception.Message,
                            retry,
                            retryCount);
                    })
                .ExecuteAndThrowFinalException(() => db.Initialize());
        }

        protected override void RegisterInboxEventBusMessageRepository(IServiceCollection serviceCollection)
        {
            // Register Default InboxEventBusMessageRepository if not existed custom inherited IPlatformInboxEventBusMessageRepository in assembly
            base.RegisterInboxEventBusMessageRepository(serviceCollection);
            if (!serviceCollection.Any(p => p.ServiceType == typeof(IPlatformInboxEventBusMessageRepository)))
            {
                serviceCollection.Register(
                    typeof(IPlatformInboxEventBusMessageRepository),
                    typeof(PlatformDefaultMongoDbInboxEventBusMessageRepository<TDbContext>),
                    ServiceLifeTime.Transient);
            }

            // Register Default MongoInboxEventBusMessageClassMapping if not existed custom inherited PlatformMongoInboxEventBusMessageClassMapping in assembly
            if (!AllClassMapTypes().Any(p => p.IsAssignableTo(typeof(PlatformMongoInboxEventBusMessageClassMapping))))
            {
                Activator.CreateInstance(typeof(PlatformDefaultMongoInboxEventBusMessageClassMapping));
            }
        }

        protected List<Type> AllClassMapTypes()
        {
            var allClassMapTypes = GetType().Assembly.GetTypes()
                .Where(p => p.IsAssignableTo(typeof(IPlatformMongoClassMapping)) && !p.IsAbstract && p.IsClass)
                .ToList();
            return allClassMapTypes;
        }

        private static void RegisterBuiltInHelpers(IServiceCollection serviceCollection)
        {
            serviceCollection.RegisterAllForImplementation<MongoDbPlatformFullTextSearchPersistenceHelper>(ServiceLifeTime.Transient);
        }

        private static void RegisterPlatformDataMigrationHistoryClassMap()
        {
            if (!BsonClassMap.IsClassMapRegistered(typeof(PlatformDataMigrationHistory)))
            {
                BsonClassMap.RegisterClassMap<PlatformDataMigrationHistory>(cm =>
                {
                    cm.AutoMap();
                    cm.SetIgnoreExtraElements(true);
                });
            }
        }
    }

    public abstract class PlatformMongoDbPersistenceModule<TDbContext, TClientContext>
        : PlatformMongoDbPersistenceModule<TDbContext, TClientContext, PlatformMongoOptions<TDbContext>>
        where TDbContext : class, IPlatformMongoDbContext<TDbContext>
        where TClientContext : class, IPlatformMongoClientContext<TDbContext>
    {
        protected PlatformMongoDbPersistenceModule(
            IServiceProvider serviceProvider,
            IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }
    }

    public abstract class PlatformMongoDbPersistenceModule<TDbContext>
        : PlatformMongoDbPersistenceModule<TDbContext, PlatformMongoClientContext<TDbContext>>
        where TDbContext : class, IPlatformMongoDbContext<TDbContext>
    {
        protected PlatformMongoDbPersistenceModule(
            IServiceProvider serviceProvider,
            IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }
    }
}
