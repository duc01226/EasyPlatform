using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Easy.Platform.Application.EventBus;
using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Application.EventBus.OutboxPattern;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.EfCore.Domain.Repositories;
using Easy.Platform.EfCore.Domain.UnitOfWork;
using Easy.Platform.EfCore.EntityConfiguration;
using Easy.Platform.Common.Extensions;
using Easy.Platform.EfCore.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Easy.Platform.Persistence;
using Easy.Platform.Persistence.Services.Abstract;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Polly;

namespace Easy.Platform.EfCore
{
    public abstract class PlatformEfCorePersistenceModule<TDbContext> : PlatformPersistenceModule<TDbContext> where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        protected readonly ILogger Logger;

        public PlatformEfCorePersistenceModule(
            IServiceProvider serviceProvider,
            IConfiguration configuration) : base(serviceProvider, configuration)
        {
            Logger = serviceProvider?.GetService<ILoggerFactory>().CreateLogger(GetType());
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

            RegisterDbContextOptions(serviceCollection, ServiceLifetime.Transient);

            serviceCollection
                .RegisterAllForImplementation(typeof(PlatformEfCoreUnitOfWork<TDbContext>));
            serviceCollection.RegisterAllFromType<IPlatformEfCoreUnitOfWork<TDbContext>>(
                ServiceLifeTime.Transient,
                Assembly,
                replaceIfExist: true,
                ServiceCollectionExtension.ReplaceServiceStrategy.ByService);
            if (!serviceCollection.Any(p => p.ServiceType == typeof(IUnitOfWork) &&
                                            p.ImplementationType?.IsAssignableTo(typeof(IPlatformEfCoreUnitOfWork<TDbContext>)) == true))
            {
                serviceCollection.Register<IUnitOfWork, PlatformEfCoreUnitOfWork<TDbContext>>(ServiceLifeTime.Transient);
            }

            serviceCollection.Register(
                typeof(PlatformEfCoreOptions),
                p =>
                {
                    var options = PlatformEfCoreOptionsFactory();

                    // Auto set value for EnableDefaultInboxEventBusMessageEntityConfiguration if it is not set value
                    options.EnableDefaultInboxEventBusMessageEntityConfiguration ??= GetEnableDefaultInboxEventBusMessageEntityConfigurationDefaultValue();

                    return options;
                });

            RegisterBuiltInPersistenceServices(serviceCollection);
        }

        /// <summary>
        /// Override this to custom PlatformEfCoreOptions value
        /// </summary>
        protected virtual PlatformEfCoreOptions PlatformEfCoreOptionsFactory()
        {
            return new PlatformEfCoreOptions();
        }

        /// <summary>
        /// Return a action for <see cref="DbContextOptionsBuilder"/> to AddDbContext. <br/>
        /// Example: return options => options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection"));
        /// </summary>
        protected abstract Action<DbContextOptionsBuilder> DbContextOptionsBuilderActionProvider(IServiceProvider serviceProvider);

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
            //the migration action could fail for network related exception. So that we do retry to ensure that migrate action run successfully.
            Policy.Handle<Exception>()
                .WaitAndRetry(
                    retryCount: retryCount,
                    sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                    onRetry: (exception, timeSpan, retry, ctx) =>
                    {
                        Logger.LogWarning(exception,
                            "[{prefix}] Exception {ExceptionType} with message {Message} detected on attempt Migrate {retry} of {retries}",
                            typeof(TDbContext).Name,
                            exception.GetType().Name,
                            exception.Message,
                            retry,
                            retryCount);
                    })
                .ExecuteAndThrowFinalException(() => db.Initialize(serviceScope.ServiceProvider));
        }

        protected override void RegisterInboxEventBusMessageRepository(IServiceCollection serviceCollection)
        {
            if (!EnableInboxEventBusMessageRepository())
                return;

            base.RegisterInboxEventBusMessageRepository(serviceCollection);

            // Register Default InboxEventBusMessageRepository if not existed custom inherited IPlatformInboxEventBusMessageRepository in assembly
            if (serviceCollection.All(p => p.ServiceType != typeof(IPlatformInboxEventBusMessageRepository)))
            {
                serviceCollection.Register(
                    typeof(IPlatformInboxEventBusMessageRepository),
                    typeof(PlatformDefaultEfCoreInboxEventBusMessageRepository<TDbContext>),
                    ServiceLifeTime.Transient);
            }
        }

        protected override void RegisterOutboxEventBusMessageRepository(IServiceCollection serviceCollection)
        {
            if (!EnableOutboxEventBusMessageRepository())
                return;

            base.RegisterOutboxEventBusMessageRepository(serviceCollection);

            // Register Default OutboxEventBusMessageRepository if not existed custom inherited IPlatformOutboxEventBusMessageRepository in assembly
            if (serviceCollection.All(p => p.ServiceType != typeof(IPlatformOutboxEventBusMessageRepository)))
            {
                serviceCollection.Register(
                    typeof(IPlatformOutboxEventBusMessageRepository),
                    typeof(PlatformDefaultEfCoreOutboxEventBusMessageRepository<TDbContext>),
                    ServiceLifeTime.Transient);
            }
        }

        private static void RegisterBuiltInPersistenceServices(IServiceCollection serviceCollection)
        {
            serviceCollection.RegisterAllForImplementation<EfCoreSqlPlatformFullTextSearchPersistenceService>(ServiceLifeTime.Transient);
        }

        private void RegisterDbContextOptions(
            IServiceCollection serviceCollection,
            ServiceLifetime optionsLifetime)
        {
            serviceCollection.TryAdd(
                new ServiceDescriptor(
                    typeof(DbContextOptions<TDbContext>),
                    p => CreateDbContextOptions(p, (provider, builder) => DbContextOptionsBuilderActionProvider(provider).Invoke(builder)),
                    optionsLifetime));

            serviceCollection.Add(
                new ServiceDescriptor(
                    typeof(DbContextOptions),
                    p => p.GetRequiredService<DbContextOptions<TDbContext>>(),
                    optionsLifetime));
        }

        private DbContextOptions<TDbContext> CreateDbContextOptions(
            IServiceProvider applicationServiceProvider,
            Action<IServiceProvider, DbContextOptionsBuilder> optionsAction)
        {
            var builder = new DbContextOptionsBuilder<TDbContext>(
                new DbContextOptions<TDbContext>(new Dictionary<Type, IDbContextOptionsExtension>()));

            builder.UseApplicationServiceProvider(applicationServiceProvider);

            optionsAction?.Invoke(applicationServiceProvider, builder);

            return builder.Options;
        }
    }
}
