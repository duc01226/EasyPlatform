using System;
using AngularDotnetPlatform.Platform.DependencyInjection;

namespace AngularDotnetPlatform.Platform.Domain
{
    public abstract class PlatformDomainModule : PlatformModule
    {
        protected PlatformDomainModule(IServiceProvider serviceProvider) : base(serviceProvider)
        {
        }
    }
}
