using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using AngularDotnetPlatform.Platform.Persistence;
using Microsoft.Extensions.Configuration;
using Polly;
using AngularDotnetPlatform.Platform.EfCore;
using AngularDotnetPlatform.Platform.MongoDB.Mapping;
using AngularDotnetPlatform.Platform.MongoDB.Migration;
using MongoDB.Bson.Serialization;

namespace AngularDotnetPlatform.Platform.MongoDB
{
    public abstract class PlatformMongoDbPersistenceModule<TClientContext, TDbContext> : PlatformPersistenceModule
        where TClientContext : class, IPlatformMongoClientContext
        where TDbContext : class, IPlatformMongoDbContext<TDbContext>
    {
        protected readonly ILogger<PlatformMongoDbPersistenceModule<TClientContext, TDbContext>> Logger;

        public PlatformMongoDbPersistenceModule(
            IServiceProvider serviceProvider,
            ILogger<PlatformMongoDbPersistenceModule<TClientContext, TDbContext>> logger) : base(serviceProvider)
        {
            Logger = logger;
        }

        protected abstract void ConfigureMongoOptions(PlatformMongoOptions options, IConfiguration configuration);

        protected override void InternalRegister(IServiceCollection serviceCollection, IConfiguration configuration)
        {
            base.InternalRegister(serviceCollection, configuration);
            serviceCollection.Configure<PlatformMongoOptions>(options => ConfigureMongoOptions(options, configuration));
            serviceCollection.AddSingleton<TClientContext>();
            serviceCollection.AddSingleton<IPlatformMongoClientContext, TClientContext>();
            serviceCollection.AddScoped<TDbContext>();
            serviceCollection.AddScoped<IPlatformMongoDbContext<TDbContext>, TDbContext>();

            RegisterPlatformDataMigrationHistoryClassMap();

            AutoRegisterAllClassMap();
        }

        protected virtual void AutoRegisterAllClassMap()
        {
            var allClassMapTypes = GetType().Assembly.GetTypes()
                .Where(p => p.IsAssignableTo(typeof(IPlatformMongoClassMapping)) && p.IsClass && !p.IsAbstract)
                .ToList();

            allClassMapTypes.ForEach(p => Activator.CreateInstance(p));
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
            var retryPolicy = Policy.Handle<Exception>()
                .WaitAndRetry(
                    retryCount: retryCount,
                    sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                    onRetry: (exception, timeSpan, retry, ctx) =>
                    {
                        Logger.LogWarning(exception, "[{prefix}] Exception {ExceptionType} with message {Message} detected on attempt {retry} of {retries}", nameof(TDbContext), exception.GetType().Name, exception.Message, retry, retryCount);
                    });

            //if the sql server container is not created on run docker compose this
            //Initialization can't fail for network related exception. The retry options for DbContext only
            //apply to transient exceptions
            retryPolicy.Execute(() => db.Initialize());
        }

        private static void RegisterPlatformDataMigrationHistoryClassMap()
        {
            BsonClassMap.RegisterClassMap<PlatformDataMigrationHistory>(cm =>
            {
                cm.AutoMap();
                cm.SetIgnoreExtraElements(true);
            });
        }
    }
}
