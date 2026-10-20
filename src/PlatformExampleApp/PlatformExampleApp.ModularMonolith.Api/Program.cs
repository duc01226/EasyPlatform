using Easy.Platform.AspNetCore;
using Easy.Platform.AspNetCore.Extensions;
using Easy.Platform.Common;
using Easy.Platform.Common.DependencyInjection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.DependencyInjection;
using PlatformExampleApp.ModularMonolith.Api;

var configuration = PlatformConfigurationBuilder.GetConfigurationBuilder().Build();
var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseConfiguration(configuration);

builder.Services
    .AddControllers()
    .AddPlatformModelBinderProviders()
    .AddPlatformJsonOptions(useCamelCaseNaming: false);
builder.Services.AddAuthorization();
builder.Services.AddOpenApi();
builder.Services.Configure<KestrelServerOptions>(
    options =>
    {
        // Some platform libraries write synchronously to the response stream.
        options.AllowSynchronousIO = true;
    });

builder.Services.RegisterModule<ModularMonolithApiAspNetCoreModule>();

var app = builder.Build();

if (PlatformEnvironment.IsDevelopment)
    app.UseDeveloperExceptionPage();
else
    app.UseHttpsRedirection();

app.MapOpenApi();
app.UsePlatformDefaultRecommendedMiddlewares();
app.UseRouting();
app.UsePlatformDefaultCorsPolicy();
app.UseAuthorization();
app.UseEndpoints(endpoints => endpoints.MapControllers());
app.UseDefaultResponseHealthCheckForEmptyPath();

await app.InitPlatformAspNetCoreModule<ModularMonolithApiAspNetCoreModule>();
await app.RunAsync();
