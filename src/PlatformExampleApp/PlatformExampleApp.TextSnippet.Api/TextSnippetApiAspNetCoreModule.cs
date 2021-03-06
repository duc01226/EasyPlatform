using System.Text.Json;
using Easy.Platform.AspNetCore;
using Easy.Platform.Common.JsonSerialization;
using Microsoft.Extensions.Configuration;
using PlatformExampleApp.TextSnippet.Api.Context.UserContext;
using PlatformExampleApp.TextSnippet.Application;
using PlatformExampleApp.TextSnippet.Infrastructure;
using PlatformExampleApp.TextSnippet.Persistence;
using PlatformExampleApp.TextSnippet.Persistence.Mongo;
using PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace PlatformExampleApp.TextSnippet.Api;

public class TextSnippetApiAspNetCoreModule : PlatformAspNetCoreModule
{
    public TextSnippetApiAspNetCoreModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(
        serviceProvider,
        configuration)
    {
    }

    protected override List<Func<IConfiguration, Type>> GetModuleTypeDependencies()
    {
        var result = new List<Func<IConfiguration, Type>>
        {
            p => typeof(TextSnippetApplicationModule),
            p => p.GetSection("UseDbType").Get<string>() == "MongoDb"
                ? typeof(TextSnippetMongoPersistenceModule)
                : typeof(TextSnippetEfCorePersistenceModule),

            // We can implement an ef-core module for TextSnippetMultiDbDemoPersistencePlatformModule too
            // and import the right module as we needed.
            p => typeof(TextSnippetMultiDbDemoMongoPersistenceModule),

            p => typeof(TextSnippetRabbitMqMessageBusModule),
            p => typeof(TextSnippetRedisCacheModule),

            // HangfireBackgroundJobModule should be after PersistenceModule to ensure first time run database is created
            p => typeof(TextSnippetHangfireBackgroundJobModule),
            p => typeof(AwsEmailInfrastructureModule)
        };

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

    protected override JsonSerializerOptions JsonSerializerCurrentOptions()
    {
        return PlatformJsonSerializer.BuildDefaultOptions(useCamelCaseNaming: true);
    }
}
