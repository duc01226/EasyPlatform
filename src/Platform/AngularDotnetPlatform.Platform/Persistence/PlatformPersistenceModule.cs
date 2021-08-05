using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using AngularDotnetPlatform.Platform.DependencyInjection;
using AngularDotnetPlatform.Platform.Domain.Repositories;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Extensions;

namespace AngularDotnetPlatform.Platform.Persistence
{
    public abstract class PlatformPersistenceModule : PlatformModule
    {
        protected PlatformPersistenceModule(IServiceProvider serviceProvider) : base(serviceProvider)
        {
        }

        protected virtual Type GetIUnitOfWorkManagerConcreteType()
        {
            return typeof(PlatformDefaultUnitOfWorkManager);
        }

        protected abstract Type GetIUnitOfWorkConcreteType();

        protected override void InternalRegister(IServiceCollection serviceCollection, IConfiguration configuration)
        {
            base.InternalRegister(serviceCollection, configuration);
            serviceCollection.AddScoped(typeof(IUnitOfWorkManager), GetIUnitOfWorkManagerConcreteType());
            serviceCollection.AddTransient(typeof(IUnitOfWork), GetIUnitOfWorkConcreteType());
            serviceCollection.RegisterAllFromType<IRepository>(ServiceLifeTime.Transient, Assembly);
        }
    }
}
