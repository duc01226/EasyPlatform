using System;
using System.Linq;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.EventBus;
using AngularDotnetPlatform.Platform.DependencyInjection;
using AngularDotnetPlatform.Platform.EfCore.Domain.Repositories;
using AngularDotnetPlatform.Platform.EfCore.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.EfCore.EntityConfiguration;
using AngularDotnetPlatform.Platform.EfCore.Helpers;
using AngularDotnetPlatform.Platform.Extensions;
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
        protected readonly ILogger Logger;

        public PlatformEfCorePersistenceModule(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger logger) : base(serviceProvider, configuration)
        {
            Logger = logger;
        }

        public bool GetEnableDefaultInboxEventBusMessageEntityConfigurationDefaultValue()
        {
            return EnableInboxEventBusMessageRepository() &&
                   !Assembly.GetTypes().Any(persistenceAssemblyType =>
                       !persistenceAssemblyType.IsAbstract &&
                       persistenceAssemblyType.IsClass &&
                       persistenceAssemblyType.IsAssignableTo(typeof(PlatformInboxEventBusMessageConfiguration)));
        }

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);

            serviceCollection.AddDbContext<TDbContext>(DbContextOptionsBuilderActionProvider(serviceCollection), ServiceLifetime.Transient);
            serviceCollection.RegisterAllFromType<IPlatformEfCoreUnitOfWork<TDbContext>>(ServiceLifeTime.Transient, Assembly);
            serviceCollection.Register(
                typeof(PlatformEfCoreOptions),
                p =>
                {
                    var options = PlatformEfCoreOptionsFactory();

                    // Auto set value for EnableDefaultInboxEventBusMessageEntityConfiguration if it is not set value
                    options.EnableDefaultInboxEventBusMessageEntityConfiguration ??= GetEnableDefaultInboxEventBusMessageEntityConfigurationDefaultValue();

                    return options;
                });

            RegisterBuiltInHelpers(serviceCollection);
        }

        /// <summary>
        /// Override this to custom PlatformEfCoreOptions value
        /// </summary>
        protected virtual PlatformEfCoreOptions PlatformEfCoreOptionsFactory()
        {
            return new PlatformEfCoreOptions();
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

            //if the db server container is not created on run docker compose,
            //the migration action could fail for network related exception. So that we do retry to ensure that migrate action run successfully.
            Policy.Handle<Exception>()
                .WaitAndRetry(
                    retryCount: retryCount,
                    sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                    onRetry: (exception, timeSpan, retry, ctx) =>
                    {
                        Logger.LogWarning(exception,
                            "[{prefix}] Exception {ExceptionType} with message {Message} detected on attempt Migrate {retry} of {retries}",
                            nameof(TDbContext),
                            exception.GetType().Name,
                            exception.Message,
                            retry,
                            retryCount);
                    })
                .ExecuteAndThrowFinalException(() => db.Database.Migrate());
        }

        protected override void RegisterInboxEventBusMessageRepository(IServiceCollection serviceCollection)
        {
            // Register Default InboxEventBusMessageRepository if not existed custom inherited IPlatformInboxEventBusMessageRepository in assembly
            base.RegisterInboxEventBusMessageRepository(serviceCollection);
            if (!serviceCollection.Any(p => p.ServiceType == typeof(IPlatformInboxEventBusMessageRepository)))
            {
                serviceCollection.Register(
                    typeof(IPlatformInboxEventBusMessageRepository),
                    typeof(PlatformDefaultEfCoreInboxEventBusMessageRepository<TDbContext>),
                    ServiceLifeTime.Transient);
            }
        }

        private static void RegisterBuiltInHelpers(IServiceCollection serviceCollection)
        {
            serviceCollection.RegisterAllForImplementation<EfCoreSqlPlatformFullTextSearchPersistenceHelper>(ServiceLifeTime.Transient);
        }
    }
}
