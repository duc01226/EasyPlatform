using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Infrastructures.Abstract;
using AngularDotnetPlatform.Platform.Common.DependencyInjection;
using AngularDotnetPlatform.Platform.Common.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AngularDotnetPlatform.Platform.Infrastructures
{
    public abstract class PlatformInfrastructureModule : PlatformModule
    {
        public PlatformInfrastructureModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);
            serviceCollection.RegisterAllFromType<IPlatformInfrastructureService>(ServiceLifeTime.Transient, Assembly);
        }
    }
}
