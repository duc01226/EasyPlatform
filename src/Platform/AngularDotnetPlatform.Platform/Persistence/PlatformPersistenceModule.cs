using System;
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

        /// <summary>
        /// Return Implementation of <see cref="IUnitOfWorkManager"/> to be registered.
        /// Default return <see cref="PlatformDefaultUnitOfWorkManager"/>
        /// </summary>
        protected virtual Type GetIUnitOfWorkManagerConcreteType()
        {
            return typeof(PlatformDefaultUnitOfWorkManager);
        }

        /// <summary>
        /// Return Implementation of <see cref="IUnitOfWork"/> to be registered
        /// </summary>
        protected abstract Type GetIUnitOfWorkConcreteType();

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);
            serviceCollection.AddScoped(typeof(IUnitOfWorkManager), GetIUnitOfWorkManagerConcreteType());
            serviceCollection.AddTransient(typeof(IUnitOfWork), GetIUnitOfWorkConcreteType());
            serviceCollection.RegisterAllFromType<IRepository>(ServiceLifeTime.Transient, Assembly);
            serviceCollection.RegisterAllFromType<IPersistenceHelper>(ServiceLifeTime.Transient, Assembly);
        }
    }
}
