using System;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.DependencyInjection;
using AngularDotnetPlatform.Platform.EfCore.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.EfCore.Helpers;
using AngularDotnetPlatform.Platform.Extensions;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using AngularDotnetPlatform.Platform.Persistence;
using Microsoft.Extensions.Configuration;
using Polly;

namespace AngularDotnetPlatform.Platform.EfCore
{
    public abstract class PlatformEfCorePersistenceModule<TDbContext> : PlatformPersistenceModule where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        protected readonly ILogger<PlatformEfCorePersistenceModule<TDbContext>> Logger;

        public PlatformEfCorePersistenceModule(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<PlatformEfCorePersistenceModule<TDbContext>> logger) : base(serviceProvider, configuration)
        {
            Logger = logger;
        }

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);

            serviceCollection.AddDbContext<TDbContext>(DbContextOptionsBuilderActionProvider(serviceCollection), ServiceLifetime.Transient);
            serviceCollection.RegisterAllFromType<IPlatformEfCoreUnitOfWork<TDbContext>>(ServiceLifeTime.Transient, Assembly);

            RegisterHelpers(serviceCollection);
        }

        /// <summary>
        /// Return a action for <see cref="DbContextOptionsBuilder"/> to AddDbContext. 
        /// </summary>
        protected abstract Action<DbContextOptionsBuilder> DbContextOptionsBuilderActionProvider(IServiceCollection serviceCollection);

        protected override async Task InternalInit(IServiceScope serviceScope)
        {
            await base.InternalInit(serviceScope);
            MigrateDbContext(serviceScope);
        }

        protected virtual void MigrateDbContext(IServiceScope serviceScope)
        {
            var db = serviceScope.ServiceProvider.GetRequiredService<TDbContext>();

            var retryCount = 10;
            var retryPolicy = Policy.Handle<SqlException>()
                .WaitAndRetry(
                    retryCount: retryCount,
                    sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                    onRetry: (exception, timeSpan, retry, ctx) =>
                    {
                        Logger.LogWarning(exception,
                            "[{prefix}] Exception {ExceptionType} with message {Message} detected on attempt {retry} of {retries}",
                            nameof(TDbContext),
                            exception.GetType().Name,
                            exception.Message,
                            retry,
                            retryCount);
                    });

            //if the sql server container is not created on run docker compose this
            //migration can't fail for network related exception. The retry options for DbContext only 
            //apply to transient exceptions
            retryPolicy.Execute(() => db.Database.Migrate());
        }

        protected virtual void RegisterHelpers(IServiceCollection serviceCollection)
        {
            serviceCollection.RegisterAllForImplementation<EfCoreSqlPlatformFullTextSearchPersistenceHelper>(ServiceLifeTime.Transient);
        }
    }
}
