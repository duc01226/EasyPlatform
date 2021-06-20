using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NoCeiling.Duc.Interview.Test.Platform.DependencyInjection;

namespace NoCeiling.Duc.Interview.Test.Platform.Cqrs
{
    public static class PlatformCqrsModuleExtensions
    {
        public static void RegisterCqrs(this PlatformModule module, IServiceCollection serviceCollection, IConfiguration configuration)
        {
            serviceCollection.AddMediatR(module.Assembly);
        }
    }
}
