using System;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NoCeiling.Duc.Interview.Test.Platform.AspNetCore.ExceptionHandling;
using NoCeiling.Duc.Interview.Test.Platform.DependencyInjection;

namespace NoCeiling.Duc.Interview.Test.Platform.AspNetCore
{
    public class PlatformAspNetCoreModule : PlatformModule
    {
        public PlatformAspNetCoreModule(IServiceProvider serviceProvider) : base(serviceProvider)
        {
        }

        protected override void InternalRegister(IServiceCollection serviceCollection, IConfiguration configuration)
        {
            base.InternalRegister(serviceCollection, configuration);
            serviceCollection.AddScoped<PlatformExceptionFilter>();
            serviceCollection
                .Configure<MvcOptions>(mvcOptions =>
                {
                    mvcOptions.Filters.AddService(typeof(PlatformExceptionFilter));
                });
        }
    }
}
