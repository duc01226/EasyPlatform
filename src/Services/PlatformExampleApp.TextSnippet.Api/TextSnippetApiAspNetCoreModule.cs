using System;
using System.Collections.Generic;
using Microsoft.Extensions.Configuration;
using AngularDotnetPlatform.Platform.AspNetCore;
using PlatformExampleApp.TextSnippet.Api.Context.UserContext;
using PlatformExampleApp.TextSnippet.Application;
using PlatformExampleApp.TextSnippet.Domain;
using PlatformExampleApp.TextSnippet.Persistence;
using PlatformExampleApp.TextSnippet.Persistence.Mongo;
using PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace PlatformExampleApp.TextSnippet.Api
{
    public class TextSnippetApiAspNetCoreModule : PlatformAspNetCoreModule
    {
        public TextSnippetApiAspNetCoreModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override List<Func<IConfiguration, Type>> GetModuleDependencies()
        {
            var result = new List<Func<IConfiguration, Type>>
            {
                p => typeof(TextSnippetApplicationModule),
                p => typeof(TextSnippetRabbitMqEventBusModule),
                p => typeof(TextSnippetRedisCacheModule)
            };

            result.Add(p => p.GetSection("UseMongoDb").Get<bool>()
                ? typeof(TextSnippetMongoPersistenceModule)
                : typeof(TextSnippetEfCorePersistenceModule));

            // We can implement an ef-core module for TextSnippetMultiDbDemoPersistencePlatformModule too
            // and import the right module as we needed.
            result.Add(p => typeof(TextSnippetMultiDbDemoMongoPersistenceModule));

            return result;
        }

        protected override string[] GetAllowCorsOrigins(IConfiguration configuration)
        {
            return Configuration["AllowCorsOrigins"].Split(";");
        }

        protected override Type UserContextKeyToClaimTypeMapperType()
        {
            return typeof(TextSnippetApplicationUserContextKeyToJwtClaimTypeMapper);
        }
    }
}
