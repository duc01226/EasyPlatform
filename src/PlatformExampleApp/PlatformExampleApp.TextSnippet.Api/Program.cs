using Easy.Platform.AspNetCore;
using Easy.Platform.AspNetCore.Extensions;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.EfCore.Logging.Exceptions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi.Models;
using PlatformExampleApp.TextSnippet.Api;
using Serilog;

// CA1852 Type 'Program' can be sealed because it has no subtypes in its containing assembly and is not externally visible
#pragma warning disable CA1852

// DEMO CHANGE DEFAULT USING LOCAL CLOCK PROVIDER. The kind, new Datetime, Default TimeZone will use LocalTimeZone.
// Clock.UseLocalProvider();

var configuration = PlatformConfigurationBuilder.GetConfigurationBuilder().Build();

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(configuration)
    .EnrichDefaultPlatformEnrichers()
    .WithExceptionDetails(p => p.WithPlatformEfCoreExceptionDetailsDestructurers())
    .CreateLogger();

try
{
    Log.Logger.Information("Starting web host");

    // CONFIG APP BUILDER
    var builder = WebApplication.CreateBuilder(args);

    ConfigureServices(builder.Services);

    // UseCustomHttpsCert: Demo can do this to help solve using https both in docker and outside machine in local still works by make it use the same https cert.
    // Fix for case api server to server call https trusting problem
    // In docker binding https cert out by Example: volumes: - ./GenerateHttpsCertForDocker/https:/https:rw; - ./GenerateHttpsCertForDocker/https/cert:/usr/local/share/ca-certificates:rw;
    builder.WebHost
        .UseConfiguration(configuration)
        .PipeIf(
            PlatformEnvironment.IsDevelopment && configuration["LocalDockerHttpsCert:FilePath"] != null,
            p => p.UseCustomHttpsCert(
                configuration["LocalDockerHttpsCert:FilePath"],
                configuration["LocalDockerHttpsCert:Password"],
                true));

    // BUILD AND CONFIG APP
    var webApplication = builder.Build();

    ConfigureRequestPipeline(webApplication);

    // RUN APP
    await BeforeRunInit(webApplication);

    await webApplication.RunAsync();
}
catch (Exception e)
{
    Log.Logger.Error(e, "Start web host failed");
    throw;
}

static void ConfigureServices(IServiceCollection services)
{
    services.AddSerilog();
    services.AddControllers()
        .AddPlatformModelBinderProviders()
        .AddPlatformJsonOptions(useCamelCaseNaming: false);
    services.Configure<KestrelServerOptions>(
        options =>
        {
            // Allow some libs could write data into response body stream use write function, not write async to fix System.InvalidOperationException: Synchronous operations are disallowed.
            options.AllowSynchronousIO = true;
        });

    //Use OpenApi instead of SwaggerGen
    //services.AddEndpointsApiExplorer(); // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
    //services.AddSwaggerGen(
    //    options =>
    //    {
    //        options.SwaggerDoc(
    //            "v1",
    //            new OpenApiInfo
    //            {
    //                Title = "TextSnippet HTTP API",
    //                Version = "v1"
    //            });
    //        options.AddSecurityDefinition(
    //            "Bearer",
    //            new OpenApiSecurityScheme
    //            {
    //                Description =
    //                    "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
    //                Name = "Authorization",
    //                In = ParameterLocation.Header,
    //                Type = SecuritySchemeType.ApiKey,
    //                Scheme = "Bearer"
    //            });
    //        options.AddSecurityRequirement(
    //            new OpenApiSecurityRequirement
    //            {
    //                {
    //                    new OpenApiSecurityScheme
    //                    {
    //                        Reference = new OpenApiReference
    //                        {
    //                            Type = ReferenceType.SecurityScheme,
    //                            Id = "Bearer"
    //                        },
    //                        Scheme = "oauth2",
    //                        Name = "Bearer",
    //                        In = ParameterLocation.Header
    //                    },
    //                    new List<string>()
    //                }
    //            });

    //        // Fix bug: Swashbuckle.AspNetCore.SwaggerGen.SwaggerGeneratorException: Failed to generate Operation for action Can't use schemaId The same schemaId is already used for type
    //        // References: https://github.com/domaindrivendev/Swashbuckle.AspNetCore/issues/1607#issuecomment-607170559
    //        options.CustomSchemaIds(type => type.FullName ?? type.ToString());
    //    });

    services.RegisterModule<TextSnippetApiAspNetCoreModule>(); // Register module into service collection
}


static void ConfigureRequestPipeline(WebApplication app)
{
    if (PlatformEnvironment.IsDevelopment) app.UseDeveloperExceptionPage();

    //Use OpenApi instead of SwaggerGen
    //app.UseSwagger();
    //app.UseSwaggerUI();
    app.MapOpenApi();
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/openapi/v1.json", typeof(Program).Assembly.GetName().Name));

    if (!PlatformEnvironment.IsDevelopment) app.UseHttpsRedirection();

    // Reference middleware orders: https://docs.microsoft.com/en-us/aspnet/core/fundamentals/middleware/?view=aspnetcore-5.0#middleware-order

    app.UsePlatformDefaultRecommendedMiddlewares();

    app.UseRouting();

    /*
     * With endpoint routing, the CORS middleware must be configured to execute between the calls to UseRouting and UseEndpoints.
     * Incorrect configuration will cause the middleware to stop functioning correctly.
     */
    app.UsePlatformDefaultCorsPolicy();

    app.UseAuthentication();
    app.UseAuthorization();

    app.UseEndpoints(endpoints => endpoints.MapControllers());

    app.UseDefaultResponseHealthCheckForEmptyPath();
}

static async Task BeforeRunInit(WebApplication webApplication)
{
    // Init module to start running init for all other modules and this module itself
    await webApplication.InitPlatformAspNetCoreModule<TextSnippetApiAspNetCoreModule>();
}
