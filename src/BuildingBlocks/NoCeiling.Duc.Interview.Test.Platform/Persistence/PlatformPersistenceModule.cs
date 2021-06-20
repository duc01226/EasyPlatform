using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NoCeiling.Duc.Interview.Test.Platform.DependencyInjection;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Repositories;
using NoCeiling.Duc.Interview.Test.Platform.Domain.UnitOfWork;

namespace NoCeiling.Duc.Interview.Test.Platform.Persistence
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
            serviceCollection.RegisterAllFromType<IRepository>(this, ServiceLifeTime.Transient);
        }
    }
}
