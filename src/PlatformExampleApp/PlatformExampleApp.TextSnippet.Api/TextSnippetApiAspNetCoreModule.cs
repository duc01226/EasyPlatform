using System.Text.Json;
using Easy.Platform.AspNetCore;
using Easy.Platform.Common.JsonSerialization;
using Microsoft.Extensions.Configuration;
using PlatformExampleApp.TextSnippet.Api.Context.RequestContext;
using PlatformExampleApp.TextSnippet.Application;
using PlatformExampleApp.TextSnippet.Infrastructure;
using PlatformExampleApp.TextSnippet.Persistence;
using PlatformExampleApp.TextSnippet.Persistence.Mongo;
using PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo;
using PlatformExampleApp.TextSnippet.Persistence.PostgreSql;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace PlatformExampleApp.TextSnippet.Api;

public class TextSnippetApiAspNetCoreModule : PlatformAspNetCoreModule
{
    public TextSnippetApiAspNetCoreModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(
        serviceProvider,
        configuration)
    {
    }

    public override List<Func<IConfiguration, Type>> GetDependentModuleTypes()
    {
        var result = new List<Func<IConfiguration, Type>>
        {
            p => typeof(TextSnippetApplicationModule),
            p => p.GetSection("UseDbType")
                .Get<string>()
                .WhenValue("MongoDb", _ => typeof(TextSnippetMongoPersistenceModule))
                .WhenValue("Postgres", _ => typeof(TextSnippetPostgreSqlEfCorePersistenceModule))
                .Else(_ => typeof(TextSnippetSqlEfCorePersistenceModule))
                .Execute(),

            // We can implement an ef-core module for TextSnippetMultiDbDemoPersistencePlatformModule too
            // and import the right module as we needed.
            p => typeof(TextSnippetMultiDbDemoMongoPersistenceModule),

            p => typeof(TextSnippetRabbitMqMessageBusModule),
            p => typeof(TextSnippetRedisCacheModule),
            p => typeof(TextSnippetHangfireBackgroundJobModule),
            p => typeof(AwsEmailInfrastructureModule),
            p => typeof(TextSnippetAzureBlobFileStorageInfrastructureModule)
        };

        return result;
    }

    protected override string[] GetAllowCorsOrigins(IConfiguration configuration)
    {
        return Configuration["AllowCorsOrigins"]!.Split(";");
    }

    protected override Type RequestContextKeyToClaimTypeMapperType()
    {
        return typeof(TextSnippetApplicationRequestContextKeyToJwtClaimTypeMapper);
    }

    protected override JsonSerializerOptions ProvideCustomJsonSerializerOptions()
    {
        return PlatformJsonSerializer.BuildDefaultOptions(useCamelCaseNaming: true);
    }

    // Apply DistributedTracingConfig OpenTelemetry
    //protected override DistributedTracingConfig ConfigureDistributedTracing()
    //{
    //    return new DistributedTracingConfig
    //    {
    //        Enabled = Configuration.GetSection("DistributedTracingConfig:Enabled").Get<bool>(),
    //        AddOtlpExporterConfig = opt => { opt.Endpoint = new Uri(Configuration["DistributedTracingConfig:AddOtlpExporterConfig:Endpoint"]!); }
    //    };
    //}

    //protected override PerformanceProfilingConfig ConfigurePerformanceProfiling()
    //{
    //    return new PerformanceProfilingConfig
    //    {
    //        CPUTrackingEnabled = Configuration.GetValue<bool?>("PerformanceProfilingConfig:CPUTrackingEnabled"),
    //        AllocationTrackingEnabled = Configuration.GetValue<bool?>("PerformanceProfilingConfig:AllocationTrackingEnabled"),
    //        ContentionTrackingEnabled = Configuration.GetValue<bool?>("PerformanceProfilingConfig:ContentionTrackingEnabled"),
    //        ExceptionTrackingEnabled = Configuration.GetValue<bool?>("PerformanceProfilingConfig:ExceptionTrackingEnabled")
    //    };
    //}
}
