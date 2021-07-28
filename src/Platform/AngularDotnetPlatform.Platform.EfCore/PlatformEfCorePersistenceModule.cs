using System;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using AngularDotnetPlatform.Platform.Persistence;
using Polly;

namespace AngularDotnetPlatform.Platform.EfCore
{
    public abstract class PlatformEfCorePersistenceModule<TDbContext> : PlatformPersistenceModule where TDbContext : DbContext
    {
        protected readonly ILogger<PlatformEfCorePersistenceModule<TDbContext>> Logger;

        public PlatformEfCorePersistenceModule(
            IServiceProvider serviceProvider,
            ILogger<PlatformEfCorePersistenceModule<TDbContext>> logger) : base(serviceProvider)
        {
            Logger = logger;
        }

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
                        Logger.LogWarning(exception, "[{prefix}] Exception {ExceptionType} with message {Message} detected on attempt {retry} of {retries}", nameof(TDbContext), exception.GetType().Name, exception.Message, retry, retryCount);
                    });

            //if the sql server container is not created on run docker compose this
            //migration can't fail for network related exception. The retry options for DbContext only
            //apply to transient exceptions
            retryPolicy.Execute(() => db.Database.Migrate());
        }
    }
}
