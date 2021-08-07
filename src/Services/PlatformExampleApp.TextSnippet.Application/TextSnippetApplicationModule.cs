using System;
using System.Collections.Generic;
using AngularDotnetPlatform.Platform.Application;
using Microsoft.Extensions.Configuration;
using PlatformExampleApp.TextSnippet.Domain;
using PlatformExampleApp.TextSnippet.Persistence;
using PlatformExampleApp.TextSnippet.Persistence.Mongo;

namespace PlatformExampleApp.TextSnippet.Application
{
    public class TextSnippetApplicationModule : PlatformApplicationModule
    {
        public TextSnippetApplicationModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override List<Func<IConfiguration, Type>> GetModuleDependencies()
        {
            return new List<Func<IConfiguration, Type>>()
            {
                p => typeof(TextSnippetDomainPlatformModule),
                p => p.GetSection("UseMongoDb").Get<bool>() ? typeof(TextSnippetMongoPersistencePlatformModule) : typeof(TextSnippetEfCorePersistencePlatformModule)
            };
        }
    }
}
