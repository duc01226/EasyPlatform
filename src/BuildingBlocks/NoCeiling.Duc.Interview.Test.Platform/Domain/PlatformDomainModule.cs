using System;
using NoCeiling.Duc.Interview.Test.Platform.DependencyInjection;

namespace NoCeiling.Duc.Interview.Test.Platform.Domain
{
    public abstract class PlatformDomainModule : PlatformModule
    {
        protected PlatformDomainModule(IServiceProvider serviceProvider) : base(serviceProvider)
        {
        }
    }
}
