using System;
using System.Collections.Generic;
using System.Linq;
using AngularDotnetPlatform.Platform.Application.Domain;
using AngularDotnetPlatform.Platform.Application.EventBus;
using AngularDotnetPlatform.Platform.Application.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using AngularDotnetPlatform.Platform.DependencyInjection;
using AngularDotnetPlatform.Platform.Domain.Repositories;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Extensions;
using AngularDotnetPlatform.Platform.Persistence.DataMigration;
using AngularDotnetPlatform.Platform.Persistence.Domain;
using AngularDotnetPlatform.Platform.Persistence.Helpers.Abstract;

namespace AngularDotnetPlatform.Platform.Persistence
{
    public abstract class PlatformPersistenceModule<TDbContext> : PlatformModule
        where TDbContext : class, IPlatformDbContext
    {
        protected PlatformPersistenceModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override bool AutoRegisterCaching => false;

        protected virtual Func<IServiceProvider, TDbContext> DbContextProvider => null;

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);

            if (DbContextProvider != null)
                serviceCollection.RegisterAllForImplementation(typeof(TDbContext), DbContextProvider, ServiceLifeTime.Transient);
            else
                serviceCollection.RegisterAllForImplementation(typeof(TDbContext), ServiceLifeTime.Transient);
            serviceCollection.RegisterAllServicesFromType<IPlatformDbContext>(ServiceLifeTime.Scoped, Assembly);

            RegisterUnitOfWorkManager(serviceCollection);
            serviceCollection.RegisterAllFromType(typeof(IUnitOfWork), ServiceLifeTime.Transient, Assembly);
            RegisterRepositories(serviceCollection);
            if (EnableInboxEventBusMessageRepository())
                RegisterInboxEventBusMessageRepository(serviceCollection);
            serviceCollection.RegisterAllFromType<IPersistenceHelper>(ServiceLifeTime.Transient, Assembly);
            serviceCollection.RegisterAllFromType<IPlatformDataMigrationExecutor>(ServiceLifeTime.Transient, Assembly);
        }

        /// <summary>
        /// Override this function to limit the list of supported limited repository implementation for this persistence module
        /// </summary>
        /// <returns></returns>
        protected virtual List<Type> RegisterLimitedRepositoryImplementationTypes()
        {
            return null;
        }

        protected virtual void RegisterInboxEventBusMessageRepository(IServiceCollection serviceCollection)
        {
            serviceCollection.RegisterAllFromType<IPlatformInboxEventBusMessageRepository>(ServiceLifeTime.Transient, Assembly);
        }

        protected virtual bool EnableInboxEventBusMessageRepository()
        {
            return false;
        }

        private void RegisterUnitOfWorkManager(IServiceCollection serviceCollection)
        {
            serviceCollection.RegisterAllFromType(typeof(IUnitOfWorkManager), ServiceLifeTime.Scoped, Assembly);
            if (!serviceCollection.Any(p => p.ServiceType == typeof(IUnitOfWorkManager) && p.ImplementationType != typeof(PlatformPseudoApplicationUnitOfWorkManager)))
            {
                serviceCollection.Register<IUnitOfWorkManager, PlatformDefaultPersistenceUnitOfWorkManager>(ServiceLifeTime.Scoped);
            }
        }

        private void RegisterRepositories(IServiceCollection serviceCollection)
        {
            if (RegisterLimitedRepositoryImplementationTypes()?.Any() == true)
            {
                RegisterLimitedRepositoryImplementationTypes().ForEach(
                    repositoryImplementationType => serviceCollection.RegisterAllForImplementation(repositoryImplementationType, ServiceLifeTime.Transient));
            }
            else
            {
                serviceCollection.RegisterAllFromType<IPlatformRepository>(ServiceLifeTime.Transient, Assembly);
            }
        }
    }
}
