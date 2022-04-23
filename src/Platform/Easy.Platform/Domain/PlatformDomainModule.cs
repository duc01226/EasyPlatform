using System;
using System.Linq;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Domain.Services;
using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Domain
{
    public abstract class PlatformDomainModule : PlatformModule
    {
        protected PlatformDomainModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);
            serviceCollection.RegisterAllFromType<IPlatformDomainService>(ServiceLifeTime.Transient, Assembly);
        }
    }
}
