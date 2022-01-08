using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application;
using AngularDotnetPlatform.Platform.Infrastructures;
using Microsoft.Extensions.Configuration;

namespace PlatformExampleApp.TextSnippet.Api.AwsEmailModule
{
    /// <summary>
    /// Example of implementation in other project assembly module. This folder should be in a separated project
    /// </summary>
    public class AwsEmailInfrastructureModule : PlatformInfrastructureModule
    {
        public AwsEmailInfrastructureModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }
    }
}
