using Easy.Platform.AspNetCore;
using Easy.Platform.AspNetCore.Extensions;
using Easy.Platform.Common;
using Easy.Platform.Common.DependencyInjection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

using PlatformExampleApp.TaskManagement.Api;

var configuration = PlatformConfigurationBuilder.GetConfigurationBuilder().Build();
var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseConfiguration(configuration);

builder.Services
    .AddControllers()
    .AddPlatformModelBinderProviders()
    .AddPlatformJsonOptions(useCamelCaseNaming: false);
builder.Services.AddAuthorization();
builder.Services.RegisterModule<TaskManagementStandaloneModule>();

var app = builder.Build();

if (PlatformEnvironment.IsDevelopment)
    app.UseDeveloperExceptionPage();
else
    app.UseHttpsRedirection();

app.UsePlatformDefaultRecommendedMiddlewares();
app.UseRouting();
app.UsePlatformDefaultCorsPolicy();
app.UseAuthorization();
app.UseEndpoints(endpoints => endpoints.MapControllers());
app.UseDefaultResponseHealthCheckForEmptyPath();

await app.InitPlatformAspNetCoreModule<TaskManagementStandaloneModule>();
await app.RunAsync();
