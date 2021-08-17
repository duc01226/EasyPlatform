using System;
using System.Linq;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using AngularDotnetPlatform.Platform.DependencyInjection;
using AngularDotnetPlatform.Platform.Domain.Repositories;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Extensions;
using AngularDotnetPlatform.Platform.Persistence.Helpers.Abstract;

namespace AngularDotnetPlatform.Platform.Persistence
{
    public abstract class PlatformPersistenceModule : PlatformModule
    {
        protected PlatformPersistenceModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override bool AutoRegisterCaching => false;

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);
            RegisterUnitOfWorkManager(serviceCollection);
            serviceCollection.RegisterAllFromType(typeof(IUnitOfWork), ServiceLifeTime.Transient, Assembly);
            serviceCollection.RegisterAllFromType<IRepository>(ServiceLifeTime.Transient, Assembly);
            serviceCollection.RegisterAllFromType<IPersistenceHelper>(ServiceLifeTime.Transient, Assembly);
        }

        private void RegisterUnitOfWorkManager(IServiceCollection serviceCollection)
        {
            serviceCollection.RegisterAllFromType(typeof(IUnitOfWorkManager), ServiceLifeTime.Scoped, Assembly);
            if (!serviceCollection.Any(p => p.ServiceType == typeof(IUnitOfWorkManager)))
            {
                serviceCollection.Register<IUnitOfWorkManager, PlatformDefaultUnitOfWorkManager>(ServiceLifeTime.Scoped);
            }
        }
    }
}
